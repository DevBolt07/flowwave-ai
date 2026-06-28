import { cn } from "@/lib/utils";

interface TrafficLightProps {
  signal: 'red' | 'amber' | 'green';
  countdown?: number;
  emergency?: boolean;
  className?: string;
}

export const TrafficLight = ({ signal, countdown, emergency, className }: TrafficLightProps) => {
  return (
    <div className={cn("flex flex-col items-center space-y-2", className)}>
      <div className="bg-card border-2 border-border rounded-lg p-2 shadow-lg">
        <div className="flex flex-col space-y-1">
          {/* Red Light */}
          <div 
            className={cn(
              "w-6 h-6 rounded-full border-2 transition-all duration-300",
              signal === 'red' 
                ? "bg-traffic-red border-traffic-red signal-glow-red" 
                : "bg-muted border-muted-foreground/20"
            )}
          />
          
          {/* Amber Light */}
          <div 
            className={cn(
              "w-6 h-6 rounded-full border-2 transition-all duration-300",
              signal === 'amber' 
                ? "bg-traffic-amber border-traffic-amber" 
                : "bg-muted border-muted-foreground/20"
            )}
          />
          
          {/* Green Light */}
          <div 
            className={cn(
              "w-6 h-6 rounded-full border-2 transition-all duration-300",
              signal === 'green' 
                ? "bg-traffic-green border-traffic-green signal-glow-green" 
                : "bg-muted border-muted-foreground/20"
            )}
          />
        </div>
      </div>
      
      {/* Countdown Timer */}
      {countdown !== undefined && (
        <div className={cn(
          "text-xs font-mono font-bold px-2 py-1 rounded",
          signal === 'red' ? "bg-destructive text-destructive-foreground" :
          signal === 'amber' ? "bg-accent text-accent-foreground" :
          "bg-secondary text-secondary-foreground"
        )}>
          {countdown}s
        </div>
      )}
      
      {/* Emergency Indicator */}
      {emergency && (
        <div className="emergency-flash bg-emergency text-emergency-foreground text-xs font-bold px-2 py-1 rounded">
          EMERGENCY
        </div>
      )}
    </div>
  );
};