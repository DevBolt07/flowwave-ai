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

-- Enable RLS
ALTER TABLE public.hospitals ENABLE ROW LEVEL SECURITY;

-- Create policies for hospitals
CREATE POLICY "All authenticated users can view hospitals"
ON public.hospitals
FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Authority users can manage hospitals"
ON public.hospitals
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM users 
    WHERE users.user_id = auth.uid() 
    AND users.role = 'authority'::user_role
  )
);

-- Create ambulances table for tracking
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

-- Enable RLS for ambulances
ALTER TABLE public.ambulances ENABLE ROW LEVEL SECURITY;

CREATE POLICY "All authenticated users can view ambulances"
ON public.ambulances
FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Drivers can update their ambulance"
ON public.ambulances
FOR UPDATE
TO authenticated
USING (auth.uid() = driver_id);

CREATE POLICY "Authority users can manage ambulances"
ON public.ambulances
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM users 
    WHERE users.user_id = auth.uid() 
    AND users.role = 'authority'::user_role
  )
);

-- Update emergencies table with more fields
ALTER TABLE public.emergencies 
ADD COLUMN IF NOT EXISTS emergency_type TEXT DEFAULT 'medical',
ADD COLUMN IF NOT EXISTS hospital_id UUID REFERENCES public.hospitals(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS ambulance_id UUID REFERENCES public.ambulances(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS workflow_status TEXT DEFAULT 'intake',
ADD COLUMN IF NOT EXISTS patient_name TEXT,
ADD COLUMN IF NOT EXISTS patient_contact TEXT;

-- Add trigger for updated_at
CREATE TRIGGER update_hospitals_updated_at
BEFORE UPDATE ON public.hospitals
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Insert sample hospitals in Bangalore
INSERT INTO public.hospitals (name, latitude, longitude, specialties, address, contact_number) VALUES
('Apollo Hospital Bannerghatta', 12.8897, 77.6010, ARRAY['cardiac', 'trauma', 'neurology', 'emergency'], 'Bannerghatta Road, Bangalore', '+91-80-26304050'),
('Manipal Hospital Whitefield', 12.9698, 77.7499, ARRAY['cardiac', 'oncology', 'orthopedics', 'emergency'], 'ITPL Main Road, Whitefield', '+91-80-66515000'),
('Fortis Hospital', 12.9124, 77.6055, ARRAY['cardiac', 'trauma', 'pediatric', 'emergency'], 'Cunningham Road, Bangalore', '+91-80-66214444'),
('Columbia Asia Hospital', 12.9698, 77.6406, ARRAY['general', 'maternity', 'orthopedics', 'emergency'], 'Hebbal, Bangalore', '+91-80-39885000'),
('Narayana Health City', 12.8132, 77.6752, ARRAY['cardiac', 'neurology', 'cancer', 'emergency'], 'Bommasandra, Bangalore', '+91-80-71222222');

-- Insert sample ambulances
INSERT INTO public.ambulances (vehicle_id, current_latitude, current_longitude, status) VALUES
('AMB-001', 12.9716, 77.5946, 'available'),
('AMB-002', 12.9352, 77.6245, 'available'),
('AMB-003', 12.8897, 77.6385, 'available');