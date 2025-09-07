import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { TrafficLight } from "./TrafficLight";
import { AlertTriangle, Car, Truck, Bike } from "lucide-react";
import { cn } from "@/lib/utils";

interface LaneData {
  id: number;
  name: string;
  vehicleCount: number;
  signal: 'red' | 'amber' | 'green';
  gstTime: number;
  hasEmergency?: boolean;
}

interface IntersectionCardProps {
  id: string;
  name: string;
  lanes: LaneData[];
  emergencyActive?: boolean;
  className?: string;
  onClick?: () => void;
}

export const IntersectionCard = ({ 
  id, 
  name, 
  lanes, 
  emergencyActive, 
  className,
  onClick 
}: IntersectionCardProps) => {
  const totalVehicles = lanes.reduce((sum, lane) => sum + lane.vehicleCount, 0);
  const activeLane = lanes.find(lane => lane.signal === 'green');

  return (
    <Card 
      className={cn(
        "cursor-pointer transition-all duration-300 hover:shadow-lg",
        emergencyActive && "border-emergency bg-emergency/5",
        className
      )}
      onClick={onClick}
    >
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium">{name}</CardTitle>
          {emergencyActive && (
            <Badge variant="destructive" className="emergency-flash">
              <AlertTriangle className="w-3 h-3 mr-1" />
              EMERGENCY
            </Badge>
          )}
        </div>
        <div className="flex items-center space-x-2 text-xs text-muted-foreground">
          <Car className="w-3 h-3" />
          <span>{totalVehicles} vehicles</span>
        </div>
      </CardHeader>
      
      <CardContent className="pt-0">
        <div className="grid grid-cols-2 gap-3">
          {lanes.map((lane) => (
            <div key={lane.id} className="flex items-center space-x-2">
              <TrafficLight 
                signal={lane.signal} 
                countdown={lane.gstTime}
                emergency={lane.hasEmergency}
                className="scale-75"
              />
              <div className="flex-1 min-w-0">
                <div className="text-xs font-medium truncate">{lane.name}</div>
                <div className="flex items-center space-x-1 text-xs text-muted-foreground">
                  <div className="flex items-center space-x-1">
                    <Car className="w-3 h-3" />
                    <span>{lane.vehicleCount}</span>
                  </div>
                  {lane.hasEmergency && (
                    <AlertTriangle className="w-3 h-3 text-emergency" />
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
        
        {activeLane && (
          <div className="mt-3 pt-3 border-t">
            <div className="text-xs text-muted-foreground">
              Active: <span className="font-medium text-secondary">{activeLane.name}</span>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};