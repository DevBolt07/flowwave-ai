
import { supabase } from '@/integrations/supabase/client';
import type { Database } from '@/integrations/supabase/types';

type Intersection = Database['public']['Tables']['intersections']['Row'];

export const getIntersections = async (): Promise<Intersection[]> => {
  const { data, error } = await supabase.from('intersections').select('*');
  if (error) {
    console.error('Error fetching intersections:', error);
    return [];
  }
  return data;
};
