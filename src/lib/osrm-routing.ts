// OSRM Routing Service Integration
// This module handles communication with a self-hosted OSRM server
// OSRM Server URL should be configured here

const OSRM_SERVER_URL = 'http://localhost:5000'; // Update this with your OSRM server URL

export interface OSRMRoute {
  geometry: [number, number][]; // Array of [lng, lat] coordinates
  distance: number; // Distance in meters
  duration: number; // Duration in seconds
  legs: OSRMRouteLeg[];
}

export interface OSRMRouteLeg {
  distance: number;
  duration: number;
  steps: OSRMStep[];
}

export interface OSRMStep {
  distance: number;
  duration: number;
  geometry: [number, number][];
  name: string;
  mode: string;
  maneuver: {
    type: string;
    location: [number, number];
    modifier?: string;
  };
}

export interface OSRMRouteResponse {
  code: string;
  routes: OSRMRoute[];
  waypoints: Array<{
    location: [number, number];
    name: string;
  }>;
}

/**
 * Calculate route between two points using OSRM
 * @param start - Starting point [lat, lng]
 * @param end - Ending point [lat, lng]
 * @param options - Optional routing parameters
 */
export async function calculateOSRMRoute(
  start: [number, number],
  end: [number, number],
  options: {
    overview?: 'full' | 'simplified' | 'false';
    steps?: boolean;
    geometries?: 'polyline' | 'polyline6' | 'geojson';
  } = {}
): Promise<OSRMRouteResponse> {
  const { overview = 'full', steps = true, geometries = 'geojson' } = options;
  
  // OSRM expects coordinates as lng,lat
  const startCoord = `${start[1]},${start[0]}`;
  const endCoord = `${end[1]},${end[0]}`;
  
  const url = `${OSRM_SERVER_URL}/route/v1/driving/${startCoord};${endCoord}?overview=${overview}&steps=${steps}&geometries=${geometries}`;
  
  try {
    const response = await fetch(url);
    
    if (!response.ok) {
      throw new Error(`OSRM API error: ${response.statusText}`);
    }
    
    const data: OSRMRouteResponse = await response.json();
    
    if (data.code !== 'Ok') {
      throw new Error(`OSRM routing failed: ${data.code}`);
    }
    
    return data;
  } catch (error) {
    console.error('OSRM routing error:', error);
    throw error;
  }
}

/**
 * Calculate route with multiple waypoints
 */
export async function calculateMultiWaypointRoute(
  waypoints: [number, number][],
  options: {
    overview?: 'full' | 'simplified' | 'false';
    steps?: boolean;
  } = {}
): Promise<OSRMRouteResponse> {
  const { overview = 'full', steps = true } = options;
  
  const coordinates = waypoints
    .map(([lat, lng]) => `${lng},${lat}`)
    .join(';');
  
  const url = `${OSRM_SERVER_URL}/route/v1/driving/${coordinates}?overview=${overview}&steps=${steps}&geometries=geojson`;
  
  const response = await fetch(url);
  
  if (!response.ok) {
    throw new Error(`OSRM API error: ${response.statusText}`);
  }
  
  const data: OSRMRouteResponse = await response.json();
  
  if (data.code !== 'Ok') {
    throw new Error(`OSRM routing failed: ${data.code}`);
  }
  
  return data;
}

/**
 * Find nearest road point from OSRM
 */
export async function findNearestRoadPoint(
  point: [number, number]
): Promise<{ location: [number, number]; name: string }> {
  const url = `${OSRM_SERVER_URL}/nearest/v1/driving/${point[1]},${point[0]}`;
  
  const response = await fetch(url);
  const data = await response.json();
  
  if (data.code !== 'Ok') {
    throw new Error(`OSRM nearest failed: ${data.code}`);
  }
  
  return data.waypoints[0];
}

/**
 * Convert OSRM geometry to Leaflet-compatible format
 */
export function convertOSRMGeometryToLeaflet(
  geometry: [number, number][]
): [number, number][] {
  // OSRM returns [lng, lat], Leaflet expects [lat, lng]
  return geometry.map(([lng, lat]) => [lat, lng]);
}

/**
 * Calculate distance between two points (Haversine formula)
 */
export function calculateDistance(
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

/**
 * Mock routing for when OSRM server is not available
 */
export function getMockRoute(
  start: [number, number],
  end: [number, number]
): OSRMRouteResponse {
  const midPoint: [number, number] = [
    (start[0] + end[0]) / 2,
    (start[1] + end[1]) / 2,
  ];
  
  return {
    code: 'Ok',
    routes: [
      {
        geometry: [
          [start[1], start[0]],
          [midPoint[1], midPoint[0]],
          [end[1], end[0]],
        ],
        distance: calculateDistance(start, end) * 1000,
        duration: calculateDistance(start, end) * 1000 / 13.89, // Assuming 50 km/h average
        legs: [
          {
            distance: calculateDistance(start, end) * 1000,
            duration: calculateDistance(start, end) * 1000 / 13.89,
            steps: [],
          },
        ],
      },
    ],
    waypoints: [
      { location: [start[1], start[0]], name: 'Start' },
      { location: [end[1], end[0]], name: 'End' },
    ],
  };
}
