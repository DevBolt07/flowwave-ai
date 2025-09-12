import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { IntersectionCard } from "./IntersectionCard";
import { TrafficLight } from "./TrafficLight";
import { ArrowLeft, MapPin, AlertTriangle, Clock, Car } from "lucide-react";
import { cn } from "@/lib/utils";
import { useRealtimeData } from "@/hooks/useRealtimeData"; 
import { Skeleton } from "@/components/ui/skeleton"; 
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"; 

interface CitizenDashboardProps {
  onBack: () => void;
}

export const CitizenDashboard = ({ onBack }: CitizenDashboardProps) => {
  const [selectedIntersectionId, setSelectedIntersectionId] = useState<string | null>(null);
  const { intersections, loading, error } = useRealtimeData(); 

  const totalIntersections = intersections.length;
  const emergencyActive = intersections.some(i => i.emergency_active);
  const totalVehicles = intersections.reduce((sum, intersection) =>
    sum + (intersection.lanes?.reduce((laneSum, lane) => laneSum + lane.vehicle_count, 0) ?? 0), 0
  );

  const selectedIntersectionData = selectedIntersectionId
    ? intersections.find(i => i.id === selectedIntersectionId)
    : null;

  if (loading) {
    return (
        <div className="p-6">
            <Skeleton className="h-10 w-1/4 mb-4" />
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
                {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-24" />)}
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2">
                    <Skeleton className="h-96" />
                </div>
                <div>
                    <Skeleton className="h-96" />
                </div>
            </div>
        </div>
    );
  }

  if (error) {
    return (
        <div className="p-6">
             <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertTitle>Error</AlertTitle>
                <AlertDescription>
                    Failed to load real-time traffic data. Please try again later.
                </AlertDescription>
            </Alert>
        </div>
    );
  }


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
                  <div className="text-2xl font-bold">{intersections.filter(i => i.emergency_active).length}</div>
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
                  {intersections.map((intersection) => (
                    <IntersectionCard
                      key={intersection.id}
                      id={intersection.id}
                      name={intersection.name}
                      lanes={intersection.lanes.map(l => ({
                          id: l.id,
                          name: l.name,
                          vehicleCount: l.vehicle_count,
                          signal: l.current_signal_state,
                          gstTime: l.gst,
                      }))}
                      emergencyActive={intersection.emergency_active}
                      onClick={() => setSelectedIntersectionId(intersection.id)}
                      className={selectedIntersectionId === intersection.id ? "ring-2 ring-primary" : ""}
                    />
                  ))}
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
                      <h4 className="text-sm font-medium">Lane Status</h4>
                      {selectedIntersectionData.lanes.map((lane) => (
                        <div key={lane.id} className="flex items-center justify-between p-2 bg-muted/50 rounded">
                          <div className="flex items-center space-x-2">
                            <TrafficLight signal={lane.current_signal_state} className="scale-50" />
                            <span className="text-sm font-medium">{lane.name}</span>
                          </div>
                          <div className="text-right">
                            <div className="text-sm font-medium">{lane.vehicle_count} vehicles</div>
                            {lane.current_signal_state === 'green' && (
                              <div className="text-xs text-secondary">{lane.gst}s remaining</div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>

                    {selectedIntersectionData.emergency_active && (
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
      </div>
    </div>
  );
};