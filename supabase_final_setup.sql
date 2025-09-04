-- =====================================================
-- SUPABASE FINAL SETUP FOR FRAME-SHARER APP
-- =====================================================
-- Run this last to complete the setup

-- =====================================================
-- 1. GRANTS AND PERMISSIONS
-- =====================================================

-- Grant permissions to all roles
GRANT USAGE ON SCHEMA "public" TO "postgres";
GRANT USAGE ON SCHEMA "public" TO "anon";
GRANT USAGE ON SCHEMA "public" TO "authenticated";
GRANT USAGE ON SCHEMA "public" TO "service_role";

-- Grant table permissions
GRANT ALL ON TABLE "public"."folders" TO "anon";
GRANT ALL ON TABLE "public"."folders" TO "authenticated";
GRANT ALL ON TABLE "public"."folders" TO "service_role";

GRANT ALL ON TABLE "public"."image_comments" TO "anon";
GRANT ALL ON TABLE "public"."image_comments" TO "authenticated";
GRANT ALL ON TABLE "public"."image_comments" TO "service_role";

GRANT ALL ON TABLE "public"."image_votes" TO "anon";
GRANT ALL ON TABLE "public"."image_votes" TO "authenticated";
GRANT ALL ON TABLE "public"."image_votes" TO "service_role";

GRANT ALL ON TABLE "public"."images" TO "anon";
GRANT ALL ON TABLE "public"."images" TO "authenticated";
GRANT ALL ON TABLE "public"."images" TO "service_role";

GRANT ALL ON TABLE "public"."plans" TO "anon";
GRANT ALL ON TABLE "public"."plans" TO "authenticated";
GRANT ALL ON TABLE "public"."plans" TO "service_role";

GRANT ALL ON TABLE "public"."profiles" TO "anon";
GRANT ALL ON TABLE "public"."profiles" TO "authenticated";
GRANT ALL ON TABLE "public"."profiles" TO "service_role";

GRANT ALL ON TABLE "public"."project_shares" TO "anon";
GRANT ALL ON TABLE "public"."project_shares" TO "authenticated";
GRANT ALL ON TABLE "public"."project_shares" TO "service_role";

GRANT ALL ON TABLE "public"."projects" TO "anon";
GRANT ALL ON TABLE "public"."projects" TO "authenticated";
GRANT ALL ON TABLE "public"."projects" TO "service_role";

GRANT ALL ON TABLE "public"."subscribers" TO "anon";
GRANT ALL ON TABLE "public"."subscribers" TO "authenticated";
GRANT ALL ON TABLE "public"."subscribers" TO "service_role";

-- Grant default privileges
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "service_role";

ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "service_role";

ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "service_role";

-- =====================================================
-- 2. REALTIME SUBSCRIPTIONS
-- =====================================================

-- Enable realtime for key tables
-- Note: The publication name might be different in your Supabase instance
-- If you get an error, check what publications exist with: SELECT * FROM pg_publication;

-- Try the standard name first
DO $$ 
BEGIN
    ALTER PUBLICATION "supabase_realtime" ADD TABLE ONLY "public"."folders";
EXCEPTION
    WHEN undefined_object THEN
        -- Try alternative publication names
        BEGIN
            ALTER PUBLICATION "realtime" ADD TABLE ONLY "public"."folders";
        EXCEPTION
            WHEN undefined_object THEN
                -- Create a new publication if none exists
                CREATE PUBLICATION "supabase_realtime" FOR TABLE "public"."folders";
        END;
END $$;

DO $$ 
BEGIN
    ALTER PUBLICATION "supabase_realtime" ADD TABLE ONLY "public"."project_shares";
EXCEPTION
    WHEN undefined_object THEN
        BEGIN
            ALTER PUBLICATION "realtime" ADD TABLE ONLY "public"."project_shares";
        EXCEPTION
            WHEN undefined_object THEN
                ALTER PUBLICATION "supabase_realtime" ADD TABLE ONLY "public"."project_shares";
        END;
END $$;

DO $$ 
BEGIN
    ALTER PUBLICATION "supabase_realtime" ADD TABLE ONLY "public"."projects";
EXCEPTION
    WHEN undefined_object THEN
        BEGIN
            ALTER PUBLICATION "realtime" ADD TABLE ONLY "public"."projects";
        EXCEPTION
            WHEN undefined_object THEN
                ALTER PUBLICATION "supabase_realtime" ADD TABLE ONLY "public"."projects";
        END;
END $$;

-- =====================================================
-- 3. STORAGE BUCKET SETUP
-- =====================================================

-- Create storage buckets (run these in Storage section of Supabase dashboard)
-- 1. Go to Storage > Buckets
-- 2. Create these buckets:
--    - project-images (for uploaded images)
--    - project-thumbnails (for project thumbnails)
--    - user-avatars (for profile pictures)

-- After creating buckets, run these commands:
-- SELECT create_storage_policies('project-images');
-- SELECT create_storage_policies('project-thumbnails');
-- SELECT create_storage_policies('user-avatars');

-- =====================================================
-- 4. AUTHENTICATION SETUP
-- =====================================================

-- Go to Authentication > Settings in your Supabase dashboard and configure:

-- 1. Site URL: Your app's domain (e.g., http://localhost:3000 for development)
-- 2. Redirect URLs: Add your app's URLs where users should be redirected after auth
-- 3. Enable providers:
--    - Email (enable "Confirm email" if you want email verification)
--    - Google OAuth (add your Google OAuth credentials)
--    - Any other providers you want

-- =====================================================
-- 5. ENVIRONMENT VARIABLES
-- =====================================================

-- Make sure your app has these environment variables set:

-- VITE_SUPABASE_URL=https://qbsnyrsolodragotgzps.supabase.co
-- VITE_SUPABASE_ANON_KEY=your_anon_key_here

-- =====================================================
-- 6. TESTING THE SETUP
-- =====================================================

-- Test that everything is working:

-- 1. Try to create a user account
-- 2. Check that a profile was automatically created
-- 3. Try to create a project
-- 4. Test image upload (if you have storage set up)
-- 5. Test project sharing

-- =====================================================
-- SETUP COMPLETE! 🎉
-- =====================================================

-- Your Supabase instance is now ready for the Frame-Sharer app!

-- Next steps:
-- 1. Test the authentication flow
-- 2. Create some test projects
-- 3. Test image uploads
-- 4. Test project sharing
-- 5. Deploy your app!

-- If you encounter any issues:
-- 1. Check the Supabase logs in the dashboard
-- 2. Verify all policies are created correctly
-- 3. Check that RLS is enabled on all tables
-- 4. Ensure all functions have proper grants
