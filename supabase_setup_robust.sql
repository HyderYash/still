-- =====================================================
-- ROBUST SUPABASE SETUP SCRIPT FOR FRAME-SHARER APP
-- =====================================================
-- This script handles existing objects gracefully
-- Run this in your Supabase SQL Editor to get everything working

-- =====================================================
-- 1. EXTENSIONS AND ENUM TYPES
-- =====================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Project visibility enum
DO $$ BEGIN
    CREATE TYPE "public"."project_visibility" AS ENUM ('public', 'private');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Share request status enum
DO $$ BEGIN
    CREATE TYPE "public"."share_request_status" AS ENUM ('pending', 'accepted', 'rejected');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- =====================================================
-- 2. DROP EXISTING TABLES (IF THEY EXIST)
-- =====================================================

-- Drop tables in reverse dependency order
DROP TABLE IF EXISTS "public"."subscribers" CASCADE;
DROP TABLE IF EXISTS "public"."project_shares" CASCADE;
DROP TABLE IF EXISTS "public"."image_votes" CASCADE;
DROP TABLE IF EXISTS "public"."image_comments" CASCADE;
DROP TABLE IF EXISTS "public"."images" CASCADE;
DROP TABLE IF EXISTS "public"."folders" CASCADE;
DROP TABLE IF EXISTS "public"."profiles" CASCADE;
DROP TABLE IF EXISTS "public"."projects" CASCADE;
DROP TABLE IF EXISTS "public"."plans" CASCADE;

-- =====================================================
-- 3. CREATE TABLES
-- =====================================================

-- Plans table for subscription tiers
CREATE TABLE "public"."plans" (
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
    "allowed_projects" smallint,
    CONSTRAINT "plans_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "plans_name_key" UNIQUE ("name")
);

-- Projects table
CREATE TABLE "public"."projects" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "name" "text" NOT NULL,
    "visibility" "public"."project_visibility" DEFAULT 'private'::"public"."project_visibility" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "projects_pkey" PRIMARY KEY ("id")
);

-- Profiles table
CREATE TABLE "public"."profiles" (
    "id" "uuid" NOT NULL,
    "first_name" "text",
    "last_name" "text",
    "avatar_url" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "plan_id" "uuid",
    "total_size_mb" numeric DEFAULT 0,
    "username" "text",
    "profile_page_text" "text",
    CONSTRAINT "profiles_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "profiles_username_key" UNIQUE ("username")
);

-- Folders table
CREATE TABLE "public"."folders" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "name" "text" NOT NULL,
    "project_id" "uuid" NOT NULL,
    "parent_id" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "folders_pkey" PRIMARY KEY ("id")
);

-- Images table
CREATE TABLE "public"."images" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
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
    "approved_by" "uuid",
    CONSTRAINT "images_pkey" PRIMARY KEY ("id")
);

-- Image comments table
CREATE TABLE "public"."image_comments" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "image_id" "uuid",
    "user_id" "uuid",
    "content" "text" NOT NULL,
    "time_marker" "text",
    "is_reply_to" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "image_comments_pkey" PRIMARY KEY ("id")
);

-- Image votes table
CREATE TABLE "public"."image_votes" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "image_id" "text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "image_votes_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "unique_user_image_vote" UNIQUE ("user_id", "image_id")
);

-- Project shares table
CREATE TABLE "public"."project_shares" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "project_id" "uuid" NOT NULL,
    "shared_with" "text" NOT NULL,
    "shared_by" "uuid" NOT NULL,
    "status" "public"."share_request_status" DEFAULT 'pending'::"public"."share_request_status" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "shared_with_user_id" "uuid",
    CONSTRAINT "project_shares_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "project_shares_project_id_shared_with_key" UNIQUE ("project_id", "shared_with")
);

-- Subscribers table
CREATE TABLE "public"."subscribers" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid",
    "email" "text" NOT NULL,
    "stripe_customer_id" "text",
    "subscribed" boolean DEFAULT false NOT NULL,
    "subscription_tier" "text",
    "subscription_end" timestamp with time zone,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "subscribers_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "subscribers_email_key" UNIQUE ("email")
);

-- =====================================================
-- 4. FOREIGN KEY CONSTRAINTS
-- =====================================================

