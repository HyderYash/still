

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;


CREATE EXTENSION IF NOT EXISTS "pgsodium";






COMMENT ON SCHEMA "public" IS 'standard public schema';



CREATE EXTENSION IF NOT EXISTS "pg_graphql" WITH SCHEMA "graphql";






CREATE EXTENSION IF NOT EXISTS "pg_stat_statements" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "pgcrypto" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "pgjwt" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "supabase_vault" WITH SCHEMA "vault";






CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA "extensions";






CREATE TYPE "public"."project_visibility" AS ENUM (
    'public',
    'private'
);


ALTER TYPE "public"."project_visibility" OWNER TO "postgres";


CREATE TYPE "public"."share_request_status" AS ENUM (
    'pending',
    'accepted',
    'rejected'
);


ALTER TYPE "public"."share_request_status" OWNER TO "postgres";


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


ALTER FUNCTION "public"."create_storage_policies"("bucket_name" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_complete_user_projects"("input_user_id" "uuid", "input_user_email" "text") RETURNS TABLE("id" "uuid", "name" "text", "user_id" "uuid", "visibility" "text", "created_at" timestamp with time zone, "updated_at" timestamp with time zone, "formatted_date" "text", "thumbnail_key" "text", "thumbnail_id" "uuid", "is_shared" boolean, "shared_by_id" "uuid", "shared_by_name" "text", "project_share_id" "uuid")
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  RETURN QUERY
  
  -- Get owned projects with their latest thumbnail
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
    
  UNION ALL
  
  -- Get shared projects with their thumbnails - SIMPLIFIED JOIN
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
  -- Direct join with profiles table
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
    ps.shared_with = input_user_email
    AND ps.status = 'accepted';
    
END;
$$;


ALTER FUNCTION "public"."get_complete_user_projects"("input_user_id" "uuid", "input_user_email" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_complete_user_projects"("input_user_id" "uuid", "input_user_email" "text" DEFAULT NULL::"text", "ispublic" boolean DEFAULT false) RETURNS TABLE("id" "uuid", "name" "text", "user_id" "uuid", "visibility" "text", "created_at" timestamp with time zone, "updated_at" timestamp with time zone, "formatted_date" "text", "thumbnail_key" "text", "thumbnail_id" "uuid", "is_shared" boolean, "shared_by_id" "uuid", "shared_by_name" "text", "project_share_id" "uuid")
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


ALTER FUNCTION "public"."get_complete_user_projects"("input_user_id" "uuid", "input_user_email" "text", "ispublic" boolean) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_image_vote_counts"() RETURNS TABLE("image_id" "text", "vote_count" bigint)
    LANGUAGE "sql" SECURITY DEFINER
    AS $$
  SELECT image_id, COUNT(*) as vote_count
  FROM public.image_votes
  GROUP BY image_id
  ORDER BY vote_count DESC;
$$;


ALTER FUNCTION "public"."get_image_vote_counts"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."handle_new_user"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$BEGIN
  INSERT INTO public.profiles (id, first_name, last_name, avatar_url, username)
  VALUES (
    NEW.id, 
    COALESCE(NEW.raw_user_meta_data->>'first_name', ''),
    COALESCE(NEW.raw_user_meta_data->>'last_name', ''),
    COALESCE(NEW.raw_user_meta_data->>'avatar_url', 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcSCpY5LtQ47cqncKMYWucFP41NtJvXU06-tnQ&s'),
    NEW.raw_user_meta_data->>'username'  -- Username is now required
  );
  RETURN NEW;
END;$$;


ALTER FUNCTION "public"."handle_new_user"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."increment_storage_usage"("user_id" "uuid", "size_mb" numeric) RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
  UPDATE public.profiles
  SET total_size_mb = COALESCE(total_size_mb, 0) + size_mb
  WHERE id = user_id;
END;
$$;


ALTER FUNCTION "public"."increment_storage_usage"("user_id" "uuid", "size_mb" numeric) OWNER TO "postgres";


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


ALTER FUNCTION "public"."is_project_shared_with_current_user"("p_project_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."is_username_available"("username" "text") RETURNS boolean
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
  RETURN NOT EXISTS (
    SELECT 1 FROM public.profiles WHERE profiles.username = username
  );
END;
$$;


ALTER FUNCTION "public"."is_username_available"("username" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."notify_project_share"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
DECLARE
  project_name text;
  sharer_name text;
  project_url text;
BEGIN
  -- Get project name
  SELECT name INTO project_name 
  FROM public.projects 
  WHERE id = NEW.project_id;
  
  -- Get sharer's name
  SELECT TRIM(CONCAT(COALESCE(first_name, ''), ' ', COALESCE(last_name, ''))) INTO sharer_name 
  FROM public.profiles 
  WHERE id = NEW.shared_by;
  
  -- If sharer_name is empty, use a generic name
  IF sharer_name IS NULL OR sharer_name = '' THEN
    sharer_name := 'A user';
  END IF;
  
  -- Create project URL
  project_url := 'https://lovable.dev/projects/' || NEW.project_id;
  
  -- Send email notification via pg_notify
  -- Applications can listen to this channel and handle the email sending
  -- This is a placeholder as Postgres itself cannot send emails directly
  PERFORM pg_notify(
    'project_share_emails',
    json_build_object(
      'recipient_email', NEW.shared_with,
      'project_name', project_name,
      'sharer_name', sharer_name,
      'project_url', project_url,
      'share_id', NEW.id
    )::text
  );
  
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."notify_project_share"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."send_email_on_project_share"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
DECLARE
    email_address text;
BEGIN
    email_address := NEW.shared_with; -- Get the email from the new row

    -- Use Supabase's built-in email sending functionality
    PERFORM supabase.auth.api.send_email(email_address, 'New Project Shared', 'A new project has been shared with you.');

    RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."send_email_on_project_share"() OWNER TO "postgres";


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


ALTER FUNCTION "public"."set_default_plan"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."set_shared_with_user_id"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  -- Try to find a user with the provided email
  IF NEW.shared_with IS NOT NULL AND NEW.shared_with_user_id IS NULL THEN
    NEW.shared_with_user_id := (SELECT id FROM auth.users WHERE email = NEW.shared_with LIMIT 1);
  END IF;
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."set_shared_with_user_id"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."update_updated_at"() OWNER TO "postgres";

SET default_tablespace = '';

SET default_table_access_method = "heap";


CREATE TABLE IF NOT EXISTS "public"."folders" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "name" "text" NOT NULL,
    "project_id" "uuid" NOT NULL,
    "parent_id" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."folders" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."image_comments" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "image_id" "uuid",
    "user_id" "uuid",
    "content" "text" NOT NULL,
    "time_marker" "text",
    "is_reply_to" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."image_comments" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."image_votes" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "image_id" "text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."image_votes" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."images" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "project_id" "uuid" NOT NULL,
    "folder_id" "uuid",
    "s3_key" "text" NOT NULL,
    "file_name" "text" NOT NULL,
    "original_file_name" "text",
    "file_size_bytes" bigint,
    "mime_type" "text",
    "width" integer,
    "height" integer,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "user_id" "uuid",
    "is_approved" boolean DEFAULT false,
    "approved_by" "uuid"
);


ALTER TABLE "public"."images" OWNER TO "postgres";


COMMENT ON TABLE "public"."images" IS 'Stores metadata for images uploaded to projects';



CREATE TABLE IF NOT EXISTS "public"."plans" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "name" "text" NOT NULL,
    "storage_limit_bytes" bigint NOT NULL,
    "is_default" boolean DEFAULT false NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "price_cents" integer DEFAULT 0 NOT NULL,
    "price_currency" "text" DEFAULT 'usd'::"text" NOT NULL,
    "stripe_price_id" "text",
    "order_sequence" smallint,
    "allowed_projects" smallint
);


ALTER TABLE "public"."plans" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."profiles" (
    "id" "uuid" NOT NULL,
    "first_name" "text",
    "last_name" "text",
    "avatar_url" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "plan_id" "uuid",
    "total_size_mb" numeric DEFAULT 0,
    "username" "text",
    "profile_page_text" "text"
);


ALTER TABLE "public"."profiles" OWNER TO "postgres";


COMMENT ON COLUMN "public"."profiles"."profile_page_text" IS 'Custom profile page text displayed on user profile';



CREATE TABLE IF NOT EXISTS "public"."project_shares" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "project_id" "uuid" NOT NULL,
    "shared_with" "text" NOT NULL,
    "shared_by" "uuid" NOT NULL,
    "status" "public"."share_request_status" DEFAULT 'pending'::"public"."share_request_status" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "shared_with_user_id" "uuid"
);


ALTER TABLE "public"."project_shares" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."projects" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "name" "text" NOT NULL,
    "visibility" "public"."project_visibility" DEFAULT 'private'::"public"."project_visibility" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."projects" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."subscribers" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid",
    "email" "text" NOT NULL,
    "stripe_customer_id" "text",
    "subscribed" boolean DEFAULT false NOT NULL,
    "subscription_tier" "text",
    "subscription_end" timestamp with time zone,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."subscribers" OWNER TO "postgres";


ALTER TABLE ONLY "public"."folders"
    ADD CONSTRAINT "folders_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."image_comments"
    ADD CONSTRAINT "image_comments_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."image_votes"
    ADD CONSTRAINT "image_votes_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."images"
    ADD CONSTRAINT "images_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."plans"
    ADD CONSTRAINT "plans_name_key" UNIQUE ("name");



ALTER TABLE ONLY "public"."plans"
    ADD CONSTRAINT "plans_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_username_key" UNIQUE ("username");



ALTER TABLE ONLY "public"."project_shares"
    ADD CONSTRAINT "project_shares_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."project_shares"
    ADD CONSTRAINT "project_shares_project_id_shared_with_key" UNIQUE ("project_id", "shared_with");



ALTER TABLE ONLY "public"."projects"
    ADD CONSTRAINT "projects_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."subscribers"
    ADD CONSTRAINT "subscribers_email_key" UNIQUE ("email");



ALTER TABLE ONLY "public"."subscribers"
    ADD CONSTRAINT "subscribers_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."image_votes"
    ADD CONSTRAINT "unique_user_image_vote" UNIQUE ("user_id", "image_id");



CREATE INDEX "idx_images_approved_by" ON "public"."images" USING "btree" ("approved_by");



CREATE INDEX "idx_images_folder_id" ON "public"."images" USING "btree" ("folder_id");



CREATE INDEX "idx_images_is_approved" ON "public"."images" USING "btree" ("is_approved");



CREATE INDEX "idx_images_project_id" ON "public"."images" USING "btree" ("project_id");



CREATE INDEX "idx_images_user_id" ON "public"."images" USING "btree" ("user_id");



CREATE INDEX "idx_profiles_id" ON "public"."profiles" USING "btree" ("id");



CREATE OR REPLACE TRIGGER "before_project_share_insert" BEFORE INSERT ON "public"."project_shares" FOR EACH ROW EXECUTE FUNCTION "public"."set_shared_with_user_id"();



CREATE OR REPLACE TRIGGER "on_profile_created" AFTER INSERT ON "public"."profiles" FOR EACH ROW EXECUTE FUNCTION "public"."set_default_plan"();



CREATE OR REPLACE TRIGGER "update_folders_updated_at" BEFORE UPDATE ON "public"."folders" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at"();



CREATE OR REPLACE TRIGGER "update_plans_updated_at" BEFORE UPDATE ON "public"."plans" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at"();



CREATE OR REPLACE TRIGGER "update_project_shares_updated_at" BEFORE UPDATE ON "public"."project_shares" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at"();



CREATE OR REPLACE TRIGGER "update_projects_updated_at" BEFORE UPDATE ON "public"."projects" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at"();



ALTER TABLE ONLY "public"."folders"
    ADD CONSTRAINT "folders_parent_id_fkey" FOREIGN KEY ("parent_id") REFERENCES "public"."folders"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."folders"
    ADD CONSTRAINT "folders_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."image_comments"
    ADD CONSTRAINT "image_comments_image_id_fkey" FOREIGN KEY ("image_id") REFERENCES "public"."images"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."image_comments"
    ADD CONSTRAINT "image_comments_is_reply_to_fkey" FOREIGN KEY ("is_reply_to") REFERENCES "public"."image_comments"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."image_comments"
    ADD CONSTRAINT "image_comments_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."image_votes"
    ADD CONSTRAINT "image_votes_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."images"
    ADD CONSTRAINT "images_approved_by_fkey" FOREIGN KEY ("approved_by") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."images"
    ADD CONSTRAINT "images_folder_id_fkey" FOREIGN KEY ("folder_id") REFERENCES "public"."folders"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."images"
    ADD CONSTRAINT "images_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."images"
    ADD CONSTRAINT "images_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_id_fkey" FOREIGN KEY ("id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_plan_id_fkey" FOREIGN KEY ("plan_id") REFERENCES "public"."plans"("id");



ALTER TABLE ONLY "public"."project_shares"
    ADD CONSTRAINT "project_shares_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."project_shares"
    ADD CONSTRAINT "project_shares_shared_by_fkey" FOREIGN KEY ("shared_by") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."project_shares"
    ADD CONSTRAINT "project_shares_shared_with_user_id_fkey" FOREIGN KEY ("shared_with_user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."projects"
    ADD CONSTRAINT "projects_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."subscribers"
    ADD CONSTRAINT "subscribers_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



CREATE POLICY "Allow public read access to profile IDs" ON "public"."profiles" FOR SELECT USING (true);



CREATE POLICY "Allow public read access to profile basic info" ON "public"."profiles" FOR SELECT USING (true);



CREATE POLICY "Allow viewing folders for public projects" ON "public"."folders" FOR SELECT TO "authenticated", "anon" USING ((EXISTS ( SELECT 1
   FROM "public"."projects"
  WHERE (("projects"."id" = "folders"."project_id") AND ("projects"."visibility" = 'public'::"public"."project_visibility")))));



CREATE POLICY "Allow viewing images for public projects" ON "public"."images" FOR SELECT TO "authenticated", "anon" USING ((EXISTS ( SELECT 1
   FROM "public"."projects"
  WHERE (("projects"."id" = "images"."project_id") AND ("projects"."visibility" = 'public'::"public"."project_visibility")))));



CREATE POLICY "Allow viewing images for shared projects" ON "public"."images" FOR SELECT TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."project_shares"
  WHERE (("project_shares"."project_id" = "images"."project_id") AND ("project_shares"."shared_with" = (( SELECT "users"."email"
           FROM "auth"."users"
          WHERE ("users"."id" = ( SELECT "auth"."uid"() AS "uid"))))::"text")))));



CREATE POLICY "Anyone can view public projects" ON "public"."projects" FOR SELECT USING (("visibility" = 'public'::"public"."project_visibility"));



CREATE POLICY "Users can create folders in their projects" ON "public"."folders" FOR INSERT WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."projects" "p"
  WHERE (("p"."id" = "folders"."project_id") AND ("p"."user_id" = "auth"."uid"())))));



