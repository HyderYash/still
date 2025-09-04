-- =====================================================
-- SUPABASE RLS POLICIES FOR FRAME-SHARER APP
-- =====================================================
-- Run this after the functions script

-- =====================================================
-- 1. ENABLE ROW LEVEL SECURITY
-- =====================================================

ALTER TABLE "public"."profiles" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."projects" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."folders" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."images" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."image_comments" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."image_votes" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."project_shares" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."subscribers" ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- 2. PROFILES POLICIES
-- =====================================================

-- Allow public read access to profile IDs
CREATE POLICY "Allow public read access to profile IDs" ON "public"."profiles" FOR SELECT USING (true);

-- Allow public read access to profile basic info
CREATE POLICY "Allow public read access to profile basic info" ON "public"."profiles" FOR SELECT USING (true);

-- Users can see profiles of project sharers
CREATE POLICY "Users can see profiles of project sharers" ON "public"."profiles" FOR SELECT USING (
  "id" IN ( 
    SELECT "project_shares"."shared_by" 
    FROM "public"."project_shares" 
    WHERE ("project_shares"."shared_with" = ("auth"."jwt"() ->> 'email'::"text")) 
    AND ("project_shares"."status" = 'accepted'::"public"."share_request_status")
  )
);

-- Users can see profiles of users who shared projects with them
CREATE POLICY "Users can see profiles of users who shared projects with them" ON "public"."profiles" FOR SELECT USING (
  EXISTS ( 
    SELECT 1 FROM "public"."project_shares" 
    WHERE ("project_shares"."shared_by" = "profiles"."id") 
    AND ("project_shares"."shared_with" = "auth"."email"())
  )
);

-- Users can view their own profile
CREATE POLICY "Users can view their own profile" ON "public"."profiles" FOR SELECT USING ("auth"."uid"() = "id");

-- Users can update their own profile
CREATE POLICY "Users can update their own profile" ON "public"."profiles" FOR UPDATE USING ("auth"."uid"() = "id");

-- =====================================================
-- 3. PROJECTS POLICIES
-- =====================================================

-- Anyone can view public projects
CREATE POLICY "Anyone can view public projects" ON "public"."projects" FOR SELECT USING (("visibility" = 'public'::"public"."project_visibility"));

-- Users can view their own projects
CREATE POLICY "Users can view their own projects" ON "public"."projects" FOR SELECT USING ("auth"."uid"() = "user_id");

-- Users can view projects shared with them
CREATE POLICY "Users can view projects shared with them" ON "public"."projects" FOR SELECT USING ("public"."is_project_shared_with_current_user"("id"));

-- Users can create their own projects
CREATE POLICY "Users can create their own projects" ON "public"."projects" FOR INSERT WITH CHECK ("auth"."uid"() = "user_id");

-- Users can update their own projects
CREATE POLICY "Users can update their own projects" ON "public"."projects" FOR UPDATE USING ("auth"."uid"() = "user_id");

-- Users can delete their own projects
CREATE POLICY "Users can delete their own projects" ON "public"."projects" FOR DELETE USING ("auth"."uid"() = "user_id");

-- =====================================================
-- 4. FOLDERS POLICIES
-- =====================================================

-- Allow viewing folders for public projects
CREATE POLICY "Allow viewing folders for public projects" ON "public"."folders" FOR SELECT TO "authenticated", "anon" USING (
  (EXISTS ( 
    SELECT 1 FROM "public"."projects" 
    WHERE ("projects"."id" = "folders"."project_id") 
    AND ("projects"."visibility" = 'public'::"public"."project_visibility")
  ))
);

-- Users can view their project folders
CREATE POLICY "Users can view their project folders" ON "public"."folders" FOR SELECT USING (
  (EXISTS ( 
    SELECT 1 FROM "public"."projects" "p" 
    WHERE ("p"."id" = "folders"."project_id") 
    AND ("p"."user_id" = "auth"."uid"())
  )) 
  OR (EXISTS ( 
    SELECT 1 FROM "public"."project_shares" "ps" 
    WHERE ("ps"."project_id" = "folders"."project_id") 
    AND ("ps"."shared_with" = (( SELECT "users"."email" FROM "auth"."users" WHERE ("users"."id" = "auth"."uid"())))::"text") 
    AND ("ps"."status" = 'accepted'::"public"."share_request_status")
  ))
);

