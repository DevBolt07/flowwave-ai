// Green Corridor Management System
// Handles identification of traffic signals on route and dynamic signal control

import { supabase } from '@/integrations/supabase/client';

export interface TrafficSignal {
  id: string;
  intersection_id: string;
  name: string;
  latitude: number;
  longitude: number;
  current_state: 'red' | 'green' | 'amber';
}

export interface GreenCorridorConfig {
  emergency_id: string;
  ambulance_id: string;
  route: [number, number][];
  affected_signals: TrafficSignal[];
  activation_distance: number; // Distance in meters before signal to activate green
}

/**
 * Identify all traffic signals along a route
 * @param route - Array of [lat, lng] coordinates
 * @param bufferMeters - Distance buffer around route to search for signals
 */
export async function identifySignalsOnRoute(
  route: [number, number][],
  bufferMeters: number = 100
): Promise<TrafficSignal[]> {
  // Fetch all intersections from database
  const { data: intersections, error } = await supabase
    .from('intersections')
    .select('id, name, latitude, longitude');
  
  if (error || !intersections) {
    console.error('Error fetching intersections:', error);
    return [];
  }
  
  const signalsOnRoute: TrafficSignal[] = [];
  const bufferKm = bufferMeters / 1000;
  
  // Check each intersection to see if it's near the route
  for (const intersection of intersections) {
    if (!intersection.latitude || !intersection.longitude) continue;
    
    const isNearRoute = route.some(point => {
      const distance = calculateDistance(
        [intersection.latitude, intersection.longitude],
        point
      );
      return distance <= bufferKm;
    });
    
    if (isNearRoute) {
      // Get current signal state from lanes
      const { data: lanes } = await supabase
        .from('lanes')
        .select('signal_state')
        .eq('intersection_id', intersection.id)
        .limit(1)
        .single();
      
      signalsOnRoute.push({
        id: intersection.id,
        intersection_id: intersection.id,
        name: intersection.name,
        latitude: intersection.latitude,
        longitude: intersection.longitude,
        current_state: lanes?.signal_state || 'red',
      });
    }
  }
  
  // Sort signals by their order along the route
  return sortSignalsByRouteOrder(signalsOnRoute, route);
}

/**
 * Sort signals in the order they appear along the route
 */
function sortSignalsByRouteOrder(
  signals: TrafficSignal[],
  route: [number, number][]
): TrafficSignal[] {
  return signals.sort((a, b) => {
    const aIndex = findClosestRoutePoint([a.latitude, a.longitude], route);
    const bIndex = findClosestRoutePoint([b.latitude, b.longitude], route);
    return aIndex - bIndex;
  });
}

/**
 * Find the index of the closest point on route to a given location
 */
function findClosestRoutePoint(
  location: [number, number],
  route: [number, number][]
): number {
  let minDistance = Infinity;
  let closestIndex = 0;
  
  for (let i = 0; i < route.length; i++) {
    const distance = calculateDistance(location, route[i]);
    if (distance < minDistance) {
      minDistance = distance;
      closestIndex = i;
    }
  }
  
  return closestIndex;
}

/**
 * Activate green corridor - turn all signals on route to green
 */
export async function activateGreenCorridor(
  emergencyId: string,
  signals: TrafficSignal[]
): Promise<void> {
  console.log(`Activating green corridor for emergency ${emergencyId} with ${signals.length} signals`);
  
  // Update all lanes at these intersections to green
  for (const signal of signals) {
    const { error } = await supabase
      .from('lanes')
      .update({ 
        signal_state: 'green',
        has_emergency: true 
      })
      .eq('intersection_id', signal.intersection_id);
    
    if (error) {
      console.error(`Error activating signal ${signal.name}:`, error);
    } else {
      console.log(`✓ Signal ${signal.name} set to GREEN`);
    }
    
    // Log the signal change
    await supabase.from('logs').insert({
      intersection_id: signal.intersection_id,
      emergency_id: emergencyId,
      event_type: 'green_corridor',
      message: `Green corridor activated at ${signal.name}`,
      metadata: {
        emergency_id: emergencyId,
        signal_name: signal.name,
        previous_state: signal.current_state,
        new_state: 'green',
      },
    });
  }
}

/**
 * Deactivate green corridor - restore normal signal operation
 */
export async function deactivateGreenCorridor(
  emergencyId: string,
  signals: TrafficSignal[]
): Promise<void> {
  console.log(`Deactivating green corridor for emergency ${emergencyId}`);
  
  for (const signal of signals) {
    // Reset to red (normal operation will take over)
    const { error } = await supabase
      .from('lanes')
      .update({ 
        signal_state: 'red',
        has_emergency: false 
      })
      .eq('intersection_id', signal.intersection_id);
    
    if (error) {
      console.error(`Error deactivating signal ${signal.name}:`, error);
    }
    
    // Log deactivation
    await supabase.from('logs').insert({
      intersection_id: signal.intersection_id,
      emergency_id: emergencyId,
      event_type: 'corridor_deactivation',
      message: `Green corridor deactivated at ${signal.name}`,
    });
  }
}

/**
 * Monitor ambulance position and activate signals progressively
 */
export class GreenCorridorManager {
  private activeCorridors: Map<string, GreenCorridorConfig> = new Map();
  private monitorIntervalId: NodeJS.Timeout | null = null;
  
  /**
   * Create and activate a green corridor
   */
  async createCorridor(
    emergencyId: string,
    ambulanceId: string,
    route: [number, number][],
    activationDistance: number = 500
  ): Promise<void> {
    // Identify signals on route
    const signals = await identifySignalsOnRoute(route);
    
    console.log(`Green Corridor: Found ${signals.length} signals on route`);
    
    const config: GreenCorridorConfig = {
      emergency_id: emergencyId,
      ambulance_id: ambulanceId,
      route,
      affected_signals: signals,
      activation_distance: activationDistance,
    };
    
    this.activeCorridors.set(emergencyId, config);
    
    // Activate all signals immediately for demo
    await activateGreenCorridor(emergencyId, signals);
    
    // Start monitoring if not already running
    if (!this.monitorIntervalId) {
      this.startMonitoring();
    }
  }
  
  /**
   * Deactivate a green corridor
   */
  async removeCorridor(emergencyId: string): Promise<void> {
    const config = this.activeCorridors.get(emergencyId);
    if (!config) return;
    
    await deactivateGreenCorridor(emergencyId, config.affected_signals);
    this.activeCorridors.delete(emergencyId);
    
    // Stop monitoring if no active corridors
    if (this.activeCorridors.size === 0 && this.monitorIntervalId) {
      clearInterval(this.monitorIntervalId);
      this.monitorIntervalId = null;
    }
  }
  
  private startMonitoring(): void {
    this.monitorIntervalId = setInterval(() => {
      this.checkCorridors();
    }, 5000); // Check every 5 seconds
  }
  
  private async checkCorridors(): Promise<void> {
    // For future enhancement: progressive signal activation based on ambulance position
    // Currently using full corridor activation
  }
}

/**
 * Calculate distance between two points (Haversine formula) in km
 */
function calculateDistance(
  point1: [number, number],
  point2: [number, number]
): number {
  const R = 6371;
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

// Export singleton manager
export const greenCorridorManager = new GreenCorridorManager();
