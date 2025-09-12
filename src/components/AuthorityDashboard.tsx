import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { IntersectionCard } from "./IntersectionCard";
import { TrafficLight } from "./TrafficLight";
import { VideoFeed } from "./VideoFeed";
import { VideoFeedUploader } from "./VideoFeedUploader";
import { ArrowLeft, Shield, Settings, Play, Square, AlertTriangle, Eye, Car, Zap } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useRealtimeData } from "@/hooks/useRealtimeData";
import { DetectionResult, calculateGST } from "@/lib/api";
import { supabase } from "@/integrations/supabase/client";

interface AuthorityDashboardProps {
  onBack: () => void;
}

interface VideoFeedData {
  id: string;
  lane_no: number;
  feed_url: string;
}

export const AuthorityDashboard = ({ onBack }: AuthorityDashboardProps) => {
  const [selectedIntersection, setSelectedIntersection] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'overview' | 'control' | 'config' | 'video'>('overview');
  const [detectionRunning, setDetectionRunning] = useState(true);
  const [detectionModel, setDetectionModel] = useState<'yolov8' | 'rt-detr' | 'yolo-nas' | 'pp-yoloe'>('yolov8');
  const [videoFeeds, setVideoFeeds] = useState<VideoFeedData[]>([]);
  
  const { toast } = useToast();
  const {
    intersections,
    lanes,
    getActiveEmergencies,
    getLanesByIntersection,
    updateLane,
    createLog,
  } = useRealtimeData();
  
  const selectedIntersectionData = selectedIntersection 
    ? intersections.find(i => i.id === selectedIntersection)
    : null;
    
  const selectedIntersectionLanes = selectedIntersection 
    ? getLanesByIntersection(selectedIntersection)
    : [];
     
  const activeEmergencies = getActiveEmergencies();

  const fetchVideoFeeds = async (intersectionId: string) => {
    try {
      const { data, error } = await supabase
        .from('video_feeds')
        .select('id, lane_no, feed_url')
        .eq('intersection_id', intersectionId);

      if (error) throw error;
      setVideoFeeds(data || []);
    } catch (error) {
      console.error("Error fetching video feeds:", error);
      toast({ title: "Error", description: "Could not load video feeds.", variant: "destructive" });
    }
  };

  useEffect(() => {
    if (selectedIntersection) {
      fetchVideoFeeds(selectedIntersection);
    }
  }, [selectedIntersection]);

  const handleManualOverride = async (laneId: string, action: 'green' | 'red') => {
    if (!selectedIntersection) return;
    await updateLane(laneId, { signal_state: action });
    await createLog({
        intersection_id: selectedIntersection,
        event_type: 'manual_override',
        message: `Signal for lane ${laneId} manually set to ${action}`,
    });
    toast({ title: "Manual Override", description: `Signal set to ${action}.` });
  };

  const handleDetectionToggle = () => setDetectionRunning(!detectionRunning);

  const handleDetectionUpdate = async (intersectionId: string, result: DetectionResult) => {
    // This function can be further developed for real-time analytics
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <Button variant="ghost" size="sm" onClick={onBack}>
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back
            </Button>
            <div>
              <h1 className="text-2xl font-bold text-primary">Traffic Authority Control</h1>
              <p className="text-sm text-muted-foreground">AI-powered traffic management</p>
            </div>
          </div>
          <div className="flex items-center space-x-3">
            <Badge variant={detectionRunning ? 'default' : 'secondary'}>
              <Eye className="w-4 h-4 mr-2" />
              Detection {detectionRunning ? 'Active' : 'Paused'}
            </Badge>
            <Button size="sm" onClick={handleDetectionToggle} variant={detectionRunning ? 'destructive' : 'default'}>
              {detectionRunning ? <Square className="w-4 h-4" /> : <Play className="w-4 h-4" />}
            </Button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-6">
        <div className="flex space-x-1 mb-6 bg-muted p-1 rounded-lg w-fit">
          {[
            { id: 'overview', label: 'System Overview', icon: Shield },
            { id: 'video', label: 'Live Video Feeds', icon: Eye },
            { id: 'control', label: 'Manual Control', icon: Zap },
            { id: 'config', label: 'Configuration', icon: Settings }
          ].map(({ id, label, icon: Icon }) => (
            <Button
              key={id}
              variant={activeTab === id ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setActiveTab(id as typeof activeTab)}
              className="flex items-center space-x-2"
            >
              <Icon className="w-4 h-4" />
              <span>{label}</span>
            </Button>
          ))}
        </div>

        {activeTab === 'video' && (
          <div className="space-y-6">
            <Card>
              <CardHeader><CardTitle>Video Feed Management</CardTitle></CardHeader>
              <CardContent>
                <div className="mb-4">
                  <label className="text-sm font-medium mb-2 block">Select Intersection</label>
                  <Select value={selectedIntersection || ""} onValueChange={setSelectedIntersection}>
                    <SelectTrigger className="max-w-md">
                      <SelectValue placeholder="Choose intersection..." />
                    </SelectTrigger>
                    <SelectContent>
                      {intersections.map((i) => <SelectItem key={i.id} value={i.id}>{i.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>

            {selectedIntersection && (
              <>
                <VideoFeedUploader 
                  intersectionId={selectedIntersection}
                  onUploadComplete={() => fetchVideoFeeds(selectedIntersection)}
                />
                <Card>
                  <CardHeader><CardTitle>Live Video Analysis - {selectedIntersectionData?.name}</CardTitle></CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                      {selectedIntersectionLanes.map((lane) => {
                        const feed = videoFeeds.find(f => f.lane_no === lane.lane_no);
                        return (
                          <VideoFeed
                            key={lane.id}
                            intersectionId={selectedIntersection}
                            direction={lane.direction as any}
                            videoUrl={feed?.feed_url}
                            onDetectionUpdate={(result) => handleDetectionUpdate(selectedIntersection, result)}
                            detectionModel={detectionModel}
                            isActive={detectionRunning}
                          />
                        );
                      })}
                    </div>
                  </CardContent>
                </Card>
              </>
            )}
          </div>
        )}

        {/* Other tabs like Overview, Control, Config would be here */}

      </main>
    </div>
  );
};
