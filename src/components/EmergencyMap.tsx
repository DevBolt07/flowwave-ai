import { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMapEvents, useMap } from 'react-leaflet';
import { Icon } from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Card, CardContent } from './ui/card';
import { Input } from './ui/input';
import { MapPin, Hospital, Ambulance, Navigation, Locate, Search } from 'lucide-react';
import { toast } from 'sonner';

// Create custom icons
const createIcon = (iconUrl: string, size: [number, number] = [32, 32]) => new Icon({
  iconUrl,
  iconSize: size,
  iconAnchor: [size[0]/2, size[1]],
  popupAnchor: [0, -size[1]],
});

const patientIcon = createIcon('data:image/svg+xml;base64,' + btoa(`
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="#ef4444" stroke="white" stroke-width="2">
    <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/>
    <circle cx="12" cy="10" r="3" fill="white" stroke="#ef4444"/>
  </svg>
`), [40, 40]);

const hospitalIcon = createIcon('data:image/svg+xml;base64,' + btoa(`
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="#22c55e" stroke="white" stroke-width="2">
    <rect x="3" y="3" width="18" height="18" rx="2" fill="#22c55e"/>
    <path d="M12 7v10M7 12h10" stroke="white" stroke-width="3"/>
  </svg>
`), [35, 35]);

const ambulanceIcon = createIcon('data:image/svg+xml;base64,' + btoa(`
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="#3b82f6" stroke="white" stroke-width="2">
    <rect x="3" y="6" width="18" height="12" rx="2" fill="#3b82f6" stroke="white"/>
    <path d="M12 9v6M9 12h6" stroke="white" stroke-width="3"/>
  </svg>
`), [35, 35]);

export interface Hospital {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
  specialties: string[];
  address?: string;
  contact_number?: string;
  available_beds?: number;
}

export interface AmbulanceData {
  id: string;
  vehicle_id: string;
  current_latitude: number;
  current_longitude: number;
  status: string;
}

interface EmergencyMapProps {
  hospitals: Hospital[];
  ambulances?: AmbulanceData[];
  center?: [number, number];
  zoom?: number;
  className?: string;
  allowPatientSelection?: boolean;
  onPatientLocationSelect?: (lat: number, lng: number) => void;
  onNearestHospitalFound?: (hospital: Hospital, distance: number) => void;
  showRoute?: boolean;
}

// Component to handle map clicks
const MapClickHandler = ({ onLocationSelect }: { onLocationSelect: (lat: number, lng: number) => void }) => {
  useMapEvents({
    click: (e) => {
      onLocationSelect(e.latlng.lat, e.latlng.lng);
    },
  });
  return null;
};

// Component to update map center
const MapCenterUpdater = ({ center }: { center: [number, number] }) => {
  const map = useMap();
  useEffect(() => {
    map.setView(center, map.getZoom());
  }, [center, map]);
  return null;
};

// Calculate distance between two points using Haversine formula
const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
  const R = 6371; // Earth's radius in km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
};

