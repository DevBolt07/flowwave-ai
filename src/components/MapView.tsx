import { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from 'react-leaflet';
import { Icon } from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Fix for default markers in React-Leaflet
const createIcon = (iconUrl: string, size: [number, number] = [25, 41]) => new Icon({
  iconUrl,
  iconSize: size,
  iconAnchor: [size[0]/2, size[1]],
  popupAnchor: [0, -size[1]],
});

const intersectionIcon = createIcon('data:image/svg+xml;base64,' + btoa(`
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
    <circle cx="12" cy="12" r="10" fill="#1f2937" stroke="#3b82f6"/>
    <path d="M12 6v12M6 12h12" stroke="white"/>
  </svg>
`));

const ambulanceIcon = createIcon('data:image/svg+xml;base64,' + btoa(`
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
    <path d="M10 2v20M14 2v20M4 7h16M4 17h16" fill="#ef4444" stroke="#ffffff"/>
    <rect x="3" y="6" width="18" height="12" rx="2" fill="#ef4444" stroke="#ffffff"/>
    <path d="M12 9v6M9 12h6" stroke="white" stroke-width="3"/>
  </svg>
`), [35, 35]);

const emergencyIcon = createIcon('data:image/svg+xml;base64,' + btoa(`
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="#ef4444" stroke="currentColor" stroke-width="2">
    <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/>
  </svg>
`));

export interface MapIntersection {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
  hasEmergency?: boolean;
  signalState?: 'red' | 'green' | 'amber';
  vehicleCount?: number;
}

export interface EmergencyRoute {
  id: string;
  coordinates: [number, number][];
  ambulancePosition: [number, number];
  eta: number;
  status: 'active' | 'completed';
}

interface MapViewProps {
  intersections: MapIntersection[];
  emergencyRoutes?: EmergencyRoute[];
  onIntersectionClick?: (intersection: MapIntersection) => void;
  center?: [number, number];
  zoom?: number;
  className?: string;
}

// Component to handle ambulance movement
const MovingAmbulance = ({ route, position }: { route: EmergencyRoute; position: [number, number] }) => {
  const map = useMap();
  
  useEffect(() => {
    // Center map on ambulance if needed
    if (route.status === 'active') {
      map.setView(position, map.getZoom(), { animate: true });
    }
  }, [position, route.status, map]);

  return (
    <Marker position={position} icon={ambulanceIcon}>
      <Popup>
        <div className="text-sm">
          <strong>Emergency Vehicle</strong><br/>
          ETA: {route.eta} minutes<br/>
          Status: {route.status}
        </div>
      </Popup>
    </Marker>
  );
};

export const MapView = ({
  intersections,
  emergencyRoutes = [],
  onIntersectionClick,
  center = [12.9716, 77.5946], // Default: Bangalore
  zoom = 13,
  className = "h-96 w-full rounded-lg overflow-hidden",
}: MapViewProps) => {
  const [selectedIntersection, setSelectedIntersection] = useState<string | null>(null);

  const handleIntersectionClick = (intersection: MapIntersection) => {
    setSelectedIntersection(intersection.id);
    onIntersectionClick?.(intersection);
  };

  const getIntersectionIcon = (intersection: MapIntersection) => {
    if (intersection.hasEmergency) {
      return emergencyIcon;
    }
    return intersectionIcon;
  };

  const getSignalColor = (state?: 'red' | 'green' | 'amber') => {
    switch (state) {
      case 'green': return '#22c55e';
      case 'amber': return '#f59e0b';
      case 'red': return '#ef4444';
      default: return '#6b7280';
    }
  };

  return (
    <div className={className}>
      <MapContainer
        center={center}
        zoom={zoom}
        style={{ height: '100%', width: '100%' }}
        className="z-0"
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        
        {/* Intersections */}
        {intersections.map((intersection) => (
          <Marker
            key={intersection.id}
            position={[intersection.latitude, intersection.longitude]}
            icon={getIntersectionIcon(intersection)}
            eventHandlers={{
              click: () => handleIntersectionClick(intersection),
            }}
          >
            <Popup>
              <div className="text-sm space-y-1">
                <strong>{intersection.name}</strong>
                {intersection.vehicleCount !== undefined && (
                  <div>Vehicles: {intersection.vehicleCount}</div>
                )}
                {intersection.signalState && (
                  <div className="flex items-center space-x-1">
                    <div 
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: getSignalColor(intersection.signalState) }}
                    />
                    <span>Signal: {intersection.signalState}</span>
                  </div>
                )}
                {intersection.hasEmergency && (
                  <div className="text-red-600 font-medium">🚨 Emergency Active</div>
                )}
              </div>
            </Popup>
          </Marker>
        ))}
        
        {/* Emergency Routes */}
        {emergencyRoutes.map((route) => (
          <div key={route.id}>
            {/* Route polyline */}
            <Polyline
              positions={route.coordinates}
              color={route.status === 'active' ? '#ef4444' : '#6b7280'}
              weight={route.status === 'active' ? 6 : 4}
              opacity={route.status === 'active' ? 0.8 : 0.5}
              dashArray={route.status === 'active' ? undefined : '10,10'}
            />
            
            {/* Moving ambulance */}
            {route.status === 'active' && (
              <MovingAmbulance route={route} position={route.ambulancePosition} />
            )}
          </div>
        ))}
      </MapContainer>
    </div>
  );
};

// Utility function to simulate ambulance movement along route
export const simulateAmbulanceMovement = (
  route: [number, number][],
  progress: number // 0 to 1
): [number, number] => {
  if (route.length < 2) return route[0] || [0, 0];
  
  const totalSegments = route.length - 1;
  const currentSegment = Math.min(Math.floor(progress * totalSegments), totalSegments - 1);
  const segmentProgress = (progress * totalSegments) - currentSegment;
  
  const start = route[currentSegment];
  const end = route[currentSegment + 1];
  
  const lat = start[0] + (end[0] - start[0]) * segmentProgress;
  const lng = start[1] + (end[1] - start[1]) * segmentProgress;
  
  return [lat, lng];
};

// Utility function to create route from coordinates
export const createEmergencyRoute = (
  id: string,
  coordinates: [number, number][],
  eta: number,
  currentProgress: number = 0
): EmergencyRoute => ({
  id,
  coordinates,
  ambulancePosition: simulateAmbulanceMovement(coordinates, currentProgress),
  eta,
  status: 'active',
});