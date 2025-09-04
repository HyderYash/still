import { supabase } from '@/integrations/supabase/client';
import { ImageMark, DatabaseImageMark, convertDatabaseMarkToFrontend, convertFrontendMarkToDatabase } from '@/integrations/supabase/types';
import { notifyMarkChange } from './notificationService';

// Get all marks for a specific image
export const getImageMarks = async (imageId: string): Promise<ImageMark[]> => {
  try {
    const { data, error } = await supabase
      .from('image_marks')
      .select('*')
      .eq('image_id', imageId)
      .order('created_at', { ascending: true });

    if (error) {
      console.error('Error fetching image marks:', error);
      throw error;
    }

    return data ? data.map(convertDatabaseMarkToFrontend) : [];
  } catch (error) {
    console.error('Error in getImageMarks:', error);
    return [];
  }
};

// Add a new mark to an image
export const addImageMark = async (
  imageId: string,
  projectId: string,
  mark: Omit<ImageMark, 'id' | 'timestamp'>,
  authorId: string,
  authorName: string
): Promise<ImageMark | null> => {
  try {
    const dbMark = convertFrontendMarkToDatabase(mark, imageId, projectId, authorId, authorName);

    // Log the data being sent for debugging
    console.log('Sending mark data to database:', dbMark);

    const { data, error } = await supabase
      .from('image_marks')
      .insert([dbMark])
      .select()
      .single();

    if (error) {
      console.error('Error adding image mark:', error);
      console.error('Mark data that caused error:', dbMark);
      throw error;
    }

    // Send email notification
    if (data) {
      const savedMark = convertDatabaseMarkToFrontend(data);

      // Get author email from auth context
      const { data: { user } } = await supabase.auth.getUser();
      const authorEmail = user?.email || '';

      // Send notification asynchronously (don't wait for it)
      notifyMarkChange(
        'mark_added',
        projectId,
        imageId,
        authorId,
        authorName,
        authorEmail,
        mark.type,
        mark.color,
        { x: mark.x, y: mark.y },
        mark.comment
      ).catch(err => console.error('Failed to send notification:', err));

      return savedMark;
    }

    return null;
  } catch (error) {
    console.error('Error in addImageMark:', error);
    return null;
  }
};

// Update an existing mark
export const updateImageMark = async (
  markId: string,
  updates: Partial<ImageMark>
): Promise<ImageMark | null> => {
  try {
    // Convert frontend updates to database format
    const dbUpdates: Partial<DatabaseImageMark> = {};

    if (updates.comment !== undefined) dbUpdates.comment = updates.comment;
    if (updates.color !== undefined) dbUpdates.color = updates.color;
    if (updates.x !== undefined) dbUpdates.x_coordinate = Math.round(updates.x);
    if (updates.y !== undefined) dbUpdates.y_coordinate = Math.round(updates.y);
    if (updates.radius !== undefined) dbUpdates.radius = updates.radius ? Math.round(updates.radius) : undefined;
    if (updates.width !== undefined) dbUpdates.width = updates.width ? Math.round(updates.width) : undefined;
    if (updates.height !== undefined) dbUpdates.height = updates.height ? Math.round(updates.height) : undefined;

    const { data, error } = await supabase
      .from('image_marks')
      .update(dbUpdates)
      .eq('id', markId)
      .select()
      .single();

    if (error) {
      console.error('Error updating image mark:', error);
      throw error;
    }

    // Send email notification
    if (data) {
      const updatedMark = convertDatabaseMarkToFrontend(data);

      // Get author email from auth context
      const { data: { user } } = await supabase.auth.getUser();
      const authorEmail = user?.email || '';

      // Get project and image info from the database mark
      const { data: markInfo } = await supabase
        .from('image_marks')
        .select('project_id, image_id, author_id, author_name')
        .eq('id', markId)
        .single();

      if (markInfo) {
        // Send notification asynchronously (don't wait for it)
        notifyMarkChange(
          'mark_updated',
          markInfo.project_id,
          markInfo.image_id,
          markInfo.author_id,
          markInfo.author_name,
          authorEmail,
          updatedMark.type,
          updatedMark.color,
          { x: updatedMark.x, y: updatedMark.y },
          updatedMark.comment
        ).catch(err => console.error('Failed to send notification:', err));
      }

      return updatedMark;
    }

    return null;
  } catch (error) {
    console.error('Error in updateImageMark:', error);
    return null;
  }
};

// Delete a mark
export const deleteImageMark = async (markId: string): Promise<boolean> => {
  try {
    // First, get the mark info before deleting for notification
    const { data: markInfo, error: fetchError } = await supabase
      .from('image_marks')
      .select('*')
      .eq('id', markId)
      .single();

    if (fetchError) {
      console.error('Error fetching mark info for deletion:', fetchError);
      throw fetchError;
    }

    const { error } = await supabase
      .from('image_marks')
      .delete()
      .eq('id', markId);

    if (error) {
      console.error('Error deleting image mark:', error);
      throw error;
    }

    // Send email notification
    if (markInfo) {
      // Get author email from auth context
      const { data: { user } } = await supabase.auth.getUser();
      const authorEmail = user?.email || '';

      // Send notification asynchronously (don't wait for it)
      notifyMarkChange(
        'mark_deleted',
        markInfo.project_id,
        markInfo.image_id,
        markInfo.author_id,
        markInfo.author_name,
        authorEmail,
        markInfo.mark_type,
        markInfo.color,
        { x: markInfo.x_coordinate, y: markInfo.y_coordinate },
        markInfo.comment
      ).catch(err => console.error('Failed to send notification:', err));
    }

    return true;
  } catch (error) {
    console.error('Error in deleteImageMark:', error);
    return false;
  }
};

// Get marks count for an image
export const getImageMarksCount = async (imageId: string): Promise<number> => {
  try {
    const { count, error } = await supabase
      .from('image_marks')
      .select('*', { count: 'exact', head: true })
      .eq('image_id', imageId);

    if (error) {
      console.error('Error getting image marks count:', error);
      throw error;
    }

    return count || 0;
  } catch (error) {
    console.error('Error in getImageMarksCount:', error);
    return 0;
  }
};

// Subscribe to real-time updates for image marks
export const subscribeToImageMarks = (
  imageId: string,
  callback: (marks: ImageMark[]) => void
) => {
  const subscription = supabase
    .channel(`image_marks_${imageId}`)
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'image_marks',
        filter: `image_id=eq.${imageId}`
      },
      async () => {
        // Fetch updated marks when changes occur
        const marks = await getImageMarks(imageId);
        callback(marks);
      }
    )
    .subscribe();

  return subscription;
};

// Legacy localStorage functions for backward compatibility (can be removed later)
export const getImageMarksLocal = (imageId: string): ImageMark[] => {
  try {
    const stored = localStorage.getItem(`image_marks_${imageId}`);
    return stored ? JSON.parse(stored) : [];
  } catch (error) {
    console.error('Error reading from localStorage:', error);
    return [];
  }
};

export const saveImageMarksLocal = (imageId: string, marks: ImageMark[]): void => {
  try {
    localStorage.setItem(`image_marks_${imageId}`, JSON.stringify(marks));
  } catch (error) {
    console.error('Error saving to localStorage:', error);
  }
};
