import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { TrafficLight } from "./TrafficLight";
import { VideoFeed } from "./VideoFeed";
import { AlertTriangle, Car, Video } from "lucide-react";
import { cn } from "@/lib/utils";

interface Lane {
  id: string;
  direction: string;
  vehicle_count: number;
  signal_state: 'red' | 'amber' | 'green';
  gst_time: number;
  has_emergency?: boolean;
}

interface VideoFeedViewerProps {
  intersectionId: string;
  intersectionName: string;
  lanes: Lane[];
  isReadOnly?: boolean;
  onDetectionUpdate?: (laneId: string, count: number) => void;
  className?: string;
}

export const VideoFeedViewer = ({ 
  intersectionId, 
  intersectionName, 
  lanes, 
  isReadOnly = false,
  onDetectionUpdate,
  className 
}: VideoFeedViewerProps) => {
  const laneDirections = ['North', 'East', 'South', 'West'] as const;
  type LaneDirection = typeof laneDirections[number];
  const detectionModel: 'yolov8' | 'rt-detr' | 'yolo-nas' | 'pp-yoloe' = 'yolov8';

  return (
    <Card className={cn("", className)}>
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <Video className="w-5 h-5" />
          <span>{intersectionName} - Live Video Feeds</span>
          {isReadOnly && (
            <Badge variant="secondary">Read Only</Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {laneDirections.map((direction: LaneDirection) => {
            const lane = lanes.find(l => 
              l.direction.toLowerCase() === direction.toLowerCase()
            );
            
            return (
              <div key={direction} className="space-y-3">
                {/* Lane Status Header */}
                <div className="flex items-center justify-between p-3 bg-muted/50 rounded">
                  <div className="flex items-center space-x-2">
                    <TrafficLight 
                      signal={lane?.signal_state || 'red'} 
                      countdown={lane?.gst_time || 0}
                      emergency={lane?.has_emergency}
                      className="scale-75"
                    />
                    <div>
                      <div className="font-medium text-sm">{direction} Lane</div>
                      <div className="flex items-center space-x-1 text-xs text-muted-foreground">
                        <Car className="w-3 h-3" />
                        <span>{lane?.vehicle_count || 0} vehicles</span>
                        {lane?.has_emergency && (
                          <AlertTriangle className="w-3 h-3 text-emergency ml-1" />
                        )}
                      </div>
                    </div>
                  </div>
                  
                  {lane?.signal_state === 'green' && (
                    <Badge variant="secondary" className="text-xs">
                      {lane.gst_time}s
                    </Badge>
                  )}
                </div>

                {/* Video Feed */}
                <VideoFeed
                  intersectionId={intersectionId}
                  direction={direction}
                  detectionModel={detectionModel}
                  isActive={!isReadOnly} // Only active for authority users
                  onDetectionUpdate={(results) => {
                    if (onDetectionUpdate && lane) {
                      const vehicleCount = results.bounding_boxes?.length || 0;
                      onDetectionUpdate(lane.id, vehicleCount);
                    }
                  }}
                />
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
};