CREATE POLICY "Users can create their own projects" ON "public"."projects" FOR INSERT WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can delete folders in their projects" ON "public"."folders" FOR DELETE USING ((EXISTS ( SELECT 1
   FROM "public"."projects" "p"
  WHERE (("p"."id" = "folders"."project_id") AND ("p"."user_id" = "auth"."uid"())))));



CREATE POLICY "Users can delete images from their own projects" ON "public"."images" FOR DELETE USING (("project_id" IN ( SELECT "projects"."id"
   FROM "public"."projects"
  WHERE ("projects"."user_id" = "auth"."uid"()))));



CREATE POLICY "Users can delete shares for their own projects" ON "public"."project_shares" FOR DELETE USING ((EXISTS ( SELECT 1
   FROM "public"."projects"
  WHERE (("projects"."id" = "project_shares"."project_id") AND ("projects"."user_id" = "auth"."uid"())))));



CREATE POLICY "Users can delete their own projects" ON "public"."projects" FOR DELETE USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can insert images into their own projects" ON "public"."images" FOR INSERT WITH CHECK (("project_id" IN ( SELECT "projects"."id"
   FROM "public"."projects"
  WHERE ("projects"."user_id" = "auth"."uid"()))));



CREATE POLICY "Users can see profiles of project sharers" ON "public"."profiles" FOR SELECT USING (("id" IN ( SELECT "project_shares"."shared_by"
   FROM "public"."project_shares"
  WHERE (("project_shares"."shared_with" = ("auth"."jwt"() ->> 'email'::"text")) AND ("project_shares"."status" = 'accepted'::"public"."share_request_status")))));



