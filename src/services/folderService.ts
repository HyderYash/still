import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

// Types
export type Folder = {
  id: string;
  name: string;
  project_id: string;
  parent_id: string | null;
  created_at: string;
  updated_at: string;
  date?: string;
  images?: any[];
};

// Create a new folder
export const createFolder = async (
  projectId: string,
  folderName: string,
  parentId: string | null = null
): Promise<Folder | null> => {
  try {
    // We need to specify the types correctly here
    const { data, error } = await supabase
      .from("folders")
      .insert({
        name: folderName,
        project_id: projectId,
        parent_id: parentId,
      })
      .select()
      .single();

    if (error) {
      console.error("Error creating folder:", error);
      toast.error("Failed to create folder");
      return null;
    }

    toast.success(`Folder "${folderName}" created successfully!`);
    return {
      ...data,
      date: new Date(data.created_at).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      }),
      images: []
    };
  } catch (error) {
    console.error("Error in createFolder:", error);
    toast.error("Failed to create folder");
    return null;
  }
};

// Get folders for a project
export const getFolders = async (
  projectId: string,
  parentId: string | null = null
): Promise<Folder[]> => {
  try {
    console.log("projectId: ", projectId);
    console.log("parentId: ", parentId);
    
    // First build the query
    let query = supabase
      .from("folders")
      .select("*")
      .eq("project_id", projectId);
    
    // Then conditionally add the parent_id filter
    if (parentId === null) {
      query = query.is("parent_id", null);
    } else {
      query = query.eq("parent_id", parentId);
    }
    
    // Finally execute the query
    const { data, error } = await query;

    console.log("Fetched folders data: ", data);
    
    if (error) {
      console.error("Error fetching folders:", error);
      return [];
    }

    return data.map((folder) => ({
      ...folder,
      date: new Date(folder.created_at).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      }),
      images: []
    }));
  } catch (error) {
    console.error("Error in getFolders:", error);
    return [];
  }
};

// Update a folder name
export const updateFolder = async (
  folderId: string,
  folderName: string
): Promise<boolean> => {
  try {
    const { error } = await supabase
      .from("folders")
      .update({ name: folderName })
      .eq("id", folderId);

    if (error) {
      console.error("Error updating folder:", error);
      toast.error("Failed to update folder");
      return false;
    }

    toast.success(`Folder updated to "${folderName}"`);
    return true;
  } catch (error) {
    console.error("Error in updateFolder:", error);
    toast.error("Failed to update folder");
    return false;
  }
};

