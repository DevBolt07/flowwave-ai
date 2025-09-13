-- Create user roles enum
CREATE TYPE public.user_role AS ENUM ('normal', 'authority', 'emergency');

-- Create signal state enum
CREATE TYPE public.signal_state AS ENUM ('red', 'green', 'amber');

-- Create emergency status enum
CREATE TYPE public.emergency_status AS ENUM ('active', 'completed', 'cancelled');

-- Create users table (extending auth.users)
CREATE TABLE public.users (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
  email TEXT NOT NULL,
  role user_role NOT NULL DEFAULT 'normal',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create intersections table
CREATE TABLE public.intersections (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  latitude FLOAT,
  longitude FLOAT,
  roi_polygons JSONB DEFAULT '[]'::jsonb,
  config JSONB DEFAULT '{"min_gst": 10, "max_gst": 120, "base_time": 15, "vehicle_factor": 2.5}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create lanes table
CREATE TABLE public.lanes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  intersection_id UUID REFERENCES public.intersections(id) ON DELETE CASCADE NOT NULL,
  lane_no INTEGER NOT NULL CHECK (lane_no >= 1 AND lane_no <= 4),
  direction TEXT NOT NULL CHECK (direction IN ('North', 'South', 'East', 'West')),
  vehicle_count INTEGER DEFAULT 0,
  gst_time INTEGER DEFAULT 0,
  signal_state signal_state DEFAULT 'red',
  has_emergency BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(intersection_id, lane_no)
);

-- Create emergencies table
CREATE TABLE public.emergencies (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  driver_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  vehicle_id TEXT,
  route JSONB DEFAULT '[]'::jsonb,
  source_latitude FLOAT,
  source_longitude FLOAT,
  destination_latitude FLOAT,
  destination_longitude FLOAT,
  status emergency_status DEFAULT 'active',
  priority_level INTEGER DEFAULT 1,
  eta_minutes INTEGER,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create logs table
CREATE TABLE public.logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  intersection_id UUID REFERENCES public.intersections(id) ON DELETE SET NULL,
  emergency_id UUID REFERENCES public.emergencies(id) ON DELETE SET NULL,
  event_type TEXT NOT NULL,
  message TEXT NOT NULL,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.intersections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lanes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.emergencies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.logs ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
-- Users can view their own profile
CREATE POLICY "Users can view their own profile" 
ON public.users 
FOR SELECT 
USING (auth.uid() = user_id);

-- Users can update their own profile
CREATE POLICY "Users can update their own profile" 
ON public.users 
FOR UPDATE 
USING (auth.uid() = user_id);

-- Users can insert their own profile
CREATE POLICY "Users can insert their own profile" 
ON public.users 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

-- All authenticated users can view intersections
CREATE POLICY "All users can view intersections" 
ON public.intersections 
FOR SELECT 
TO authenticated
USING (true);

-- Only authority users can modify intersections
CREATE POLICY "Authority users can modify intersections" 
ON public.intersections 
FOR ALL 
TO authenticated
USING (EXISTS (
  SELECT 1 FROM public.users 
  WHERE users.user_id = auth.uid() 
  AND users.role = 'authority'
));

-- All authenticated users can view lanes
CREATE POLICY "All users can view lanes" 
ON public.lanes 
FOR SELECT 
TO authenticated
USING (true);

-- Only authority users can modify lanes
CREATE POLICY "Authority users can modify lanes" 
ON public.lanes 
FOR ALL 
TO authenticated
USING (EXISTS (
  SELECT 1 FROM public.users 
  WHERE users.user_id = auth.uid() 
  AND users.role = 'authority'
));

-- Emergency drivers can view and manage their own emergencies
CREATE POLICY "Emergency drivers can manage their emergencies" 
ON public.emergencies 
FOR ALL 
TO authenticated
USING (auth.uid() = driver_id);

-- Authority users can view all emergencies
CREATE POLICY "Authority users can view all emergencies" 
ON public.emergencies 
FOR SELECT 
TO authenticated
USING (EXISTS (
  SELECT 1 FROM public.users 
  WHERE users.user_id = auth.uid() 
  AND users.role = 'authority'
));

-- All authenticated users can view logs
CREATE POLICY "All users can view logs" 
ON public.logs 
FOR SELECT 
TO authenticated
USING (true);

-- Authority users can create logs
CREATE POLICY "Authority users can create logs" 
ON public.logs 
FOR INSERT 
TO authenticated
WITH CHECK (EXISTS (
  SELECT 1 FROM public.users 
  WHERE users.user_id = auth.uid() 
  AND users.role = 'authority'
));

-- Create function to update timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Create triggers for automatic timestamp updates
CREATE TRIGGER update_users_updated_at
    BEFORE UPDATE ON public.users
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_intersections_updated_at
    BEFORE UPDATE ON public.intersections
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_lanes_updated_at
    BEFORE UPDATE ON public.lanes
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_emergencies_updated_at
    BEFORE UPDATE ON public.emergencies
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

-- Insert sample data
INSERT INTO public.intersections (name, latitude, longitude, roi_polygons, config) VALUES
('MG Road × Brigade Road', 12.9716, 77.5946, '[]', '{"min_gst": 10, "max_gst": 120, "base_time": 15, "vehicle_factor": 2.5}'),
('Whitefield × ITPL Main', 12.9698, 77.7499, '[]', '{"min_gst": 15, "max_gst": 90, "base_time": 20, "vehicle_factor": 3.0}'),
('Koramangala × Hosur Road', 12.9352, 77.6245, '[]', '{"min_gst": 12, "max_gst": 100, "base_time": 18, "vehicle_factor": 2.2}');

-- Get intersection IDs for lane inserts
DO $$
DECLARE
    int1_id UUID;
    int2_id UUID;
    int3_id UUID;
BEGIN
    SELECT id INTO int1_id FROM public.intersections WHERE name = 'MG Road × Brigade Road';
    SELECT id INTO int2_id FROM public.intersections WHERE name = 'Whitefield × ITPL Main';
    SELECT id INTO int3_id FROM public.intersections WHERE name = 'Koramangala × Hosur Road';
    
    -- Insert lanes for intersection 1
    INSERT INTO public.lanes (intersection_id, lane_no, direction, vehicle_count, gst_time, signal_state) VALUES
    (int1_id, 1, 'North', 12, 45, 'green'),
    (int1_id, 2, 'South', 8, 0, 'red'),
    (int1_id, 3, 'East', 15, 0, 'red'),
    (int1_id, 4, 'West', 6, 0, 'red');
    
    -- Insert lanes for intersection 2
    INSERT INTO public.lanes (intersection_id, lane_no, direction, vehicle_count, gst_time, signal_state) VALUES
    (int2_id, 1, 'North', 24, 0, 'red'),
    (int2_id, 2, 'South', 18, 5, 'amber'),
    (int2_id, 3, 'East', 9, 0, 'red'),
    (int2_id, 4, 'West', 14, 0, 'red');
    
    -- Insert lanes for intersection 3
    INSERT INTO public.lanes (intersection_id, lane_no, direction, vehicle_count, gst_time, signal_state, has_emergency) VALUES
    (int3_id, 1, 'North', 31, 0, 'red', false),
    (int3_id, 2, 'South', 7, 0, 'red', true),
    (int3_id, 3, 'East', 19, 28, 'green', false),
    (int3_id, 4, 'West', 12, 0, 'red', false);
END $$;

-- Enable realtime for tables
ALTER TABLE public.lanes REPLICA IDENTITY FULL;
ALTER TABLE public.emergencies REPLICA IDENTITY FULL;
ALTER TABLE public.logs REPLICA IDENTITY FULL;

ALTER PUBLICATION supabase_realtime ADD TABLE public.lanes;
ALTER PUBLICATION supabase_realtime ADD TABLE public.emergencies;
ALTER PUBLICATION supabase_realtime ADD TABLE public.logs;