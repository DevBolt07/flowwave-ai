import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { IntersectionCard } from "./IntersectionCard";
import { TrafficLight } from "./TrafficLight";
import { VideoFeed } from "./VideoFeed";
import { EmergencyMap, Hospital } from "./EmergencyMap";
import { ArrowLeft, MapPin, AlertTriangle, Clock, Car, Map as MapIcon, Video } from "lucide-react";
import { cn } from "@/lib/utils";
import { getHospitals, getAmbulances } from "@/lib/supabase-api";
import { useRealtimeData } from "@/hooks/useRealtimeData";

interface CitizenDashboardProps {
  onBack: () => void;
}

// Mock data for intersections
const mockIntersections = [
  {
    id: "int-001",
    name: "MG Road × Brigade Road",
    lanes: [
      { id: 1, name: "North", vehicleCount: 12, signal: 'green' as const, gstTime: 45 },
      { id: 2, name: "South", vehicleCount: 8, signal: 'red' as const, gstTime: 0 },
      { id: 3, name: "East", vehicleCount: 15, signal: 'red' as const, gstTime: 0 },
      { id: 4, name: "West", vehicleCount: 6, signal: 'red' as const, gstTime: 0 }
    ],
    emergencyActive: false
  },
  {
    id: "int-002", 
    name: "Whitefield × ITPL Main",
    lanes: [
      { id: 1, name: "North", vehicleCount: 24, signal: 'red' as const, gstTime: 0 },
      { id: 2, name: "South", vehicleCount: 18, signal: 'amber' as const, gstTime: 5 },
      { id: 3, name: "East", vehicleCount: 9, signal: 'red' as const, gstTime: 0 },
      { id: 4, name: "West", vehicleCount: 14, signal: 'red' as const, gstTime: 0 }
    ],
    emergencyActive: false
  },
  {
    id: "int-003",
    name: "Koramangala × Hosur Road", 
    lanes: [
      { id: 1, name: "North", vehicleCount: 31, signal: 'red' as const, gstTime: 0 },
      { id: 2, name: "South", vehicleCount: 7, signal: 'red' as const, gstTime: 0, hasEmergency: true },
      { id: 3, name: "East", vehicleCount: 19, signal: 'green' as const, gstTime: 28 },
      { id: 4, name: "West", vehicleCount: 12, signal: 'red' as const, gstTime: 0 }
    ],
    emergencyActive: true
  }
];

export const CitizenDashboard = ({ onBack }: CitizenDashboardProps) => {
  const [selectedIntersection, setSelectedIntersection] = useState<string | null>(null);
  const [hospitals, setHospitals] = useState<Hospital[]>([]);
  const [ambulances, setAmbulances] = useState<any[]>([]);
  const { intersections, lanes, getLanesByIntersection, getActiveEmergencies } = useRealtimeData();

  useEffect(() => {
    loadMapData();
  }, []);

  const loadMapData = async () => {
    const [hospitalsData, ambulancesData] = await Promise.all([
      getHospitals(),
      getAmbulances()
    ]);
    setHospitals(hospitalsData as Hospital[]);
    setAmbulances(ambulancesData);
  };
  
  const totalIntersections = intersections.length;
  const activeEmergencies = getActiveEmergencies();
  const emergencyActive = activeEmergencies.length > 0;
  const totalVehicles = lanes.reduce((sum, lane) => sum + (lane.vehicle_count || 0), 0);

  const selectedIntersectionData = selectedIntersection 
    ? intersections.find(i => i.id === selectedIntersection)
    : null;
    
  const selectedIntersectionLanes = selectedIntersection 
    ? getLanesByIntersection(selectedIntersection)
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
        <Tabs defaultValue="intersections" className="space-y-6">
          <TabsList className="grid w-full grid-cols-3 max-w-2xl">
            <TabsTrigger value="intersections">
              <Car className="w-4 h-4 mr-2" />
              Intersections
            </TabsTrigger>
            <TabsTrigger value="video">
              <Video className="w-4 h-4 mr-2" />
              Live Feeds
            </TabsTrigger>
            <TabsTrigger value="map">
              <MapIcon className="w-4 h-4 mr-2" />
              City Map
            </TabsTrigger>
          </TabsList>

          <TabsContent value="intersections">
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
                        const intersectionLanes = getLanesByIntersection(intersection.id);
                        const hasEmergency = intersectionLanes.some(lane => lane.has_emergency);
                        return (
                          <IntersectionCard
                            key={intersection.id}
                            id={intersection.id}
                            name={intersection.name}
                            lanes={intersectionLanes.map((lane, idx) => ({
                              id: idx + 1,
                              name: lane.direction,
                              vehicleCount: lane.vehicle_count || 0,
                              signal: lane.signal_state || 'red',
                              gstTime: lane.gst_time || 0,
                              hasEmergency: lane.has_emergency
                            }))}
                            emergencyActive={hasEmergency}
                            onClick={() => setSelectedIntersection(intersection.id)}
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
                      <h4 className="text-sm font-medium">Lane Status</h4>
                      {selectedIntersectionLanes.map((lane) => (
                        <div key={lane.id} className="flex items-center justify-between p-2 bg-muted/50 rounded">
                          <div className="flex items-center space-x-2">
                            <TrafficLight signal={lane.signal_state || 'red'} className="scale-50" />
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
                    
                    {selectedIntersectionLanes.some(lane => lane.has_emergency) && (
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
          </TabsContent>

          <TabsContent value="video">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Video className="w-5 h-5" />
                  <span>Live Video Feeds</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
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

                {selectedIntersection && selectedIntersectionLanes.length > 0 ? (
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {selectedIntersectionLanes.map((lane) => (
                      <VideoFeed
                        key={lane.id}
                        intersectionId={selectedIntersection}
                        direction={lane.direction as any}
                        readOnly={true}
                      />
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-12 text-muted-foreground">
                    <Video className="w-12 h-12 mx-auto mb-3 opacity-50" />
                    <p className="text-sm">Select an intersection to view live video feeds</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="map">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <MapIcon className="w-5 h-5" />
                  <span>City Traffic & Emergency Services Map</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <EmergencyMap
                  hospitals={hospitals}
                  ambulances={ambulances}
                  center={[12.9716, 77.5946]}
                  zoom={12}
                  className="h-[600px] w-full rounded-lg overflow-hidden border"
                  allowPatientSelection={false}
                  showRoute={false}
                />
                <div className="mt-4 p-4 bg-muted/50 rounded-lg">
                  <h4 className="font-medium mb-2 text-sm">Map Information</h4>
                  <ul className="text-xs text-muted-foreground space-y-1">
                    <li>• View real-time locations of hospitals and ambulances</li>
                    <li>• Green markers indicate available hospitals</li>
                    <li>• Blue markers show active ambulances</li>
                    <li>• Click on markers for detailed information</li>
                  </ul>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};