export const EmergencyMap = ({
  hospitals,
  ambulances = [],
  center = [12.9716, 77.5946],
  zoom = 12,
  className = "h-[500px] w-full rounded-lg overflow-hidden",
  allowPatientSelection = false,
  onPatientLocationSelect,
  onNearestHospitalFound,
  showRoute = false,
}: EmergencyMapProps) => {
  const [patientLocation, setPatientLocation] = useState<[number, number] | null>(null);
  const [nearestHospital, setNearestHospital] = useState<Hospital | null>(null);
  const [routeCoordinates, setRouteCoordinates] = useState<[number, number][] | null>(null);
  const [mapCenter, setMapCenter] = useState<[number, number]>(center);
  const [isLoadingLocation, setIsLoadingLocation] = useState(false);
  const [addressSearch, setAddressSearch] = useState('');

  const handleLocationSelect = (lat: number, lng: number) => {
    if (!allowPatientSelection) return;
    
    const location: [number, number] = [lat, lng];
    setPatientLocation(location);
    onPatientLocationSelect?.(lat, lng);

    // Find nearest hospital
    let minDistance = Infinity;
    let nearest: Hospital | null = null;

    hospitals.forEach(hospital => {
      const distance = calculateDistance(lat, lng, hospital.latitude, hospital.longitude);
      if (distance < minDistance) {
        minDistance = distance;
        nearest = hospital;
      }
    });

    if (nearest) {
      setNearestHospital(nearest);
      onNearestHospitalFound?.(nearest, minDistance);

      if (showRoute) {
        // Create simple straight line route (in production, use routing API)
        setRouteCoordinates([
          location,
          [nearest.latitude, nearest.longitude]
        ]);
      }
    }
  };

  const clearSelection = () => {
    setPatientLocation(null);
    setNearestHospital(null);
    setRouteCoordinates(null);
  };

  const getCurrentLocation = () => {
    setIsLoadingLocation(true);
    if ('geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const location: [number, number] = [position.coords.latitude, position.coords.longitude];
          setMapCenter(location);
          toast.success('Location detected successfully');
          setIsLoadingLocation(false);
        },
        (error) => {
          console.error('Error getting location:', error);
          toast.error('Unable to get your location. Please enable location services.');
          setIsLoadingLocation(false);
        }
      );
    } else {
      toast.error('Geolocation is not supported by your device');
      setIsLoadingLocation(false);
    }
  };

  const searchAddress = async () => {
    if (!addressSearch.trim()) {
      toast.error('Please enter an address');
      return;
    }

    try {
      // Using OpenStreetMap Nominatim API for geocoding
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(addressSearch)}&limit=1`
      );
      const data = await response.json();

      if (data.length > 0) {
        const location: [number, number] = [parseFloat(data[0].lat), parseFloat(data[0].lon)];
        setMapCenter(location);
        if (allowPatientSelection) {
          handleLocationSelect(location[0], location[1]);
        }
        toast.success('Address found and displayed on map');
      } else {
        toast.error('Address not found. Please try a different search.');
      }
    } catch (error) {
      console.error('Error searching address:', error);
      toast.error('Failed to search address. Please try again.');
    }
  };

  useEffect(() => {
    // Auto-detect location on component mount
    if (allowPatientSelection) {
      getCurrentLocation();
    }
  }, [allowPatientSelection]);

  return (
    <div className="relative">
      {/* Address Search Bar */}
      {allowPatientSelection && (
        <div className="absolute top-4 left-1/2 transform -translate-x-1/2 z-[1000] w-full max-w-md px-4">
          <Card className="bg-background/95 backdrop-blur">
            <CardContent className="p-3 space-y-2">
              <div className="flex gap-2">
                <Input
                  type="text"
                  placeholder="Enter destination address..."
                  value={addressSearch}
                  onChange={(e) => setAddressSearch(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && searchAddress()}
                  className="flex-1"
                />
                <Button size="sm" onClick={searchAddress}>
                  <Search className="w-4 h-4" />
                </Button>
                <Button 
                  size="sm" 
                  variant="outline" 
                  onClick={getCurrentLocation}
                  disabled={isLoadingLocation}
                >
                  <Locate className={`w-4 h-4 ${isLoadingLocation ? 'animate-spin' : ''}`} />
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      <div className={className}>
        <MapContainer
          center={mapCenter}
          zoom={zoom}
          style={{ height: '100%', width: '100%' }}
          className="z-0"
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          
          <MapCenterUpdater center={mapCenter} />
          
          {allowPatientSelection && (
            <MapClickHandler onLocationSelect={handleLocationSelect} />
          )}

          {/* Patient Location Marker */}
          {patientLocation && (
            <Marker position={patientLocation} icon={patientIcon}>
              <Popup>
                <div className="text-sm font-semibold text-emergency">
                  <MapPin className="w-4 h-4 inline mr-1" />
                  Patient Location
                </div>
              </Popup>
            </Marker>
          )}

          {/* Hospital Markers */}
          {hospitals.map((hospital) => (
            <Marker
              key={hospital.id}
              position={[hospital.latitude, hospital.longitude]}
              icon={hospitalIcon}
            >
              <Popup>
                <div className="text-sm space-y-2 min-w-[200px]">
                  <div>
                    <strong className="text-secondary flex items-center">
                      <Hospital className="w-4 h-4 mr-1" />
                      {hospital.name}
                    </strong>
                  </div>
                  {hospital.specialties && hospital.specialties.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {hospital.specialties.slice(0, 3).map((spec) => (
                        <Badge key={spec} variant="outline" className="text-xs">
                          {spec}
                        </Badge>
                      ))}
                    </div>
                  )}
                  {hospital.available_beds !== undefined && (
                    <div className="text-xs">
                      Available Beds: <strong>{hospital.available_beds}</strong>
                    </div>
                  )}
                  {hospital.contact_number && (
                    <div className="text-xs">📞 {hospital.contact_number}</div>
                  )}
                  {hospital.address && (
                    <div className="text-xs text-muted-foreground">{hospital.address}</div>
                  )}
                  {nearestHospital?.id === hospital.id && (
                    <Badge variant="destructive" className="text-xs">
                      Nearest Hospital
                    </Badge>
                  )}
                </div>
              </Popup>
            </Marker>
          ))}

          {/* Ambulance Markers */}
          {ambulances.map((ambulance) => (
            <Marker
              key={ambulance.id}
              position={[ambulance.current_latitude, ambulance.current_longitude]}
              icon={ambulanceIcon}
            >
              <Popup>
                <div className="text-sm space-y-1">
                  <strong className="flex items-center text-primary">
                    <Ambulance className="w-4 h-4 mr-1" />
                    {ambulance.vehicle_id}
                  </strong>
                  <div className="text-xs">
                    Status: <Badge variant={ambulance.status === 'available' ? 'default' : 'secondary'}>
                      {ambulance.status}
                    </Badge>
                  </div>
                </div>
              </Popup>
            </Marker>
          ))}

          {/* Route Polyline */}
          {routeCoordinates && showRoute && (
            <Polyline
              positions={routeCoordinates}
              color="#ef4444"
              weight={4}
              opacity={0.7}
              dashArray="10, 10"
            />
          )}
        </MapContainer>
      </div>

      {/* Map Controls Overlay */}
      {allowPatientSelection && (
        <div className="absolute top-4 left-4 z-[1000] space-y-2">
          <Card className="bg-background/95 backdrop-blur">
            <CardContent className="p-3 space-y-2">
              <div className="text-xs font-medium flex items-center">
                <MapPin className="w-4 h-4 mr-1 text-emergency" />
                {patientLocation ? 'Patient Location Set' : 'Click map to set patient location'}
              </div>
              {patientLocation && nearestHospital && (
                <>
                  <div className="text-xs space-y-1 border-t pt-2">
                    <div className="font-medium text-secondary">Nearest Hospital:</div>
                    <div>{nearestHospital.name}</div>
                    <div className="flex items-center text-muted-foreground">
                      <Navigation className="w-3 h-3 mr-1" />
                      {calculateDistance(
                        patientLocation[0],
                        patientLocation[1],
                        nearestHospital.latitude,
                        nearestHospital.longitude
                      ).toFixed(2)} km away
                    </div>
                  </div>
                  <Button size="sm" variant="outline" onClick={clearSelection} className="w-full text-xs">
                    Clear Selection
                  </Button>
                </>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* Legend */}
      <div className="absolute bottom-4 right-4 z-[1000]">
        <Card className="bg-background/95 backdrop-blur">
          <CardContent className="p-2 space-y-1">
            <div className="text-xs font-semibold mb-2">Map Legend</div>
            {allowPatientSelection && (
              <div className="flex items-center space-x-2 text-xs">
                <div className="w-4 h-4 rounded-full bg-emergency"></div>
                <span>Patient</span>
              </div>
            )}
            <div className="flex items-center space-x-2 text-xs">
              <div className="w-4 h-4 rounded-full bg-secondary"></div>
              <span>Hospital</span>
            </div>
            <div className="flex items-center space-x-2 text-xs">
              <div className="w-4 h-4 rounded-full bg-primary"></div>
              <span>Ambulance</span>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};