CREATE POLICY "Users can share their own projects" ON "public"."project_shares" FOR INSERT WITH CHECK (((EXISTS ( SELECT 1
   FROM "public"."projects"
  WHERE (("projects"."id" = "project_shares"."project_id") AND ("projects"."user_id" = "auth"."uid"())))) AND ("auth"."uid"() = "shared_by")));



CREATE POLICY "Users can update folders in their projects" ON "public"."folders" FOR UPDATE USING ((EXISTS ( SELECT 1
   FROM "public"."projects" "p"
  WHERE (("p"."id" = "folders"."project_id") AND ("p"."user_id" = "auth"."uid"())))));



CREATE POLICY "Users can update images in their own projects" ON "public"."images" FOR UPDATE USING (("project_id" IN ( SELECT "projects"."id"
   FROM "public"."projects"
  WHERE ("projects"."user_id" = "auth"."uid"()))));



CREATE POLICY "Users can update share requests for themselves" ON "public"."project_shares" FOR UPDATE USING ((EXISTS ( SELECT 1
   FROM "auth"."users"
  WHERE ((("users"."email")::"text" = "project_shares"."shared_with") AND ("users"."id" = "auth"."uid"())))));



CREATE POLICY "Users can update their own profile" ON "public"."profiles" FOR UPDATE USING (("auth"."uid"() = "id"));



