import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2.29.0";
import { S3Client, PutObjectCommand } from "npm:@aws-sdk/client-s3@3.410.0";
import { getSignedUrl } from "npm:@aws-sdk/s3-request-presigner@3.410.0";
import { v4 as uuidv4 } from "https://esm.sh/uuid@9.0.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Max-Age": "86400",
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
  requestTimeout: 3000, // 3 second timeout for S3 operations
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
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser(token);
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
      .from("profiles")
      .select("*, plans:plan_id(name, storage_limit_bytes), total_size_mb")
      .eq("id", userId)
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
      .from("profiles")
      .select("total_size_mb")
      .eq("id", userId)
      .single();

    if (fetchError) throw fetchError;

    const currentUsage = currentProfile?.total_size_mb || 0;
    const newUsage = currentUsage + sizeMB;

    const { error: updateError } = await supabase
      .from("profiles")
      .update({ total_size_mb: newUsage })
      .eq("id", userId);

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

// Background task to update storage usage asynchronously
const updateStorageUsageAsync = (userId, sizeMB) => {
  setTimeout(async () => {
    try {
      await supabase.rpc("increment_storage_usage", {
        user_id: userId,
        size_mb: sizeMB,
      });
    } catch (error) {
      console.error("Background storage update failed:", error.message);
    }
  }, 0);
};

// Improved error responses with consistent format
const errorResponse = (message, status = 400) => {
  return new Response(
    JSON.stringify({
      success: false,
      error: message,
    }),
    {
      status,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    }
  );
};

// Success response helper
const successResponse = (data) => {
  return new Response(
    JSON.stringify({
      success: true,
      ...data,
    }),
    {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    }
  );
};

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: corsHeaders
    });
  }

  const url = new URL(req.url);
  const path = url.pathname;

  try {
    console.log("get-upload-url-main-call");

    // Get upload URL endpoint
    if (path === "/upload-image/get-upload-url" && req.method === "POST") {
      const startTime = performance.now();

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

      const { projectId, folderId, fileName, fileSize, fileType } = body;

      if (!projectId || !fileName || !fileSize) {
        return errorResponse(
          "Missing required parameters: projectId, fileName, and fileSize are required"
        );
      }

      // Generate S3 key
      const folderPath = folderId ? `${folderId}/` : "";
      const uniqueId = uuidv4();
      const s3Key = `${user.id}/${projectId}/${folderPath}/${uniqueId}${fileName}`;

      try {
        // Generate pre-signed URL with shorter timeout
        const command = new PutObjectCommand({
          Bucket: s3Bucket,
          Key: s3Key,
          ContentType: fileType || "application/octet-stream",
        });

        const url = await getSignedUrl(s3Client, command, { expiresIn: 60 });

        const endTime = performance.now();
        console.log(`get-upload-url completed in ${endTime - startTime}ms`);

        return successResponse({ url, s3Key, userId: user.id });
      } catch (s3Error) {
        console.error("S3 presigned URL error:", s3Error);
        return errorResponse("Failed to generate upload URL", 500);
      }
    }

    if (path === "/upload-image/save-metadata" && req.method === "POST") {
      const startTime = performance.now();

      // Limit the maximum body size to prevent abuse
      const bodyText = await req.text();
      if (bodyText.length > 10000) {
        return errorResponse("Request body too large", 413);
      }

      let body;
      try {
        body = JSON.parse(bodyText);
      } catch (e) {
        return errorResponse("Invalid JSON body", 400);
      }

      const { s3Key, fileName, fileType, fileSize, projectId, folderId } = body;

      if (!s3Key || !fileName || !projectId) {
        return errorResponse(
          "Missing required parameters: s3Key, fileName, and projectId are required"
        );
      }

      // Auth validation using cached authentication
      const authHeader = req.headers.get("Authorization");
      if (!authHeader) {
        return errorResponse("Unauthorized: No token provided", 401);
      }

      const token = authHeader.replace("Bearer ", "");
      const user = await getUser(token);
      if (!user) {
        return errorResponse("Unauthorized: Invalid token", 401);
      }

      // Insert metadata with minimal selected fields
      try {
        const { data: imageData, error: insertError } = await supabase
          .from("images")
          .insert({
            user_id: user.id,
            project_id: projectId,
            folder_id: folderId || null,
            file_name: fileName,
            original_file_name: fileName,
            s3_key: s3Key,
            file_size_bytes: fileSize || 0,
            mime_type: fileType || "application/octet-stream",
          })
          .select("id, s3_key, file_name, file_size_bytes") // Only select what we need
          .single();

        if (insertError) throw insertError;

        // Update quota asynchronously without waiting
        if (fileSize) {
          updateStorageUsageAsync(user.id, fileSize / 1000000);
        }

        const endTime = performance.now();
        console.log(`save-metadata completed in ${endTime - startTime}ms`);

        // Return minimal image data
        return new Response(
          JSON.stringify({
            success: true,
            image: {
              id: imageData.id,
              s3_key: imageData.s3_key,
              file_name: imageData.file_name,
              size_bytes: imageData.file_size_bytes,
            },
            elapsed_ms: Math.round(endTime - startTime),
          }),
          {
            headers: { "Content-Type": "application/json", ...corsHeaders },
          }
        );
      } catch (dbError) {
        const endTime = performance.now();
        console.error(
          `Error in save-metadata (${endTime - startTime}ms):`,
          dbError
        );
        return new Response(
          JSON.stringify({
            success: false,
            error: dbError.message,
            elapsed_ms: Math.round(endTime - startTime),
          }),
          {
            headers: { "Content-Type": "application/json", ...corsHeaders },
            status: 500,
          }
        );
      }
    }

    // Handle unknown routes
    return errorResponse("Method or path not allowed", 405);
  } catch (error) {
    console.error("Unhandled error:", error);
    return errorResponse(`Internal server error: ${error.message}`, 500);
  }
});
