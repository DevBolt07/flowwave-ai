import { useState, useRef, useEffect, useCallback } from 'react';
import ReactPlayer from 'react-player';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { AlertTriangle, Loader } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface DetectionResult {
    bounding_boxes: any[];
    vehicle_count: number;
}

interface VideoFeedProps {
  feedUrl: string;
  intersectionId: string;
  direction: 'North' | 'South' | 'East' | 'West';
  onDetectionUpdate: (result: any) => void;
  detectionModel: string;
  isActive: boolean;
}

export const VideoFeed = ({
  feedUrl,
  intersectionId,
  direction,
  onDetectionUpdate,
  detectionModel,
  isActive,
}: VideoFeedProps) => {
  const [isReady, setIsReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [detectedObjects, setDetectedObjects] = useState<any[]>([]);
  const playerRef = useRef<ReactPlayer>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const detectionIntervalRef = useRef<NodeJS.Timeout>();
  const { toast } = useToast();

  const captureFrame = useCallback((): string | null => {
    const player = playerRef.current?.getInternalPlayer();
    if (!player || !canvasRef.current || player.videoWidth === 0) return null;
    
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;

    canvas.width = player.videoWidth;
    canvas.height = player.videoHeight;
    ctx.drawImage(player, 0, 0, canvas.width, canvas.height);
    
    // Return base64 image data
    return canvas.toDataURL('image/jpeg', 0.7);
  }, []);

  const runDetection = useCallback(async () => {
    if (!isActive || !isReady) return;
    
    const frame = captureFrame();
    if (!frame) return;

    try {
        const { data, error } = await supabase.functions.invoke('vehicle-detection', {
            body: JSON.stringify({
                frame: frame,
                model: detectionModel
            })
        });

        if (error) throw new Error(error.message);
        if (!data) throw new Error("No data returned from function");

        const result: DetectionResult = data;
        setDetectedObjects(result.bounding_boxes);
        onDetectionUpdate({
            intersectionId,
            lane: direction,
            vehicle_count: result.vehicle_count,
            bounding_boxes: result.bounding_boxes
        });

    } catch (err) {
      console.error('Detection error:', err);
      // Do not show toast for detection errors, as they can be frequent.
      // Consider a more subtle UI indicator if needed.
    }
  }, [isActive, isReady, captureFrame, detectionModel, intersectionId, direction, onDetectionUpdate]);

  useEffect(() => {
    if (isActive && isReady) {
      detectionIntervalRef.current = setInterval(runDetection, 5000); // 5 seconds
      return () => clearInterval(detectionIntervalRef.current);
    } else {
        if(detectionIntervalRef.current) {
            clearInterval(detectionIntervalRef.current);
        }
    }
  }, [isActive, isReady, runDetection]);

  const handleReady = () => {
    setIsReady(true);
    console.log(`Video feed ready for ${direction} lane.`);
  };

  const handleError = (e: any) => {
    const errorMessage = `Failed to load video for ${direction} lane.`;
    console.error(errorMessage, e);
    setError(errorMessage + " Please check the URL and network.");
    toast({
      title: "Video Load Error",
      description: errorMessage,
      variant: "destructive",
    });
  };

  const renderBoundingBoxes = () => {
    if (!detectedObjects.length || !playerRef.current) return null;
    
    const playerElement = playerRef.current.getInternalPlayer() as HTMLVideoElement;
    if(!playerElement) return null;

    const scaleX = playerElement.clientWidth / playerElement.videoWidth;
    const scaleY = playerElement.clientHeight / playerElement.videoHeight;

    return (
      <div className="absolute inset-0 pointer-events-none">
        <svg className="w-full h-full">
          {detectedObjects.map((box, index) => (
            <g key={index}>
              <rect
                x={box.x * scaleX}
                y={box.y * scaleY}
                width={box.width * scaleX}
                height={box.height * scaleY}
                className="fill-none stroke-green-400 animate-pulse"
                strokeWidth="2"
              />
              <text
                x={box.x * scaleX}
                y={box.y * scaleY - 5}
                className="fill-green-400 text-xs font-mono"
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
    <Card className="h-full overflow-hidden">
      <CardContent className="p-0 relative aspect-video bg-muted/30">
        {!isReady && !error && (
             <div className="absolute inset-0 flex flex-col items-center justify-center text-muted-foreground">
                <Loader className="w-8 h-8 animate-spin mb-2" />
                <p className="text-sm">Loading video...</p>
            </div>
        )}
        {error && (
            <div className="absolute inset-0 flex flex-col items-center justify-center text-destructive p-4">
                <AlertTriangle className="w-8 h-8 mb-2" />
                <p className="text-sm text-center font-medium">{error}</p>
            </div>
        )}
        <ReactPlayer
          ref={playerRef}
          url={feedUrl}
          playing={true}
          loop={true}
          muted={true}
          width="100%"
          height="100%"
          onReady={handleReady}
          onError={handleError}
          config={{
            file: {
              attributes: {
                crossOrigin: 'anonymous'
              }
            }
          }}
          className={isReady ? '' : 'opacity-0'}
        />
        {isReady && renderBoundingBoxes()}
        <canvas ref={canvasRef} className="hidden" />
        {isActive && <Badge className="absolute top-2 left-2">Detection Active</Badge>}
      </CardContent>
    </Card>
  );
};