// Ambulance Simulation System
// Manages ambulance entities, their positions, and real-time movement

import { supabase } from '@/integrations/supabase/client';

export type AmbulanceStatus = 'available' | 'en_route' | 'at_scene' | 'transporting' | 'returning';

export interface SimulatedAmbulance {
  id: string;
  vehicle_id: string;
  status: AmbulanceStatus;
  current_latitude: number;
  current_longitude: number;
  hospital_id?: string;
  driver_id?: string;
  speed_kmh?: number; // Current speed
  heading?: number; // Direction in degrees
}

export interface AmbulanceMovement {
  ambulance_id: string;
  route: [number, number][]; // Array of [lat, lng] waypoints
  current_waypoint_index: number;
  progress: number; // 0 to 1
  eta_seconds: number;
}

/**
 * Initialize simulated ambulances for Pune (Kothrud area)
 */
export async function initializeSimulatedAmbulances(count: number = 8): Promise<void> {
  // Kothrud, Pune coordinates (centered around 18.5074, 73.8077)
  const baseCoords = {
    lat: 18.5074,
    lng: 73.8077,
  };
  
  const ambulances: Partial<SimulatedAmbulance>[] = [];
  
  for (let i = 0; i < count; i++) {
    // Distribute ambulances in a ~5km radius
    const angle = (i / count) * 2 * Math.PI;
    const radius = 0.02 + Math.random() * 0.03; // Roughly 2-5 km
    
    ambulances.push({
      vehicle_id: `AMB-${String(i + 1).padStart(3, '0')}`,
      status: 'available',
      current_latitude: baseCoords.lat + radius * Math.cos(angle),
      current_longitude: baseCoords.lng + radius * Math.sin(angle),
      speed_kmh: 0,
      heading: 0,
    });
  }
  
  // Insert ambulances into database
  const { error } = await supabase
    .from('ambulances')
    .upsert(ambulances as any, { onConflict: 'vehicle_id' });
  
  if (error) {
    console.error('Error initializing ambulances:', error);
    throw error;
  }
  
  console.log(`Initialized ${count} simulated ambulances in Kothrud, Pune`);
}

/**
 * Find the nearest available ambulance to a location
 */
export async function findNearestAvailableAmbulance(
  location: [number, number]
): Promise<SimulatedAmbulance | null> {
  const { data: ambulances, error } = await supabase
    .from('ambulances')
    .select('*')
    .eq('status', 'available');
  
  if (error || !ambulances || ambulances.length === 0) {
    console.error('Error fetching ambulances:', error);
    return null;
  }
  
  // Calculate distances and find nearest
  let nearest: SimulatedAmbulance | null = null;
  let minDistance = Infinity;
  
  for (const ambulance of ambulances) {
    if (!ambulance.current_latitude || !ambulance.current_longitude) continue;
    
    const distance = calculateDistance(
      [ambulance.current_latitude, ambulance.current_longitude],
      location
    );
    
    if (distance < minDistance) {
      minDistance = distance;
      nearest = ambulance as SimulatedAmbulance;
    }
  }
  
  return nearest;
}

/**
 * Update ambulance status
 */
export async function updateAmbulanceStatus(
  ambulanceId: string,
  status: AmbulanceStatus
): Promise<void> {
  const { error } = await supabase
    .from('ambulances')
    .update({ status, last_updated: new Date().toISOString() })
    .eq('id', ambulanceId);
  
  if (error) {
    console.error('Error updating ambulance status:', error);
    throw error;
  }
}

/**
 * Update ambulance location
 */
export async function updateAmbulanceLocation(
  ambulanceId: string,
  location: [number, number],
  heading?: number,
  speed?: number
): Promise<void> {
  const updates: any = {
    current_latitude: location[0],
    current_longitude: location[1],
    last_updated: new Date().toISOString(),
  };
  
  const { error } = await supabase
    .from('ambulances')
    .update(updates)
    .eq('id', ambulanceId);
  
  if (error) {
    console.error('Error updating ambulance location:', error);
    throw error;
  }
}

