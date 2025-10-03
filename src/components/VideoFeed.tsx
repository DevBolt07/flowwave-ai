import { useState, useRef, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Camera, Upload, Square, Play, AlertTriangle, Link2, Video } from 'lucide-react';
import { detectVehicles, DetectionResult, mockDetectionResult } from '@/lib/api';
import { useToast } from '@/hooks/use-toast';

// Sample demo videos that loop by default
const DEMO_VIDEOS = [
  'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerEscapes.mp4',
  'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4',
  'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerJoyrides.mp4',
  'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerFun.mp4'
];

interface VideoFeedProps {
  intersectionId: string;
  direction: 'North' | 'South' | 'East' | 'West';
  onDetectionUpdate: (result: DetectionResult) => void;
  detectionModel: 'yolov8' | 'rt-detr' | 'yolo-nas' | 'pp-yoloe';
  isActive: boolean;
}

export const VideoFeed = ({
  intersectionId,
  direction,
  onDetectionUpdate,
  detectionModel,
  isActive,
}: VideoFeedProps) => {
  const [feedType, setFeedType] = useState<'demo' | 'webcam' | 'upload' | 'url'>('demo');
  const [isRecording, setIsRecording] = useState(false);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [detectionResults, setDetectionResults] = useState<DetectionResult | null>(null);
  const [lastDetectionTime, setLastDetectionTime] = useState<Date | null>(null);
  const [streamUrl, setStreamUrl] = useState('');
  const [showUrlInput, setShowUrlInput] = useState(false);
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const detectionIntervalRef = useRef<NodeJS.Timeout>();
  
  const { toast } = useToast();

  // Get demo video based on direction
  const getDemoVideoUrl = () => {
    const directionMap = { 'North': 0, 'South': 1, 'East': 2, 'West': 3 };
    return DEMO_VIDEOS[directionMap[direction]];
  };

  // Load demo video on mount
  useEffect(() => {
    if (videoRef.current && feedType === 'demo') {
      videoRef.current.src = getDemoVideoUrl();
      videoRef.current.load();
    }
  }, []);

  const startWebcam = useCallback(async () => {
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 640 },
          height: { ideal: 480 },
          facingMode: 'environment'
        },
        audio: false,
      });
      
      setStream(mediaStream);
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
      }
      setFeedType('webcam');
      setIsRecording(true);
      
      toast({
        title: "Webcam Connected",
        description: `Live feed active for ${direction} lane`,
      });
    } catch (error) {
      console.error('Error accessing webcam:', error);
      toast({
        title: "Webcam Error",
        description: "Unable to access camera. Please check permissions.",
        variant: "destructive",
      });
    }
  }, [direction, toast]);

  const stopWebcam = useCallback(() => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      setStream(null);
    }
    setIsRecording(false);
    setFeedType('demo');
    
    if (detectionIntervalRef.current) {
      clearInterval(detectionIntervalRef.current);
    }

    // Return to demo video
    if (videoRef.current) {
      videoRef.current.src = getDemoVideoUrl();
      videoRef.current.load();
    }
  }, [stream, direction]);

  const handleFileUpload = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file && videoRef.current) {
      const url = URL.createObjectURL(file);
      videoRef.current.src = url;
      videoRef.current.load();
      setFeedType('upload');
      
      toast({
        title: "Video Uploaded",
        description: `Video file loaded for ${direction} lane`,
      });
    }
  }, [direction, toast]);

  const handleUrlSubmit = useCallback(() => {
    if (streamUrl && videoRef.current) {
      videoRef.current.src = streamUrl;
      videoRef.current.load();
      setFeedType('url');
      setShowUrlInput(false);
      
      toast({
        title: "Stream URL Set",
        description: `Stream loaded for ${direction} lane`,
      });
    }
  }, [streamUrl, direction, toast]);

  const resetToDemo = useCallback(() => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      setStream(null);
    }
    setIsRecording(false);
    setFeedType('demo');
    setStreamUrl('');
    setShowUrlInput(false);
    
    if (videoRef.current) {
      videoRef.current.src = getDemoVideoUrl();
      videoRef.current.load();
    }
    
    toast({
      title: "Demo Video Restored",
      description: `Showing demo video for ${direction} lane`,
    });
  }, [stream, direction, toast]);

  const captureFrame = useCallback((): Blob | null => {
    if (!videoRef.current || !canvasRef.current) return null;
    
    const video = videoRef.current;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    
    if (!ctx) return null;
    
    canvas.width = video.videoWidth || 640;
    canvas.height = video.videoHeight || 480;
    
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    
    return new Promise<Blob>((resolve) => {
      canvas.toBlob((blob) => {
        resolve(blob!);
      }, 'image/jpeg', 0.8);
    }) as any;
  }, []);

  const runDetection = useCallback(async () => {
    if (!isActive) return;
    
    try {
      const frame = captureFrame();
      if (!frame) return;
      
      let result: DetectionResult;
      
      try {
        result = await detectVehicles(frame, intersectionId, detectionModel);
      } catch (error) {
        // Fallback to mock data if backend is not available
        console.warn('Detection API unavailable, using mock data:', error);
        result = mockDetectionResult(intersectionId);
      }
      
      setDetectionResults(result);
      setLastDetectionTime(new Date());
      onDetectionUpdate(result);
      
    } catch (error) {
      console.error('Detection error:', error);
    }
  }, [isActive, feedType, captureFrame, intersectionId, detectionModel, onDetectionUpdate]);

  useEffect(() => {
    if (isActive) {
      // Run detection every 2 seconds
      detectionIntervalRef.current = setInterval(runDetection, 2000);
      
      return () => {
        if (detectionIntervalRef.current) {
          clearInterval(detectionIntervalRef.current);
        }
      };
    }
  }, [isActive, runDetection]);

  useEffect(() => {
    return () => {
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
      if (detectionIntervalRef.current) {
        clearInterval(detectionIntervalRef.current);
      }
    };
  }, [stream]);

  const renderBoundingBoxes = () => {
    if (!detectionResults || !videoRef.current) return null;
    
    const video = videoRef.current;
    const scaleX = video.clientWidth / (video.videoWidth || 640);
    const scaleY = video.clientHeight / (video.videoHeight || 480);
    
    return (
      <div className="absolute inset-0 pointer-events-none">
        <svg className="w-full h-full">
          {detectionResults.bounding_boxes.map((box, index) => (
            <g key={index}>
              <rect
                x={box.x * scaleX}
                y={box.y * scaleY}
                width={box.width * scaleX}
                height={box.height * scaleY}
                fill="none"
                stroke="#00ff00"
                strokeWidth="2"
                className="animate-pulse"
              />
              <text
                x={box.x * scaleX}
                y={box.y * scaleY - 5}
                fill="#00ff00"
                fontSize="12"
                className="font-mono"
              >
                {box.class} ({(box.confidence * 100).toFixed(0)}%)
              </text>
            </g>
          ))}
        </svg>
      </div>
    );
  };

  return (
    <Card className="h-full">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm">{direction} Lane</CardTitle>
          <div className="flex items-center space-x-2">
            {isActive && detectionResults && (
              <Badge variant="default" className="text-xs">
                {detectionResults.lane_counts[direction.toLowerCase() as keyof typeof detectionResults.lane_counts]} vehicles
              </Badge>
            )}
            <Badge variant={isActive ? 'default' : 'secondary'} className="text-xs">
              {isActive ? 'Active' : 'Inactive'}
            </Badge>
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-3">
        {/* Video Feed */}
        <div className="relative aspect-video bg-muted rounded overflow-hidden">
          <video
            ref={videoRef}
            autoPlay
            muted
            loop
            playsInline
            className="w-full h-full object-cover"
            onLoadedData={() => {
              // Auto-play and loop videos
              if (videoRef.current) {
                videoRef.current.currentTime = 0;
                videoRef.current.play();
              }
            }}
          />
          {renderBoundingBoxes()}
          <canvas ref={canvasRef} className="hidden" />
          
          {/* Demo badge */}
          {feedType === 'demo' && (
            <div className="absolute top-2 left-2">
              <Badge variant="secondary" className="text-xs">
                <Video className="w-3 h-3 mr-1" />
                Demo Video
              </Badge>
            </div>
          )}
        </div>

        {/* Controls */}
        <div className="space-y-2">
          <div className="grid grid-cols-4 gap-2">
            <Button
              size="sm"
              variant={feedType === 'webcam' ? 'destructive' : 'outline'}
              onClick={feedType === 'webcam' ? stopWebcam : startWebcam}
              className="text-xs"
            >
              <Camera className="w-3 h-3 mr-1" />
              {feedType === 'webcam' ? 'Stop' : 'Cam'}
            </Button>
            
            <Button
              size="sm"
              variant="outline"
              onClick={() => fileInputRef.current?.click()}
              className="text-xs"
            >
              <Upload className="w-3 h-3 mr-1" />
              Upload
            </Button>

            <Button
              size="sm"
              variant={showUrlInput ? 'secondary' : 'outline'}
              onClick={() => setShowUrlInput(!showUrlInput)}
              className="text-xs"
            >
              <Link2 className="w-3 h-3 mr-1" />
              URL
            </Button>

            <Button
              size="sm"
              variant={feedType === 'demo' ? 'default' : 'outline'}
              onClick={resetToDemo}
              className="text-xs"
              disabled={feedType === 'demo'}
            >
              <Video className="w-3 h-3 mr-1" />
              Demo
            </Button>
          </div>

          {/* URL Input */}
          {showUrlInput && (
            <div className="space-y-2 pt-2 border-t">
              <Label htmlFor="stream-url" className="text-xs">Stream URL or Video URL</Label>
              <div className="flex space-x-2">
                <Input
                  id="stream-url"
                  type="text"
                  placeholder="https://example.com/stream.m3u8"
                  value={streamUrl}
                  onChange={(e) => setStreamUrl(e.target.value)}
                  className="text-xs h-8"
                />
                <Button
                  size="sm"
                  onClick={handleUrlSubmit}
                  disabled={!streamUrl}
                  className="text-xs h-8"
                >
                  Load
                </Button>
              </div>
            </div>
          )}
          
          <Input
            ref={fileInputRef}
            type="file"
            accept="video/*"
            onChange={handleFileUpload}
            className="hidden"
          />
        </div>

        {/* Detection Stats */}
        {detectionResults && (
          <div className="space-y-2 text-xs">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Model:</span>
              <span className="font-mono">{detectionModel.toUpperCase()}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Confidence:</span>
              <span className="font-mono">{(detectionResults.confidence * 100).toFixed(1)}%</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Vehicles:</span>
              <span className="font-mono">{detectionResults.bounding_boxes.length}</span>
            </div>
            {lastDetectionTime && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Last update:</span>
                <span className="font-mono">{lastDetectionTime.toLocaleTimeString()}</span>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
};