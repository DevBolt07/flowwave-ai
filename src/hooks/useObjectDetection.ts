
import { useState, useEffect, useRef } from 'react';
import * as tf from '@tensorflow/tfjs';
import { InferenceSession, Tensor } from 'onnxruntime-web';

// Define the structure of the detection results
export interface DetectionResult {
    box: [number, number, number, number]; // [x1, y1, x2, y2]
    label: string;
    score: number;
}

const YOLOV8_CLASS_NAMES = [
    'person', 'bicycle', 'car', 'motorcycle', 'airplane', 'bus', 'train', 'truck', 'boat', 
    'traffic light', 'fire hydrant', 'stop sign', 'parking meter', 'bench', 'bird', 'cat', 
    'dog', 'horse', 'sheep', 'cow', 'elephant', 'bear', 'zebra', 'giraffe', 'backpack', 
    'umbrella', 'handbag', 'tie', 'suitcase', 'frisbee', 'skis', 'snowboard', 'sports ball', 
    'kite', 'baseball bat', 'baseball glove', 'skateboard', 'surfboard', 'tennis racket', 
    'bottle', 'wine glass', 'cup', 'fork', 'knife', 'spoon', 'bowl', 'banana', 'apple', 
    'sandwich', 'orange', 'broccoli', 'carrot', 'hot dog', 'pizza', 'donut', 'cake', 'chair', 
    'couch', 'potted plant', 'bed', 'dining table', 'toilet', 'tv', 'laptop', 'mouse', 
    'remote', 'keyboard', 'cell phone', 'microwave', 'oven', 'toaster', 'sink', 'refrigerator', 
    'book', 'clock', 'vase', 'scissors', 'teddy bear', 'hair drier', 'toothbrush'
];

export function useObjectDetection() {
    const [session, setSession] = useState<InferenceSession | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // Effect to load the ONNX model
    useEffect(() => {
        const loadModel = async () => {
            try {
                // Ensure tfjs is ready
                await tf.ready();
                // Create a new ONNX runtime session
                const newSession = await InferenceSession.create(
                    './yolov8n.onnx', // Path to the model in the public folder
                    { executionProviders: ['webgl'], graphOptimizationLevel: 'all' }
                );
                setSession(newSession);
            } catch (e) {
                console.error("Failed to load the ONNX model:", e);
                setError("Could not load the object detection model. Please ensure the model file is available.");
            } finally {
                setIsLoading(false);
            }
        };
        loadModel();
    }, []);

    // Function to run detection on a single video frame
    const detectObjects = async (frame: HTMLVideoElement | HTMLCanvasElement): Promise<DetectionResult[]> => {
        if (!session) return [];

        // Pre-process the frame
        const modelInput = tf.browser.fromPixels(frame);
        const [width, height] = [modelInput.shape[1], modelInput.shape[0]];
        const resized = tf.image.resizeBilinear(modelInput, [640, 640])
            .div(255.0) // Normalize to [0, 1]
            .transpose([2, 0, 1]) // HWC to CHW
            .expandDims(0); // Add batch dimension

        const tensor = new Tensor('float32', resized.dataSync(), [1, 3, 640, 640]);
        
        // Run inference
        const feeds = { 'images': tensor };
        const results = await session.run(feeds);
        const output = results.output0;

        // Post-process the results
        const detections: DetectionResult[] = [];
        for (let i = 0; i < output.dims[2]; i++) {
            const score = output.data[4 * output.dims[2] + i];
            if (score > 0.5) { // Confidence threshold
                const classIndex = output.data.slice(4 * output.dims[2], 84 * output.dims[2])
                    .reduce((maxIndex, currentValue, currentIndex, arr) => 
                        currentValue > arr[maxIndex] ? currentIndex : maxIndex, 0);

                const left = output.data[0 * output.dims[2] + i] / 640 * width;
                const top = output.data[1 * output.dims[2] + i] / 640 * height;
                const right = output.data[2 * output.dims[2] + i] / 640 * width;
                const bottom = output.data[3 * output.dims[2] + i] / 640 * height;

                detections.push({
                    box: [left, top, right, bottom],
                    label: YOLOV8_CLASS_NAMES[classIndex],
                    score: score,
                });
            }
        }
        
        tf.dispose([modelInput, resized]); // Clean up tensors
        return detections;
    };

    return { session, isLoading, error, detectObjects };
}
