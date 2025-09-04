import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface ThumbnailUpdateData {
    projectId: string;
    imageId: string;
    imageUrl: string;
    imageName: string;
}

// Update project thumbnail to a specific image
export const updateProjectThumbnail = async (
    projectId: string,
    imageId: string
): Promise<boolean> => {
    try {
        // First, get the image details - only select columns we know exist
        const { data: imageData, error: imageError } = await supabase
            .from('images')
            .select('s3_key, file_name')
            .eq('id', imageId)
            .eq('project_id', projectId)
            .single();

        if (imageError || !imageData) {
            console.error('Error fetching image data:', imageError);
            toast.error('Image not found');
            return false;
        }

        // Try to update the project with the new thumbnail
        const { error: updateError } = await supabase
            .from('projects')
            .update({
                thumbnail_key: imageData.s3_key,
                updated_at: new Date().toISOString()
            })
            .eq('id', projectId);

        if (updateError) {
            console.error('Error updating project thumbnail:', updateError);

            // If it's a column error, the column doesn't exist yet
            if (updateError.message?.includes('column') || updateError.message?.includes('thumbnail_key')) {
                toast.error('Thumbnail system not set up yet. Please run the database setup first.');
                return false;
            }

            toast.error('Failed to update project thumbnail');
            return false;
        }

        toast.success('Project thumbnail updated successfully!');
        return true;
    } catch (error) {
        console.error('Error in updateProjectThumbnail:', error);
        toast.error('Failed to update project thumbnail');
        return false;
    }
};

// Remove project thumbnail (set to null)
export const removeProjectThumbnail = async (projectId: string): Promise<boolean> => {
    try {
        const { error: updateError } = await supabase
            .from('projects')
            .update({
                thumbnail_key: null,
                updated_at: new Date().toISOString()
            })
            .eq('id', projectId);

        if (updateError) {
            console.error('Error removing project thumbnail:', updateError);
            toast.error('Failed to remove project thumbnail');
            return false;
        }

        toast.success('Project thumbnail removed successfully!');
        return true;
    } catch (error) {
        console.error('Error in removeProjectThumbnail:', error);
        toast.error('Failed to remove project thumbnail');
        return false;
    }
};

// Get current project thumbnail
export const getProjectThumbnail = async (projectId: string): Promise<string | null> => {
    try {
        const { data: projectData, error: projectError } = await supabase
            .from('projects')
            .select('thumbnail_key')
            .eq('id', projectId)
            .single();

        if (projectError || !projectData) {
            console.error('Error fetching project thumbnail:', projectError);
            return null;
        }

        return projectData.thumbnail_key;
    } catch (error) {
        console.error('Error in getProjectThumbnail:', error);
        return null;
    }
};

// Auto-update thumbnail to most recent image (fallback)
export const autoUpdateThumbnail = async (projectId: string): Promise<boolean> => {
    try {
        // Get the most recent image for the project
        const { data: recentImage, error: imageError } = await supabase
            .from('images')
            .select('s3_key')
            .eq('project_id', projectId)
            .order('created_at', { ascending: false })
            .limit(1)
            .single();

        if (imageError || !recentImage) {
            console.error('No images found for project:', imageError);
            return false;
        }

        // Update the thumbnail
        return await updateProjectThumbnail(projectId, recentImage.id);
    } catch (error) {
        console.error('Error in autoUpdateThumbnail:', error);
        return false;
    }
};

// Get all images for a project to choose thumbnail from
export const getProjectImagesForThumbnail = async (projectId: string) => {
    try {
        // Start with the most basic query - only select columns that definitely exist
        const { data: images, error: imageError } = await supabase
            .from('images')
            .select('id, s3_key, file_name, created_at')
            .eq('project_id', projectId)
            .order('created_at', { ascending: false });

        if (imageError) {
            console.error('Error fetching project images:', imageError);
            return [];
        }

        return images || [];
    } catch (error) {
        console.error('Error in getProjectImagesForThumbnail:', error);
        return [];
    }
};