/**
 * Simulate ambulance movement along a route
 */
export class AmbulanceSimulator {
  private movements: Map<string, AmbulanceMovement> = new Map();
  private intervalId: NodeJS.Timeout | null = null;
  private updateInterval = 1000; // Update every 1 second
  
  /**
   * Start moving an ambulance along a route
   */
  startMovement(
    ambulanceId: string,
    route: [number, number][],
    speedKmh: number = 50
  ): void {
    if (route.length < 2) {
      console.error('Route must have at least 2 points');
      return;
    }
    
    const totalDistance = this.calculateRouteDistance(route);
    const etaSeconds = (totalDistance / speedKmh) * 3600;
    
    this.movements.set(ambulanceId, {
      ambulance_id: ambulanceId,
      route,
      current_waypoint_index: 0,
      progress: 0,
      eta_seconds: etaSeconds,
    });
    
    // Start simulation if not already running
    if (!this.intervalId) {
      this.startSimulation();
    }
  }
  
  /**
   * Stop movement for an ambulance
   */
  stopMovement(ambulanceId: string): void {
    this.movements.delete(ambulanceId);
    
    // Stop simulation if no more movements
    if (this.movements.size === 0 && this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
  }
  
  /**
   * Get current position of moving ambulance
   */
  getCurrentPosition(ambulanceId: string): [number, number] | null {
    const movement = this.movements.get(ambulanceId);
    if (!movement) return null;
    
    const { route, current_waypoint_index, progress } = movement;
    
    if (current_waypoint_index >= route.length - 1) {
      return route[route.length - 1];
    }
    
    const start = route[current_waypoint_index];
    const end = route[current_waypoint_index + 1];
    
    // Interpolate between waypoints
    const lat = start[0] + (end[0] - start[0]) * progress;
    const lng = start[1] + (end[1] - start[1]) * progress;
    
    return [lat, lng];
  }
  
  private startSimulation(): void {
    this.intervalId = setInterval(() => {
      this.updateMovements();
    }, this.updateInterval);
  }
  
  private async updateMovements(): Promise<void> {
    for (const [ambulanceId, movement] of this.movements.entries()) {
      const { route, current_waypoint_index, progress, eta_seconds } = movement;
      
      // Calculate progress increment (distance covered in this interval)
      const incrementPerSecond = 1 / eta_seconds;
      const newProgress = progress + incrementPerSecond * (this.updateInterval / 1000);
      
      if (newProgress >= 1) {
        // Move to next waypoint
        const newIndex = current_waypoint_index + 1;
        
        if (newIndex >= route.length - 1) {
          // Route completed
          await updateAmbulanceLocation(ambulanceId, route[route.length - 1]);
          this.stopMovement(ambulanceId);
          continue;
        }
        
        movement.current_waypoint_index = newIndex;
        movement.progress = 0;
      } else {
        movement.progress = newProgress;
      }
      
      // Update ambulance location in database
      const currentPos = this.getCurrentPosition(ambulanceId);
      if (currentPos) {
        await updateAmbulanceLocation(ambulanceId, currentPos);
      }
    }
  }
  
  private calculateRouteDistance(route: [number, number][]): number {
    let distance = 0;
    for (let i = 0; i < route.length - 1; i++) {
      distance += calculateDistance(route[i], route[i + 1]);
    }
    return distance;
  }
}

/**
 * Calculate distance between two points (Haversine formula) in km
 */
function calculateDistance(
  point1: [number, number],
  point2: [number, number]
): number {
  const R = 6371; // Earth's radius in km
  const dLat = ((point2[0] - point1[0]) * Math.PI) / 180;
  const dLon = ((point2[1] - point1[1]) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((point1[0] * Math.PI) / 180) *
      Math.cos((point2[0] * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

// Export singleton simulator instance
export const ambulanceSimulator = new AmbulanceSimulator();
