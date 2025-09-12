import { useState, useRef, useEffect, useCallback } from 'react';
import ReactPlayer from 'react-player';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { AlertTriangle, Loader, VideoOff, Car, TrafficCone } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

interface DetectionResult {
    bounding_boxes: any[];
    vehicle_count: number;
}

interface VideoFeedProps {
  videoUrl?: string; 
  intersectionId: string;
  direction: 'North' | 'South' | 'East' | 'West';
  onDetectionUpdate: (result: any) => void;
  detectionModel: string;
  isActive: boolean;
  handleManualOverride: (direction: 'North' | 'South' | 'East' | 'West', signalState: 'red' | 'green') => void;
}

export const VideoFeed = ({
  videoUrl,
  intersectionId,
  direction,
  onDetectionUpdate,
  detectionModel,
  isActive,
  handleManualOverride,
}: VideoFeedProps) => {
  const [isReady, setIsReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [detectedObjects, setDetectedObjects] = useState<any[]>([]);
  const [vehicleCount, setVehicleCount] = useState<number>(0);
  const [signalState, setSignalState] = useState('red'); // Default to red
  const playerRef = useRef<ReactPlayer>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const detectionIntervalRef = useRef<NodeJS.Timeout>();

  useEffect(() => {
    setIsReady(false);
    setError(null);
    setDetectedObjects([]);
    setVehicleCount(0);
  }, [videoUrl]);

  const captureFrame = useCallback((): string | null => {
    const player = playerRef.current?.getInternalPlayer();
    if (!player || !canvasRef.current || player.videoWidth === 0) return null;
    
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;

    canvas.width = player.videoWidth;
    canvas.height = player.videoHeight;
    ctx.drawImage(player, 0, 0, canvas.width, canvas.height);
    
    return canvas.toDataURL('image/jpeg', 0.7);
  }, []);

  const runDetection = useCallback(async () => {
    if (!isActive || !isReady || !videoUrl) return;
    
    const frame = captureFrame();
    if (!frame) return;

    try {
        const { data, error: funcError } = await supabase.functions.invoke('vehicle-detection', {
            body: { frame, model: detectionModel }
        });

        if (funcError) throw new Error(funcError.message);
        if (!data) throw new Error("No data returned from AI function.");

        const result: DetectionResult = data;
        setDetectedObjects(result.bounding_boxes || []);
        setVehicleCount(result.vehicle_count || 0);
        onDetectionUpdate({
            intersectionId,
            lane: direction,
            vehicle_count: result.vehicle_count,
            bounding_boxes: result.bounding_boxes
        });

    } catch (err) {
      console.error(`Detection error in ${direction} feed:`, err);
    }
  }, [isActive, isReady, videoUrl, captureFrame, detectionModel, intersectionId, direction, onDetectionUpdate]);

  useEffect(() => {
    if (isActive && isReady && videoUrl) {
      detectionIntervalRef.current = setInterval(runDetection, 5000);
      return () => clearInterval(detectionIntervalRef.current);
    } else if (detectionIntervalRef.current) {
      clearInterval(detectionIntervalRef.current);
    }
  }, [isActive, isReady, videoUrl, runDetection]);

  const handleReady = () => {
    setIsReady(true);
  };

  const handleError = (e: any) => {
    const errorMessage = `Cannot play video for ${direction}.`;
    console.error(errorMessage, e);
    setError("The video source is unplayable. Check URL/CORS.");
  };

  const renderBoundingBoxes = () => {
    const playerElement = playerRef.current?.getInternalPlayer() as HTMLVideoElement;
    if (!detectedObjects.length || !playerElement) return null;

    const scaleX = playerElement.clientWidth / playerElement.videoWidth;
    const scaleY = playerElement.clientHeight / playerElement.videoHeight;

    return (
        <svg className="absolute inset-0 pointer-events-none w-full h-full">
          {detectedObjects.map((box, index) => (
            <g key={index}>
              <rect
                x={box.x * scaleX}
                y={box.y * scaleY}
                width={box.width * scaleX}
                height={box.height * scaleY}
                className="fill-transparent stroke-red-500"
                strokeWidth="2"
              />
              <text x={box.x * scaleX} y={box.y * scaleY - 5} className="fill-white bg-red-500 text-xs font-mono p-1">
                {box.class} ({(box.confidence * 100).toFixed(0)}%)
              </text>
            </g>
          ))}
        </svg>
    );
  };

  return (
    <Card className="h-full overflow-hidden bg-black">
      <CardHeader className="p-2 border-b flex flex-row items-center justify-between text-white">
        <div className="flex items-center space-x-2">
          <div className={`w-3 h-3 rounded-full ${signalState === 'green' ? 'bg-green-500' : 'bg-red-500'}`}></div>
          <h3 className="text-sm font-medium">{direction}</h3>
        </div>
        <div className="flex items-center space-x-2">
          <Badge variant="secondary" className="flex items-center space-x-1">
            <Car className="h-3 w-3" />
            <span>{vehicleCount}</span>
          </Badge>
          <Button size="sm" variant="destructive" onClick={() => handleManualOverride(direction, signalState === 'green' ? 'red' : 'green')}>
            <TrafficCone className="h-4 w-4 mr-1" />
            Override
          </Button>
        </div>
      </CardHeader>
      <CardContent className="p-0 relative aspect-video">
        {!videoUrl ? (
          <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
            <VideoOff className="w-8 h-8 mb-2" />
            <p className="text-sm">No video feed configured.</p>
          </div>
        ) : (
          <div className="w-full h-full">
            {error && (
                <div className="absolute inset-0 flex flex-col items-center justify-center text-destructive p-4 z-10">
                    <AlertTriangle className="w-8 h-8 mb-2" />
                    <p className="text-sm text-center font-medium">{error}</p>
                </div>
            )}
            {!isReady && !error && (
                 <div className="absolute inset-0 flex flex-col items-center justify-center text-muted-foreground">
                    <Loader className="w-8 h-8 animate-spin mb-2" />
                    <p className="text-sm">Loading video...</p>
                </div>
            )}
            <ReactPlayer
              ref={playerRef}
              url={videoUrl}
              playing
              loop
              muted
              width="100%"
              height="100%"
              onReady={handleReady}
              onError={handleError}
              config={{ file: { attributes: { crossOrigin: 'anonymous' } } }}
              className={isReady ? 'opacity-100' : 'opacity-0'}
            />
            {isReady && renderBoundingBoxes()}
          </div>
        )}
        <canvas ref={canvasRef} className="hidden" />
      </CardContent>
    </Card>
  );
};