-- Profiles foreign keys
ALTER TABLE "public"."profiles" ADD CONSTRAINT "profiles_id_fkey" 
    FOREIGN KEY ("id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;
ALTER TABLE "public"."profiles" ADD CONSTRAINT "profiles_plan_id_fkey" 
    FOREIGN KEY ("plan_id") REFERENCES "public"."plans"("id");

-- Projects foreign keys
ALTER TABLE "public"."projects" ADD CONSTRAINT "projects_user_id_fkey" 
    FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;

-- Folders foreign keys
ALTER TABLE "public"."folders" ADD CONSTRAINT "folders_parent_id_fkey" 
    FOREIGN KEY ("parent_id") REFERENCES "public"."folders"("id") ON DELETE CASCADE;
ALTER TABLE "public"."folders" ADD CONSTRAINT "folders_project_id_fkey" 
    FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE CASCADE;

-- Images foreign keys
ALTER TABLE "public"."images" ADD CONSTRAINT "images_folder_id_fkey" 
    FOREIGN KEY ("folder_id") REFERENCES "public"."folders"("id") ON DELETE SET NULL;
ALTER TABLE "public"."images" ADD CONSTRAINT "images_project_id_fkey" 
    FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE CASCADE;
ALTER TABLE "public"."images" ADD CONSTRAINT "images_user_id_fkey" 
    FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id");
ALTER TABLE "public"."images" ADD CONSTRAINT "images_approved_by_fkey" 
    FOREIGN KEY ("approved_by") REFERENCES "auth"."users"("id");

-- Image comments foreign keys
ALTER TABLE "public"."image_comments" ADD CONSTRAINT "image_comments_image_id_fkey" 
    FOREIGN KEY ("image_id") REFERENCES "public"."images"("id") ON DELETE CASCADE;
ALTER TABLE "public"."image_comments" ADD CONSTRAINT "image_comments_is_reply_to_fkey" 
    FOREIGN KEY ("is_reply_to") REFERENCES "public"."image_comments"("id") ON DELETE CASCADE;
ALTER TABLE "public"."image_comments" ADD CONSTRAINT "image_comments_user_id_fkey" 
    FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;

-- Image votes foreign keys
ALTER TABLE "public"."image_votes" ADD CONSTRAINT "image_votes_user_id_fkey" 
    FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id");

-- Project shares foreign keys
ALTER TABLE "public"."project_shares" ADD CONSTRAINT "project_shares_project_id_fkey" 
    FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE CASCADE;
ALTER TABLE "public"."project_shares" ADD CONSTRAINT "project_shares_shared_by_fkey" 
    FOREIGN KEY ("shared_by") REFERENCES "auth"."users"("id") ON DELETE CASCADE;
ALTER TABLE "public"."project_shares" ADD CONSTRAINT "project_shares_shared_with_user_id_fkey" 
    FOREIGN KEY ("shared_with_user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;

-- Subscribers foreign keys
ALTER TABLE "public"."subscribers" ADD CONSTRAINT "subscribers_user_id_fkey" 
    FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;

-- =====================================================
-- 5. INDEXES
-- =====================================================

CREATE INDEX "idx_images_project_id" ON "public"."images" USING "btree" ("project_id");
CREATE INDEX "idx_images_folder_id" ON "public"."images" USING "btree" ("folder_id");
CREATE INDEX "idx_images_user_id" ON "public"."images" USING "btree" ("user_id");
CREATE INDEX "idx_images_is_approved" ON "public"."images" USING "btree" ("is_approved");
CREATE INDEX "idx_images_approved_by" ON "public"."images" USING "btree" ("approved_by");
CREATE INDEX "idx_profiles_id" ON "public"."profiles" USING "btree" ("id");

-- =====================================================
-- 6. INITIAL DATA
-- =====================================================

INSERT INTO "public"."plans" ("name", "storage_limit_bytes", "is_default", "price_cents", "price_currency", "order_sequence", "allowed_projects") VALUES
('Free', 1073741824, true, 0, 'usd', 1, 5),  -- 1GB, 5 projects
('Pro', 10737418240, false, 999, 'usd', 2, 50),   -- 10GB, 50 projects
('Enterprise', 107374182400, false, 2999, 'usd', 3, 500)  -- 100GB, 500 projects
ON CONFLICT ("name") DO NOTHING;

-- =====================================================
-- SETUP COMPLETE! 🎉
-- =====================================================

-- Now run the other scripts in order:
-- 1. supabase_functions.sql
-- 2. supabase_rls_policies.sql  
-- 3. supabase_final_setup.sql
