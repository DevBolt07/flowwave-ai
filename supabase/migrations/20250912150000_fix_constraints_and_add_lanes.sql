-- Migration to fix video_feeds constraint and add missing lane data.

-- Add unique constraint to video_feeds table
ALTER TABLE public.video_feeds
ADD CONSTRAINT video_feeds_intersection_id_lane_no_key UNIQUE (intersection_id, lane_no);

-- Add lane data for other intersections to provide a consistent UI experience.
DO $$
DECLARE
    jm_road_id UUID;
    shivaji_nagar_id UUID;
    swargate_id UUID;
BEGIN
    -- Get IDs for the intersections that are missing lane data.
    -- We assume these intersections already exist in the 'intersections' table.
    SELECT id INTO jm_road_id FROM public.intersections WHERE name = 'JM Road';
    SELECT id INTO shivaji_nagar_id FROM public.intersections WHERE name = 'Shivaji Nagar';
    SELECT id INTO swargate_id FROM public.intersections WHERE name = 'Swargate';

    -- Insert lanes for JM Road, if the ID was found
    IF jm_road_id IS NOT NULL THEN
        -- Check if lanes already exist to prevent duplicates
        IF NOT EXISTS (SELECT 1 FROM public.lanes WHERE intersection_id = jm_road_id) THEN
            INSERT INTO public.lanes (intersection_id, lane_no, direction, signal_state) VALUES
            (jm_road_id, 1, 'North', 'red'),
            (jm_road_id, 2, 'South', 'red'),
            (jm_road_id, 3, 'East', 'red'),
            (jm_road_id, 4, 'West', 'red');
        END IF;
    END IF;

    -- Insert lanes for Shivaji Nagar, if the ID was found
    IF shivaji_nagar_id IS NOT NULL THEN
        IF NOT EXISTS (SELECT 1 FROM public.lanes WHERE intersection_id = shivaji_nagar_id) THEN
            INSERT INTO public.lanes (intersection_id, lane_no, direction, signal_state) VALUES
            (shivaji_nagar_id, 1, 'North', 'red'),
            (shivaji_nagar_id, 2, 'South', 'red'),
            (shivaji_nagar_id, 3, 'East', 'red'),
            (shivaji_nagar_id, 4, 'West', 'red');
        END IF;
    END IF;
    
    -- Insert lanes for Swargate, if the ID was found
    IF swargate_id IS NOT NULL THEN
        IF NOT EXISTS (SELECT 1 FROM public.lanes WHERE intersection_id = swargate_id) THEN
            INSERT INTO public.lanes (intersection_id, lane_no, direction, signal_state) VALUES
            (swargate_id, 1, 'North', 'red'),
            (swargate_id, 2, 'South', 'red'),
            (swargate_id, 3, 'East', 'red'),
            (swargate_id, 4, 'West', 'red');
        END IF;
    END IF;

END $$;
