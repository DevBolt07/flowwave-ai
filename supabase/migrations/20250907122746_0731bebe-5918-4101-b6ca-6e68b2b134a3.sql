
-- Create user roles enum
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'user_role') THEN
        CREATE TYPE public.user_role AS ENUM ('normal', 'authority', 'emergency');
    END IF;
END$$;

-- Create signal state enum
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'signal_state') THEN
        CREATE TYPE public.signal_state AS ENUM ('red', 'green', 'amber');
    END IF;
END$$;

-- Create emergency status enum
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'emergency_status') THEN
        CREATE TYPE public.emergency_status AS ENUM ('active', 'completed', 'cancelled');
    END IF;
END$$;

-- Create users table (extending auth.users)
CREATE TABLE IF NOT EXISTS public.users (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
  email TEXT NOT NULL,
  role user_role NOT NULL DEFAULT 'normal',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create intersections table
CREATE TABLE IF NOT EXISTS public.intersections (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  latitude FLOAT,
  longitude FLOAT,
  roi_polygons JSONB DEFAULT '[]'::jsonb,
  config JSONB DEFAULT '{"min_gst": 10, "max_gst": 120, "base_time": 15, "vehicle_factor": 2.5}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Add unique constraint to intersections.name if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conrelid = 'public.intersections'::regclass
    AND conname = 'intersections_name_key'
  )
  THEN
    ALTER TABLE public.intersections ADD CONSTRAINT intersections_name_key UNIQUE (name);
  END IF;
END;
$$;


-- Create lanes table
CREATE TABLE IF NOT EXISTS public.lanes (
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
CREATE TABLE IF NOT EXISTS public.emergencies (
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
CREATE TABLE IF NOT EXISTS public.logs (
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
DROP POLICY IF EXISTS "Users can view their own profile" ON public.users;
CREATE POLICY "Users can view their own profile" 
ON public.users 
FOR SELECT 
USING (auth.uid() = user_id);

-- Users can update their own profile
DROP POLICY IF EXISTS "Users can update their own profile" ON public.users;
CREATE POLICY "Users can update their own profile" 
ON public.users 
FOR UPDATE 
USING (auth.uid() = user_id);

-- Users can insert their own profile
DROP POLICY IF EXISTS "Users can insert their own profile" ON public.users;
CREATE POLICY "Users can insert their own profile" 
ON public.users 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

-- All authenticated users can view intersections
DROP POLICY IF EXISTS "All users can view intersections" ON public.intersections;
CREATE POLICY "All users can view intersections" 
ON public.intersections 
FOR SELECT 
TO authenticated
USING (true);

-- Only authority users can modify intersections
DROP POLICY IF EXISTS "Authority users can modify intersections" ON public.intersections;
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
DROP POLICY IF EXISTS "All users can view lanes" ON public.lanes;
CREATE POLICY "All users can view lanes" 
ON public.lanes 
FOR SELECT 
TO authenticated
USING (true);

-- Only authority users can modify lanes
DROP POLICY IF EXISTS "Authority users can modify lanes" ON public.lanes;
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
DROP POLICY IF EXISTS "Emergency drivers can manage their emergencies" ON public.emergencies;
CREATE POLICY "Emergency drivers can manage their emergencies" 
ON public.emergencies 
FOR ALL 
TO authenticated
USING (auth.uid() = driver_id);

-- Authority users can view all emergencies
DROP POLICY IF EXISTS "Authority users can view all emergencies" ON public.emergencies;
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
DROP POLICY IF EXISTS "All users can view logs" ON public.logs;
CREATE POLICY "All users can view logs" 
ON public.logs 
FOR SELECT 
TO authenticated
USING (true);

-- Authority users can create logs
DROP POLICY IF EXISTS "Authority users can create logs" ON public.logs;
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
DROP TRIGGER IF EXISTS update_users_updated_at ON public.users;
CREATE TRIGGER update_users_updated_at
    BEFORE UPDATE ON public.users
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_intersections_updated_at ON public.intersections;
CREATE TRIGGER update_intersections_updated_at
    BEFORE UPDATE ON public.intersections
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_lanes_updated_at ON public.lanes;
CREATE TRIGGER update_lanes_updated_at
    BEFORE UPDATE ON public.lanes
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_emergencies_updated_at ON public.emergencies;
CREATE TRIGGER update_emergencies_updated_at
    BEFORE UPDATE ON public.emergencies
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

-- Insert sample data
INSERT INTO public.intersections (name, latitude, longitude, roi_polygons, config) VALUES
('MG Road × Brigade Road', 12.9716, 77.5946, '[]', '{"min_gst": 10, "max_gst": 120, "base_time": 15, "vehicle_factor": 2.5}'),
('Whitefield × ITPL Main', 12.9698, 77.7499, '[]', '{"min_gst": 15, "max_gst": 90, "base_time": 20, "vehicle_factor": 3.0}'),
('Koramangala × Hosur Road', 12.9352, 77.6245, '[]', '{"min_gst": 12, "max_gst": 100, "base_time": 18, "vehicle_factor": 2.2}')
ON CONFLICT (name) DO NOTHING;

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
    (int1_id, 4, 'West', 6, 0, 'red')
    ON CONFLICT (intersection_id, lane_no) DO NOTHING;
    
    -- Insert lanes for intersection 2
    INSERT INTO public.lanes (intersection_id, lane_no, direction, vehicle_count, gst_time, signal_state) VALUES
    (int2_id, 1, 'North', 24, 0, 'red'),
    (int2_id, 2, 'South', 18, 5, 'amber'),
    (int2_id, 3, 'East', 9, 0, 'red'),
    (int2_id, 4, 'West', 14, 0, 'red')
    ON CONFLICT (intersection_id, lane_no) DO NOTHING;
    
    -- Insert lanes for intersection 3
    INSERT INTO public.lanes (intersection_id, lane_no, direction, vehicle_count, gst_time, signal_state, has_emergency) VALUES
    (int3_id, 1, 'North', 31, 0, 'red', false),
    (int3_id, 2, 'South', 7, 0, 'red', true),
    (int3_id, 3, 'East', 19, 28, 'green', false),
    (int3_id, 4, 'West', 12, 0, 'red', false)
    ON CONFLICT (intersection_id, lane_no) DO NOTHING;
END $$;

-- Enable realtime for tables
ALTER TABLE public.lanes REPLICA IDENTITY FULL;
ALTER TABLE public.emergencies REPLICA IDENTITY FULL;
ALTER TABLE public.logs REPLICA IDENTITY FULL;


DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
    AND schemaname = 'public'
    AND tablename = 'lanes'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.lanes;
  END IF;
END;
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
    AND schemaname = 'public'
    AND tablename = 'emergencies'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.emergencies;
  END IF;
END;
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
    AND schemaname = 'public'
    AND tablename = 'logs'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.logs;
  END IF;
END;
$$;
