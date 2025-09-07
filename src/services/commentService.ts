import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

// Type definitions
export type ImageComment = {
  id: string;
  image_id: string;
  user_id: string;
  content: string;
  time_marker?: string | null;
  is_reply_to?: string | null;
  created_at: string;
  updated_at: string;
  // Derived fields after join
  author_name: string;
  author_avatar?: string;
};

// Get comments for an image
export const getImageComments = async (
  imageId: string
): Promise<ImageComment[]> => {
  try {
    // First, get all comments for this image
    const { data: commentsData, error: commentsError } = await supabase
      .from("image_comments")
      .select("*")
      .eq("image_id", imageId)
      .order("created_at", { ascending: true });

    if (commentsError) {
      console.error("Error fetching comments:", commentsError);
      return [];
    }

    if (!commentsData || commentsData.length === 0) {
      return [];
    }

    // Collect all user IDs from comments
    const userIds = [...new Set(commentsData.map(comment => comment.user_id))];

    // Fetch profiles for all these users in a single query
    const { data: profilesData, error: profilesError } = await supabase
      .from("profiles")
      .select("id, first_name, last_name, avatar_url")
      .in("id", userIds);

    if (profilesError) {
      console.error("Error fetching profiles:", profilesError);
      // Continue with available data
    }

    // Create a map of user_id to profile data for quick lookup
    const profilesMap = new Map();
    if (profilesData) {
      profilesData.forEach(profile => {
        profilesMap.set(profile.id, profile);
      });
    }

    // Process the data to format it correctly
    const processedComments: ImageComment[] = commentsData.map((comment) => {
      const profile = profilesMap.get(comment.user_id);

      return {
        id: comment.id,
        image_id: comment.image_id,
        user_id: comment.user_id,
        content: comment.content,
        time_marker: comment.time_marker,
        is_reply_to: comment.is_reply_to,
        created_at: comment.created_at,
        updated_at: comment.updated_at,
        author_name: profile
          ? `${profile.first_name || ""} ${profile.last_name || ""
            }`.trim() || "Anonymous"
          : "Anonymous",
        author_avatar: profile?.avatar_url,
      };
    });

    return processedComments;
  } catch (error) {
    console.error("Error in getImageComments:", error);
    return [];
  }
};

// Add a new comment
export const addComment = async (
  imageId: string,
  content: string,
  timeMarker?: string,
  replyTo?: string
): Promise<ImageComment | null> => {
  try {
    const { data: userData } = await supabase.auth.getUser();
    console.log("User authentication check:", { user: userData.user, error: userData.error });

    if (!userData.user) {
      console.error("No authenticated user found");
      toast.error("You must be logged in to comment");
      return null;
    }

    // First insert the comment
    const commentData = {
      image_id: imageId,
      user_id: userData.user.id,
      content,
      time_marker: timeMarker,
      is_reply_to: replyTo,
    };

    console.log("Inserting comment with data:", commentData);

    // Use Supabase Edge Function to bypass all database restrictions
    const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/add-comment`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`,
      },
      body: JSON.stringify({
        imageId,
        content,
        timeMarker,
        replyTo,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error("Error adding comment via Edge Function:", errorData);
      console.error("Comment data:", { imageId, content, timeMarker, replyTo });
      console.error("User data:", userData.user);
      toast.error(`Failed to add comment: ${errorData.error || 'Unknown error'}`);
      return null;
    }

    const processedComment = await response.json();

    toast.success("Comment added successfully");
    return processedComment;
  } catch (error) {
    console.error("Error in addComment:", error);
    console.error("Comment parameters:", { imageId, content, timeMarker, replyTo });
    toast.error(`Failed to add comment: ${error instanceof Error ? error.message : 'Unknown error'}`);
    return null;
  }
};

// Update an existing comment
export const updateComment = async (
  commentId: string,
  content: string
): Promise<boolean> => {
  try {
    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user) {
      toast.error("You must be logged in to update comments");
      return false;
    }

    // Verify this is the user's comment
    const { data: commentData } = await supabase
      .from("image_comments")
      .select("user_id")
      .eq("id", commentId)
      .single();

    if (!commentData || commentData.user_id !== userData.user.id) {
      toast.error("You can only edit your own comments");
      return false;
    }

    const { error } = await supabase
      .from("image_comments")
      .update({ content })
      .eq("id", commentId);

    if (error) {
      console.error("Error updating comment:", error);
      toast.error("Failed to update comment");
      return false;
    }

    toast.success("Comment updated successfully");
    return true;
  } catch (error) {
    console.error("Error in updateComment:", error);
    toast.error("Failed to update comment");
    return false;
  }
};

// Delete a comment
export const deleteComment = async (commentId: string): Promise<boolean> => {
  try {
    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user) {
      toast.error("You must be logged in to delete comments");
      return false;
    }

    // Verify this is the user's comment
    const { data: commentData } = await supabase
      .from("image_comments")
      .select("user_id")
      .eq("id", commentId)
      .single();

    if (!commentData || commentData.user_id !== userData.user.id) {
      toast.error("You can only delete your own comments");
      return false;
    }

    const { error } = await supabase
      .from("image_comments")
      .delete()
      .eq("id", commentId);

    if (error) {
      console.error("Error deleting comment:", error);
      toast.error("Failed to delete comment");
      return false;
    }

    toast.success("Comment deleted successfully");
    return true;
  } catch (error) {
    console.error("Error in deleteComment:", error);
    toast.error("Failed to delete comment");
    return false;
  }
};