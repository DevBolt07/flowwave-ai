// API integration utilities for Smart Traffic Management System

const API_BASE_URL = process.env.NODE_ENV === 'production' 
  ? 'https://your-backend-api.com/api' 
  : 'http://localhost:5000/api';

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

// Vehicle Detection API
export const detectVehicles = async (
  videoFrame: Blob,
  intersectionId: string,
  model: 'yolov8' | 'rt-detr' | 'yolo-nas' | 'pp-yoloe' = 'yolov8'
): Promise<DetectionResult> => {
  const formData = new FormData();
  formData.append('frame', videoFrame);
  formData.append('intersection_id', intersectionId);
  formData.append('model', model);

  const response = await fetch(`${API_BASE_URL}/detect`, {
    method: 'POST',
    body: formData,
  });

  if (!response.ok) {
    throw new Error(`Detection API error: ${response.statusText}`);
  }

  return response.json();
};

// GST Calculation API
export const calculateGST = async (
  intersectionId: string,
  laneCounts: { north: number; south: number; east: number; west: number },
  config: { min_gst: number; max_gst: number; base_time: number; vehicle_factor: number }
): Promise<GST[]> => {
  const response = await fetch(`${API_BASE_URL}/gst`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      intersection_id: intersectionId,
      lane_counts: laneCounts,
      config,
    }),
  });

  if (!response.ok) {
    throw new Error(`GST API error: ${response.statusText}`);
  }

  return response.json();
};

// Route Planning API
export const calculateRoute = async (
  source: { lat: number; lng: number },
  destination: { lat: number; lng: number }
): Promise<RouteResult> => {
  const response = await fetch(`${API_BASE_URL}/route`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      source,
      destination,
    }),
  });

  if (!response.ok) {
    throw new Error(`Route API error: ${response.statusText}`);
  }

  return response.json();
};

// Emergency Corridor Management
export const startCorridor = async (request: CorridorRequest): Promise<{ success: boolean; corridor_id: string }> => {
  const response = await fetch(`${API_BASE_URL}/corridor/start`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(request),
  });

  if (!response.ok) {
    throw new Error(`Corridor start API error: ${response.statusText}`);
  }

  return response.json();
};

export const stopCorridor = async (emergencyId: string): Promise<{ success: boolean }> => {
  const response = await fetch(`${API_BASE_URL}/corridor/stop`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      emergency_id: emergencyId,
    }),
  });

  if (!response.ok) {
    throw new Error(`Corridor stop API error: ${response.statusText}`);
  }

  return response.json();
};

// Simulation step for demo purposes
export const simulationStep = async (intersectionId: string): Promise<{ success: boolean }> => {
  const response = await fetch(`${API_BASE_URL}/sim/step`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      intersection_id: intersectionId,
    }),
  });

  if (!response.ok) {
    throw new Error(`Simulation API error: ${response.statusText}`);
  }

  return response.json();
};

// Fallback functions for when backend is not available
export const mockDetectionResult = (intersectionId: string): DetectionResult => ({
  bounding_boxes: [
    { x: 100, y: 100, width: 80, height: 120, confidence: 0.92, class: 'car', lane: 1 },
    { x: 200, y: 150, width: 90, height: 110, confidence: 0.88, class: 'truck', lane: 1 },
    { x: 50, y: 200, width: 70, height: 100, confidence: 0.85, class: 'bike', lane: 2 },
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