import { supabase } from "@/integrations/supabase/client";
import { getSignedUrlForObject } from "@/integrations/aws/client";
import { toast } from "sonner";

// Types
export type ShareRequest = {
  id: string;
  projectId: string;
  projectName: string;
  senderName: string;
  senderEmail: string;
  date: string;
  status: "pending" | "accepted" | "rejected";
};

// Get pending share requests for the current user
export const getShareRequests = async (): Promise<ShareRequest[]> => {
  try {
    const { data: userData } = await supabase.auth.getUser();

    if (!userData.user) {
      return [];
    }

    const { data, error } = await supabase
      .from("project_shares")
      .select(
        `
        id,
        project_id,
        shared_by,
        status,
        created_at,
        projects(name)
      `
      )
      .eq("shared_with", userData.user.email)
      .eq("status", "pending");

    if (error) {
      console.error("Error fetching share requests:", error);
      return [];
    }

    // Get sender information for each share
    const shareRequests: ShareRequest[] = [];

    for (const share of data) {
      // Get sender profile information
      const { data: senderData } = await supabase
        .from("profiles")
        .select("first_name, last_name")
        .eq("id", share.shared_by)
        .single();

      const senderName = senderData
        ? `${senderData.first_name || ""} ${senderData.last_name || ""}`.trim()
        : "Unknown User";

      shareRequests.push({
        id: share.id,
        projectId: share.project_id,
        projectName: share.projects?.name || "Untitled Project",
        senderName: senderName,
        senderEmail: "",
        date: new Date(share.created_at).toLocaleDateString("en-US", {
          month: "short",
          day: "numeric",
          year: "numeric",
        }),
        status: share.status,
      });
    }

    return shareRequests;
  } catch (error) {
    console.error("Error in getShareRequests:", error);
    return [];
  }
};

// Accept a share request
export const acceptShareRequest = async (
  requestId: string
): Promise<boolean> => {
  try {
    const { error } = await supabase
      .from("project_shares")
      .update({ status: "accepted" })
      .eq("id", requestId);

    if (error) {
      console.error("Error accepting share request:", error);
      toast.error("Failed to accept share request");
      return false;
    }

    toast.success("Share request accepted!");
    return true;
  } catch (error) {
    console.error("Error in acceptShareRequest:", error);
    toast.error("Failed to accept share request");
    return false;
  }
};

// Decline a share request
export const declineShareRequest = async (
  requestId: string
): Promise<boolean> => {
  try {
    const { error } = await supabase
      .from("project_shares")
      .update({ status: "rejected" })
      .eq("id", requestId);

    if (error) {
      console.error("Error declining share request:", error);
      toast.error("Failed to decline share request");
      return false;
    }

    toast.success("Share request declined");
    return true;
  } catch (error) {
    console.error("Error in declineShareRequest:", error);
    toast.error("Failed to decline share request");
    return false;
  }
};

// Share a project with another user
export const shareProject = async (
  projectId: string,
  recipientEmail: string
): Promise<boolean> => {
  try {
    const { data: userData } = await supabase.auth.getUser();

    if (!userData.user) {
      toast.error("You must be logged in to share projects");
      return false;
    }

    // Check if this project is already shared with this user
    const { data: existingShares } = await supabase
      .from("project_shares")
      .select("*")
      .eq("project_id", projectId)
      .eq("shared_with", recipientEmail);

    if (existingShares && existingShares.length > 0) {
      toast.info("This project is already shared with this user");
      return false;
    }

    // Create new share
    const { error } = await supabase.from("project_shares").insert({
      project_id: projectId,
      shared_with: recipientEmail,
      shared_by: userData.user.id,
      status: "pending",
    });

    if (error) {
      console.error("Error sharing project:", error);
      toast.error("Failed to share project");
      return false;
    }

    // Call the edge function to send email
    const { data: edgeFunctionData, error: edgeFunctionError } = await supabase.functions.invoke('share-notification-email', {
      body: {
        project_id: projectId,
        shared_by: userData.user.id,
        shared_with_email: recipientEmail
      }
    });

    if (edgeFunctionError) {
      console.error("Error sending notification email:", edgeFunctionError);
      // Don't show error to user since the share was created successfully
    }
    else {
      console.log("Notification email sent successfully, data:", edgeFunctionData);
    }

    toast.success(`Shared with ${recipientEmail}`);
    return true;
  } catch (error) {
    console.error("Error in shareProject:", error);
    toast.error("Failed to share project");
    return false;
  }
};

// Get all users a project is shared with
export const getProjectShares = async (
  projectId: string
): Promise<{ email: string; status: string }[]> => {
  try {
    const { data, error } = await supabase
      .from("project_shares")
      .select("shared_with, status")
      .eq("project_id", projectId);

    if (error) {
      console.error("Error fetching project shares:", error);
      return [];
    }

    return data.map((share) => ({
      email: share.shared_with,
      status: share.status,
    }));
  } catch (error) {
    console.error("Error in getProjectShares:", error);
    return [];
  }
};

// Update project visibility
export const updateProjectVisibility = async (
  projectId: string,
  visibility: "public" | "private"
): Promise<boolean> => {
  try {
    const { error } = await supabase
      .from("projects")
      .update({ visibility })
      .eq("id", projectId);

    if (error) {
      console.error("Error updating project visibility:", error);
      toast.error("Failed to update project visibility");
      return false;
    }

    toast.success(`Project set to ${visibility}`);
    return true;
  } catch (error) {
    console.error("Error in updateProjectVisibility:", error);
    toast.error("Failed to update project visibility");
    return false;
  }
};

export const getProjects = async (userId?: string, isPublic?: boolean) => {
  try {
    let userEmail = null;

    if(!userId) {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) {
        return [];
      }
      userId = userData.user.id;
      userEmail = userData.user.email;
    } 

    // Call the simplified stored procedure
    const { data: projects, error } = await supabase.rpc(
      "get_complete_user_projects",
      {
        input_user_id: userId,
        input_user_email: userEmail,
        ispublic: isPublic
      }
    );

    if (error) {
      console.error("Error fetching projects:", error);
      return [];
    }

    // Log raw data for debugging
    console.log("Raw projects data:", projects);

    // Process the results to get signed URLs for thumbnails
    const processedProjects = await Promise.all(
      projects.map(async (project) => {
        let thumbnailUrl = null;

        if (project.thumbnail_key) {
          thumbnailUrl = await getSignedUrlForObject(project.thumbnail_key);
        }

        return {
          id: project.id,
          name: project.name,
          user_id: project.user_id,
          visibility: project.visibility,
          created_at: project.created_at,
          updated_at: project.updated_at,
          date: project.formatted_date,
          isShared: project.is_shared,
          sharedById: project.shared_by_id,
          sharedByName: project.shared_by_name ?? "Unknown User",
          thumbnailUrl: thumbnailUrl,
        };
      })
    );

    return processedProjects;
  } catch (error) {
    console.error("Error in getProjects:", error);
    return [];
  }
};

// Subscribe to project changes
export const subscribeToProjects = (callback: () => void) => {
  return supabase
    .channel("public:projects")
    .on(
      "postgres_changes",
      { event: "*", schema: "public", table: "projects" },
      callback
    )
    .on(
      "postgres_changes",
      { event: "*", schema: "public", table: "project_shares" },
      callback
    )
    .subscribe();
};
