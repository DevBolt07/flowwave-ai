-- Create video_feeds table
CREATE TABLE public.video_feeds (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  intersection_id UUID NOT NULL REFERENCES public.intersections(id) ON DELETE CASCADE,
  lane_no INTEGER NOT NULL,
  feed_url TEXT NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on video_feeds
ALTER TABLE public.video_feeds ENABLE ROW LEVEL SECURITY;

-- RLS Policies for video_feeds
CREATE POLICY "All users can view active video feeds"
ON public.video_feeds
FOR SELECT
USING (is_active = true);

CREATE POLICY "Authority users can manage video feeds"
ON public.video_feeds
FOR ALL
USING (EXISTS (
  SELECT 1 FROM public.users 
  WHERE users.user_id = auth.uid() 
  AND users.role = 'authority'
));

-- Add trigger for updated_at
CREATE TRIGGER update_video_feeds_updated_at
BEFORE UPDATE ON public.video_feeds
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Add current_count column to lanes if not exists (for real-time detection)
ALTER TABLE public.lanes ADD COLUMN IF NOT EXISTS current_count INTEGER DEFAULT 0;

-- Create index for performance
CREATE INDEX idx_video_feeds_intersection_lane ON public.video_feeds(intersection_id, lane_no);
CREATE INDEX idx_video_feeds_active ON public.video_feeds(is_active) WHERE is_active = true;

-- Enable realtime for video_feeds
ALTER PUBLICATION supabase_realtime ADD TABLE public.video_feeds;