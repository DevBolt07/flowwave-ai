-- ==========================================================
-- FlowWave AI - Database Schema Setup
-- Run this in the Supabase SQL Editor to initialize the database
-- ==========================================================

-- Clean up existing objects if they exist
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

DROP FUNCTION IF EXISTS public.handle_new_user() CASCADE;
DROP FUNCTION IF EXISTS public.update_updated_at_column() CASCADE;

DROP TABLE IF EXISTS public.video_feeds CASCADE;
DROP TABLE IF EXISTS public.logs CASCADE;
DROP TABLE IF EXISTS public.emergencies CASCADE;
DROP TABLE IF EXISTS public.ambulances CASCADE;
DROP TABLE IF EXISTS public.hospitals CASCADE;
DROP TABLE IF EXISTS public.lanes CASCADE;
DROP TABLE IF EXISTS public.intersections CASCADE;
DROP TABLE IF EXISTS public.users CASCADE;

DROP TYPE IF EXISTS public.emergency_status CASCADE;
DROP TYPE IF EXISTS public.signal_state CASCADE;
DROP TYPE IF EXISTS public.user_role CASCADE;

-- 1. Create Enums
CREATE TYPE public.user_role AS ENUM ('normal', 'authority', 'emergency');
CREATE TYPE public.signal_state AS ENUM ('red', 'green', 'amber');
CREATE TYPE public.emergency_status AS ENUM ('active', 'completed', 'cancelled');

-- 2. Create Tables