-- Users can create folders in their projects
CREATE POLICY "Users can create folders in their projects" ON "public"."folders" FOR INSERT WITH CHECK (
  (EXISTS ( 
    SELECT 1 FROM "public"."projects" "p" 
    WHERE ("p"."id" = "folders"."project_id") 
    AND ("p"."user_id" = "auth"."uid"())
  ))
);

-- Users can update folders in their projects
CREATE POLICY "Users can update folders in their projects" ON "public"."folders" FOR UPDATE USING (
  (EXISTS ( 
    SELECT 1 FROM "public"."projects" "p" 
    WHERE ("p"."id" = "folders"."project_id") 
    AND ("p"."user_id" = "auth"."uid"())
  ))
);

-- Users can delete folders in their projects
CREATE POLICY "Users can delete folders in their projects" ON "public"."folders" FOR DELETE USING (
  (EXISTS ( 
    SELECT 1 FROM "public"."projects" "p" 
    WHERE ("p"."id" = "folders"."project_id") 
    AND ("p"."user_id" = "auth"."uid"())
  ))
);

-- =====================================================
-- 5. IMAGES POLICIES
-- =====================================================

-- Allow viewing images for public projects
CREATE POLICY "Allow viewing images for public projects" ON "public"."images" FOR SELECT TO "authenticated", "anon" USING (
  (EXISTS ( 
    SELECT 1 FROM "public"."projects" 
    WHERE ("projects"."id" = "images"."project_id") 
    AND ("projects"."visibility" = 'public'::"public"."project_visibility")
  ))
);

-- Allow viewing images for shared projects
CREATE POLICY "Allow viewing images for shared projects" ON "public"."images" FOR SELECT TO "authenticated" USING (
  (EXISTS ( 
    SELECT 1 FROM "public"."project_shares" 
    WHERE ("project_shares"."project_id" = "images"."project_id") 
    AND ("project_shares"."shared_with" = (( SELECT "users"."email" FROM "auth"."users" WHERE ("users"."id" = ( SELECT "auth"."uid"() AS "uid"))))::"text")
  ))
);

-- Users can view images from their own projects
CREATE POLICY "Users can view images from their own projects" ON "public"."images" FOR SELECT USING (
  ("project_id" IN ( 
    SELECT "projects"."id" FROM "public"."projects" 
    WHERE ("projects"."user_id" = "auth"."uid"())
  ))
);

-- Users can view images of shared projects
CREATE POLICY "Users can view images of shared projects" ON "public"."images" FOR SELECT USING (
  (EXISTS ( 
    SELECT 1 FROM "public"."project_shares" 
    WHERE ("project_shares"."project_id" = "images"."project_id") 
    AND ("project_shares"."shared_with" = "auth"."email"()) 
    AND ("project_shares"."status" = ANY (ARRAY['pending'::"public"."share_request_status", 'accepted'::"public"."share_request_status"]))
  ))
);

-- Users can view their own images
CREATE POLICY "Users can view their own images" ON "public"."images" FOR SELECT USING ("auth"."uid"() = "user_id");

-- Users can insert images into their own projects
CREATE POLICY "Users can insert images into their own projects" ON "public"."images" FOR INSERT WITH CHECK (
  ("project_id" IN ( 
    SELECT "projects"."id" FROM "public"."projects" 
    WHERE ("projects"."user_id" = "auth"."uid"())
  ))
);

-- Users can update images in their own projects
CREATE POLICY "Users can update images in their own projects" ON "public"."images" FOR UPDATE USING (
  ("project_id" IN ( 
    SELECT "projects"."id" FROM "public"."projects" 
    WHERE ("projects"."user_id" = "auth"."uid"())
  ))
);

