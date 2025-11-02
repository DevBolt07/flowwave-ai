import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ArrowLeft, Navigation, AlertTriangle, MapPin, Video, Activity, Ambulance } from "lucide-react";
import { VideoFeed } from "./VideoFeed";
import { EmergencyMap, Hospital } from "./EmergencyMap";
import { getHospitals, getAmbulances } from "@/lib/supabase-api";
import { useToast } from "@/hooks/use-toast";
import { useRealtimeData } from "@/hooks/useRealtimeData";
import { useEmergencySimulation } from "@/hooks/useEmergencySimulation";
import { initializeSimulatedAmbulances } from "@/lib/ambulance-simulation";

interface EmergencyDashboardProps {
  onBack: () => void;
}

export const EmergencyDashboard = ({ onBack }: EmergencyDashboardProps) => {
  const [hospitals, setHospitals] = useState<Hospital[]>([]);
  const [ambulances, setAmbulances] = useState<any[]>([]);
  const [selectedIntersection, setSelectedIntersection] = useState<string | null>(null);
  const [simulationInitialized, setSimulationInitialized] = useState(false);
  const { toast } = useToast();
  const { intersections, getLanesByIntersection } = useRealtimeData();
  const { state: emergencyState, startEmergency, endEmergency, useOSRM, setUseOSRM } = useEmergencySimulation();

  useEffect(() => {
    loadMapData();
    initializeSimulation();
  }, []);

  const loadMapData = async () => {
    const [hospitalsData, ambulancesData] = await Promise.all([
      getHospitals(),
      getAmbulances()
    ]);
    setHospitals(hospitalsData as Hospital[]);
    setAmbulances(ambulancesData);
  };

  const initializeSimulation = async () => {
    try {
      const existingAmbulances = await getAmbulances();
      if (!existingAmbulances || existingAmbulances.length < 5) {
        await initializeSimulatedAmbulances(8);
        await loadMapData();
        toast({
          title: "Simulation Initialized",
          description: "8 ambulances deployed in Kothrud, Pune",
        });
      }
      setSimulationInitialized(true);
    } catch (error) {
      console.error('Failed to initialize simulation:', error);
    }
  };
  
  const selectedIntersectionLanes = selectedIntersection 
    ? getLanesByIntersection(selectedIntersection)
    : [];
  
  const handlePatientLocationSelect = async (lat: number, lng: number) => {
    if (emergencyState.isActive) {
      toast({
        title: "Emergency Already Active",
        description: "Please complete the current emergency first",
        variant: "destructive",
      });
      return;
    }

    // Start emergency response
    await startEmergency([lat, lng]);
  };

  const handleEndEmergency = async () => {
    await endEmergency();
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
                <h1 className="text-2xl font-bold text-emergency">Emergency Driver Panel</h1>
                <p className="text-sm text-muted-foreground">Priority green corridor management</p>
              </div>
            </div>
            
            <div className="flex items-center gap-4">
              <Badge 
                variant={emergencyState.isActive ? 'destructive' : 'secondary'}
                className={emergencyState.isActive ? 'emergency-flash' : ''}
              >
                <AlertTriangle className="w-4 h-4 mr-2" />
                {emergencyState.phase === 'idle' ? 'Standby' : 
                 emergencyState.phase === 'dispatching' ? 'Dispatching' : 
                 emergencyState.phase === 'en_route_to_patient' ? 'En Route to Patient' :
                 emergencyState.phase === 'transporting' ? 'Transporting' : 'Active'}
              </Badge>
              
              <div className="text-sm text-muted-foreground">
                Routing: {useOSRM ? 'OSRM' : 'Mock'} 
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={() => setUseOSRM(!useOSRM)}
                  className="ml-2 h-6 text-xs"
                >
                  Switch
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-6">
        {/* Emergency Request Panel */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          <div className="lg:col-span-2">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Activity className="w-5 h-5 text-emergency" />
                  <span>Emergency Response Simulation</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                {emergencyState.phase === 'idle' && (
                  <div>
                    <h3 className="font-medium mb-3">Start Emergency Simulation</h3>
                    <p className="text-sm text-muted-foreground mb-4">
                      Click on the map below to set patient location. The system will:
                    </p>
                    <ul className="text-sm text-muted-foreground space-y-2 mb-4 list-disc list-inside">
                      <li>Find nearest available ambulance</li>
                      <li>Calculate optimal route using {useOSRM ? 'OSRM' : 'mock routing'}</li>
                      <li>Identify nearest hospital</li>
                      <li>Activate green corridor for all signals on route</li>
                      <li>Simulate real-time ambulance movement</li>
                    </ul>
                    
                    {!simulationInitialized && (
                      <div className="p-3 bg-muted rounded-lg text-sm">
                        <Activity className="w-4 h-4 inline mr-2" />
                        Initializing simulation...
                      </div>
                    )}
                  </div>
                )}
                
                {emergencyState.phase === 'dispatching' && (
                  <div className="text-center py-8">
                    <div className="w-16 h-16 border-4 border-emergency border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                    <h3 className="font-medium mb-2">Dispatching Ambulance</h3>
                    <p className="text-sm text-muted-foreground">
                      Finding nearest ambulance and calculating route...
                    </p>
                  </div>
                )}
                
                {emergencyState.isActive && emergencyState.phase !== 'dispatching' && (
                  <div className="space-y-4">
                    <div className="p-4 bg-emergency/10 border border-emergency/20 rounded">
                      <div className="flex items-center space-x-2 text-emergency mb-3">
                        <AlertTriangle className="w-5 h-5" />
                        <span className="font-medium">Green Corridor Active</span>
                      </div>
                      
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Ambulance:</span>
                          <span className="font-mono">{emergencyState.ambulance?.vehicle_id}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Hospital:</span>
                          <span className="font-medium">{emergencyState.hospitalLocation?.name}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Signals Cleared:</span>
                          <span className="font-mono">{emergencyState.affectedSignals.length}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Total Distance:</span>
                          <span className="font-mono">{emergencyState.distanceKm} km</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">ETA:</span>
                          <span className="font-mono text-secondary">{emergencyState.eta} min</span>
                        </div>
                      </div>
                    </div>
                    
                    <Button 
                      onClick={handleEndEmergency}
                      variant="outline"
                      className="w-full"
                    >
                      End Emergency
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Status Panel */}
          <div>
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Ambulance className="w-5 h-5" />
                  Fleet Status
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">Total Ambulances</span>
                    <span className="text-sm font-mono">{ambulances.length}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">Available</span>
                    <span className="text-sm font-mono text-green-600">
                      {ambulances.filter(a => a.status === 'available').length}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">En Route</span>
                    <span className="text-sm font-mono text-amber-600">
                      {ambulances.filter(a => a.status === 'en_route').length}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">Hospitals</span>
                    <span className="text-sm font-mono">{hospitals.length}</span>
                  </div>
                </div>
                
                {emergencyState.isActive && (
                  <>
                    <div className="border-t pt-4 space-y-3">
                      <h4 className="text-sm font-medium">Active Emergency</h4>
                      <div className="space-y-2">
                        <div className="flex justify-between items-center">
                          <span className="text-sm text-muted-foreground">Phase</span>
                          <Badge variant="outline" className="text-xs">
                            {emergencyState.phase.replace(/_/g, ' ')}
                          </Badge>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-sm text-muted-foreground">Route Type</span>
                          <span className="text-xs">{useOSRM ? 'OSRM Real' : 'Simulated'}</span>
                        </div>
                      </div>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Live Emergency Map */}
        <Tabs defaultValue="map" className="space-y-6">
          <TabsList className="grid w-full grid-cols-2 max-w-md">
            <TabsTrigger value="map">
              <MapPin className="w-4 h-4 mr-2" />
              Map
            </TabsTrigger>
            <TabsTrigger value="video">
              <Video className="w-4 h-4 mr-2" />
              Live Feeds
            </TabsTrigger>
          </TabsList>

          <TabsContent value="map">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <MapPin className="w-5 h-5" />
                  <span>Emergency Response Map</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <EmergencyMap
                  hospitals={hospitals}
                  ambulances={ambulances}
                  center={[18.5074, 73.8077]} 
                  zoom={13}
                  className="h-[600px] w-full rounded-lg overflow-hidden border"
                  allowPatientSelection={!emergencyState.isActive}
                  onPatientLocationSelect={handlePatientLocationSelect}
                  emergencyRoute={emergencyState.leg1Route && emergencyState.leg2Route 
                    ? [...emergencyState.leg1Route, ...emergencyState.leg2Route] 
                    : null}
                  affectedSignals={emergencyState.affectedSignals}
                />
              </CardContent>
            </Card>
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
        </Tabs>

        {/* Simulation Info */}
        {emergencyState.affectedSignals.length > 0 && (
          <Card className="mt-6">
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Activity className="w-5 h-5 text-secondary" />
                <span>Green Corridor Details</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div>
                  <div className="text-sm text-muted-foreground mb-2">Affected Traffic Signals</div>
                  <div className="grid grid-cols-2 gap-2">
                    {emergencyState.affectedSignals.map((signal) => (
                      <div key={signal.id} className="p-2 bg-muted rounded text-sm">
                        <div className="font-medium">{signal.name}</div>
                        <Badge variant="outline" className="mt-1 text-xs">
                          Status: GREEN
                        </Badge>
                      </div>
                    ))}
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