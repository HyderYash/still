-- Fix the broken RLS policy for image_comments INSERT
-- The current policy is missing EXISTS keyword

-- Drop the broken policy
DROP POLICY IF EXISTS "Users can insert comments on images they can see" ON "public"."image_comments";

-- Create the corrected policy
CREATE POLICY "Users can insert comments on images they can see" ON "public"."image_comments" FOR INSERT WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.images i
    WHERE i.id = image_comments.image_id
    AND (
      -- User can comment if they own the project
      EXISTS (SELECT 1 FROM public.projects p WHERE p.id = i.project_id AND p.user_id = auth.uid())
      -- Or if the project is public
      OR EXISTS (SELECT 1 FROM public.projects p WHERE p.id = i.project_id AND p.visibility = 'public')
      -- Or if the project is shared with them
      OR EXISTS (
        SELECT 1 FROM public.project_shares ps 
        WHERE ps.project_id = i.project_id 
        AND ps.shared_with = auth.email() 
        AND ps.status IN ('pending', 'accepted')
      )
    )
  )
  AND user_id = auth.uid()
);

-- Test the policy by checking if it exists
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies 
WHERE tablename = 'image_comments' 
AND policyname = 'Users can insert comments on images they can see';
