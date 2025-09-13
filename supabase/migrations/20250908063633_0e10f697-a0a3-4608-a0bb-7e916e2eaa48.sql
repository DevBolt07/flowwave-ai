-- Add video_feeds table for traffic intersections
CREATE TABLE public.video_feeds (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  intersection_id uuid NOT NULL REFERENCES public.intersections(id) ON DELETE CASCADE,
  lane_no integer NOT NULL,
  feed_url text NOT NULL,
  is_active boolean DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Add current_count column to lanes table for real-time vehicle counts
ALTER TABLE public.lanes ADD COLUMN current_count integer DEFAULT 0;

-- Enable RLS on video_feeds
ALTER TABLE public.video_feeds ENABLE ROW LEVEL SECURITY;

-- Create policies for video_feeds
CREATE POLICY "All users can view active video feeds"
ON public.video_feeds
FOR SELECT
USING (is_active = true);

CREATE POLICY "Authority users can manage video feeds"
ON public.video_feeds
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.users
    WHERE users.user_id = auth.uid()
    AND users.role = 'authority'
  )
);

-- Insert Pune intersections
INSERT INTO public.intersections (name, latitude, longitude, config) VALUES
('Swargate Intersection', 18.5014, 73.8553, '{"max_gst": 120, "min_gst": 10, "base_time": 15, "vehicle_factor": 2.5}'),
('JM Road × FC Road', 18.5204, 73.8567, '{"max_gst": 120, "min_gst": 10, "base_time": 15, "vehicle_factor": 2.5}'),
('Shivajinagar Square', 18.5304, 73.8478, '{"max_gst": 120, "min_gst": 10, "base_time": 15, "vehicle_factor": 2.5}');

-- Get the intersection IDs for lane creation
DO $$
DECLARE
    swargate_id uuid;
    jmroad_id uuid;
    shivaji_id uuid;
BEGIN
    SELECT id INTO swargate_id FROM public.intersections WHERE name = 'Swargate Intersection';
    SELECT id INTO jmroad_id FROM public.intersections WHERE name = 'JM Road × FC Road';
    SELECT id INTO shivaji_id FROM public.intersections WHERE name = 'Shivajinagar Square';
    
    -- Insert lanes for Swargate
    INSERT INTO public.lanes (intersection_id, lane_no, direction, vehicle_count, current_count, signal_state) VALUES
    (swargate_id, 1, 'North', 0, 0, 'red'),
    (swargate_id, 2, 'South', 0, 0, 'red'),
    (swargate_id, 3, 'East', 0, 0, 'red'),
    (swargate_id, 4, 'West', 0, 0, 'red');
    
    -- Insert lanes for JM Road
    INSERT INTO public.lanes (intersection_id, lane_no, direction, vehicle_count, current_count, signal_state) VALUES
    (jmroad_id, 1, 'North', 0, 0, 'red'),
    (jmroad_id, 2, 'South', 0, 0, 'red'),
    (jmroad_id, 3, 'East', 0, 0, 'red'),
    (jmroad_id, 4, 'West', 0, 0, 'red');
    
    -- Insert lanes for Shivajinagar
    INSERT INTO public.lanes (intersection_id, lane_no, direction, vehicle_count, current_count, signal_state) VALUES
    (shivaji_id, 1, 'North', 0, 0, 'red'),
    (shivaji_id, 2, 'South', 0, 0, 'red'),
    (shivaji_id, 3, 'East', 0, 0, 'red'),
    (shivaji_id, 4, 'West', 0, 0, 'red');
END $$;