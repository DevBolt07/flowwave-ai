import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { IntersectionCard } from "./IntersectionCard";
import { TrafficLight } from "./TrafficLight";
import { VideoFeedViewer } from "./VideoFeedViewer";
import { useRealtimeData } from "@/hooks/useRealtimeData";
import { ArrowLeft, MapPin, AlertTriangle, Clock, Car, Video } from "lucide-react";
import { cn } from "@/lib/utils";

interface CitizenDashboardProps {
  onBack: () => void;
}

export const CitizenDashboard = ({ onBack }: CitizenDashboardProps) => {
  const [selectedIntersection, setSelectedIntersection] = useState<string | null>(null);
  const [showVideoFeeds, setShowVideoFeeds] = useState(false);
  
  const { 
    intersections, 
    lanes, 
    emergencies, 
    getVideoFeedsByIntersection,
    loading 
  } = useRealtimeData();

  const totalIntersections = intersections.length;
  const activeEmergencies = emergencies.filter(e => e.status === 'active');
  const emergencyActive = activeEmergencies.length > 0;
  const totalVehicles = lanes.reduce((sum, lane) => sum + (lane.vehicle_count || 0), 0);

  const selectedIntersectionData = selectedIntersection 
    ? intersections.find(i => i.id === selectedIntersection)
    : null;
    
  const selectedIntersectionLanes = selectedIntersection 
    ? lanes.filter(l => l.intersection_id === selectedIntersection)
    : [];

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
                <h1 className="text-2xl font-bold">Citizen Traffic View</h1>
                <p className="text-sm text-muted-foreground">Real-time city traffic monitoring</p>
              </div>
            </div>
            
            {emergencyActive && (
              <Badge variant="destructive" className="emergency-flash">
                <AlertTriangle className="w-4 h-4 mr-2" />
                Emergency Active
              </Badge>
            )}
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-6">
        {/* Stats Overview */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center space-x-2">
                <MapPin className="w-5 h-5 text-primary" />
                <div>
                  <div className="text-2xl font-bold">{totalIntersections}</div>
                  <div className="text-xs text-muted-foreground">Active Intersections</div>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center space-x-2">
                <Car className="w-5 h-5 text-secondary" />
                <div>
                  <div className="text-2xl font-bold">{totalVehicles}</div>
                  <div className="text-xs text-muted-foreground">Total Vehicles</div>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center space-x-2">
                <Clock className="w-5 h-5 text-accent" />
                <div>
                  <div className="text-2xl font-bold">2.3</div>
                  <div className="text-xs text-muted-foreground">Avg Wait (min)</div>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center space-x-2">
                <AlertTriangle className={cn(
                  "w-5 h-5",
                  emergencyActive ? "text-emergency" : "text-muted-foreground"
                )} />
                <div>
                  <div className="text-2xl font-bold">{emergencyActive ? 1 : 0}</div>
                  <div className="text-xs text-muted-foreground">Emergency Events</div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Main Content */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Intersections List */}
          <div className="lg:col-span-2">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <MapPin className="w-5 h-5" />
                  <span>City Intersections</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4">
                  {intersections.map((intersection) => {
                    const intersectionLanes = lanes.filter(l => l.intersection_id === intersection.id);
                    const hasEmergency = activeEmergencies.some(e => 
                      e.route && Array.isArray(e.route) && e.route.includes(intersection.id)
                    );
                    
                    return (
                      <IntersectionCard
                        key={intersection.id}
                        id={intersection.id}
                        name={intersection.name}
                        lanes={intersectionLanes.map(lane => ({
                          id: lane.lane_no,
                          name: lane.direction,
                          vehicleCount: lane.vehicle_count || 0,
                          signal: lane.signal_state as 'red' | 'amber' | 'green',
                          gstTime: lane.gst_time || 0,
                          hasEmergency: lane.has_emergency
                        }))}
                        emergencyActive={hasEmergency}
                        onClick={() => {
                          setSelectedIntersection(intersection.id);
                          setShowVideoFeeds(false);
                        }}
                        className={selectedIntersection === intersection.id ? "ring-2 ring-primary" : ""}
                      />
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Intersection Detail */}
          <div>
            <Card>
              <CardHeader>
                <CardTitle>
                  {selectedIntersectionData ? "Intersection Details" : "Select Intersection"}
                </CardTitle>
              </CardHeader>
              <CardContent>
                {selectedIntersectionData ? (
                  <div className="space-y-4">
                    <div>
                      <h3 className="font-medium mb-2">{selectedIntersectionData.name}</h3>
                      <p className="text-sm text-muted-foreground">
                        ID: {selectedIntersectionData.id}
                      </p>
                    </div>
                    
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <h4 className="text-sm font-medium">Lane Status</h4>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setShowVideoFeeds(!showVideoFeeds)}
                        >
                          <Video className="w-4 h-4 mr-2" />
                          {showVideoFeeds ? 'Hide' : 'Show'} Video Feeds
                        </Button>
                      </div>
                      
                      {selectedIntersectionLanes.map((lane) => (
                        <div key={lane.id} className="flex items-center justify-between p-2 bg-muted/50 rounded">
                          <div className="flex items-center space-x-2">
                            <TrafficLight 
                              signal={lane.signal_state as 'red' | 'amber' | 'green'} 
                              className="scale-50" 
                            />
                            <span className="text-sm font-medium">{lane.direction}</span>
                          </div>
                          <div className="text-right">
                            <div className="text-sm font-medium">{lane.vehicle_count || 0} vehicles</div>
                            {lane.signal_state === 'green' && (
                              <div className="text-xs text-secondary">{lane.gst_time || 0}s remaining</div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                    
                    {activeEmergencies.some(e => 
                      e.route && Array.isArray(e.route) && e.route.includes(selectedIntersectionData.id)
                    ) && (
                      <div className="p-3 bg-emergency/10 border border-emergency/20 rounded">
                        <div className="flex items-center space-x-2 text-emergency">
                          <AlertTriangle className="w-4 h-4" />
                          <span className="text-sm font-medium">Emergency Corridor Active</span>
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">
                          Priority signaling in progress for emergency vehicle
                        </p>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    <MapPin className="w-12 h-12 mx-auto mb-3 opacity-50" />
                    <p className="text-sm">Click on an intersection to view details</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Video Feeds Section */}
        {selectedIntersectionData && showVideoFeeds && (
          <div className="mt-6">
            <VideoFeedViewer
              intersectionId={selectedIntersectionData.id}
              intersectionName={selectedIntersectionData.name}
              lanes={selectedIntersectionLanes}
              videoFeeds={getVideoFeedsByIntersection(selectedIntersectionData.id)}
              isReadOnly={true}
            />
          </div>
        )}
      </div>
    </div>
  );
};