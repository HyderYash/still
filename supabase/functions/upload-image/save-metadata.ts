import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.4';

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Initialize Supabase client once at cold start
const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY") || "";

// Cache for authentication tokens to avoid repeated auth calls
const authCache = new Map();
const AUTH_CACHE_TTL = 5 * 60 * 1000; // 5 minutes

// Function to get user from cache or authenticate
const getAuthenticatedUser = async (authHeader) => {
  if (!authHeader) return null;
  
  const token = authHeader.replace("Bearer ", "");
  
  // Check cache first
  if (authCache.has(token)) {
    return authCache.get(token);
  }
  
  // Not in cache, authenticate with Supabase
  const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
    global: { 
      headers: { Authorization: authHeader },
    },
  });
  
  try {
    const { data: { user }, error } = await supabase.auth.getUser();
    if (error || !user) return null;
    
    // Store in cache
    authCache.set(token, user);
    setTimeout(() => authCache.delete(token), AUTH_CACHE_TTL);
    
    return user;
  } catch (error) {
    console.error("Auth error:", error.message);
    return null;
  }
};

// Background task to update storage usage
const updateStorageUsageAsync = (userId, sizeMB) => {
  setTimeout(async () => {
    try {
      // Create a new client for this background operation
      const supabase = createClient(supabaseUrl, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "");
      
      await supabase.rpc('increment_storage_usage', { 
        user_id: userId, 
        size_mb: sizeMB
      });
    } catch (error) {
      console.error("Background storage update failed:", error.message);
    }
  }, 0);
};

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }
  
  const startTime = performance.now();
  
  try {
    // Parse request - limit the maximum body size to prevent abuse
    const bodyText = await req.text();
    if (bodyText.length > 10000) {
      return new Response(
        JSON.stringify({ success: false, error: "Request body too large" }),
        { headers: { "Content-Type": "application/json", ...corsHeaders }, status: 413 }
      );
    }
    
    const body = JSON.parse(bodyText);
    const { s3Key, fileName, fileType, fileSize, projectId, folderId } = body;

    if (!s3Key || !fileName || !projectId) {
      return new Response(
        JSON.stringify({ success: false, error: "Missing required parameters" }),
        { headers: { "Content-Type": "application/json", ...corsHeaders }, status: 400 }
      );
    }

    // Get and validate user (using cached authentication)
    const user = await getAuthenticatedUser(req.headers.get('Authorization'));
    if (!user) {
      return new Response(
        JSON.stringify({ success: false, error: "Unauthorized" }),
        { headers: { "Content-Type": "application/json", ...corsHeaders }, status: 401 }
      );
    }

    // Create client with minimal options for specific operation
    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        persistSession: false,
      },
      global: { 
        headers: { Authorization: req.headers.get('Authorization') },
      },
      db: {
        schema: 'public',
      },
    });

    // Save image metadata - only select necessary fields
    const { data: image, error: imageError } = await supabase
      .from('images')
      .insert({
        project_id: projectId,
        folder_id: folderId,
        user_id: user.id,
        file_name: fileName,
        original_file_name: fileName,
        s3_key: s3Key,
        mime_type: fileType || 'application/octet-stream',
        file_size_bytes: fileSize || 0
      })
      .select('id, s3_key, file_name, file_size_bytes')  // Only select what we need
      .single();

    if (imageError) {
      console.error("Error saving image metadata:", imageError);
      return new Response(
        JSON.stringify({ success: false, error: imageError.message }),
        { headers: { "Content-Type": "application/json", ...corsHeaders }, status: 500 }
      );
    }

    // Update user storage usage asynchronously
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
          id: image.id,
          s3_key: image.s3_key,
          file_name: image.file_name,
          size_bytes: image.file_size_bytes
        },
        elapsed_ms: Math.round(endTime - startTime)
      }),
      { 
        headers: { "Content-Type": "application/json", ...corsHeaders } 
      }
    );

  } catch (error) {
    const endTime = performance.now();
    console.error(`Error in save-metadata (${endTime - startTime}ms):`, error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message,
        elapsed_ms: Math.round(endTime - startTime)
      }),
      { headers: { "Content-Type": "application/json", ...corsHeaders }, status: 500 }
    );
  }
});