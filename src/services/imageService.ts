import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { getSignedUrlForObject, deleteObjectFromS3, s3Client } from "@/integrations/aws/client";
import { S3Client, GetObjectCommand } from "@aws-sdk/client-s3";
import JSZip from "jszip";

// Types
export type ImageMetadata = {
  id: string;
  user_id: string | null;
  project_id: string;
  folder_id: string | null;
  file_name: string;
  s3_key: string;
  size_bytes?: number;
  file_size_bytes?: number; // For compatibility
  created_at: string;
  updated_at: string;
  width?: number;
  height?: number;
  mime_type?: string;
  original_file_name?: string;
  url?: string; // For client-side use
  has_comments: boolean;
  is_approved?: boolean;
  approved_by?: string | null;
};

export type MarkerInfo = {
  label: string;
  color: string;
};

// Upload image to S3 directly and save metadata using edge functions
export const uploadImage = async (
  file: File,
  projectId: string,
  folderId: string | null = null
): Promise<ImageMetadata | null> => {
  // Create a single toast ID that will be updated throughout the process
  const uploadToastId = toast.loading(`Uploading ${file.name}...`, {
    id: `upload-${file.name}-${Date.now()}`,
    duration: Infinity
  });

  try {
    // 1. Validate session
    const {
      data: { session },
    } = await supabase.auth.getSession();
    if (!session) {
      toast.dismiss(uploadToastId);
      toast.error("You must be logged in to upload images");
      return null;
    }

    const token = session.access_token;

    // 2. Check storage limits before initiating upload
    try {
      toast.loading(`Checking storage limits for ${file.name}...`, {
        id: uploadToastId,
        duration: 1000
      });

      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select(`
              id,
              total_size_mb,
              plans:plan_id(
                name,
                storage_limit_bytes
              )
            `)
        .eq("id", session.user.id)
        .single();

      if (profileError) {
        console.error("Profile fetch error:", profileError);
        toast.error("Failed to check storage limits", {
          id: uploadToastId,
          duration: 3000
        });
        return null;
      }

      if (!profile) {
        toast.error("User profile not found", {
          id: uploadToastId,
          duration: 3000
        });
        return null;
      }

      // Check storage limits
      const currentUsageMB = profile.total_size_mb || 0;
      const fileSizeMB = file.size / (1024 * 1024); // Convert bytes to MB
      const planLimitBytes = profile.plans?.storage_limit_bytes || 0;
      const planLimitMB = planLimitBytes / (1024 * 1024);

      // Validate if upload would exceed plan limit (only if plan has a limit)
      if (planLimitMB > 0 && (currentUsageMB + fileSizeMB) > planLimitMB) {
        toast.error(
          `Upload would exceed your plan's storage limit. Used: ${currentUsageMB.toFixed(2)}MB, Limit: ${planLimitMB.toFixed(2)}MB, File size: ${fileSizeMB.toFixed(2)}MB`,
          {
            id: uploadToastId,
            duration: 5000
          }
        );
        return null;
      }

      // Optional: Show warning when approaching limit (90% threshold)
      if (planLimitMB > 0) {
        const usagePercentage = ((currentUsageMB + fileSizeMB) / planLimitMB) * 100;
        if (usagePercentage > 90) {
          console.warn(`User ${session.user.id} approaching storage limit: ${usagePercentage.toFixed(1)}%`);
          // Optionally show a warning toast (but don't block upload)
          if (usagePercentage > 95) {
            toast.loading(`Warning: Approaching storage limit (${usagePercentage.toFixed(1)}% used). Uploading ${file.name}...`, {
              id: uploadToastId,
              duration: 2000
            });
          }
        }
      }

    } catch (storageCheckError) {
      console.error("Storage check failed:", storageCheckError);
      // Continue with upload even if storage check fails (graceful degradation)
      toast.loading(`Storage check failed, continuing with upload of ${file.name}...`, {
        id: uploadToastId,
        duration: 2000
      });
    }

    // 3. Get pre-signed URL with timeout and retry logic
    const getPreSignedUrl = async (
      retries = 2
    ): Promise<{ url: string; s3Key: string; userId: string } | null> => {
      try {
        console.time("Get Pre-Signed URL");

        // Use AbortController to implement a timeout
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout

        const { data, error } = await supabase.functions.invoke(
          "upload-image/get-upload-url",
          {
            method: "POST",
            headers: { Authorization: `Bearer ${token}` },
            body: {
              projectId,
              folderId,
              fileName: file.name,
              fileSize: file.size,
              fileType: file.type,
            }
          }
        );

        clearTimeout(timeoutId);
        console.timeEnd("Get Pre-Signed URL");

        if (error || !data?.success || !data?.url) {
          throw new Error(
            error?.message || data?.error || "Failed to get pre-signed URL"
          );
        }

        return {
          url: data.url,
          s3Key: data.s3Key,
          userId: data.userId,
        };
      } catch (err: unknown) {
        console.error(
          `Pre-signed URL attempt failed (${retries} retries left):`,
          err
        );

        if (
          retries > 0 &&
          (err instanceof Error && (err.name === "AbortError" || err.message.includes("timeout")))
        ) {
          // Update the existing toast instead of creating a new one
          toast.loading(`Connection slow, retrying upload for ${file.name}...`, {
            id: uploadToastId,
            duration: 3000
          });
          return getPreSignedUrl(retries - 1);
        }

        return null;
      }
    };

    // Get pre-signed URL with retry
    const urlData = await getPreSignedUrl();
    if (!urlData) {
      toast.error("Failed to initiate upload - connection timed out", {
        id: uploadToastId,
        duration: 3000
      });
      return null;
    }

    const { url, s3Key } = urlData;

    // 3. Upload to S3 with progress tracking if possible
    try {
      console.time("S3 Upload");
      // Update the existing toast instead of dismissing and creating a new one
      toast.loading(`Uploading ${file.name} to storage...`, {
        id: uploadToastId,
        duration: 3000
      });

      // For larger files, consider implementing the upload with XMLHttpRequest
      // to show progress, but here's a simpler implementation with fetch:
      const uploadResponse = await fetch(url, {
        method: "PUT",
        body: file,
        headers: { "Content-Type": file.type || "application/octet-stream" },
      });

      console.timeEnd("S3 Upload");

      if (!uploadResponse.ok) {
        const errorText = await uploadResponse.text();
        throw new Error(
          `S3 Upload failed (${uploadResponse.status}): ${errorText}`
        );
      }
    } catch (err) {
      console.error("S3 Upload error:", err);
      toast.error("Failed to upload file to storage", {
        id: uploadToastId,
        duration: 3000
      });
      return null;
    }

    // 4. Save metadata
    try {
      console.time("Save Metadata");
      // Update the existing toast instead of dismissing and creating a new one
      toast.loading(`Finalizing upload for ${file.name}...`, {
        id: uploadToastId,
        duration: 3000
      });

      const { data, error } = await supabase.functions.invoke(
        "upload-image/save-metadata",
        {
          method: "POST",
          headers: { Authorization: `Bearer ${token}` },
          body: {
            s3Key,
            fileName: file.name,
            fileType: file.type,
            fileSize: file.size,
            projectId,
            folderId,
          },
        }
      );

      console.timeEnd("Save Metadata");

      if (error || !data?.success) {
        throw new Error(
          error?.message || data?.error || "Failed to save metadata"
        );
      }

      // Update the existing toast with success instead of dismissing and creating a new one
      toast.success(`${file.name} uploaded successfully!`, {
        id: uploadToastId,
        duration: 3000
      });
      return data.image;
    } catch (err) {
      console.error("Metadata save error:", err);
      toast.error("File uploaded but failed to save metadata", {
        id: uploadToastId,
        duration: 3000
      });
      return null;
    }
  } catch (error) {
    console.error("Unexpected error during upload:", error);
    toast.error("Failed to upload image", {
      id: uploadToastId,
      duration: 3000
    });
    return null;
  }
};

