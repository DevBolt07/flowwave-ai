import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { IntersectionCard } from "./IntersectionCard";
import { TrafficLight } from "./TrafficLight";
import { VideoFeed } from "./VideoFeed";
import { ArrowLeft, Shield, Settings, AlertTriangle, Eye, Zap, Map as MapIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { useRealtimeData } from "@/hooks/useRealtimeData";
import { MapView, MapIntersection } from "./MapView";

interface AuthorityDashboardProps {
  onBack: () => void;
}

export const AuthorityDashboard = ({ onBack }: AuthorityDashboardProps) => {
  const [selectedIntersection, setSelectedIntersection] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'overview' | 'control' | 'config' | 'video' | 'map'>('map');
  
  const { toast } = useToast();
  const {
    intersections,
    lanes,
    emergencies,
    logs,
    loading,
    updateLane,
    createLog,
    getLanesByIntersection,
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


  return (
    <div className="min-h-screen bg-background safe-top">
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
            
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-6">
        {/* Tabs */}
        <div className="flex space-x-1 mb-6 bg-muted p-1 rounded-lg w-fit">
          {[
            { id: 'map', label: 'Live Map', icon: MapIcon },
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
              <span className='hidden md:inline'>{label}</span>
            </Button>
          ))}
        </div>

        {/* Map Tab */}
        {activeTab === 'map' && (
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Traffic System Map View</CardTitle>
              </CardHeader>
              <CardContent>
                <MapView
                  intersections={intersections.map((intersection): MapIntersection => {
                    const intersectionLanes = getLanesByIntersection(intersection.id);
                    const totalVehicles = intersectionLanes.reduce((sum, lane) => sum + (lane.vehicle_count || 0), 0);
                    const hasEmergency = intersectionLanes.some(lane => lane.has_emergency);
                    const greenLanes = intersectionLanes.filter(lane => lane.signal_state === 'green');
                    const signalState = greenLanes.length > 0 ? 'green' : 'red';
                    
                    return {
                      id: intersection.id,
                      name: intersection.name,
                      latitude: intersection.latitude || 0,
                      longitude: intersection.longitude || 0,
                      hasEmergency,
                      signalState,
                      vehicleCount: totalVehicles,
                    };
                  })}
                  onIntersectionClick={(intersection) => {
                    setSelectedIntersection(intersection.id);
                    setActiveTab('overview');
                  }}
                  center={intersections.length > 0 && intersections[0].latitude && intersections[0].longitude
                    ? [intersections[0].latitude, intersections[0].longitude]
                    : [12.9716, 77.5946]}
                  zoom={13}
                  className="h-[600px] w-full rounded-lg overflow-hidden border"
                />
              </CardContent>
            </Card>

            {/* Map Legend */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Map Legend</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="flex items-center space-x-2">
                    <div className="w-4 h-4 rounded-full bg-primary border-2 border-primary-foreground"></div>
                    <span className="text-sm">Intersection</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <div className="w-4 h-4 rounded-full" style={{ backgroundColor: '#22c55e' }}></div>
                    <span className="text-sm">Green Signal</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <div className="w-4 h-4 rounded-full" style={{ backgroundColor: '#ef4444' }}></div>
                    <span className="text-sm">Red Signal</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <div className="w-4 h-4 rounded-full bg-emergency emergency-flash"></div>
                    <span className="text-sm">Emergency Active</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Quick Stats */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <Card>
                <CardContent className="pt-6">
                  <div className="text-center">
                    <div className="text-3xl font-bold text-primary">{intersections.length}</div>
                    <div className="text-sm text-muted-foreground mt-1">Total Intersections</div>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6">
                  <div className="text-center">
                    <div className="text-3xl font-bold text-secondary">
                      {lanes.reduce((sum, lane) => sum + (lane.vehicle_count || 0), 0)}
                    </div>
                    <div className="text-sm text-muted-foreground mt-1">Vehicles Detected</div>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6">
                  <div className="text-center">
                    <div className="text-3xl font-bold text-accent">
                      {lanes.filter(lane => lane.signal_state === 'green').length}
                    </div>
                    <div className="text-sm text-muted-foreground mt-1">Green Signals</div>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6">
                  <div className="text-center">
                    <div className="text-3xl font-bold text-emergency">
                      {activeEmergencies.length}
                    </div>
                    <div className="text-sm text-muted-foreground mt-1">Active Emergencies</div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        )}

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
                      <div className="text-2xl font-bold text-secondary">{lanes.reduce((sum, lane) => sum + (lane.vehicle_count || 0), 0)}</div>
                      <div className="text-xs text-muted-foreground">Vehicles Detected</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-accent">{lanes.length}</div>
                      <div className="text-xs text-muted-foreground">Total Lanes</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-emergency">{activeEmergencies.length}</div>
                      <div className="text-xs text-muted-foreground">Emergency Active</div>
                    </div>
                  </div>
                </CardContent>
              </Card>

            </div>
          </div>
        )}

        {/* Video Tab */}
        {activeTab === 'video' && (
          <div className="space-y-6">
            {/* Intersection Selection */}
            <Card>
              <CardHeader>
                <CardTitle>Video Feed Management</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="mb-4">
                  <label className="text-sm font-medium mb-2 block">Select Intersection</label>
                  <Select value={selectedIntersection || ""} onValueChange={setSelectedIntersection}>
                    <SelectTrigger className="max-w-md">
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
              </CardContent>
            </Card>

            {selectedIntersection && (
              <>
                {/* Live Video Feeds */}
                <Card>
                  <CardHeader>
                    <CardTitle>Live Video Analysis - {selectedIntersectionData?.name}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                      {selectedIntersectionLanes.map((lane) => (
                        <VideoFeed
                          key={lane.id}
                          intersectionId={selectedIntersection}
                          direction={lane.direction as any}
                        />
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </>
            )}
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
                          <div className="text-xs text-muted-foreground mb-2">
                            Vehicles: {lane.vehicle_count || 0} | GST: {lane.gst_time || 0}s
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
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Emergency Override */}
            <Card>
              <CardHeader>
                <CardTitle>Emergency Override</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-3">
                  {activeEmergencies.length > 0 ? (
                    activeEmergencies.map((emergency) => (
                      <div key={emergency.id} className="p-3 bg-emergency/10 border border-emergency/20 rounded-lg">
                        <div className="flex items-center justify-between">
                          <div>
                            <div className="font-medium text-sm">Emergency Vehicle</div>
                            <div className="text-xs text-muted-foreground">Vehicle ID: {emergency.vehicle_id}</div>
                          </div>
                          <Badge variant="destructive">
                            <AlertTriangle className="w-3 h-3 mr-1" />
                            Priority {emergency.priority_level}
                          </Badge>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-6 text-muted-foreground">
                      <AlertTriangle className="w-8 h-8 mx-auto mb-2 opacity-50" />
                      <p className="text-sm">No active emergencies</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Config Tab */}
        {activeTab === 'config' && (
          <Card>
            <CardHeader>
              <CardTitle>System Configuration</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="text-center p-3 bg-muted rounded-lg">
                    <div className="text-lg font-bold text-primary">{intersections.length}</div>
                    <div className="text-xs text-muted-foreground">Active Intersections</div>
                  </div>
                  <div className="text-center p-3 bg-muted rounded-lg">
                    <div className="text-lg font-bold text-secondary">Live</div>
                    <div className="text-xs text-muted-foreground">Video Feeds</div>
                  </div>
                  <div className="text-center p-3 bg-muted rounded-lg">
                    <div className="text-lg font-bold text-accent">{lanes.length}</div>
                    <div className="text-xs text-muted-foreground">Total Lanes</div>
                  </div>
                  <div className="text-center p-3 bg-muted rounded-lg">
                    <div className="text-lg font-bold text-emergency">{activeEmergencies.length}</div>
                    <div className="text-xs text-muted-foreground">Active Emergencies</div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};