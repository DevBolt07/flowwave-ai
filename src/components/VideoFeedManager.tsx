import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { VideoFeed } from './VideoFeed';
import { VideoFeedUploader } from './VideoFeedUploader';
import { supabase } from '@/integrations/supabase/client';
import { Play, Square, Eye, Settings } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface VideoFeedManagerProps {
  intersectionId: string;
  intersectionName: string;
  lanes: Array<{
    id: string;
    direction: string;
    lane_no: number;
    vehicle_count: number | null;
    signal_state: 'red' | 'green' | 'amber' | null;
  }>;
  detectionModel: 'yolov8' | 'rt-detr' | 'yolo-nas' | 'pp-yoloe';
  isDetectionActive: boolean;
  onDetectionUpdate?: (intersectionId: string, result: any) => void;
}

interface VideoFeedData {
  id: string;
  lane_no: number;
  feed_url: string;
  is_active: boolean;
  created_at: string;
}

export const VideoFeedManager = ({
  intersectionId,
  intersectionName,
  lanes,
  detectionModel,
  isDetectionActive,
  onDetectionUpdate
}: VideoFeedManagerProps) => {
  const [videoFeeds, setVideoFeeds] = useState<VideoFeedData[]>([]);
  const [loading, setLoading] = useState(true);
  const [showUploader, setShowUploader] = useState(false);
  
  const { toast } = useToast();

  useEffect(() => {
    loadVideoFeeds();
  }, [intersectionId]);

  const loadVideoFeeds = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('video_feeds')
        .select('*')
        .eq('intersection_id', intersectionId);

      if (error) throw error;
      
      setVideoFeeds(data || []);
    } catch (error) {
      console.error('Failed to load video feeds:', error);
      toast({
        title: "Load Error",
        description: "Failed to load video feeds",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const getFeedForLane = (laneNo: number) => {
    return videoFeeds.find(feed => feed.lane_no === laneNo);
  };

  const toggleFeedStatus = async (feedId: string, currentStatus: boolean) => {
    try {
      const { error } = await supabase
        .from('video_feeds')
        .update({ is_active: !currentStatus })
        .eq('id', feedId);

      if (error) throw error;

      await loadVideoFeeds();
      
      toast({
        title: !currentStatus ? "Feed Activated" : "Feed Deactivated",
        description: `Video feed ${!currentStatus ? 'enabled' : 'disabled'}`,
      });
    } catch (error) {
      console.error('Toggle error:', error);
      toast({
        title: "Update Failed",
        description: "Failed to update feed status",
        variant: "destructive",
      });
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <div className="text-muted-foreground">Loading video feeds...</div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Video Feed Manager</CardTitle>
              <p className="text-sm text-muted-foreground">{intersectionName}</p>
            </div>
            <div className="flex items-center space-x-2">
              <Badge variant={isDetectionActive ? 'default' : 'secondary'}>
                <Eye className="w-4 h-4 mr-2" />
                Detection {isDetectionActive ? 'Active' : 'Inactive'}
              </Badge>
              <Button
                size="sm"
                variant={showUploader ? 'secondary' : 'outline'}
                onClick={() => setShowUploader(!showUploader)}
              >
                <Settings className="w-4 h-4 mr-2" />
                {showUploader ? 'Hide' : 'Manage'} Feeds
              </Button>
            </div>
          </div>
        </CardHeader>
      </Card>

      {showUploader && (
        <VideoFeedUploader 
          intersectionId={intersectionId}
          onUploadComplete={loadVideoFeeds}
        />
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {lanes.map((lane) => {
          const feed = getFeedForLane(lane.lane_no);
          
          return (
            <div key={lane.id} className="space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-medium">Lane {lane.lane_no} - {lane.direction}</h3>
                  <div className="flex items-center space-x-4 text-sm text-muted-foreground">
                    <span>Vehicles: {lane.vehicle_count || 0}</span>
                    <Badge variant={
                      lane.signal_state === 'green' ? 'default' :
                      lane.signal_state === 'amber' ? 'secondary' : 'destructive'
                    } className="text-xs">
                      {lane.signal_state?.toUpperCase() || 'OFF'}
                    </Badge>
                  </div>
                </div>
                {feed && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => toggleFeedStatus(feed.id, feed.is_active)}
                  >
                    {feed.is_active ? <Square className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                  </Button>
                )}
              </div>

              {feed && feed.is_active ? (
                <VideoFeed
                  feedUrl={feed.feed_url}
                  intersectionId={intersectionId}
                  direction={lane.direction as any}
                  onDetectionUpdate={(result) => {
                    onDetectionUpdate?.(intersectionId, result);
                  }}
                  detectionModel={detectionModel}
                  isActive={isDetectionActive}
                />
              ) : (
                <Card>
                  <CardContent className="aspect-video flex items-center justify-center bg-muted/30">
                    <div className="text-center">
                      <Eye className="w-8 h-8 mx-auto mb-2 text-muted-foreground/50" />
                      <p className="text-sm text-muted-foreground">
                        {feed ? 'Feed Inactive' : 'No Video Feed'}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {feed ? 'Click play to activate' : 'Configure a video feed to enable detection'}
                      </p>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};