-- =====================================================
-- SUPABASE FUNCTIONS FOR FRAME-SHARER APP
-- =====================================================
-- Run this after the main setup script

-- =====================================================
-- 1. UTILITY FUNCTIONS
-- =====================================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION "public"."update_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- Function to set default plan for new users
CREATE OR REPLACE FUNCTION "public"."set_default_plan"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
  UPDATE public.profiles
  SET plan_id = (SELECT id FROM public.plans WHERE is_default = true)
  WHERE id = NEW.id AND plan_id IS NULL;
  RETURN NEW;
END;
$$;

-- Function to handle new user creation
CREATE OR REPLACE FUNCTION "public"."handle_new_user"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
BEGIN
  INSERT INTO public.profiles (id, first_name, last_name, avatar_url, username)
  VALUES (
    NEW.id, 
    COALESCE(NEW.raw_user_meta_data->>'first_name', ''),
    COALESCE(NEW.raw_user_meta_data->>'last_name', ''),
    COALESCE(NEW.raw_user_meta_data->>'avatar_url', 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcSCpY5LtQ47cqncKMYWucFP41NtJvXU06-tnQ&s'),
    NEW.raw_user_meta_data->>'username'
  );
  RETURN NEW;
END;
$$;

-- Function to set shared_with_user_id
CREATE OR REPLACE FUNCTION "public"."set_shared_with_user_id"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  IF NEW.shared_with IS NOT NULL AND NEW.shared_with_user_id IS NULL THEN
    NEW.shared_with_user_id := (SELECT id FROM auth.users WHERE email = NEW.shared_with LIMIT 1);
  END IF;
  RETURN NEW;
END;
$$;

-- Function to increment storage usage
CREATE OR REPLACE FUNCTION "public"."increment_storage_usage"("user_id" "uuid", "size_mb" numeric) RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
  UPDATE public.profiles
  SET total_size_mb = COALESCE(total_size_mb, 0) + size_mb
  WHERE id = user_id;
END;
$$;

-- Function to check if project is shared with current user
CREATE OR REPLACE FUNCTION "public"."is_project_shared_with_current_user"("p_project_id" "uuid") RETURNS boolean
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 
    FROM project_shares
    WHERE 
      project_shares.project_id = p_project_id AND
      project_shares.shared_with = auth.email() AND
      project_shares.status IN ('pending', 'accepted')
  );
END;
$$;

-- Function to check username availability
CREATE OR REPLACE FUNCTION "public"."is_username_available"("username" "text") RETURNS boolean
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
  RETURN NOT EXISTS (
    SELECT 1 FROM public.profiles WHERE profiles.username = username
  );
END;
$$;

-- =====================================================
-- 2. CORE BUSINESS LOGIC FUNCTIONS
-- =====================================================

