
import React, { useState, useCallback, useRef, useEffect } from 'react';
import { useDropzone } from 'react-dropzone';
import { useObjectDetection, DetectionResult } from '../hooks/useObjectDetection';
import { Button } from './ui/button';
import { Card, CardHeader, CardContent, CardFooter } from './ui/card';
import { Badge } from './ui/badge';

export function LaneWindow({ laneName }: { laneName: string }) {
    const { isLoading: isLoadingModel, error: modelError, detectObjects } = useObjectDetection();

    const [videoSrc, setVideoSrc] = useState<string | null>(null);
    const [isProcessing, setIsProcessing] = useState(false);
    const [detections, setDetections] = useState<DetectionResult[]>([]);
    const [lastUpdateTime, setLastUpdateTime] = useState<string>("--:--:--");
    const [isWebcam, setIsWebcam] = useState(false);

    const videoRef = useRef<HTMLVideoElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const animationFrameId = useRef<number>();

    const onDrop = useCallback((acceptedFiles: File[]) => {
        const file = acceptedFiles[0];
        if (!file) return;
        if (videoSrc) URL.revokeObjectURL(videoSrc);
        const url = URL.createObjectURL(file);
        setVideoSrc(url);
        setIsWebcam(false);
    }, [videoSrc]);

    const { getRootProps, getInputProps, isDragActive } = useDropzone({
        onDrop,
        accept: { 'video/mp4': ['.mp4'] },
        noClick: true, // We have dedicated buttons
        multiple: false,
    });

    const startWebcam = async () => {
        if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
            try {
                const stream = await navigator.mediaDevices.getUserMedia({ video: true });
                if (videoRef.current) {
                    videoRef.current.srcObject = stream;
                }
                setIsWebcam(true);
                setVideoSrc('webcam'); // Use a special string to denote webcam usage
            } catch (err) {
                console.error("Error accessing webcam: ", err);
            }
        }
    };

    const processFrame = useCallback(async () => {
        if (!videoRef.current || !canvasRef.current || videoRef.current.paused || videoRef.current.ended) {
            animationFrameId.current = requestAnimationFrame(processFrame);
            return;
        }

        const video = videoRef.current;
        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d');

        if (ctx) {
            canvas.width = video.videoWidth;
            canvas.height = video.videoHeight;
            ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

            const detected = await detectObjects(video);
            const vehicleDetections = detected.filter(d => ['car', 'motorcycle', 'bus', 'truck'].includes(d.label));
            setDetections(vehicleDetections);
            setLastUpdateTime(new Date().toLocaleTimeString());

            vehicleDetections.forEach(det => {
                ctx.strokeStyle = '#00FF00';
                ctx.lineWidth = 2;
                ctx.beginPath();
                ctx.rect(det.box[0], det.box[1], det.box[2] - det.box[0], det.box[3] - det.box[1]);
                ctx.stroke();

                ctx.fillStyle = '#00FF00';
                ctx.font = '16px sans-serif';
                ctx.fillText(`${det.label} (${det.score.toFixed(2)})`, det.box[0], det.box[1] > 10 ? det.box[1] - 5 : 15);
            });
        }

        animationFrameId.current = requestAnimationFrame(processFrame);
    }, [detectObjects]);

    useEffect(() => {
        const video = videoRef.current;
        if (videoSrc && video) {
            const handlePlay = () => {
                animationFrameId.current = requestAnimationFrame(processFrame);
            };
            const handlePause = () => {
                if (animationFrameId.current) cancelAnimationFrame(animationFrameId.current);
            };

            video.addEventListener('play', handlePlay);
            video.addEventListener('pause', handlePause);
            video.addEventListener('ended', handlePause);

            if (!video.paused) handlePlay();

            return () => {
                video.removeEventListener('play', handlePlay);
                video.removeEventListener('pause', handlePause);
                video.removeEventListener('ended', handlePause);
                if (animationFrameId.current) cancelAnimationFrame(animationFrameId.current);
                if (video.srcObject) {
                    (video.srcObject as MediaStream).getTracks().forEach(track => track.stop());
                }
            };
        }
    }, [videoSrc, processFrame]);

    const avgConfidence = detections.length > 0 
        ? (detections.reduce((sum, d) => sum + d.score, 0) / detections.length * 100).toFixed(1) + '%'
        : 'N/A';

    const renderInitialState = () => (
        <div {...getRootProps({ className: `flex flex-col items-center justify-center h-full p-4 text-center ${isDragActive ? 'border-blue-500' : 'border-gray-600'} border-2 border-dashed rounded-lg` })}>
            <input {...getInputProps()} />
            <p className="font-semibold text-gray-300">Drag & drop a video, or use the buttons below.</p>
            <div className="flex gap-4 mt-4">
                <Button onClick={startWebcam}>Webcam</Button>
                <Button onClick={() => document.getElementById(`upload-${laneName}`)?.click()}>Upload</Button>
                <input id={`upload-${laneName}`} type="file" accept="video/mp4" style={{ display: 'none' }} onChange={(e) => onDrop(Array.from(e.target.files || []))} />
            </div>
        </div>
    );

    const renderVideoState = () => (
        <div style={{ position: 'relative', width: '100%', height: '100%' }}>
            <video
                ref={videoRef}
                src={isWebcam ? undefined : videoSrc || ''}
                controls={!isWebcam}
                autoPlay
                loop={!isWebcam}
                muted
                style={{ width: '100%', height: '100%', objectFit: 'contain' }}
            />
            <canvas
                ref={canvasRef}
                style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', objectFit: 'contain', pointerEvents: 'none' }}
            />
        </div>
    );

    return (
        <Card className="bg-gray-800 text-white overflow-hidden">
            <CardHeader className="flex flex-row items-center justify-between p-4">
                <h3 className="font-semibold">{laneName}</h3>
                <div className="flex items-center gap-2">
                    <Badge variant="secondary">{detections.length} vehicles</Badge>
                    <Badge className={videoSrc ? 'bg-green-500' : 'bg-gray-500'}>{videoSrc ? 'Active' : 'Inactive'}</Badge>
                </div>
            </CardHeader>

            <CardContent className="p-0 aspect-video flex items-center justify-center">
                {modelError && <p className="text-red-500">Error: {modelError}</p>}
                {isLoadingModel && <p>Loading AI Model...</p>}
                {!isLoadingModel && !modelError && (
                    videoSrc ? renderVideoState() : renderInitialState()
                )}
            </CardContent>

            <CardFooter className="p-4 flex-col items-start text-sm">
                <div className="flex justify-between w-full">
                    <span>Model:</span>
                    <span className="font-mono">YOLOV8</span>
                </div>
                <div className="flex justify-between w-full">
                    <span>Confidence:</span>
                    <span className="font-mono">{avgConfidence}</span>
                </div>
                <div className="flex justify-between w-full">
                    <span>Vehicles:</span>
                    <span className="font-mono">{detections.length}</span>
                </div>
                <div className="flex justify-between w-full">
                    <span>Last update:</span>
                    <span className="font-mono">{lastUpdateTime}</span>
                </div>
                 <div className="flex gap-4 mt-4 w-full justify-center">
                    <Button variant="outline" onClick={startWebcam}>Webcam</Button>
                    <Button variant="outline" onClick={() => document.getElementById(`upload-${laneName}-footer`)?.click()}>Upload</Button>
                    <input id={`upload-${laneName}-footer`} type="file" accept="video/mp4" style={{ display: 'none' }} onChange={(e) => onDrop(Array.from(e.target.files || []))} />
            </div>
            </CardFooter>
        </Card>
    );
}