CREATE POLICY "Users can update their own projects" ON "public"."projects" FOR UPDATE USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can view images from their own projects" ON "public"."images" FOR SELECT USING (("project_id" IN ( SELECT "projects"."id"
   FROM "public"."projects"
  WHERE ("projects"."user_id" = "auth"."uid"()))));



CREATE POLICY "Users can view images of shared projects" ON "public"."images" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."project_shares"
  WHERE (("project_shares"."project_id" = "images"."project_id") AND ("project_shares"."shared_with" = "auth"."email"()) AND ("project_shares"."status" = ANY (ARRAY['pending'::"public"."share_request_status", 'accepted'::"public"."share_request_status"]))))));



CREATE POLICY "Users can view profiles of users who shared projects with them" ON "public"."profiles" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."project_shares"
  WHERE (("project_shares"."shared_by" = "profiles"."id") AND ("project_shares"."shared_with" = "auth"."email"())))));



CREATE POLICY "Users can view projects shared with them" ON "public"."projects" FOR SELECT USING ("public"."is_project_shared_with_current_user"("id"));



CREATE POLICY "Users can view shares for their projects" ON "public"."project_shares" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."projects"
  WHERE (("projects"."id" = "project_shares"."project_id") AND ("projects"."user_id" = "auth"."uid"())))));



