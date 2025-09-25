-- Add current_count column to lanes table if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'lanes' AND column_name = 'current_count') THEN
        ALTER TABLE public.lanes ADD COLUMN current_count integer DEFAULT 0;
    END IF;
END $$;

-- Insert Pune intersections if they don't exist
INSERT INTO public.intersections (name, latitude, longitude, config) 
SELECT name, latitude, longitude, config::jsonb FROM (VALUES
    ('Swargate Intersection', 18.5014, 73.8553, '{"max_gst": 120, "min_gst": 10, "base_time": 15, "vehicle_factor": 2.5}'),
    ('JM Road × FC Road', 18.5204, 73.8567, '{"max_gst": 120, "min_gst": 10, "base_time": 15, "vehicle_factor": 2.5}'),
    ('Shivajinagar Square', 18.5304, 73.8478, '{"max_gst": 120, "min_gst": 10, "base_time": 15, "vehicle_factor": 2.5}')
) AS v(name, latitude, longitude, config)
WHERE NOT EXISTS (SELECT 1 FROM public.intersections WHERE intersections.name = v.name);