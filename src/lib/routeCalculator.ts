// Route calculation utilities for emergency corridors
export interface RoutePoint {
  lat: number;
  lng: number;
}

export interface RouteSegment {
  start: RoutePoint;
  end: RoutePoint;
  distance: number; // in meters
  duration: number; // in seconds
  intersectionIds: string[];
}

export interface CalculatedRoute {
  points: RoutePoint[];
  segments: RouteSegment[];
  totalDistance: number;
  totalDuration: number;
  intersectionIds: string[];
}

// Mock route calculation - in production, use Google Maps Directions API or similar
export const calculateEmergencyRoute = async (
  source: RoutePoint,
  destination: RoutePoint,
  intersections: Array<{ id: string; latitude?: number; longitude?: number; }>
): Promise<CalculatedRoute> => {
  // Simple straight-line route for demo purposes
  // In production, integrate with routing service
  const points = [source, destination];
  
  // Calculate distance using Haversine formula
  const distance = calculateDistance(source, destination);
  const duration = Math.round(distance / 16.67); // Assuming 60 km/h average speed
  
  // Find intersections along the route (simplified)
  const routeIntersections = intersections.filter(intersection => {
    if (!intersection.latitude || !intersection.longitude) return false;
    
    const distanceFromRoute = calculateDistanceToLine(
      { lat: intersection.latitude, lng: intersection.longitude },
      source,
      destination
    );
    
    return distanceFromRoute < 500; // Within 500m of route
  });

  return {
    points,
    segments: [{
      start: source,
      end: destination,
      distance,
      duration,
      intersectionIds: routeIntersections.map(i => i.id)
    }],
    totalDistance: distance,
    totalDuration: duration,
    intersectionIds: routeIntersections.map(i => i.id)
  };
};

// Haversine formula for distance calculation
const calculateDistance = (point1: RoutePoint, point2: RoutePoint): number => {
  const R = 6371000; // Earth's radius in meters
  const φ1 = (point1.lat * Math.PI) / 180;
  const φ2 = (point2.lat * Math.PI) / 180;
  const Δφ = ((point2.lat - point1.lat) * Math.PI) / 180;
  const Δλ = ((point2.lng - point1.lng) * Math.PI) / 180;

  const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c;
};

// Calculate distance from point to line
const calculateDistanceToLine = (
  point: RoutePoint,
  lineStart: RoutePoint,
  lineEnd: RoutePoint
): number => {
  const A = point.lat - lineStart.lat;
  const B = point.lng - lineStart.lng;
  const C = lineEnd.lat - lineStart.lat;
  const D = lineEnd.lng - lineStart.lng;

  const dot = A * C + B * D;
  const lenSq = C * C + D * D;
  let param = -1;
  
  if (lenSq !== 0) {
    param = dot / lenSq;
  }

  let xx, yy;

  if (param < 0) {
    xx = lineStart.lat;
    yy = lineStart.lng;
  } else if (param > 1) {
    xx = lineEnd.lat;
    yy = lineEnd.lng;
  } else {
    xx = lineStart.lat + param * C;
    yy = lineStart.lng + param * D;
  }

  return calculateDistance(point, { lat: xx, lng: yy });
};

// Animate vehicle movement along route
export class VehicleAnimator {
  private intervalId?: NodeJS.Timeout;
  private currentSegmentIndex = 0;
  private segmentProgress = 0;
  private isRunning = false;

  constructor(
    private route: CalculatedRoute,
    private onPositionUpdate: (position: RoutePoint, progress: number) => void,
    private onIntersectionReached?: (intersectionId: string) => void,
    private speed: number = 50 // km/h
  ) {}

  start() {
    if (this.isRunning) return;
    
    this.isRunning = true;
    this.currentSegmentIndex = 0;
    this.segmentProgress = 0;

    this.intervalId = setInterval(() => {
      this.updatePosition();
    }, 100); // Update every 100ms
  }

  stop() {
    this.isRunning = false;
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = undefined;
    }
  }

  private updatePosition() {
    if (this.currentSegmentIndex >= this.route.segments.length) {
      this.stop();
      return;
    }

    const segment = this.route.segments[this.currentSegmentIndex];
    const progressIncrement = (this.speed / 3.6) * 0.1 / segment.distance; // Convert km/h to m/s, then to progress per 100ms
    
    this.segmentProgress += progressIncrement;

    if (this.segmentProgress >= 1) {
      // Reached end of segment, check for intersections
      if (this.onIntersectionReached) {
        segment.intersectionIds.forEach(id => this.onIntersectionReached?.(id));
      }
      
      this.currentSegmentIndex++;
      this.segmentProgress = 0;
      
      if (this.currentSegmentIndex >= this.route.segments.length) {
        this.stop();
        return;
      }
    }

    // Interpolate position
    const currentSegment = this.route.segments[this.currentSegmentIndex];
    const position = this.interpolatePosition(
      currentSegment.start,
      currentSegment.end,
      this.segmentProgress
    );

    const overallProgress = (this.currentSegmentIndex + this.segmentProgress) / this.route.segments.length;
    this.onPositionUpdate(position, overallProgress);
  }

  private interpolatePosition(start: RoutePoint, end: RoutePoint, progress: number): RoutePoint {
    return {
      lat: start.lat + (end.lat - start.lat) * progress,
      lng: start.lng + (end.lng - start.lng) * progress
    };
  }
}