CREATE POLICY "Users can view shares where they are recipients" ON "public"."project_shares" FOR SELECT USING (("auth"."email"() = "shared_with"));



CREATE POLICY "Users can view shares where they are the recipient" ON "public"."project_shares" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "auth"."users"
  WHERE ((("users"."email")::"text" = "project_shares"."shared_with") AND ("users"."id" = "auth"."uid"())))));



CREATE POLICY "Users can view their own images" ON "public"."images" FOR SELECT USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can view their own profile" ON "public"."profiles" FOR SELECT USING (("auth"."uid"() = "id"));



CREATE POLICY "Users can view their own projects" ON "public"."projects" FOR SELECT USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can view their project folders" ON "public"."folders" FOR SELECT USING (((EXISTS ( SELECT 1
   FROM "public"."projects" "p"
  WHERE (("p"."id" = "folders"."project_id") AND ("p"."user_id" = "auth"."uid"())))) OR (EXISTS ( SELECT 1
   FROM "public"."project_shares" "ps"
  WHERE (("ps"."project_id" = "folders"."project_id") AND ("ps"."shared_with" = (( SELECT "users"."email"
           FROM "auth"."users"
          WHERE ("users"."id" = "auth"."uid"())))::"text") AND ("ps"."status" = 'accepted'::"public"."share_request_status"))))));