-- Function to get complete user projects
CREATE OR REPLACE FUNCTION "public"."get_complete_user_projects"("input_user_id" "uuid", "input_user_email" "text" DEFAULT NULL::"text", "ispublic" boolean DEFAULT false) 
    RETURNS TABLE("id" "uuid", "name" "text", "user_id" "uuid", "visibility" "text", "created_at" timestamp with time zone, "updated_at" timestamp with time zone, "formatted_date" "text", "thumbnail_key" "text", "thumbnail_id" "uuid", "is_shared" boolean, "shared_by_id" "uuid", "shared_by_name" "text", "project_share_id" "uuid")
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  -- First part: Get owned projects with their latest thumbnail
  RETURN QUERY
  SELECT 
    p.id,                  -- Project ID
    p.name,                -- Project name
    p.user_id,             -- Owner ID
    p.visibility::TEXT,    -- Visibility as text
    p.created_at,          -- Creation date
    p.updated_at,          -- Update date
    to_char(p.created_at, 'Mon DD, YYYY'), -- Formatted date
    i.s3_key,              -- Thumbnail S3 key
    i.id AS thumbnail_id,  -- Thumbnail image ID
    FALSE as is_shared,    -- Not shared (owned)
    NULL as shared_by_id,  -- No sharer
    NULL as shared_by_name,-- No sharer name
    NULL as project_share_id -- No share record
  FROM 
    public.projects p
  LEFT JOIN LATERAL (
    -- Get the latest image for each project
    SELECT img.id, img.s3_key
    FROM public.images img
    WHERE img.project_id = p.id
    ORDER BY img.created_at ASC
    LIMIT 1
  ) i ON true
  WHERE 
    p.user_id = input_user_id
    AND (NOT ispublic OR p.visibility = 'public') -- Only public projects if ispublic is true
  
  UNION ALL
  
  -- Second part: Get shared projects - only executed if input_user_email is not null
  SELECT 
    p.id,                  -- Project ID
    p.name,                -- Project name
    p.user_id,             -- Original owner ID
    p.visibility::TEXT,    -- Visibility
    p.created_at,          -- Creation date
    p.updated_at,          -- Update date
    to_char(p.created_at, 'Mon DD, YYYY'), -- Formatted date
    i.s3_key,              -- Thumbnail S3 key
    i.id AS thumbnail_id,  -- Thumbnail image ID
    TRUE as is_shared,     -- Is shared
    ps.shared_by,          -- Sharer's ID
    TRIM(CONCAT(COALESCE(prof.first_name, ''), ' ', COALESCE(prof.last_name, ''))) as shared_by_name, -- Direct concatenation
    ps.id as project_share_id -- Share record ID
  FROM 
    public.project_shares ps
  JOIN 
    public.projects p ON ps.project_id = p.id
  LEFT JOIN 
    public.profiles prof ON ps.shared_by = prof.id
  LEFT JOIN LATERAL (
    -- Get the latest image for each shared project
    SELECT img.id, img.s3_key
    FROM public.images img
    WHERE img.project_id = p.id
    ORDER BY img.created_at DESC
    LIMIT 1
  ) i ON true
  WHERE 
    input_user_email IS NOT NULL -- Skip this part if input_user_email is null
    AND ps.shared_with = input_user_email
    AND ps.status = 'accepted'
    AND (NOT ispublic OR p.visibility = 'public'); -- Only public projects if ispublic is true
    
END;
$$;

-- Function to get image vote counts
CREATE OR REPLACE FUNCTION "public"."get_image_vote_counts"() RETURNS TABLE("image_id" "text", "vote_count" bigint)
    LANGUAGE "sql" SECURITY DEFINER
    AS $$
  SELECT image_id, COUNT(*) as vote_count
  FROM public.image_votes
  GROUP BY image_id
  ORDER BY vote_count DESC;
$$;

-- Function to create storage policies
CREATE OR REPLACE FUNCTION "public"."create_storage_policies"("bucket_name" "text") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'storage'
    AS $$
BEGIN
  -- Allow public read access to all objects
  EXECUTE format('
    CREATE POLICY IF NOT EXISTS "Public Read Access (%s)" 
    ON storage.objects 
    FOR SELECT USING (bucket_id = %L);', 
    bucket_name, bucket_name
  );
  
  -- Allow authenticated users to insert objects
  EXECUTE format('
    CREATE POLICY IF NOT EXISTS "Authenticated Users Can Upload (%s)" 
    ON storage.objects 
    FOR INSERT 
    TO authenticated 
    WITH CHECK (bucket_id = %L);',
    bucket_name, bucket_name
  );
  
  -- Allow users to update their own objects
  EXECUTE format('
    CREATE POLICY IF NOT EXISTS "Users Can Update Own Objects (%s)" 
    ON storage.objects 
    FOR UPDATE 
    TO authenticated 
    USING (bucket_id = %L AND (storage.foldername(name))[1] = auth.uid()::text);',
    bucket_name, bucket_name
  );
  
  -- Allow users to delete their own objects
  EXECUTE format('
    CREATE POLICY IF NOT EXISTS "Users Can Delete Own Objects (%s)" 
    ON storage.objects 
    FOR DELETE 
    TO authenticated 
    USING (bucket_id = %L AND (storage.foldername(name))[1] = auth.uid()::text);',
    bucket_name, bucket_name
  );
