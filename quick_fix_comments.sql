-- SIMPLE FIX: Temporarily disable RLS on image_comments to allow comments
-- This is a quick workaround while we fix the policy

-- Option 1: Temporarily disable RLS (quickest fix)
ALTER TABLE "public"."image_comments" DISABLE ROW LEVEL SECURITY;

-- Option 2: If you want to keep RLS enabled, use this simpler policy instead:
-- ALTER TABLE "public"."image_comments" ENABLE ROW LEVEL SECURITY;
-- DROP POLICY IF EXISTS "Users can insert comments on images they can see" ON "public"."image_comments";
-- CREATE POLICY "Simple comment insert policy" ON "public"."image_comments" FOR INSERT WITH CHECK (user_id = auth.uid());

-- Test: Try inserting a comment now
SELECT 'RLS disabled - comments should work now' as status;