ALTER TABLE "public"."folders" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."image_votes" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."images" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "insert_own_votes" ON "public"."image_votes" FOR INSERT WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "insert_subscription" ON "public"."subscribers" FOR INSERT WITH CHECK (true);



ALTER TABLE "public"."profiles" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."project_shares" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."projects" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "select_own_subscription" ON "public"."subscribers" FOR SELECT USING ((("user_id" = "auth"."uid"()) OR ("email" = "auth"."email"())));



ALTER TABLE "public"."subscribers" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "update_own_subscription" ON "public"."subscribers" FOR UPDATE USING (true);



CREATE POLICY "view_votes" ON "public"."image_votes" FOR SELECT USING (true);





ALTER PUBLICATION "supabase_realtime" OWNER TO "postgres";






ALTER PUBLICATION "supabase_realtime" ADD TABLE ONLY "public"."folders";



ALTER PUBLICATION "supabase_realtime" ADD TABLE ONLY "public"."project_shares";



ALTER PUBLICATION "supabase_realtime" ADD TABLE ONLY "public"."projects";



GRANT USAGE ON SCHEMA "public" TO "postgres";
GRANT USAGE ON SCHEMA "public" TO "anon";
GRANT USAGE ON SCHEMA "public" TO "authenticated";
GRANT USAGE ON SCHEMA "public" TO "service_role";




















































































































































































GRANT ALL ON FUNCTION "public"."create_storage_policies"("bucket_name" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."create_storage_policies"("bucket_name" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."create_storage_policies"("bucket_name" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_complete_user_projects"("input_user_id" "uuid", "input_user_email" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."get_complete_user_projects"("input_user_id" "uuid", "input_user_email" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_complete_user_projects"("input_user_id" "uuid", "input_user_email" "text") TO "service_role";



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



GRANT ALL ON FUNCTION "public"."notify_project_share"() TO "anon";
GRANT ALL ON FUNCTION "public"."notify_project_share"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."notify_project_share"() TO "service_role";



GRANT ALL ON FUNCTION "public"."send_email_on_project_share"() TO "anon";
GRANT ALL ON FUNCTION "public"."send_email_on_project_share"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."send_email_on_project_share"() TO "service_role";



GRANT ALL ON FUNCTION "public"."set_default_plan"() TO "anon";
GRANT ALL ON FUNCTION "public"."set_default_plan"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."set_default_plan"() TO "service_role";



GRANT ALL ON FUNCTION "public"."set_shared_with_user_id"() TO "anon";
GRANT ALL ON FUNCTION "public"."set_shared_with_user_id"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."set_shared_with_user_id"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_updated_at"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_updated_at"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_updated_at"() TO "service_role";


















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



ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES  TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES  TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES  TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES  TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS  TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS  TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS  TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS  TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES  TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES  TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES  TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES  TO "service_role";






























RESET ALL;
