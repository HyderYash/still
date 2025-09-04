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

    const { folderId } = body;

    if (!folderId) {
      return errorResponse("Missing required parameter: folderId is required");
    }

    // Verify folder exists and user has access
    const { data: folderData, error: folderError } = await supabase
      .from("folders")
      .select("id, project_id")
      .eq("id", folderId)
      .single();

    if (folderError || !folderData) {
      return errorResponse("Folder not found", 404);
    }

    // Get all images in the folder
    const { data: folderImages, error: imagesError } = await supabase
      .from("images")
      .select("id, s3_key, user_id, file_size_bytes")
      .eq("folder_id", folderId);

    if (imagesError) {
      return errorResponse(`Failed to fetch folder images: ${imagesError.message}`, 500);
    }

    if (!folderImages || folderImages.length === 0) {
      // No images to delete
      return successResponse({
        message: "No images to delete in this folder",
        folderImagesCount: 0
      });
    }

    // Verify all images belong to the authenticated user
    for (const image of folderImages) {
      if (image.user_id !== user.id) {
        return errorResponse("Unauthorized: You don't have permission to delete some images in this folder", 403);
      }
    }

    // Calculate total size for quota update
    let totalSizeMB = 0;

    for (const image of folderImages) {
      console.log("image: ", image);
      // Add to total size (convert bytes to MB)
      const imageSizeBytes = image?.file_size_bytes || 0;
      totalSizeMB += imageSizeBytes / (1024 * 1024);
    }

    console.log(`Deleting ${folderImages.length} images, total size: ${totalSizeMB.toFixed(2)} MB`);

    // Delete all images from S3
    const deletePromises = folderImages.map(async (image) => {
      try {
        const command = new DeleteObjectCommand({
          Bucket: s3Bucket,
          Key: image.s3_key,
        });

        await s3Client.send(command);
        return { id: image.id, success: true };
      } catch (error) {
        console.error(`Error deleting image ${image.id} from S3:`, error);
        return { id: image.id, success: false, error };
      }
    });

    // Wait for all S3 deletions to complete
    const s3Results = await Promise.all(deletePromises);
    const failedS3Deletions = s3Results.filter(r => !r.success);

    if (failedS3Deletions.length > 0) {
      console.error(`Failed to delete ${failedS3Deletions.length} images from S3`);
    }

    // Delete all images from the database
    const { error: dbDeleteError } = await supabase
      .from("images")
      .delete()
      .eq("folder_id", folderId);

    if (dbDeleteError) {
      console.error("Error deleting images from database:", dbDeleteError);
      return errorResponse("Failed to delete images from database", 500);
    }

    // Update storage quota
    if (totalSizeMB > 0) {
      try {
        await updateStorageQuota(user.id, totalSizeMB);
      } catch (error) {
        console.error("Error updating storage quota:", error);
        // Continue anyway, this is not critical
      }
    }

    // Success response
    return successResponse({
      message: "All folder images deleted successfully",
      folderImagesCount: folderImages.length,
      totalSizeMB: totalSizeMB.toFixed(2)
    });

  } catch (error) {
    console.error("Unhandled error:", error);
    return errorResponse(`Internal server error: ${error.message}`, 500);
  }
});