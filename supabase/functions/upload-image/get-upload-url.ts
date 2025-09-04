
// This file handles getting a pre-signed URL for image uploads

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.4';
import { v4 as uuidv4 } from "https://esm.sh/uuid@9.0.0";
import { S3Client, PutObjectCommand } from "https://esm.sh/@aws-sdk/client-s3@3.379.1";
import { getSignedUrl } from "https://esm.sh/@aws-sdk/s3-request-presigner@3.379.1";

const s3Bucket = Deno.env.get("S3_BUCKET") || "";
const s3Region = Deno.env.get("S3_REGION") || "";

// Initialize S3 client
const s3Client = new S3Client({
  region: s3Region,
  credentials: {
    accessKeyId: Deno.env.get("AWS_ACCESS_KEY_ID") || "",
    secretAccessKey: Deno.env.get("AWS_SECRET_ACCESS_KEY") || "",
  },
});

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Max-Age": "86400",
};

serve(async (req) => {
  console.log("get-upload-url-seperate-call");
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: corsHeaders
    });
  }

  try {
    // Parse request
    const { projectId, folderId, fileName, fileSize, fileType } = await req.json();

    if (!projectId || !fileName) {
      return new Response(
        JSON.stringify({ success: false, error: "Missing required parameters" }),
        { headers: { "Content-Type": "application/json", ...corsHeaders }, status: 400 }
      );
    }

    // Get authorization header
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ success: false, error: "Unauthorized" }),
        { headers: { "Content-Type": "application/json", ...corsHeaders }, status: 401 }
      );
    }

    // Create Supabase client with auth token
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") || "",
      Deno.env.get("SUPABASE_ANON_KEY") || "",
      {
        global: { headers: { Authorization: authHeader } },
      }
    );

    // Get current user
    const { data: { user }, error: userError } = await supabase.auth.getUser();

    if (userError || !user) {
      console.error("Error getting user:", userError);
      return new Response(
        JSON.stringify({ success: false, error: "Unauthorized" }),
        { headers: { "Content-Type": "application/json", ...corsHeaders }, status: 401 }
      );
    }

    // Verify project access (owner, shared, or public)
    const { data: projectData, error: projectError } = await supabase
      .from('projects')
      .select('visibility, user_id')
      .eq('id', projectId)
      .single();

    if (projectError || !projectData) {
      console.error("Error getting project:", projectError);
      return new Response(
        JSON.stringify({ success: false, error: "Project not found" }),
        { headers: { "Content-Type": "application/json", ...corsHeaders }, status: 404 }
      );
    }

    // Check if user owns the project or if it's public
    let hasAccess = projectData.user_id === user.id || projectData.visibility === 'public';

    // If not owner and not public, check if project is shared with user
    if (!hasAccess) {
      const { data: shareData } = await supabase
        .from('project_shares')
        .select('id')
        .eq('project_id', projectId)
        .eq('shared_with', user.email)
        .eq('status', 'accepted')
        .single();

      hasAccess = !!shareData;
    }

    if (!hasAccess) {
      return new Response(
        JSON.stringify({ success: false, error: "You don't have permission to upload to this project" }),
        { headers: { "Content-Type": "application/json", ...corsHeaders }, status: 403 }
      );
    }

    // Check user's storage quota
    const { data: profile } = await supabase
      .from('profiles')
      .select(`
        total_size_mb,
        plans (storage_limit_bytes)
      `)
      .eq('id', user.id)
      .single();

    if (profile) {
      // Convert MB to bytes and check against plan limit
      const currentUsage = (profile.total_size_mb || 0) * 1000000; // MB to bytes
      const storageLimit = profile.plans?.storage_limit_bytes || 1000000000; // Default to 1GB
      const fileSizeBytes = fileSize || 0;

      if (currentUsage + fileSizeBytes > storageLimit) {
        return new Response(
          JSON.stringify({
            success: false,
            error: "Storage quota exceeded. Please upgrade your plan."
          }),
          { headers: { "Content-Type": "application/json", ...corsHeaders }, status: 400 }
        );
      }
    }

    // Generate a unique key for the S3 object
    const fileExtension = fileName.split('.').pop();
    const uniqueId = uuidv4();
    const s3Key = `${projectId}/${uniqueId}.${fileExtension}`;

    // Create command for getting pre-signed URL
    const command = new PutObjectCommand({
      Bucket: s3Bucket,
      Key: s3Key,
      ContentType: fileType || 'application/octet-stream',
    });

    // Generate pre-signed URL
    const presignedUrl = await getSignedUrl(s3Client, command, {
      expiresIn: 3600, // 1 hour
    });

    // Return presigned URL and key
    return new Response(
      JSON.stringify({
        success: true,
        url: presignedUrl,
        s3Key,
        userId: user.id
      }),
      {
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );

  } catch (error) {
    console.error("Error in get-upload-url:", error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { headers: { "Content-Type": "application/json", ...corsHeaders }, status: 500 }
    );
  }
});