// Get images for a project or folder
export const getImages = async (
  projectId: string,
  folderId: string | null = null
): Promise<ImageMetadata[]> => {
  try {
    console.log("projectId: ", projectId);
    console.log("folderId: ", folderId);

    // First build the query
    let query = supabase
      .from("images")
      .select(`
        *,
        has_comments:image_comments!left(id)
      `)
      .eq("project_id", projectId);


    // Then conditionally add the folder_id filter
    if (folderId === null) {
      query = query.is("folder_id", null);
    } else {
      query = query.eq("folder_id", folderId);
    }

    // Finally execute the query
    const { data, error } = await query;

    console.log("Fetched images data: ", data);

    if (error) {
      console.error("Error fetching images:", error);
      return [];
    }

    // Generate temporary URLs for each image
    const imagesWithUrls = await Promise.all(
      data.map(async (image) => {
        try {
          const url = await getSignedUrlForObject(image.s3_key);

          return {
            ...image,
            url,
            size_bytes: image.file_size_bytes || 0,
            user_id: image.user_id || null,
            has_comments: image.has_comments.length > 0, // Convert to boolean
            is_approved: image.is_approved || false,
            approved_by: image.approved_by || null
          } as ImageMetadata;
        } catch (error) {
          console.error(`Error generating URL for image ${image.id}:`, error);
          return {
            ...image,
            url: "/placeholder.svg", // Fallback image
            size_bytes: image.file_size_bytes || 0,
            user_id: image.user_id || null,
            has_comments: image.has_comments.length > 0, // Convert to boolean
            is_approved: image.is_approved || false,
            approved_by: image.approved_by || null
          } as ImageMetadata;
        }
      })
    );

    return imagesWithUrls;
  } catch (error) {
    console.error("Error in getImages:", error);
    return [];
  }
};

