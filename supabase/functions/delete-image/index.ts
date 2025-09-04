import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2.29.0";
import { S3Client, DeleteObjectCommand } from "npm:@aws-sdk/client-s3@3.410.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Max-Age': '86400',
};

const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
const s3Bucket = Deno.env.get("S3_BUCKET") || "";
const s3Region = Deno.env.get("S3_REGION") || "";
const supabase = createClient(supabaseUrl, supabaseServiceKey);

// Initialize S3 client once during cold start
const s3Client = new S3Client({
  region: s3Region,
  credentials: {
    accessKeyId: Deno.env.get("AWS_ACCESS_KEY_ID") || "",
    secretAccessKey: Deno.env.get("AWS_SECRET_ACCESS_KEY") || "",
  },
  maxAttempts: 3, // Increased from 2
  requestTimeout: 3000 // 3 second timeout for S3 operations
});

// Improved caching with TTL
const authCache = new Map();
const profileCache = new Map();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

const getUser = async (token) => {
  if (authCache.has(token)) {
    return authCache.get(token);
  }

  try {
    const { data: { user }, error } = await supabase.auth.getUser(token);
    if (error) throw error;
    if (user) {
      authCache.set(token, user);
      setTimeout(() => authCache.delete(token), CACHE_TTL);
      return user;
    }
    return null;
  } catch (error) {
    console.error("Auth error:", error.message);
    return null;
  }
};

const getProfile = async (userId) => {
  if (profileCache.has(userId)) {
    return profileCache.get(userId);
  }

  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('*, plans:plan_id(name, storage_limit_bytes), total_size_mb')
      .eq('id', userId)
      .single();

    if (error) throw error;
    if (data) {
      profileCache.set(userId, data);
      setTimeout(() => profileCache.delete(userId), CACHE_TTL);
      return data;
    }
    return null;
  } catch (error) {
    console.error("Profile fetch error:", error.message);
    return null;
  }
};

const updateStorageQuota = async (userId, sizeMB) => {
  try {
    const { data: currentProfile, error: fetchError } = await supabase
      .from('profiles')
      .select('total_size_mb')
      .eq('id', userId)
      .single();

    if (fetchError) throw fetchError;

    const currentUsage = currentProfile?.total_size_mb || 0;
    const newUsage = Math.max(0, currentUsage - sizeMB); // Ensure we don't go below 0

    const { error: updateError } = await supabase
      .from('profiles')
      .update({ total_size_mb: newUsage })
      .eq('id', userId);

    if (updateError) throw updateError;

    // Update cache if it exists
    if (profileCache.has(userId)) {
      const cachedProfile = profileCache.get(userId);
      cachedProfile.total_size_mb = newUsage;
    }

    return true;
  } catch (error) {
    console.error("Quota update error:", error.message);
    return false;
  }
};

// Improved error responses with consistent format
const errorResponse = (message, status = 400) => {
  return new Response(
    JSON.stringify({
      success: false,
      error: message
    }),
    {
      status,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    }
  );
};

// Success response helper
const successResponse = (data) => {
  return new Response(
    JSON.stringify({
      success: true,
      ...data
    }),
    {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    }
  );
};

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 200,
      headers: corsHeaders
    });
  }

  try {
    // Auth validation
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return errorResponse("Unauthorized: No token provided", 401);
    }

    const token = authHeader.replace("Bearer ", "");
    const user = await getUser(token);
    if (!user) {
      return errorResponse("Unauthorized: Invalid token", 401);
    }

    // Parse request body
    let body;
    try {
      body = await req.json();
    } catch (e) {
      return errorResponse("Invalid JSON body", 400);
    }

    const { imageId } = body;

    if (!imageId) {
      return errorResponse("Missing required parameter: imageId is required");
    }

    // Get image metadata to verify ownership and get S3 key
    const { data: imageData, error: fetchError } = await supabase
      .from("images")
      .select("*")
      .eq("id", imageId)
      .single();

    if (fetchError || !imageData) {
      return errorResponse("Image not found", 404);
    }

    // Verify ownership
    if (imageData.user_id !== user.id) {
      return errorResponse("Unauthorized: You don't have permission to delete this image", 403);
    }

    // Calculate file size in MB for quota update
    const fileSizeMB = imageData.size_bytes ? imageData.size_bytes / (1024 * 1024) :
      imageData.file_size_bytes ? imageData.file_size_bytes / (1024 * 1024) : 0;

    // Delete from S3
    try {
      const command = new DeleteObjectCommand({
        Bucket: s3Bucket,
        Key: imageData.s3_key,
      });

      await s3Client.send(command);
    } catch (s3Error) {
      console.error("Error deleting from S3:", s3Error);
      return errorResponse("Failed to delete image from storage", 500);
    }

    // Delete from Supabase
    const { error: deleteError } = await supabase
      .from("images")
      .delete()
      .eq("id", imageId);

    if (deleteError) {
      console.error("Database deletion error:", deleteError);
      return errorResponse("Failed to delete image metadata from database", 500);
    }

    // Update quota in background without waiting
    if (fileSizeMB > 0) {
      updateStorageQuota(user.id, fileSizeMB)
        .catch(err => console.error("Background quota update failed:", err));
    }

    return successResponse({
      message: "Image deleted successfully",
      imageId: imageId
    });

  } catch (error) {
    console.error("Unhandled error:", error);
    return errorResponse(`Internal server error: ${error.message}`, 500);
  }
});