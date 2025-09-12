import { supabase } from '@/integrations/supabase/client';

// Type Definitions
export interface DetectionResult {
  bounding_boxes: Array<{
    x: number;
    y: number;
    width: number;
    height: number;
    confidence: number;
    class: string;
    lane: number;
  }>;
  lane_counts: {
    north: number;
    south: number;
    east: number;
    west: number;
  };
  total_vehicles: number;
  confidence: number;
  processing_time_ms: number;
}

export interface GST {
  lane_no: number;
  direction: string;
  vehicle_count: number;
  gst_time: number;
  density_status: 'low' | 'medium' | 'high';
}

export interface RouteResult {
  route: Array<{
    lat: number;
    lng: number;
  }>;
  distance_km: number;
  eta_minutes: number;
  intersections: string[];
}

export interface CorridorRequest {
  emergency_id: string;
  route?: RouteResult;
  source?: {
    lat: number;
    lng: number;
  };
  destination?: {
    lat: number;
    lng: number;
  };
}

/**
 * Calculates Green Signal Time (GST) for an intersection using a Supabase Edge Function.
 * @param intersectionId The ID of the intersection.
 * @param laneCounts An object with vehicle counts for each lane.
 * @param config GST calculation parameters.
 * @returns A promise that resolves to an array of GST results for each lane.
 */
export const calculateGST = async (
  intersectionId: string,
  laneCounts: { north: number; south: number; east: number; west: number },
  config: { min_gst: number; max_gst: number; base_time: number; vehicle_factor: number }
): Promise<GST[]> => {
  const { data, error } = await supabase.functions.invoke('gst-calculator', {
    body: {
      intersection_id: intersectionId,
      lane_counts: laneCounts,
      config,
    },
  });

  if (error) {
    throw new Error(`GST calculation error: ${error.message}`);
  }

  return data;
};


// Note: Other API functions like vehicle detection and route planning are now called
// directly from their respective components using `supabase.functions.invoke()`.
// This file is maintained for shared type definitions and genuinely shared API calls.


// Mock fallback functions

export const mockDetectionResult = (intersectionId: string): DetectionResult => ({
  bounding_boxes: [
    { x: 100, y: 100, width: 80, height: 120, confidence: 0.92, class: 'car', lane: 1 },
    { x: 200, y: 150, width: 90, height: 110, confidence: 0.88, class: 'truck', lane: 1 },
  ],
  lane_counts: {
    north: Math.floor(Math.random() * 20) + 5,
    south: Math.floor(Math.random() * 15) + 3,
    east: Math.floor(Math.random() * 25) + 8,
    west: Math.floor(Math.random() * 18) + 4,
  },
  total_vehicles: 0,
  confidence: 0.91,
  processing_time_ms: 45,
});

export const mockRouteResult = (
  source: { lat: number; lng: number },
  destination: { lat: number; lng: number }
): RouteResult => ({
  route: [
    source,
    { lat: source.lat + 0.01, lng: source.lng + 0.005 },
    { lat: source.lat + 0.02, lng: source.lng + 0.01 },
    destination,
  ],
  distance_km: 3.2,
  eta_minutes: 4,
  intersections: ['MG Road × Brigade Road', 'Whitefield × ITPL Main'],
});
