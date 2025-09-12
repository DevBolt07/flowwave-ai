import { useState, useEffect, useCallback } from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { VideoFeed } from "@/components/VideoFeed";
import { VideoUpload } from "@/components/VideoUpload";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { ClientOnly } from "@/components/ClientOnly";
import { Car } from 'lucide-react';

interface Intersection {
  id: string;
  name: string;
}

interface VideoFeedData {
  direction: 'North' | 'South' | 'East' | 'West';
  video_url: string;
}

interface DetectionData {
    lane: 'North' | 'South' | 'East' | 'West';
    vehicle_count: number;
}

export const AuthorityDashboard = () => {
  const [intersections, setIntersections] = useState<Intersection[]>([]);
  const [selectedIntersection, setSelectedIntersection] = useState<Intersection | null>(null);
  const [videoFeeds, setVideoFeeds] = useState<Record<string, string | undefined>>({});
  const [detectionData, setDetectionData] = useState<Record<string, number>>({ North: 0, South: 0, East: 0, West: 0 });
  const [totalVehicles, setTotalVehicles] = useState(0);
  const { toast } = useToast();

  useEffect(() => {
      const total = Object.values(detectionData).reduce((sum, count) => sum + count, 0);
      setTotalVehicles(total);
  }, [detectionData]);

  const fetchIntersections = useCallback(async () => {
    const { data, error } = await supabase.from('intersections').select('id, name');
    if (error) {
      console.error("Error fetching intersections:", error);
      toast({ title: "Error", description: "Could not fetch intersection data.", variant: "destructive" });
    } else {
      setIntersections(data as Intersection[]);
      if (data.length > 0) {
        setSelectedIntersection(data[0]);
      }
    }
  }, [toast]);

  useEffect(() => {
    fetchIntersections();
  }, [fetchIntersections]);

  const fetchVideoFeeds = useCallback(async (intersectionId: string) => {
    const { data, error } = await supabase
      .from('video_feeds')
      .select('direction, video_url')
      .eq('intersection_id', intersectionId)
      .eq('is_active', true);

    if (error) {
      console.error("Error fetching video feeds:", error);
      toast({ title: "Error", description: "Could not fetch video feed data.", variant: "destructive" });
      setVideoFeeds({});
    } else {
      const feeds = (data as VideoFeedData[]).reduce((acc, feed) => {
        acc[feed.direction] = feed.video_url;
        return acc;
      }, {} as Record<string, string>);
      setVideoFeeds(feeds);
    }
  }, [toast]);

  useEffect(() => {
    if (selectedIntersection) {
      fetchVideoFeeds(selectedIntersection.id);
    } else {
      setVideoFeeds({});
    }
  }, [selectedIntersection, fetchVideoFeeds]);

  const handleIntersectionChange = (id: string) => {
    const intersection = intersections.find(i => i.id === id) || null;
    setSelectedIntersection(intersection);
    setDetectionData({ North: 0, South: 0, East: 0, West: 0 });
  };

  const handleDetectionUpdate = useCallback((data: DetectionData) => {
      setDetectionData(prev => ({ ...prev, [data.lane]: data.vehicle_count }));
  }, []);
  
  const handleUploadComplete = useCallback(() => {
      if (selectedIntersection) {
          fetchVideoFeeds(selectedIntersection.id);
      }
  }, [selectedIntersection, fetchVideoFeeds]);

  const handleManualOverride = async (direction: 'North' | 'South' | 'East' | 'West', signalState: 'red' | 'green') => {
    if (!selectedIntersection) return;

    console.log(`Manual override for ${direction} to ${signalState}`);

    const { error } = await supabase.from('traffic_signal_state').upsert({
        intersection_id: selectedIntersection.id,
        lane_direction: direction,
        signal_state: signalState,
        last_updated: new Date().toISOString(),
    }, { onConflict: 'intersection_id, lane_direction' });

    if (error) {
        toast({
            title: 'Override Failed',
            description: `Failed to update signal state: ${error.message}`,
            variant: 'destructive',
        });
    } else {
        toast({
            title: 'Override Successful',
            description: `${direction} lane signal has been set to ${signalState}.`,
        });
    }
  };

  return (
    <div className="container mx-auto p-4">
      <header className="flex justify-between items-center mb-4">
        <h1 className="text-2xl font-bold">Authority Dashboard</h1>
        <Card>
          <CardContent className="p-3">
             <div className="flex items-center space-x-2">
                <Car className="h-6 w-6 text-muted-foreground" />
                <div>
                  <div className="text-sm text-muted-foreground">Total Vehicles</div>
                  <div className="text-2xl font-bold">{totalVehicles}</div>
                </div>
            </div>
          </CardContent>
        </Card>
      </header>

      <Card className="mb-4">
        <CardHeader>
          <CardTitle>Intersection Selection</CardTitle>
        </CardHeader>
        <CardContent>
          <Select onValueChange={handleIntersectionChange} value={selectedIntersection?.id || ''}>
            <SelectTrigger>
              <SelectValue placeholder="Select an intersection" />
            </SelectTrigger>
            <SelectContent>
              {intersections.map(intersection => (
                <SelectItem key={intersection.id} value={intersection.id}>{intersection.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      {selectedIntersection && (
        <ClientOnly>
          <Card>
            <CardHeader>
              <CardTitle>Live Video Analysis - {selectedIntersection.name}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {(['North', 'South', 'East', 'West'] as const).map(direction => {
                  const videoUrl = videoFeeds[direction];
                  return (
                    <div key={direction}>
                      {videoUrl ? (
                        <VideoFeed 
                          videoUrl={videoUrl}
                          intersectionId={selectedIntersection.id} 
                          direction={direction} 
                          onDetectionUpdate={handleDetectionUpdate}
                          detectionModel="yolov8n.pt"
                          isActive={true}
                          handleManualOverride={handleManualOverride}
                        />
                      ) : (
                        <VideoUpload
                          intersectionId={selectedIntersection.id}
                          direction={direction}
                          onUploadComplete={handleUploadComplete}
                        />
                      )}
                    </div>
                  )
                })}
              </div>
            </CardContent>
          </Card>
        </ClientOnly>
      )}
    </div>
  );
};