// Get the most recent image for a project (for thumbnail)
export const getMostRecentImage = async (
  projectId: string
): Promise<ImageMetadata | null> => {
  try {
    const { data, error } = await supabase
      .from("images")
      .select("*")
      .eq("project_id", projectId)
      .order("created_at", { ascending: false })
      .limit(1)
      .single();

    if (error) {
      console.error("Error fetching project thumbnail:", error);
      return null;
    }

    if (!data) {
      return null;
    }

    // Generate a temporary URL
    try {
      const url = await getSignedUrlForObject(data.s3_key);

      return {
        ...data,
        url,
        size_bytes: data.file_size_bytes || 0,
        user_id: data.user_id || null
      } as ImageMetadata;
    } catch (error) {
      console.error(`Error generating URL for image ${data.id}:`, error);
      return {
        ...data,
        url: "/placeholder.svg", // Fallback image
        size_bytes: data.file_size_bytes || 0,
        user_id: data.user_id || null
      } as ImageMetadata;
    }
  } catch (error) {
    console.error("Error in getMostRecentImage:", error);
    return null;
  }
};

// Delete an image (updated version)
export const deleteImage = async (imageId: string): Promise<boolean> => {
  const deleteToastId = toast.loading(`Deleting image...`, {
    id: `delete-${imageId}-${Date.now()}`,
    duration: Infinity
  });

  try {
    // Get session for auth token
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      toast.error("You must be logged in to delete images", {
        id: deleteToastId,
        duration: 3000
      });
      return false;
    }

    const token = session.access_token;

    // Call edge function to handle S3 deletion
    const { data, error } = await supabase.functions.invoke("delete-image", {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${token}` },
      body: { imageId },
    });

    if (error || !data?.success) {
      throw new Error(error?.message || data?.error || "Failed to delete image");
    }

    toast.success("Image deleted successfully", {
      id: deleteToastId,
      duration: 3000
    });
    return true;
  } catch (error) {
    console.error("Error in deleteImage:", error);
    toast.error("Failed to delete image", {
      id: deleteToastId,
      duration: 3000
    });
    return false;
  }
};

export const downloadImage = async (s3Key: string, fileName: string): Promise<void> => {
  try {
    console.log("s3Key", s3Key);
    console.log("fileName", fileName);
    const command = new GetObjectCommand({
      Bucket: import.meta.env.VITE_S3_BUCKET,
      Key: s3Key,
    });

    const response = await s3Client.send(command);
    const arrayBuffer = await response.Body?.transformToByteArray();

    if (!arrayBuffer) {
      throw new Error('Failed to get image data');
    }

    const blob = new Blob([arrayBuffer], { type: response.ContentType || 'application/octet-stream' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = fileName;
    link.style.display = 'none';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
  } catch (error) {
    console.error('Error downloading image:', error);
    throw error;
  }
};

export const downloadAllImages = async (images: ImageMetadata[], folderName: string = "download"): Promise<void> => {
  try {
    if (images.length === 0) {
      toast.error("No images to download");
      return;
    }

    const downloadToastId = toast.loading(`Preparing ${images.length} images for download...`, {
      id: `download-all-${Date.now()}`,
      duration: Infinity
    });

    const zip = new JSZip();
    const imgFolder = zip.folder(folderName);

    if (!imgFolder) {
      throw new Error("Failed to create folder in zip");
    }

    // Download each image and add to zip
    const promises = images.map(async (image, index) => {
      try {
        const command = new GetObjectCommand({
          Bucket: import.meta.env.VITE_S3_BUCKET,
          Key: image.s3_key,
        });

        const response = await s3Client.send(command);
        const arrayBuffer = await response.Body?.transformToByteArray();

        if (!arrayBuffer) {
          toast.error(`Failed to download image: ${image.file_name}`);
          return;
        }

        // Update toast with progress
        toast.loading(`Downloading ${index + 1}/${images.length}...`, {
          id: downloadToastId,
          duration: Infinity
        });

        // Add file to zip with proper name
        const fileName = image.file_name || `image-${index + 1}.jpg`;
        imgFolder.file(fileName, arrayBuffer, { binary: true });
      } catch (error) {
        console.error(`Error downloading image ${image.file_name}:`, error);
      }
    });

    await Promise.all(promises);

    // Generate zip file
    toast.loading(`Creating zip file...`, {
      id: downloadToastId,
      duration: Infinity
    });

    const zipContent = await zip.generateAsync({ type: "blob" });
    const zipUrl = window.URL.createObjectURL(zipContent);

    // Create download link and trigger download
    const link = document.createElement('a');
    link.href = zipUrl;
    link.download = `${folderName}.zip`;
    link.style.display = 'none';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(zipUrl);

    toast.success(`${images.length} images downloaded as ${folderName}.zip`, {
      id: downloadToastId,
      duration: 3000
    });
  } catch (error) {
    console.error('Error downloading all images:', error);
    toast.error('Failed to download images');
  }
};

// Approve an image
export const approveImage = async (imageId: string): Promise<boolean> => {
  const approveToastId = toast.loading(`Approving image...`, {
    id: `approve-${imageId}-${Date.now()}`,
    duration: Infinity
  });
  
  try {
    // Get current user
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      toast.error("You must be logged in to approve images", {
        id: approveToastId,
        duration: 3000
      });
      return false;
    }

    // Update the image with approval
    const { error } = await supabase
      .from("images")
      .update({
        is_approved: true,
        approved_by: user.id
      })
      .eq("id", imageId);
    
    if (error) {
      throw new Error(error.message);
    }
    
    toast.success("Image approved successfully", {
      id: approveToastId,
      duration: 3000
    });
    return true;
  } catch (error) {
    console.error("Error in approveImage:", error);
    toast.error("Failed to approve image", {
      id: approveToastId,
      duration: 3000
    });
    return false;
  }
};

// Unapprove an image
export const unapproveImage = async (imageId: string): Promise<boolean> => {
  const unapproveToastId = toast.loading(`Removing approval...`, {
    id: `unapprove-${imageId}-${Date.now()}`,
    duration: Infinity
  });
  
  try {
    // Get current user
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      toast.error("You must be logged in to modify approvals", {
        id: unapproveToastId,
        duration: 3000
      });
      return false;
    }

    // Update the image to remove approval
    const { error } = await supabase
      .from("images")
      .update({
        is_approved: false,
        approved_by: null
      })
      .eq("id", imageId);
    
    if (error) {
      throw new Error(error.message);
    }
    
    toast.success("Image approval removed", {
      id: unapproveToastId,
      duration: 3000
    });
    return true;
  } catch (error) {
    console.error("Error in unapproveImage:", error);
    toast.error("Failed to remove approval", {
      id: unapproveToastId,
      duration: 3000
    });
    return false;
  }
};
