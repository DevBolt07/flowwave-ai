
import { supabase } from '@/integrations/supabase/client';
import type { Database } from '@/integrations/supabase/types';

type Intersection = Database['public']['Tables']['intersections']['Row'];
type Hospital = Database['public']['Tables']['hospitals']['Row'];
type Ambulance = Database['public']['Tables']['ambulances']['Row'];

export const getIntersections = async (): Promise<Intersection[]> => {
  const { data, error } = await supabase.from('intersections').select('*');
  if (error) {
    console.error('Error fetching intersections:', error);
    return [];
  }
  return data;
};

export const getHospitals = async (): Promise<Hospital[]> => {
  const { data, error } = await supabase.from('hospitals').select('*');
  if (error) {
    console.error('Error fetching hospitals:', error);
    return [];
  }
  return data;
};

export const getAmbulances = async (): Promise<Ambulance[]> => {
  const { data, error } = await supabase.from('ambulances').select('*');
  if (error) {
    console.error('Error fetching ambulances:', error);
    return [];
  }
  return data;
};

export const findNearestHospital = async (
  latitude: number,
  longitude: number,
  specialty?: string
): Promise<Hospital | null> => {
  const hospitals = await getHospitals();
  
  // Filter by specialty if provided
  const filtered = specialty 
    ? hospitals.filter(h => h.specialties?.includes(specialty))
    : hospitals;

  if (filtered.length === 0) return null;

  // Calculate distances and find nearest
  const withDistances = filtered.map(hospital => {
    const R = 6371; // Earth's radius in km
    const dLat = (hospital.latitude - latitude) * Math.PI / 180;
    const dLon = (hospital.longitude - longitude) * Math.PI / 180;
    const a = 
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(latitude * Math.PI / 180) * Math.cos(hospital.latitude * Math.PI / 180) *
      Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    const distance = R * c;

    return { hospital, distance };
  });

  withDistances.sort((a, b) => a.distance - b.distance);
  return withDistances[0]?.hospital || null;
};
