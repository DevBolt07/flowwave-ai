import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { IntersectionCard } from "./IntersectionCard";
import { TrafficLight } from "./TrafficLight";
import { VideoFeed } from "./VideoFeed";
import { ArrowLeft, Shield, Settings, Play, Square, AlertTriangle, Eye, Car, Zap } from "lucide-react";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { useRealtimeData } from "@/hooks/useRealtimeData";
import { DetectionResult, calculateGST } from "@/lib/api";

interface AuthorityDashboardProps {
  onBack: () => void;
}

export const AuthorityDashboard = ({ onBack }: AuthorityDashboardProps) => {
  const [selectedIntersection, setSelectedIntersection] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'overview' | 'video' | 'control' | 'config'>('overview');
  const [detectionRunning, setDetectionRunning] = useState(true);
  const [detectionModel, setDetectionModel] = useState<'yolov8' | 'rt-detr' | 'yolo-nas' | 'pp-yoloe'>('yolov8');
  const [gstConfig, setGstConfig] = useState({
    min_gst: 10,
    max_gst: 120,
    base_time: 15,
    vehicle_factor: 2.5,
  });
  
  const { toast } = useToast();
  const {
    intersections,
    lanes,
    videoFeeds,
    emergencies,
    logs,
    loading,
    updateLane,
    createLog,
    createVideoFeed,
    updateVideoFeed,
    deleteVideoFeed,
    getLanesByIntersection,
    getVideoFeedsByIntersection,
    getActiveEmergencies,
  } = useRealtimeData();
  
  const selectedIntersectionData = selectedIntersection 
    ? intersections.find(i => i.id === selectedIntersection)
    : null;
    
  const selectedIntersectionLanes = selectedIntersection 
    ? getLanesByIntersection(selectedIntersection)
    : [];
    
  const activeEmergencies = getActiveEmergencies();

  const handleManualOverride = async (laneId: string, action: 'green' | 'red' | 'reset') => {
    if (!selectedIntersection) return;
    
    try {
      let signalState: 'red' | 'green' | 'amber' = 'red';
      if (action === 'green') signalState = 'green';
      else if (action === 'reset') signalState = 'red'; // Reset to auto cycle
      
      await updateLane(laneId, { signal_state: signalState });
      
      // Log the manual override
      await createLog({
        intersection_id: selectedIntersection,
        event_type: 'manual_override',
        message: `Manual override: ${action} signal for lane ${laneId}`,
        metadata: { action, lane_id: laneId },
      });
      
      toast({
        title: "Manual Override",
        description: `${action.charAt(0).toUpperCase() + action.slice(1)} signal command sent`,
        variant: action === 'reset' ? 'default' : 'destructive'
      });
    } catch (error) {
      toast({
        title: "Override Failed",
        description: "Failed to update signal state",
        variant: "destructive",
      });
    }
  };

  const handleDetectionToggle = () => {
    setDetectionRunning(!detectionRunning);
    toast({
      title: detectionRunning ? "Detection Stopped" : "Detection Started", 
      description: detectionRunning ? "AI vehicle detection paused" : "AI vehicle detection active",
      variant: detectionRunning ? 'destructive' : 'default'
    });
  };

  const handleDetectionUpdate = async (intersectionId: string, result: DetectionResult) => {
    try {
      // Update lane counts based on detection results
      const intersection = intersections.find(i => i.id === intersectionId);
      const config = intersection?.config as any;
      
      if (config) {
        // Calculate GST for each lane
        const gstResults = await calculateGST(intersectionId, result.lane_counts, config);
        
        // Update lanes with new counts and GST
        const intersectionLanes = getLanesByIntersection(intersectionId);
        for (const lane of intersectionLanes) {
          const direction = lane.direction.toLowerCase() as keyof typeof result.lane_counts;
          const newCount = result.lane_counts[direction] || 0;
          const gstResult = gstResults.find(g => g.direction === lane.direction);
          
          await updateLane(lane.id, {
            vehicle_count: newCount,
            gst_time: gstResult?.gst_time || lane.gst_time,
          });
        }
        
        // Log detection update
        await createLog({
          intersection_id: intersectionId,
          event_type: 'detection_update',
          message: `Vehicle detection updated: ${result.total_vehicles} total vehicles`,
          metadata: { 
            lane_counts: result.lane_counts, 
            confidence: result.confidence,
            model: detectionModel,
          },
        });
      }
    } catch (error) {
      console.error('Failed to process detection update:', error);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b bg-card">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <Button variant="ghost" size="sm" onClick={onBack}>
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back
              </Button>
              <div>
                <h1 className="text-2xl font-bold text-primary">Traffic Authority Control</h1>
                <p className="text-sm text-muted-foreground">AI-powered traffic management & optimization</p>
              </div>
            </div>
            
            <div className="flex items-center space-x-3">
              <Badge variant={detectionRunning ? 'default' : 'secondary'}>
                <Eye className="w-4 h-4 mr-2" />
                Detection {detectionRunning ? 'Active' : 'Paused'}
              </Badge>
              <Button
                variant={detectionRunning ? 'destructive' : 'default'}
                size="sm"
                onClick={handleDetectionToggle}
              >
                {detectionRunning ? <Square className="w-4 h-4" /> : <Play className="w-4 h-4" />}
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-6">
        {/* Tabs */}
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

        {/* Overview Tab */}
        {activeTab === 'overview' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2">
              <Card>
                <CardHeader>
                  <CardTitle>Live Intersections</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid gap-4">
                    {intersections.map((intersection) => (
                      <div key={intersection.id} className="relative">
                        <div className="p-4 border rounded-lg cursor-pointer hover:bg-muted/50" 
                             onClick={() => setSelectedIntersection(intersection.id)}>
                          <h3 className="font-medium">{intersection.name}</h3>
                          <p className="text-sm text-muted-foreground">{getLanesByIntersection(intersection.id).length} lanes</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>

            <div>
              <Card>
                <CardHeader>
                  <CardTitle>System Stats</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="text-center">
                      <div className="text-2xl font-bold text-primary">{intersections.length}</div>
                      <div className="text-xs text-muted-foreground">Active Intersections</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-secondary">{lanes.reduce((sum, lane) => sum + lane.vehicle_count, 0)}</div>
                      <div className="text-xs text-muted-foreground">Vehicles Detected</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-accent">92%</div>
                      <div className="text-xs text-muted-foreground">Detection Accuracy</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-emergency">{activeEmergencies.length}</div>
                      <div className="text-xs text-muted-foreground">Emergency Active</div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {selectedIntersectionData && (
                <Card className="mt-6">
                  <CardHeader>
                    <CardTitle className="text-base">Detection Feed</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      <div className="aspect-video bg-muted rounded flex items-center justify-center border-2 border-dashed border-muted-foreground/20">
                        <div className="text-center">
                          <Car className="w-8 h-8 mx-auto mb-2 text-muted-foreground/50" />
                          <p className="text-xs text-muted-foreground">Live Detection Feed</p>
                          <p className="text-xs text-muted-foreground">{selectedIntersectionData.name}</p>
                        </div>
                      </div>
                      <div className="text-xs space-y-1">
                        <div className="flex justify-between">
                          <span>Model:</span>
                          <span className="font-mono">{detectionModel.toUpperCase()}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Status:</span>
                          <span className="font-mono">{detectionRunning ? 'Active' : 'Paused'}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Lanes:</span>
                          <span className="font-mono">{selectedIntersectionLanes.length}</span>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          </div>
        )}

        {/* Video Tab */}
        {activeTab === 'video' && selectedIntersectionData && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {selectedIntersectionLanes.map((lane) => (
              <VideoFeed
                key={lane.id}
                intersectionId={selectedIntersection!}
                direction={lane.direction as any}
                onDetectionUpdate={(result) => handleDetectionUpdate(selectedIntersection!, result)}
                detectionModel={detectionModel}
                isActive={detectionRunning}
              />
            ))}
          </div>
        )}

        {/* Control Tab */}
        {activeTab === 'control' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Manual Signal Override</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <label className="text-sm font-medium mb-2 block">Select Intersection</label>
                  <Select value={selectedIntersection || ""} onValueChange={setSelectedIntersection}>
                    <SelectTrigger>
                      <SelectValue placeholder="Choose intersection..." />
                    </SelectTrigger>
                    <SelectContent>
                      {intersections.map((intersection) => (
                        <SelectItem key={intersection.id} value={intersection.id}>
                          {intersection.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                {selectedIntersectionLanes.length > 0 && (
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-3">
                      {selectedIntersectionLanes.map((lane) => (
                        <div key={lane.id} className="p-3 border rounded-lg">
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-sm font-medium">{lane.direction}</span>
                            <TrafficLight signal={lane.signal_state} className="scale-50" />
                          </div>
                          <div className="flex space-x-1">
                            <Button 
                              size="sm" 
                              variant="destructive"
                              className="flex-1 text-xs"
                              onClick={() => handleManualOverride(lane.id, 'red')}
                            >
                              Red
                            </Button>
                            <Button 
                              size="sm" 
                              variant="default"
                              className="flex-1 text-xs bg-secondary hover:bg-secondary/80"
                              onClick={() => handleManualOverride(lane.id, 'green')}
                            >
                              Green
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                    
                    <div className="flex space-x-2 pt-4 border-t">
                      <Button 
                        variant="outline" 
                        className="flex-1"
                        onClick={() => {
                          // Reset all lanes to auto mode
                          selectedIntersectionLanes.forEach(lane => {
                            handleManualOverride(lane.id, 'reset');
                          });
                        }}
                      >
                        Reset to Auto
                      </Button>
                      <Button 
                        variant="destructive"
                        onClick={() => {
                          // Emergency stop all lanes
                          selectedIntersectionLanes.forEach(lane => {
                            handleManualOverride(lane.id, 'red');
                          });
                        }}
                      >
                        <AlertTriangle className="w-4 h-4 mr-2" />
                        Emergency Stop
                      </Button>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Emergency Management</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {activeEmergencies.length > 0 ? (
                  activeEmergencies.map((emergency) => (
                    <div key={emergency.id} className="p-4 bg-emergency/10 border border-emergency/20 rounded">
                      <div className="flex items-center space-x-2 text-emergency mb-2">
                        <AlertTriangle className="w-5 h-5" />
                        <span className="font-medium">Active Emergency</span>
                      </div>
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span>Vehicle ID:</span>
                          <span className="font-mono">{emergency.vehicle_id || 'AMB-001'}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Priority:</span>
                          <Badge variant="destructive">Level {emergency.priority_level}</Badge>
                        </div>
                        <div className="flex justify-between">
                          <span>Status:</span>
                          <Badge variant="destructive">{emergency.status}</Badge>
                        </div>
                        {emergency.eta_minutes && (
                          <div className="flex justify-between">
                            <span>ETA:</span>
                            <span className="font-mono">{emergency.eta_minutes} min</span>
                          </div>
                        )}
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center text-muted-foreground py-4">
                    No active emergencies
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        )}

        {/* Config Tab */}
        {activeTab === 'config' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>GST Configuration</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium mb-2 block">Min GST (seconds)</label>
                    <Input 
                      type="number" 
                      value={gstConfig.min_gst}
                      onChange={(e) => setGstConfig(prev => ({ ...prev, min_gst: Number(e.target.value) }))}
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium mb-2 block">Max GST (seconds)</label>
                    <Input 
                      type="number" 
                      value={gstConfig.max_gst}
                      onChange={(e) => setGstConfig(prev => ({ ...prev, max_gst: Number(e.target.value) }))}
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium mb-2 block">Base Time (seconds)</label>
                    <Input 
                      type="number" 
                      value={gstConfig.base_time}
                      onChange={(e) => setGstConfig(prev => ({ ...prev, base_time: Number(e.target.value) }))}
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium mb-2 block">Vehicle Factor</label>
                    <Input 
                      type="number" 
                      step="0.1" 
                      value={gstConfig.vehicle_factor}
                      onChange={(e) => setGstConfig(prev => ({ ...prev, vehicle_factor: Number(e.target.value) }))}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Detection Settings</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <label className="text-sm font-medium mb-2 block">AI Model Backend</label>
                  <Select value={detectionModel} onValueChange={(value) => setDetectionModel(value as typeof detectionModel)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="yolov8">YOLOv8</SelectItem>
                      <SelectItem value="rt-detr">RT-DETR</SelectItem>
                      <SelectItem value="yolo-nas">YOLO-NAS</SelectItem>
                      <SelectItem value="pp-yoloe">PP-YOLOE</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div>
                  <label className="text-sm font-medium mb-2 block">Detection Status</label>
                  <div className="flex items-center space-x-2">
                    <Button
                      variant={detectionRunning ? 'destructive' : 'default'}
                      size="sm"
                      onClick={handleDetectionToggle}
                    >
                      {detectionRunning ? <Square className="w-4 h-4 mr-2" /> : <Play className="w-4 h-4 mr-2" />}
                      {detectionRunning ? 'Stop Detection' : 'Start Detection'}
                    </Button>
                  </div>
                </div>
                
                <div className="flex space-x-2 pt-4">
                  <Button className="flex-1">Save Configuration</Button>
                  <Button variant="outline">Reset to Default</Button>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
};