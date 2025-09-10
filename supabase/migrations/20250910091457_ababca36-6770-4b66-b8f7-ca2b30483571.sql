-- Fix security vulnerability: Restrict video feed access to authority users only
-- Remove the overly permissive policy that allows all users to view video feeds
DROP POLICY IF EXISTS "All users can view active video feeds" ON public.video_feeds;

-- Create a new restrictive policy that only allows authority users to view video feeds
CREATE POLICY "Authority users can view active video feeds" 
ON public.video_feeds 
FOR SELECT 
USING (
  is_active = true 
  AND EXISTS (
    SELECT 1 
    FROM public.users 
    WHERE users.user_id = auth.uid() 
    AND users.role = 'authority'::user_role
  )
);

-- Log this security fix
INSERT INTO public.logs (event_type, message, metadata) 
VALUES (
  'security_fix', 
  'Fixed video feed access vulnerability - restricted to authority users only',
  '{"previous_policy": "all_users", "new_policy": "authority_only", "security_level": "critical"}'::jsonb
);