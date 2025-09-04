
// This function ensures the 'avatars' storage bucket exists

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.4";

const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
const supabase = createClient(supabaseUrl, supabaseServiceKey);

serve(async (req) => {
  try {
    // Check if the bucket already exists
    const { data: buckets, error: listError } = await supabase
      .storage
      .listBuckets();
    
    if (listError) {
      throw listError;
    }
    
    const bucketExists = buckets?.some(bucket => bucket.name === 'avatars');
    
    // If bucket doesn't exist, create it
    if (!bucketExists) {
      const { error: createError } = await supabase
        .storage
        .createBucket('avatars', {
          public: true,
          fileSizeLimit: 5242880, // 5MB in bytes
          allowedMimeTypes: ['image/jpeg', 'image/png', 'image/gif', 'image/webp']
        });
      
      if (createError) {
        throw createError;
      }
      
      // Set CORS policy for the bucket
      const { error: corsError } = await supabase
        .storage
        .updateBucket('avatars', {
          cors: [
            {
              "origin": "*",
              "method": ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
              "headers": ["Origin", "Content-Type", "Content-Length", "Accept-Encoding", "Authorization"]
            }
          ],
        });
      
      if (corsError) {
        throw corsError;
      }
      
      return new Response(JSON.stringify({ 
        success: true, 
        message: "Avatars bucket created successfully"
      }), {
        headers: { "Content-Type": "application/json" }
      });
    }
    
    return new Response(JSON.stringify({ 
      success: true, 
      message: "Avatars bucket already exists"
    }), {
      headers: { "Content-Type": "application/json" }
    });
    
  } catch (error) {
    console.error("Error:", error);
    return new Response(JSON.stringify({ 
      success: false, 
      error: error.message
    }), {
      status: 500,
      headers: { "Content-Type": "application/json" }
    });
  }
});