-- Create users table (extends auth.users)
CREATE TABLE public.users (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
  email TEXT NOT NULL,
  role public.user_role NOT NULL DEFAULT 'normal',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create intersections table
CREATE TABLE public.intersections (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  latitude DOUBLE PRECISION,
  longitude DOUBLE PRECISION,
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
  current_count INTEGER DEFAULT 0,
  gst_time INTEGER DEFAULT 0,
  signal_state public.signal_state DEFAULT 'red',
  has_emergency BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(intersection_id, lane_no)
);

-- Create hospitals table
CREATE TABLE public.hospitals (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  latitude DOUBLE PRECISION NOT NULL,
  longitude DOUBLE PRECISION NOT NULL,
  specialties TEXT[] NOT NULL DEFAULT '{}',
  capacity INTEGER DEFAULT 100,
  available_beds INTEGER DEFAULT 50,
  contact_number TEXT,
  address TEXT,
  status TEXT DEFAULT 'active',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create ambulances table
CREATE TABLE public.ambulances (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  vehicle_id TEXT NOT NULL UNIQUE,
  driver_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  current_latitude DOUBLE PRECISION,
  current_longitude DOUBLE PRECISION,
  status TEXT DEFAULT 'available',
  hospital_id UUID REFERENCES public.hospitals(id) ON DELETE SET NULL,
  last_updated TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create emergencies table
CREATE TABLE public.emergencies (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  driver_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  vehicle_id TEXT,
  route JSONB DEFAULT '[]'::jsonb,
  source_latitude DOUBLE PRECISION,
  source_longitude DOUBLE PRECISION,
  destination_latitude DOUBLE PRECISION,
  destination_longitude DOUBLE PRECISION,
  status public.emergency_status DEFAULT 'active',
  priority_level INTEGER DEFAULT 1,
  eta_minutes INTEGER,
  emergency_type TEXT DEFAULT 'medical',
  hospital_id UUID REFERENCES public.hospitals(id) ON DELETE SET NULL,
  ambulance_id UUID REFERENCES public.ambulances(id) ON DELETE SET NULL,
  workflow_status TEXT DEFAULT 'intake',
  patient_name TEXT,
  patient_contact TEXT,
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

-- Create video_feeds table
CREATE TABLE public.video_feeds (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  intersection_id UUID NOT NULL REFERENCES public.intersections(id) ON DELETE CASCADE,
  lane_no INTEGER NOT NULL,
  feed_url TEXT NOT NULL,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- 3. Enable Row Level Security (RLS)
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.intersections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lanes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.hospitals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ambulances ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.emergencies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.video_feeds ENABLE ROW LEVEL SECURITY;

-- 4. Create RLS Policies

-- Public Users Policies
CREATE POLICY "Users can view their own profile" ON public.users FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can update their own profile" ON public.users FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own profile" ON public.users FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Intersections Policies
CREATE POLICY "All users can view intersections" ON public.intersections FOR SELECT TO authenticated USING (TRUE);
CREATE POLICY "Authority users can manage intersections" ON public.intersections FOR ALL TO authenticated
USING (EXISTS (SELECT 1 FROM public.users WHERE users.user_id = auth.uid() AND users.role = 'authority'));

-- Lanes Policies
CREATE POLICY "All users can view lanes" ON public.lanes FOR SELECT TO authenticated USING (TRUE);
CREATE POLICY "Authority users can modify lanes" ON public.lanes FOR ALL TO authenticated
USING (EXISTS (SELECT 1 FROM public.users WHERE users.user_id = auth.uid() AND users.role = 'authority'));

-- Hospitals Policies
CREATE POLICY "All authenticated users can view hospitals" ON public.hospitals FOR SELECT TO authenticated USING (TRUE);
CREATE POLICY "Authority users can manage hospitals" ON public.hospitals FOR ALL TO authenticated
USING (EXISTS (SELECT 1 FROM public.users WHERE users.user_id = auth.uid() AND users.role = 'authority'));

-- Ambulances Policies
CREATE POLICY "All authenticated users can view ambulances" ON public.ambulances FOR SELECT TO authenticated USING (TRUE);
CREATE POLICY "Drivers can update their ambulance" ON public.ambulances FOR UPDATE TO authenticated USING (auth.uid() = driver_id);
CREATE POLICY "Authority users can manage ambulances" ON public.ambulances FOR ALL TO authenticated
USING (EXISTS (SELECT 1 FROM public.users WHERE users.user_id = auth.uid() AND users.role = 'authority'));

-- Emergencies Policies
CREATE POLICY "Emergency drivers can manage their emergencies" ON public.emergencies FOR ALL TO authenticated USING (auth.uid() = driver_id);
CREATE POLICY "Authority users can view all emergencies" ON public.emergencies FOR SELECT TO authenticated
USING (EXISTS (SELECT 1 FROM public.users WHERE users.user_id = auth.uid() AND users.role = 'authority'));

-- Logs Policies
CREATE POLICY "All users can view logs" ON public.logs FOR SELECT TO authenticated USING (TRUE);
CREATE POLICY "Authority users can create logs" ON public.logs FOR INSERT TO authenticated
WITH CHECK (EXISTS (SELECT 1 FROM public.users WHERE users.user_id = auth.uid() AND users.role = 'authority'));

-- Video Feeds Policies
CREATE POLICY "Authority users can view active video feeds" ON public.video_feeds FOR SELECT
USING (is_active = TRUE AND EXISTS (SELECT 1 FROM public.users WHERE users.user_id = auth.uid() AND users.role = 'authority'));
CREATE POLICY "Authority users can manage video feeds" ON public.video_feeds FOR ALL
USING (EXISTS (SELECT 1 FROM public.users WHERE users.user_id = auth.uid() AND users.role = 'authority'));

-- 5. Trigger Functions

-- Trigger function to update timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Trigger function to automatically create public profile on auth user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.users (user_id, email, role)
  VALUES (
    NEW.id, 
    NEW.email, 
    COALESCE(NEW.raw_user_meta_data ->> 'role', 'normal')::public.user_role
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- 6. Attach Triggers
CREATE TRIGGER update_users_updated_at
    BEFORE UPDATE ON public.users
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_intersections_updated_at
    BEFORE UPDATE ON public.intersections
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_lanes_updated_at
    BEFORE UPDATE ON public.lanes
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_hospitals_updated_at
    BEFORE UPDATE ON public.hospitals
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_emergencies_updated_at
    BEFORE UPDATE ON public.emergencies
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 7. Create Optimization Indexes
CREATE INDEX IF NOT EXISTS idx_lanes_intersection_id ON public.lanes(intersection_id);
CREATE INDEX IF NOT EXISTS idx_video_feeds_intersection_id ON public.video_feeds(intersection_id);
CREATE INDEX IF NOT EXISTS idx_emergencies_driver_id ON public.emergencies(driver_id);
CREATE INDEX IF NOT EXISTS idx_emergencies_hospital_id ON public.emergencies(hospital_id);
CREATE INDEX IF NOT EXISTS idx_emergencies_ambulance_id ON public.emergencies(ambulance_id);
CREATE INDEX IF NOT EXISTS idx_ambulances_driver_id ON public.ambulances(driver_id);
CREATE INDEX IF NOT EXISTS idx_ambulances_hospital_id ON public.ambulances(hospital_id);
CREATE INDEX IF NOT EXISTS idx_logs_intersection_id ON public.logs(intersection_id);
CREATE INDEX IF NOT EXISTS idx_logs_emergency_id ON public.logs(emergency_id);

-- 8. Enable Realtime Replication
ALTER TABLE public.lanes REPLICA IDENTITY FULL;
ALTER TABLE public.emergencies REPLICA IDENTITY FULL;
ALTER TABLE public.logs REPLICA IDENTITY FULL;
ALTER TABLE public.ambulances REPLICA IDENTITY FULL;

-- Attempt to add tables to publication if it exists
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.lanes;
    ALTER PUBLICATION supabase_realtime ADD TABLE public.emergencies;
    ALTER PUBLICATION supabase_realtime ADD TABLE public.logs;
    ALTER PUBLICATION supabase_realtime ADD TABLE public.ambulances;
  END IF;
EXCEPTION
  WHEN OTHERS THEN NULL;
END $$;

-- ==========================================================
-- 9. Seed Initial Data
-- ==========================================================

-- Insert Intersections
INSERT INTO public.intersections (name, latitude, longitude, roi_polygons, config) VALUES
('MG Road × Brigade Road', 12.9716, 77.5946, '[]', '{"min_gst": 10, "max_gst": 120, "base_time": 15, "vehicle_factor": 2.5}'),
('Whitefield × ITPL Main', 12.9698, 77.7499, '[]', '{"min_gst": 15, "max_gst": 90, "base_time": 20, "vehicle_factor": 3.0}'),
('Koramangala × Hosur Road', 12.9352, 77.6245, '[]', '{"min_gst": 12, "max_gst": 100, "base_time": 18, "vehicle_factor": 2.2}'),
('Swargate Intersection', 18.5014, 73.8553, '[]', '{"max_gst": 120, "min_gst": 10, "base_time": 15, "vehicle_factor": 2.5}'),
('JM Road × FC Road', 18.5204, 73.8567, '[]', '{"max_gst": 120, "min_gst": 10, "base_time": 15, "vehicle_factor": 2.5}'),
('Shivajinagar Square', 18.5304, 73.8478, '[]', '{"max_gst": 120, "min_gst": 10, "base_time": 15, "vehicle_factor": 2.5}');

-- Insert Lanes
DO $$
DECLARE
    int1_id UUID;
    int2_id UUID;
    int3_id UUID;
    swargate_id UUID;
    jmroad_id UUID;
    shivaji_id UUID;
BEGIN
    SELECT id INTO int1_id FROM public.intersections WHERE name = 'MG Road × Brigade Road';
    SELECT id INTO int2_id FROM public.intersections WHERE name = 'Whitefield × ITPL Main';
    SELECT id INTO int3_id FROM public.intersections WHERE name = 'Koramangala × Hosur Road';
    SELECT id INTO swargate_id FROM public.intersections WHERE name = 'Swargate Intersection';
    SELECT id INTO jmroad_id FROM public.intersections WHERE name = 'JM Road × FC Road';
    SELECT id INTO shivaji_id FROM public.intersections WHERE name = 'Shivajinagar Square';
    
    -- Lanes for MG Road
    INSERT INTO public.lanes (intersection_id, lane_no, direction, vehicle_count, gst_time, signal_state) VALUES
    (int1_id, 1, 'North', 12, 45, 'green'),
    (int1_id, 2, 'South', 8, 0, 'red'),
    (int1_id, 3, 'East', 15, 0, 'red'),
    (int1_id, 4, 'West', 6, 0, 'red');
    
    -- Lanes for Whitefield
    INSERT INTO public.lanes (intersection_id, lane_no, direction, vehicle_count, gst_time, signal_state) VALUES
    (int2_id, 1, 'North', 24, 0, 'red'),
    (int2_id, 2, 'South', 18, 5, 'amber'),
    (int2_id, 3, 'East', 9, 0, 'red'),
    (int2_id, 4, 'West', 14, 0, 'red');
    
    -- Lanes for Koramangala
    INSERT INTO public.lanes (intersection_id, lane_no, direction, vehicle_count, gst_time, signal_state, has_emergency) VALUES
    (int3_id, 1, 'North', 31, 0, 'red', false),
    (int3_id, 2, 'South', 7, 0, 'red', true),
    (int3_id, 3, 'East', 19, 28, 'green', false),
    (int3_id, 4, 'West', 12, 0, 'red', false);

    -- Lanes for Swargate
    INSERT INTO public.lanes (intersection_id, lane_no, direction, vehicle_count, current_count, signal_state) VALUES
    (swargate_id, 1, 'North', 0, 0, 'red'),
    (swargate_id, 2, 'South', 0, 0, 'red'),
    (swargate_id, 3, 'East', 0, 0, 'red'),
    (swargate_id, 4, 'West', 0, 0, 'red');
    
    -- Lanes for JM Road
    INSERT INTO public.lanes (intersection_id, lane_no, direction, vehicle_count, current_count, signal_state) VALUES
    (jmroad_id, 1, 'North', 0, 0, 'red'),
    (jmroad_id, 2, 'South', 0, 0, 'red'),
    (jmroad_id, 3, 'East', 0, 0, 'red'),
    (jmroad_id, 4, 'West', 0, 0, 'red');
    
    -- Lanes for Shivajinagar
    INSERT INTO public.lanes (intersection_id, lane_no, direction, vehicle_count, current_count, signal_state) VALUES
    (shivaji_id, 1, 'North', 0, 0, 'red'),
    (shivaji_id, 2, 'South', 0, 0, 'red'),
    (shivaji_id, 3, 'East', 0, 0, 'red'),
    (shivaji_id, 4, 'West', 0, 0, 'red');
END $$;

-- Insert Hospitals
INSERT INTO public.hospitals (name, latitude, longitude, specialties, address, contact_number) VALUES
('Apollo Hospital Bannerghatta', 12.8897, 77.6010, ARRAY['cardiac', 'trauma', 'neurology', 'emergency'], 'Bannerghatta Road, Bangalore', '+91-80-26304050'),
('Manipal Hospital Whitefield', 12.9698, 77.7499, ARRAY['cardiac', 'oncology', 'orthopedics', 'emergency'], 'ITPL Main Road, Whitefield', '+91-80-66515000'),
('Fortis Hospital', 12.9124, 77.6055, ARRAY['cardiac', 'trauma', 'pediatric', 'emergency'], 'Cunningham Road, Bangalore', '+91-80-66214444'),
('Columbia Asia Hospital', 12.9698, 77.6406, ARRAY['general', 'maternity', 'orthopedics', 'emergency'], 'Hebbal, Bangalore', '+91-80-39885000'),
('Narayana Health City', 12.8132, 77.6752, ARRAY['cardiac', 'neurology', 'cancer', 'emergency'], 'Bommasandra, Bangalore', '+91-80-71222222');

-- Insert Ambulances
INSERT INTO public.ambulances (vehicle_id, current_latitude, current_longitude, status) VALUES
('AMB-001', 12.9716, 77.5946, 'available'),
('AMB-002', 12.9352, 77.6245, 'available'),
('AMB-003', 12.8897, 77.6385, 'available');