// Delete a folder and all images inside it
export const deleteFolder = async (folderId: string): Promise<boolean> => {
  try {
    const deleteToastId = toast.loading("Deleting folder...");
    
    // Get session for authentication
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      toast.error("You must be logged in to delete a folder", { id: deleteToastId });
      return false;
    }
    
    // First, get folder details for better user feedback
    const { data: folderData, error: folderError } = await supabase
      .from("folders")
      .select("id, name")
      .eq("id", folderId)
      .single();
    
    if (folderError || !folderData) {
      console.error("Error fetching folder:", folderError);
      toast.error("Folder not found", { id: deleteToastId });
      return false;
    }
    
    // Call edge function to delete all images at once (more efficient)
    // This handles S3 deletion and database cleanup in one request
    const { error: deleteImagesError } = await supabase.functions.invoke("delete-folder-images", {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${session.access_token}` },
      body: { folderId },
    });
    
    if (deleteImagesError) {
      console.error("Error deleting folder images:", deleteImagesError);
      toast.error("Failed to delete folder images", { id: deleteToastId });
      return false;
    }
    
    // Now delete the folder itself
    const { error } = await supabase
      .from("folders")
      .delete()
      .eq("id", folderId);

    if (error) {
      console.error("Error deleting folder:", error);
      toast.error("Failed to delete folder", { id: deleteToastId });
      return false;
    }

    toast.success(`Folder "${folderData.name}" deleted successfully`, { id: deleteToastId });
    return true;
  } catch (error) {
    console.error("Error in deleteFolder:", error);
    toast.error("Failed to delete folder");
    return false;
  }
};

/**
 * Comprehensive function to delete a folder with all its contents.
 * This function will:
 * 1. Fetch all images in the folder
 * 2. Delete each image from both S3 and the database
 * 3. Update storage quota for the user
 * 4. Delete any nested folders recursively
 * 5. Delete the folder from the database
 * 
 * @param folderId The ID of the folder to delete
 * @returns Promise<boolean> indicating success or failure
 */
export const deleteFolderWithContents = async (folderId: string): Promise<boolean> => {
  try {
    const deleteToastId = toast.loading("Deleting folder and its contents...");
    
    // Get session for authentication
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      toast.error("You must be logged in to delete a folder", { id: deleteToastId });
      return false;
    }
    
    // Step 1: Fetch folder details
    const { data: folderData, error: folderError } = await supabase
      .from("folders")
      .select("id, name, project_id")
      .eq("id", folderId)
      .single();
    
    if (folderError || !folderData) {
      console.error("Error fetching folder:", folderError);
      toast.error("Folder not found", { id: deleteToastId });
      return false;
    }
    
    // Step 2: Check for nested folders and delete them recursively
    const { data: nestedFolders, error: nestedFoldersError } = await supabase
      .from("folders")
      .select("id, name")
      .eq("parent_id", folderId);
    
    if (nestedFoldersError) {
      console.error("Error fetching nested folders:", nestedFoldersError);
      toast.error("Failed to check for nested folders", { id: deleteToastId });
      return false;
    }
    
    // Delete nested folders if any exist
    if (nestedFolders && nestedFolders.length > 0) {
      toast.loading(`Deleting ${nestedFolders.length} nested folders...`, { id: deleteToastId });
      
      // Delete each nested folder recursively
      for (const nestedFolder of nestedFolders) {
        const success = await deleteFolderWithContents(nestedFolder.id);
        if (!success) {
          console.error(`Failed to delete nested folder: ${nestedFolder.name}`);
          // Continue with other folders even if one fails
        }
      }
    }
    
    // Step 3: Fetch all images in the folder
    const { data: folderImages, error: imagesError } = await supabase
      .from("images")
      .select("id, s3_key, size_bytes, file_size_bytes")
      .eq("folder_id", folderId);
    
    if (imagesError) {
      console.error("Error fetching folder images:", imagesError);
      toast.error("Failed to fetch folder contents", { id: deleteToastId });
      return false;
    }
    
    // Update toast with more info
    toast.loading(`Deleting ${folderImages?.length || 0} images from folder "${folderData.name}"...`, { 
      id: deleteToastId 
    });
    
    // Step 4: Delete all images if there are any
    if (folderImages && folderImages.length > 0) {
      try {
        // Call edge function to delete all images at once (more efficient)
        const { error: deleteImagesError } = await supabase.functions.invoke("delete-folder-images", {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${session.access_token}` },
          body: { folderId },
        });
        
        if (deleteImagesError) {
          console.error("Error deleting folder images:", deleteImagesError);
          toast.error("Failed to delete folder images", { id: deleteToastId });
          return false;
        }
      } catch (error) {
        console.error("Error invoking delete-folder-images function:", error);
        toast.error("Failed to delete folder images", { id: deleteToastId });
        return false;
      }
    }
    
    // Step 5: Delete the folder itself
    const { error } = await supabase
      .from("folders")
      .delete()
      .eq("id", folderId);

    if (error) {
      console.error("Error deleting folder:", error);
      toast.error("Failed to delete folder", { id: deleteToastId });
      return false;
    }
    
    // Success!
    toast.success(`Folder "${folderData.name}" and all contents deleted successfully`, { 
      id: deleteToastId,
      duration: 3000
    });
    return true;
    
  } catch (error) {
    console.error("Error in deleteFolderWithContents:", error);
    toast.error("Failed to delete folder and its contents");
    return false;
  }
};

// Subscribe to folder changes
export const subscribeToFolders = (callback: () => void) => {
  return supabase
    .channel("public:folders")
    .on(
      "postgres_changes",
      { event: "*", schema: "public", table: "folders" },
      callback
    )
    .subscribe();
};
