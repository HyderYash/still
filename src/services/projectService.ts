import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { getMostRecentImage } from "./imageService";

// Create a new project in the database
export const createProject = async (name: string): Promise<string | null> => {
  try {
    const { data: userData } = await supabase.auth.getUser();

    if (!userData.user) {
      toast.error("You must be logged in to create projects");
      return null;
    }

    // Single parallel query to get both profile+plan data and project count
    const [profileResponse, projectCountResponse] = await Promise.all([
      supabase
        .from("profiles")
        .select(`
          id,
          plans:plan_id(
            name,
            allowed_projects
          )
        `)
        .eq("id", userData.user.id)
        .single(),
      supabase
        .from("projects")
        .select("id", { count: "exact", head: true })
        .eq("user_id", userData.user.id)
    ]);

    // Handle profile response
    if (profileResponse.error) {
      console.error("Profile fetch error:", profileResponse.error);
      toast.error("Failed to check project limits");
      return null;
    }

    if (!profileResponse.data) {
      toast.error("User profile not found");
      return null;
    }

    // Handle project count response
    if (projectCountResponse.error) {
      console.error("Error fetching user projects:", projectCountResponse.error);
      toast.error("Failed to check existing projects");
      return null;
    }

    const allowedProjects = profileResponse.data.plans?.allowed_projects;
    const currentProjectCount = projectCountResponse.count || 0;

    // Check limits only if user has a plan with project limits
    if (allowedProjects !== null && allowedProjects !== undefined) {
      // Check if user has reached the limit
      if (currentProjectCount >= allowedProjects) {
        toast.error("Upgrade your plan to create more projects", {
          duration: 5000
        });
        return null;
      }

      // Optional: Show warning when approaching limit (80% threshold)
      const usagePercentage = (currentProjectCount / allowedProjects) * 100;
      if (usagePercentage >= 80) {
        toast.warning(
          `You're using ${currentProjectCount} of ${allowedProjects} allowed projects. Consider upgrading your plan.`,
          {
            duration: 4000
          }
        );
      }
    }

    // Create the project if limits are not exceeded
    const { data, error } = await supabase
      .from('projects')
      .insert({
        name,
        user_id: userData.user.id,
        visibility: 'private'
      })
      .select()
      .single();

    if (error) {
      console.error("Error creating project:", error);
      toast.error("Failed to create project");
      return null;
    }

    toast.success(`Project "${name}" created successfully!`);
    return data.id;
  } catch (error) {
    console.error("Error in createProject:", error);
    toast.error("Failed to create project");
    return null;
  }
};

// Get project thumbnail
export const getProjectThumbnailfromDB = async (projectId: string) => {
  try {
    // First check if we can access the project
    const { data: projectData, error: projectError } = await supabase
      .from('projects')
      .select('visibility, user_id, thumbnail_key')
      .eq('id', projectId)
      .single();

    if (projectError) {
      console.error("Error fetching project:", projectError);
      return null;
    }

    // If project has a custom thumbnail, use it
    if (projectData.thumbnail_key) {
      // You can implement logic here to get the thumbnail image
      // For now, we'll fall back to the most recent image
    }

    // Now get the most recent image as fallback
    const thumbnailImage = await getMostRecentImage(projectId);
    return thumbnailImage;
  } catch (error) {
    console.error("Error fetching project thumbnail:", error);
    return null;
  }
};

// Optional: Helper function to check project limits (can be used elsewhere)
export const checkProjectLimits = async (userId: string): Promise<{
  canCreateMore: boolean;
  currentCount: number;
  allowedProjects: number | null;
  usagePercentage: number;
}> => {
  try {
    // Get user's plan
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select(`
        id,
        plans:plan_id(
          name,
          allowed_projects
        )
      `)
      .eq("id", userId)
      .single();

    if (profileError || !profile) {
      throw new Error("Failed to fetch user profile");
    }

    const allowedProjects = profile.plans?.allowed_projects;

    // Get current project count
    const { data: projectsData, error: projectsError } = await supabase
      .from("projects")
      .select("id", { count: "exact" })
      .eq("user_id", userId);

    if (projectsError) {
      throw new Error("Failed to fetch user projects");
    }

    const currentCount = projectsData?.length || 0;

    // If allowed_projects is null, unlimited projects are allowed
    if (allowedProjects === null || allowedProjects === undefined) {
      return {
        canCreateMore: true,
        currentCount,
        allowedProjects,
        usagePercentage: 0
      };
    }

    const usagePercentage = (currentCount / allowedProjects) * 100;
    const canCreateMore = currentCount < allowedProjects;

    return {
      canCreateMore,
      currentCount,
      allowedProjects,
      usagePercentage
    };
  } catch (error) {
    console.error("Error checking project limits:", error);
    throw error;
  }
};

export default {
  createProject,
  getProjectThumbnailfromDB,
  checkProjectLimits
};