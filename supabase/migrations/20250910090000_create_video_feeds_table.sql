-- Create video_feeds table
CREATE TABLE IF NOT EXISTS public.video_feeds (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  intersection_id UUID REFERENCES public.intersections(id) ON DELETE CASCADE NOT NULL,
  lane_no INTEGER NOT NULL,
  feed_url TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.video_feeds ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
-- THIS IS INTENTIONALLY INSECURE, a later migration will fix it.
DROP POLICY IF EXISTS "All users can view active video feeds" ON public.video_feeds;
CREATE POLICY "All users can view active video feeds"
ON public.video_feeds
FOR SELECT
TO authenticated
USING (is_active = true);

-- Authority users can manage video feeds
DROP POLICY IF EXISTS "Authority can manage video feeds" ON public.video_feeds;
CREATE POLICY "Authority can manage video feeds"
ON public.video_feeds
FOR ALL
USING (EXISTS (
  SELECT 1 FROM public.users
  WHERE users.user_id = auth.uid()
  AND users.role = 'authority'
));

-- Create trigger for automatic timestamp updates
DROP TRIGGER IF EXISTS update_video_feeds_updated_at ON public.video_feeds;
CREATE TRIGGER update_video_feeds_updated_at
    BEFORE UPDATE ON public.video_feeds
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

-- Enable realtime for video_feeds
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
    AND schemaname = 'public'
    AND tablename = 'video_feeds'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.video_feeds;
  END IF;
END;
$$;