-- Users can delete images from their own projects
CREATE POLICY "Users can delete images from their own projects" ON "public"."images" FOR DELETE USING (
  ("project_id" IN ( 
    SELECT "projects"."id" FROM "public"."projects" 
    WHERE ("projects"."user_id" = "auth"."uid"())
  ))
);

-- =====================================================
-- 6. IMAGE COMMENTS POLICIES
-- =====================================================

-- Users can view comments on images they can see
CREATE POLICY "Users can view comments on images they can see" ON "public"."image_comments" FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.images i
    WHERE i.id = image_comments.image_id
    AND (
      -- User can see the image if they own the project
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
);

-- Users can insert comments on images they can see
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

-- Users can update their own comments
CREATE POLICY "Users can update their own comments" ON "public"."image_comments" FOR UPDATE USING (user_id = auth.uid());

-- Users can delete their own comments
CREATE POLICY "Users can delete their own comments" ON "public"."image_comments" FOR DELETE USING (user_id = auth.uid());

-- =====================================================
-- 7. IMAGE VOTES POLICIES
-- =====================================================

-- Anyone can view votes
CREATE POLICY "view_votes" ON "public"."image_votes" FOR SELECT USING (true);

-- Users can only insert their own votes
CREATE POLICY "insert_own_votes" ON "public"."image_votes" FOR INSERT WITH CHECK ("auth"."uid"() = "user_id");

-- =====================================================
-- 8. PROJECT SHARES POLICIES
-- =====================================================

-- Users can view shares for their projects
CREATE POLICY "Users can view shares for their projects" ON "public"."project_shares" FOR SELECT USING (
  (EXISTS ( 
    SELECT 1 FROM "public"."projects" 
    WHERE ("projects"."id" = "project_shares"."project_id") 
    AND ("projects"."user_id" = "auth"."uid"())
  ))
);

-- Users can view shares where they are recipients
CREATE POLICY "Users can view shares where they are recipients" ON "public"."project_shares" FOR SELECT USING ("auth"."email"() = "shared_with");

-- Users can view shares where they are the recipient
CREATE POLICY "Users can view shares where they are the recipient" ON "public"."project_shares" FOR SELECT USING (
  (EXISTS ( 
    SELECT 1 FROM "auth"."users" 
    WHERE (("users"."email")::"text" = "project_shares"."shared_with") 
    AND ("users"."id" = "auth"."uid"())
  ))
);

-- Users can share their own projects
CREATE POLICY "Users can share their own projects" ON "public"."project_shares" FOR INSERT WITH CHECK (
  ((EXISTS ( 
    SELECT 1 FROM "public"."projects" 
    WHERE ("projects"."id" = "project_shares"."project_id") 
    AND ("projects"."user_id" = "auth"."uid"())
  ))) 
  AND ("auth"."uid"() = "shared_by")
);

-- Users can update share requests for themselves
CREATE POLICY "Users can update share requests for themselves" ON "public"."project_shares" FOR UPDATE USING (
  (EXISTS ( 
    SELECT 1 FROM "auth"."users" 
    WHERE (("users"."email")::"text" = "project_shares"."shared_with") 
    AND ("users"."id" = "auth"."uid"())
  ))
);

-- Users can delete shares for their own projects
CREATE POLICY "Users can delete shares for their own projects" ON "public"."project_shares" FOR DELETE USING (
  (EXISTS ( 
    SELECT 1 FROM "public"."projects" 
    WHERE ("projects"."id" = "project_shares"."project_id") 
    AND ("projects"."user_id" = "auth"."uid"())
  ))
);

-- =====================================================
-- 9. SUBSCRIBERS POLICIES
-- =====================================================

-- Anyone can insert subscriptions
CREATE POLICY "insert_subscription" ON "public"."subscribers" FOR INSERT WITH CHECK (true);

-- Users can view their own subscriptions
CREATE POLICY "select_own_subscription" ON "public"."subscribers" FOR SELECT USING (
  (("user_id" = "auth"."uid"()) OR ("email" = "auth"."email"()))
);

-- Users can update their own subscriptions
CREATE POLICY "update_own_subscription" ON "public"."subscribers" FOR UPDATE USING (true);
