import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { TrafficLight } from "./TrafficLight";
import { VideoFeed } from "./VideoFeed";
import { AlertTriangle, Car, Video, Play, Pause } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useState } from "react";

interface Lane {
  id: string;
  direction: string;
  vehicle_count: number;
  current_count: number;
  signal_state: 'red' | 'amber' | 'green';
  gst_time: number;
  has_emergency?: boolean;
}

interface VideoFeedData {
  id: string;
  intersection_id: string;
  lane_no: number;
  feed_url: string;
  is_active: boolean;
}

interface VideoFeedViewerProps {
  intersectionId: string;
  intersectionName: string;
  lanes: Lane[];
  videoFeeds: VideoFeedData[];
  isReadOnly?: boolean;
  showControls?: boolean;
  onDetectionUpdate?: (laneId: string, count: number) => void;
  className?: string;
}

export const VideoFeedViewer = ({ 
  intersectionId, 
  intersectionName, 
  lanes, 
  videoFeeds,
  isReadOnly = false,
  showControls = false,
  onDetectionUpdate,
  className 
}: VideoFeedViewerProps) => {
  const [playingFeeds, setPlayingFeeds] = useState<Record<string, boolean>>({});
  const laneDirections = ['North', 'East', 'South', 'West'] as const;
  type LaneDirection = typeof laneDirections[number];
  const detectionModel: 'yolov8' | 'rt-detr' | 'yolo-nas' | 'pp-yoloe' = 'yolov8';

  const toggleFeedPlayback = (direction: string) => {
    setPlayingFeeds(prev => ({
      ...prev,
      [direction]: !prev[direction]
    }));
  };

  const getVideoFeedForLane = (direction: string) => {
    const laneNo = laneDirections.indexOf(direction as LaneDirection) + 1;
    return videoFeeds.find(feed => 
      feed.intersection_id === intersectionId && 
      feed.lane_no === laneNo && 
      feed.is_active
    );
  };

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
            
            const videoFeed = getVideoFeedForLane(direction);
            const isPlaying = playingFeeds[direction];
            
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
                        <span>{lane?.current_count || lane?.vehicle_count || 0} vehicles</span>
                        {lane?.has_emergency && (
                          <AlertTriangle className="w-3 h-3 text-emergency ml-1" />
                        )}
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    {showControls && videoFeed && (
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => toggleFeedPlayback(direction)}
                      >
                        {isPlaying ? (
                          <Pause className="w-4 h-4" />
                        ) : (
                          <Play className="w-4 h-4" />
                        )}
                      </Button>
                    )}
                    
                    {lane?.signal_state === 'green' && (
                      <Badge variant="secondary" className="text-xs">
                        {lane.gst_time}s
                      </Badge>
                    )}
                  </div>
                </div>

                {/* Video Feed */}
                {videoFeed ? (
                  <VideoFeed
                    intersectionId={intersectionId}
                    direction={direction}
                    feedUrl={videoFeed.feed_url}
                    detectionModel={detectionModel}
                    isActive={!isReadOnly && isPlaying}
                    autoPlay={!isReadOnly}
                    onDetectionUpdate={(results) => {
                      if (onDetectionUpdate && lane) {
                        const vehicleCount = results.bounding_boxes?.length || 0;
                        onDetectionUpdate(lane.id, vehicleCount);
                      }
                    }}
                  />
                ) : (
                  <div className="aspect-video bg-muted rounded-lg flex items-center justify-center">
                    <div className="text-center text-muted-foreground">
                      <Video className="w-8 h-8 mx-auto mb-2" />
                      <p className="text-sm">No video feed available</p>
                      <p className="text-xs">Upload feed for {direction} lane</p>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
};