END;
$$;

-- =====================================================
-- 3. TRIGGERS
-- =====================================================

-- Triggers for updated_at
CREATE TRIGGER "update_projects_updated_at" BEFORE UPDATE ON "public"."projects" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at"();
CREATE TRIGGER "update_folders_updated_at" BEFORE UPDATE ON "public"."folders" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at"();
CREATE TRIGGER "update_images_updated_at" BEFORE UPDATE ON "public"."images" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at"();
CREATE TRIGGER "update_image_comments_updated_at" BEFORE UPDATE ON "public"."image_comments" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at"();
CREATE TRIGGER "update_project_shares_updated_at" BEFORE UPDATE ON "public"."project_shares" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at"();
CREATE TRIGGER "update_plans_updated_at" BEFORE UPDATE ON "public"."plans" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at"();

-- Triggers for automatic actions
CREATE TRIGGER "on_profile_created" AFTER INSERT ON "public"."profiles" FOR EACH ROW EXECUTE FUNCTION "public"."set_default_plan"();
CREATE TRIGGER "before_project_share_insert" BEFORE INSERT ON "public"."project_shares" FOR EACH ROW EXECUTE FUNCTION "public"."set_shared_with_user_id"();

-- =====================================================
-- 4. GRANTS FOR FUNCTIONS
-- =====================================================

GRANT ALL ON FUNCTION "public"."create_storage_policies"("bucket_name" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."create_storage_policies"("bucket_name" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."create_storage_policies"("bucket_name" "text") TO "service_role";

GRANT ALL ON FUNCTION "public"."get_complete_user_projects"("input_user_id" "uuid", "input_user_email" "text", "ispublic" boolean) TO "anon";
GRANT ALL ON FUNCTION "public"."get_complete_user_projects"("input_user_id" "uuid", "input_user_email" "text", "ispublic" boolean) TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_complete_user_projects"("input_user_id" "uuid", "input_user_email" "text", "ispublic" boolean) TO "service_role";

GRANT ALL ON FUNCTION "public"."get_image_vote_counts"() TO "anon";
GRANT ALL ON FUNCTION "public"."get_image_vote_counts"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_image_vote_counts"() TO "service_role";

GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "anon";
GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "service_role";

GRANT ALL ON FUNCTION "public"."increment_storage_usage"("user_id" "uuid", "size_mb" numeric) TO "anon";
GRANT ALL ON FUNCTION "public"."increment_storage_usage"("user_id" "uuid", "size_mb" numeric) TO "authenticated";
GRANT ALL ON FUNCTION "public"."increment_storage_usage"("user_id" "uuid", "size_mb" numeric) TO "service_role";

GRANT ALL ON FUNCTION "public"."is_project_shared_with_current_user"("p_project_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."is_project_shared_with_current_user"("p_project_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."is_project_shared_with_current_user"("p_project_id" "uuid") TO "service_role";

GRANT ALL ON FUNCTION "public"."is_username_available"("username" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."is_username_available"("username" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."is_username_available"("username" "text") TO "service_role";

GRANT ALL ON FUNCTION "public"."set_default_plan"() TO "anon";
GRANT ALL ON FUNCTION "public"."set_default_plan"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."set_default_plan"() TO "service_role";

GRANT ALL ON FUNCTION "public"."set_shared_with_user_id"() TO "anon";
GRANT ALL ON FUNCTION "public"."set_shared_with_user_id"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."set_shared_with_user_id"() TO "service_role";

GRANT ALL ON FUNCTION "public"."update_updated_at"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_updated_at"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_updated_at"() TO "service_role";
