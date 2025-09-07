import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Navigation, AlertTriangle, MapPin, Clock, Route } from "lucide-react";
import { cn } from "@/lib/utils";

interface EmergencyDashboardProps {
  onBack: () => void;
}

export const EmergencyDashboard = ({ onBack }: EmergencyDashboardProps) => {
  const [destination, setDestination] = useState("");
  const [routeActive, setRouteActive] = useState(false);
  const [corridorStatus, setCorridorStatus] = useState<'idle' | 'requesting' | 'active'>('idle');
  
  const handleDestinationSubmit = () => {
    if (destination.trim()) {
      setCorridorStatus('requesting');
      setTimeout(() => {
        setCorridorStatus('active');
        setRouteActive(true);
      }, 2000);
    }
  };

  const handleSkipDestination = () => {
    setCorridorStatus('requesting');
    setTimeout(() => {
      setCorridorStatus('active');
    }, 1500);
  };

  const handleEndCorridor = () => {
    setCorridorStatus('idle');
    setRouteActive(false);
    setDestination("");
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

        {/* Live Map Simulation */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <MapPin className="w-5 h-5" />
              <span>Live Traffic Map</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64 bg-muted/30 rounded-lg flex items-center justify-center border-2 border-dashed border-muted-foreground/20">
              <div className="text-center">
                <Route className="w-12 h-12 mx-auto mb-3 text-muted-foreground/50" />
                <p className="text-sm text-muted-foreground">
                  {corridorStatus === 'active' 
                    ? routeActive 
                      ? `Interactive map showing route to ${destination} with green corridor`
                      : 'Map showing priority intersection with active green signal'
                    : 'Map will display when emergency corridor is activated'
                  }
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};