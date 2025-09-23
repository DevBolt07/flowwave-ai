
import { supabase } from '@/integrations/supabase/client';
import type { Intersection } from '@/integrations/supabase/types';

export const getIntersections = async (): Promise<Intersection[]> => {
  const { data, error } = await supabase.from('intersections').select('*');
  if (error) {
    console.error('Error fetching intersections:', error);
    return [];
  }
  return data;
};
