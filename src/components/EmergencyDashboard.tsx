import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { VideoFeedViewer } from "./VideoFeedViewer";
import { MapView } from "./MapView";
import { useRealtimeData } from "@/hooks/useRealtimeData";
import { useToast } from "@/hooks/use-toast";
import { calculateRoute, startCorridor, stopCorridor } from "@/lib/api";
import { ArrowLeft, Navigation, AlertTriangle, MapPin, Clock, Route } from "lucide-react";
import { cn } from "@/lib/utils";

interface EmergencyDashboardProps {
  onBack: () => void;
}

export const EmergencyDashboard = ({ onBack }: EmergencyDashboardProps) => {
  const [destination, setDestination] = useState("");
  const [routeActive, setRouteActive] = useState(false);
  const [corridorStatus, setCorridorStatus] = useState<'idle' | 'requesting' | 'active'>('idle');
  const [routeData, setRouteData] = useState<any>(null);
  const [emergencyId, setEmergencyId] = useState<string | null>(null);
  
  const { toast } = useToast();
  
  const { 
    intersections, 
    lanes, 
    emergencies, 
    createEmergency, 
    updateEmergency 
  } = useRealtimeData();
  
  // Get active emergencies
  const activeEmergencies = emergencies.filter(e => e.status === 'active');
  
  const handleDestinationSubmit = async () => {
    if (destination.trim()) {
      setCorridorStatus('requesting');
      
      try {
        // Create emergency record
        const emergency = await createEmergency({
          vehicle_id: 'AMB-001',
          priority_level: 1,
          status: 'active',
          destination_latitude: 12.9716,
          destination_longitude: 77.5946
        });
        
        setEmergencyId(emergency?.id || null);
        
        // Calculate route
        const route = await calculateRoute(
          { lat: 12.9716, lng: 77.5946 },
          { lat: 12.9716, lng: 77.5946 }
        );
        
        setRouteData(route);
        
        // Start corridor
        await startCorridor({
          emergency_id: emergency?.id || '',
          route: route
        });
        
        setCorridorStatus('active');
        setRouteActive(true);
      } catch (error) {
        console.error('Failed to create corridor:', error);
        setCorridorStatus('idle');
      }
    }
  };

  const handleSkipDestination = async () => {
    setCorridorStatus('requesting');
    
    try {
      const emergency = await createEmergency({
        vehicle_id: 'AMB-001',
        priority_level: 1,
        status: 'active'
      });
      
      setEmergencyId(emergency?.id || null);
      setCorridorStatus('active');
    } catch (error) {
      console.error('Failed to create emergency:', error);
      setCorridorStatus('idle');
    }
  };

  const handleEndCorridor = async () => {
    if (emergencyId) {
      try {
        await stopCorridor(emergencyId);
        await updateEmergency(emergencyId, { status: 'completed' });
      } catch (error) {
        console.error('Failed to end corridor:', error);
      }
    }
    
    setCorridorStatus('idle');
    setRouteActive(false);
    setDestination("");
    setRouteData(null);
    setEmergencyId(null);
  };

  // Get route intersections for video feeds
  const routeIntersections = routeData?.intersections ? 
    intersections.filter(i => routeData.intersections.includes(i.id)) : [];

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
                <h1 className="text-2xl font-bold text-emergency">Emergency Driver Panel</h1>
                <p className="text-sm text-muted-foreground">Priority green corridor management</p>
              </div>
            </div>
            
            <Badge 
              variant={corridorStatus === 'active' ? 'destructive' : 'secondary'}
              className={corridorStatus === 'active' ? 'emergency-flash' : ''}
            >
              <AlertTriangle className="w-4 h-4 mr-2" />
              {corridorStatus === 'idle' ? 'Standby' : 
               corridorStatus === 'requesting' ? 'Requesting' : 'Corridor Active'}
            </Badge>
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
                  <Navigation className="w-5 h-5 text-emergency" />
                  <span>Emergency Green Corridor</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                {corridorStatus === 'idle' && (
                  <>
                    <div>
                      <h3 className="font-medium mb-3">Option 1: Destination Route</h3>
                      <div className="flex space-x-2">
                        <Input
                          placeholder="Enter destination address..."
                          value={destination}
                          onChange={(e) => setDestination(e.target.value)}
                          className="flex-1"
                        />
                        <Button 
                          onClick={handleDestinationSubmit}
                          disabled={!destination.trim()}
                          variant="destructive"
                        >
                          Request Corridor
                        </Button>
                      </div>
                      <p className="text-xs text-muted-foreground mt-2">
                        System will calculate shortest-time route and activate sequential green signals
                      </p>
                    </div>
                    
                    <div className="border-t pt-4">
                      <h3 className="font-medium mb-3">Option 2: Immediate Priority</h3>
                      <div className="flex items-center space-x-2">
                        <Button 
                          onClick={handleSkipDestination}
                          variant="outline"
                          className="border-emergency text-emergency hover:bg-emergency hover:text-emergency-foreground"
                        >
                          <AlertTriangle className="w-4 h-4 mr-2" />
                          Priority at Current Location
                        </Button>
                      </div>
                      <p className="text-xs text-muted-foreground mt-2">
                        Lane with detected emergency vehicle gets immediate green signal
                      </p>
                    </div>
                  </>
                )}
                
                {corridorStatus === 'requesting' && (
                  <div className="text-center py-8">
                    <div className="w-16 h-16 border-4 border-emergency border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                    <h3 className="font-medium mb-2">Processing Emergency Request</h3>
                    <p className="text-sm text-muted-foreground">
                      {destination ? 'Calculating optimal route...' : 'Detecting current position...'}
                    </p>
                  </div>
                )}
                
                {corridorStatus === 'active' && (
                  <div className="space-y-4">
                    <div className="p-4 bg-emergency/10 border border-emergency/20 rounded">
                      <div className="flex items-center space-x-2 text-emergency mb-2">
                        <AlertTriangle className="w-5 h-5" />
                        <span className="font-medium">Green Corridor Active</span>
                      </div>
                      {routeActive ? (
                        <p className="text-sm">
                          Route to <strong>{destination}</strong> is being cleared. Follow navigation prompts.
                        </p>
                      ) : (
                        <p className="text-sm">
                          Priority green signal activated at current intersection.
                        </p>
                      )}
                    </div>
                    
                    <Button 
                      onClick={handleEndCorridor}
                      variant="outline"
                      className="w-full"
                    >
                      End Emergency Corridor
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
                <CardTitle>Emergency Status</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">Vehicle ID</span>
                    <span className="text-sm font-mono">AMB-001</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">Priority Level</span>
                    <Badge variant="destructive">CRITICAL</Badge>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">Current Location</span>
                    <span className="text-sm">MG Road Junction</span>
                  </div>
                </div>
                
                {routeActive && (
                  <>
                    <div className="border-t pt-4 space-y-3">
                      <h4 className="text-sm font-medium">Route Progress</h4>
                      <div className="space-y-2">
                        <div className="flex justify-between items-center">
                          <span className="text-sm text-muted-foreground">Distance</span>
                          <span className="text-sm font-mono">3.2 km</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-sm text-muted-foreground">ETA</span>
                          <span className="text-sm font-mono text-secondary">4 min</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-sm text-muted-foreground">Signals Cleared</span>
                          <span className="text-sm font-mono">2/5</span>
                        </div>
                      </div>
                      
                      <div className="w-full bg-muted rounded-full h-2">
                        <div className="bg-secondary h-2 rounded-full transition-all duration-1000" style={{width: '40%'}}></div>
                      </div>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Live Map and Route Display */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <MapPin className="w-5 h-5" />
                <span>Emergency Route Map</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {corridorStatus === 'active' && routeData ? (
                <MapView
                  intersections={intersections.filter(i => i.latitude && i.longitude).map(i => ({
                    id: i.id,
                    name: i.name,
                    latitude: i.latitude!,
                    longitude: i.longitude!,
                    hasEmergency: activeEmergencies.some(e => 
                      e.route && Array.isArray(e.route) && e.route.includes(i.id)
                    )
                  }))}
                  emergencyRoutes={activeEmergencies.filter(e => e.id === emergencyId).map(e => ({
                    id: e.id,
                    coordinates: routeData?.route?.map(r => [r.lat, r.lng] as [number, number]) || [],
                    ambulancePosition: [e.source_latitude || 12.9716, e.source_longitude || 77.5946] as [number, number],
                    eta: e.eta_minutes || 5,
                    status: e.status as 'active' | 'completed'
                  }))}
                  onIntersectionClick={() => {}}
                />
              ) : (
                <div className="h-64 bg-muted/30 rounded-lg flex items-center justify-center border-2 border-dashed border-muted-foreground/20">
                  <div className="text-center">
                    <Route className="w-12 h-12 mx-auto mb-3 text-muted-foreground/50" />
                    <p className="text-sm text-muted-foreground">
                      {corridorStatus === 'active' 
                        ? 'Priority intersection with active green signal'
                        : 'Map will display when emergency corridor is activated'
                      }
                    </p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader>
              <CardTitle>Route Intersections</CardTitle>
            </CardHeader>
            <CardContent>
              {routeIntersections.length > 0 ? (
                <div className="space-y-3">
                  {routeIntersections.slice(0, 3).map((intersection) => {
                    const intersectionLanes = lanes.filter(l => l.intersection_id === intersection.id);
                    const hasGreenSignal = intersectionLanes.some(l => l.signal_state === 'green');
                    
                    return (
                      <div key={intersection.id} className="p-3 bg-muted/50 rounded">
                        <div className="flex items-center justify-between">
                          <span className="font-medium text-sm">{intersection.name}</span>
                          <Badge variant={hasGreenSignal ? 'secondary' : 'outline'}>
                            {hasGreenSignal ? 'GREEN' : 'QUEUED'}
                          </Badge>
                        </div>
                        <div className="text-xs text-muted-foreground mt-1">
                          {intersectionLanes.reduce((sum, l) => sum + (l.vehicle_count || 0), 0)} vehicles
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <AlertTriangle className="w-8 h-8 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">No route intersections available</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Route Video Feeds */}
        {corridorStatus === 'active' && routeIntersections.length > 0 && (
          <div className="mt-6">
            <h3 className="text-lg font-medium mb-4">Live Feeds Along Route</h3>
            <div className="space-y-6">
              {routeIntersections.slice(0, 2).map((intersection) => {
                const intersectionLanes = lanes.filter(l => l.intersection_id === intersection.id);
                
                return (
                  <VideoFeedViewer
                    key={intersection.id}
                    intersectionId={intersection.id}
                    intersectionName={intersection.name}
                    lanes={intersectionLanes}
                    isReadOnly={true}
                  />
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};