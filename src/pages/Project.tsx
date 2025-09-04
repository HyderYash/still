import { useParams, useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";
import { ScrollArea } from "@/components/ui/scroll-area";
import EditProjectDialog from "@/components/EditProjectDialog";
import { toast } from "sonner";
import ImageCommentsSidebar from "@/components/ImageCommentsSidebar";
import { useUser } from "@/contexts/UserContext";
import AuthModal from "@/components/AuthModal";
import { Dialog } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { ThumbnailSelector } from "@/components/ThumbnailSelector";

import { createFolder } from "@/services/folderService";
import { getImages } from "@/services/imageService";
import { getMostRecentImage } from "@/services/imageService";
import { getProjectThumbnailfromDB } from "@/services/projectService";
import { Folder } from "@/services/folderService";
import { ImageData } from "@/hooks/useProjectImages";
import { MessageCircle, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

import ProjectHeader from "@/components/project/ProjectHeader";
import FolderPath from "@/components/project/FolderPath";
import FolderGrid from "@/components/project/FolderGrid";
import ImageGrid from "@/components/project/ImageGrid";
import CreateFolderDialog from "@/components/project/CreateFolderDialog";
import { useProjectFolders } from "@/hooks/useProjectFolders";
import { useProjectImages } from "@/hooks/useProjectImages";
import ImageDetailView from "@/components/ImageDetailView";

type ProjectData = {
  id: string;
  name: string;
  date: string;
  images: ImageData[];
  folders?: Folder[];
  archived?: boolean;
  visibility?: string;
  user_id?: string;
  thumbnailUrl?: string | null;
};

const Project = () => {
  const { projectId } = useParams();
  const navigate = useNavigate();
  const { isLoggedIn, user } = useUser();
  const [project, setProject] = useState<ProjectData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [layoutType, setLayoutType] = useState<"grid" | "rows">("grid");
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isCreateFolderOpen, setIsCreateFolderOpen] = useState(false);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [authRedirectAction, setAuthRedirectAction] = useState<
    (() => void) | undefined
  >(undefined);
  const [showOnlyCommented, setShowOnlyCommented] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isThumbnailSelectorOpen, setIsThumbnailSelectorOpen] = useState(false);

  // Fetch project data - Simple and reliable
  useEffect(() => {
    const fetchProject = async () => {
      if (!projectId) return;

      setIsLoading(true);
      setError(null);

      try {
        console.log("Fetching project:", projectId);

        const { data, error } = await supabase
          .from("projects")
          .select("*")
          .eq("id", projectId)
          .single();

        console.log("Supabase response:", { data, error, projectId });

        if (error) {
          console.error("Error fetching project:", error);
          setError(`Project not found: ${error.message || error}`);
          return;
        }

        if (!data) {
          setError("Project not found");
          return;
        }

        console.log("Project data loaded:", data);

        // Map database data to ProjectData type
        const projectData: ProjectData = {
          id: data.id,
          name: data.name,
          date: new Date(data.created_at).toLocaleDateString('en-US', {
            month: 'long',
            year: 'numeric'
          }),
          images: [],
          visibility: data.visibility,
          user_id: data.user_id,
          thumbnailUrl: data.thumbnail_key ? `https://stillscolab-images-us-east-1.s3.us-east-1.amazonaws.com/${data.thumbnail_key}` : undefined,
        };

        setProject(projectData);
      } catch (err: any) {
        console.error("Error in fetchProject:", err);

        setError("Failed to fetch project - please check your connection");
      } finally {
        setIsLoading(false);
      }
    };

    fetchProject();
  }, [projectId]);

  const {
    folders,
    currentFolderId,
    folderPath,
    handleFolderClick,
    handleBackToParent,
    navigateToPathLevel,
    foldersLoading,
  } = useProjectFolders(projectId);

  const openAuthModal = (redirectAction?: () => void) => {
    if (!isLoggedIn && (!project || project.visibility !== "public")) {
      setAuthRedirectAction(() => redirectAction);
      setIsAuthModalOpen(true);
    } else {
      redirectAction?.();
    }
  };

  const {
    processedImages,
    selectedImage,
    isCommentsSidebarOpen,
    setIsCommentsSidebarOpen,
    setSelectedImage,
    handleAddImage,
    handleAddMultipleImages,
    handleDeleteImage,
    handleDownloadImage,
    handleDownloadAllImages,
    handleImageClick,
    handleUpdateMarker,
    navigateToNextImage,
    navigateToPreviousImage,
  } = useProjectImages({
    projectId,
    currentFolderId,
    isLoggedIn,
    openAuthModal,
    projectVisibility: project?.visibility,
  });

  // Filter images to show only those with comments if filter is active
  const imagesWithComments = processedImages.filter(image => image.has_comments);
  const commentsCount = imagesWithComments.length;
  const filteredImages = showOnlyCommented ? imagesWithComments : processedImages;

  const currentFolder = folders.find((f) => f.id === currentFolderId);

  // Handle auth modal for private projects
  useEffect(() => {
    if (project && !isLoggedIn && project.visibility !== "public") {
      setTimeout(() => {
        setIsAuthModalOpen(true);
      }, 100);
    }
  }, [project, isLoggedIn]);



  const handleCreateFolder = async (folderName: string) => {
    if (!isLoggedIn) {
      openAuthModal(() => handleCreateFolder(folderName));
      return;
    }

    // Check if user has permission to create folders
    const isProjectOwner = user?.id === project?.user_id;
    if (project?.visibility === "public" && !isProjectOwner) {
      toast.error("You don't have permission to create folders in this project");
      return;
    }

    if (!project || !projectId || !folderName.trim()) return;

    const newFolder = await createFolder(
      projectId,
      folderName,
      currentFolderId
    );

    if (newFolder) {
      setIsCreateFolderOpen(false);
      toast.success(`Folder "${folderName}" created successfully!`);
    }
  };

  const handleThumbnailChange = () => {
    setIsThumbnailSelectorOpen(true);
  };

  const handleThumbnailUpdate = () => {
    // Refresh project data to show updated thumbnail
    if (projectId) {
      // You might want to refresh the project list here
      // For now, we'll just close the modal
      setIsThumbnailSelectorOpen(false);
    }
  };

  const handleSaveEditedProject = async (
    projectName: string,
    projectDate: string
  ) => {
    if (!isLoggedIn) {
      openAuthModal(() => handleSaveEditedProject(projectName, projectDate));
      return;
    }

    if (!project) return;

    try {
      if (project.id) {
        const { error } = await supabase
          .from("projects")
          .update({
            name: projectName,
            // Note: We're not updating the date in the database since it's derived from created_at
            // The date field is just for display purposes
          })
          .eq("id", project.id);

        if (error) throw error;
      }

      setProject({
        ...project,
        name: projectName,
        date: projectDate,
      });

      toast.success(`Project "${projectName}" updated successfully!`);
      setIsEditModalOpen(false);
    } catch (error) {
      console.error("Error updating project:", error);
      toast.error("Failed to update project");
    }
  };

  const handleDeleteProject = async (projectId: string) => {
    if (!isLoggedIn && project?.visibility !== "public") {
      openAuthModal(() => handleDeleteProject(projectId));
      return;
    }

    try {
      const { error } = await supabase
        .from("projects")
        .delete()
        .eq("id", projectId);

      if (error) throw error;

      toast.success("Project deleted successfully!");
      navigate("/");
    } catch (error) {
      console.error("Error deleting project:", error);
      toast.error("Failed to delete project");
    }
  };

  const handleArchiveProject = (projectId: string) => {
    if (!isLoggedIn && project?.visibility !== "public") {
      openAuthModal(() => handleArchiveProject(projectId));
      return;
    }

    if (!project) return;

    const updatedProject = {
      ...project,
      archived: true,
    };

    setProject(updatedProject);

    toast.success(`Project "${project.name}" archived successfully!`);
  };



  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] flex flex-col items-center justify-center">
        <div className="text-center">
          <div className="w-24 h-24 bg-gradient-to-br from-[#16ad7c]/20 to-[#5ce1e6]/20 rounded-full flex items-center justify-center mx-auto mb-6">
            <div className="w-12 h-12 border-4 border-[#16ad7c] border-r-transparent rounded-full animate-spin"></div>
          </div>
          <h1 className="text-2xl font-bold text-white mb-4">Loading Project...</h1>
          <p className="text-gray-400 text-lg max-w-md mx-auto">
            Please wait while we fetch your project details.
          </p>
          <div className="mt-4 text-sm text-gray-500">
            Project ID: {projectId}
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] flex flex-col items-center justify-center">
        <div className="text-center">
          <div className="w-24 h-24 bg-gradient-to-br from-red-500/20 to-red-600/20 rounded-full flex items-center justify-center mx-auto mb-6">
            <svg className="w-12 h-12 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
          </div>
          <h1 className="text-3xl font-bold text-white mb-4">Project Not Found</h1>
          <p className="text-gray-400 text-lg mb-8 max-w-md mx-auto">
            {error === "Project not found"
              ? "The project you're looking for doesn't exist or may have been removed."
              : `Error: ${error}`
            }
          </p>
          <Button
            onClick={() => navigate("/")}
            className="bg-gradient-to-r from-[#16ad7c] to-[#5ce1e6] hover:from-[#5ce1e6] hover:to-[#16ad7c] text-black font-semibold px-8 py-3 rounded-xl transition-all duration-300 shadow-lg hover:shadow-[0_8px_25px_rgba(22,173,124,0.3)]"
          >
            Back to Projects
          </Button>
        </div>
      </div>
    );
  }

  if (!project) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] flex flex-col items-center justify-center">
        <div className="text-center">
          <div className="w-24 h-24 bg-gradient-to-br from-red-500/20 to-red-600/20 rounded-full flex items-center justify-center mx-auto mb-6">
            <svg className="w-12 h-12 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
          </div>
          <h1 className="text-3xl font-bold text-white mb-4">Project Not Found</h1>
          <p className="text-gray-400 text-lg mb-8 max-w-md mx-auto">
            The project you're looking for doesn't exist or may have been removed.
          </p>
          <Button
            onClick={() => navigate("/")}
            className="bg-gradient-to-r from-[#16ad7c] to-[#5ce1e6] hover:from-[#5ce1e6] hover:to-[#16ad7c] text-black font-semibold px-8 py-3 rounded-xl transition-all duration-300 shadow-lg hover:shadow-[0_8px_25px_rgba(22,173,124,0.3)]"
          >
            Back to Projects
          </Button>
        </div>
      </div>
    );
  }

  const isProjectOwner = user?.id === project.user_id;
  const canAddImages = isLoggedIn && (project.visibility !== "public" || isProjectOwner);
  // Only project owners can edit, delete, or archive projects
  const canEditProject = isLoggedIn && isProjectOwner;

  const handleCreateFolderClick = () => {
    if (!canAddImages) {
      toast.error("You don't have permission to create folders in this project");
      return;
    }
    setIsCreateFolderOpen(true);
  };



  const handleRenameProject = () => {
    if (!canEditProject) {
      toast.error("You don't have permission to rename this project");
      return;
    }
    setIsEditModalOpen(true);
  };

  const handleDeleteProjectClick = (projectId: string) => {
    if (!canEditProject) {
      toast.error("You don't have permission to delete this project");
      return;
    }
    handleDeleteProject(projectId);
  };

  const handleArchiveProjectClick = (projectId: string) => {
    if (!canEditProject) {
      toast.error("You don't have permission to archive this project");
      return;
    }
    handleArchiveProject(projectId);
  };

  return (
    <div className="relative min-h-screen bg-[#0a0a0a]">
      {/* Enhanced Background with Subtle Elements */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-20 left-10 w-72 h-72 bg-[#16ad7c]/3 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute bottom-20 right-10 w-96 h-96 bg-[#5ce1e6]/3 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '2s' }}></div>
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-[#6366f1]/2 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }}></div>
      </div>

      <main className="container mx-auto pt-24 pb-8 px-4 sm:px-6 relative z-10 max-w-7xl animate-fade-in">
        <ProjectHeader
          projectName={project.name}
          projectDate={currentFolder ? currentFolder.date : project.date}
          projectId={project.id}
          isInFolder={!!currentFolderId}
          onBack={handleBackToParent}
          onRename={handleRenameProject}
          onDelete={() => project.id && handleDeleteProjectClick(project.id)}
          onArchive={() => project.id && handleArchiveProjectClick(project.id)}
          onLayoutChange={setLayoutType}
          currentLayout={layoutType}
          onCreateFolder={handleCreateFolderClick}
          hasImages={processedImages.length > 0}
          canAddImages={canAddImages}
          canEditProject={canEditProject}
          onThumbnailChange={handleThumbnailChange}
        />

        <FolderPath
          projectName={project.name}
          folderPath={folderPath}
          navigateToLevel={navigateToPathLevel}
        />

        {/* Enhanced Action Buttons Section */}
        <div className="mb-6 sm:mb-8 flex justify-end flex-wrap gap-3">
          {processedImages.length > 0 && (
            <Button
              variant="outline"
              onClick={() => handleDownloadAllImages(currentFolder ? currentFolder.name : project.name)}
              className="flex items-center gap-2 border-[#2a2a2a] hover:border-[#16ad7c]/30 text-gray-300 hover:text-white hover:bg-[#16ad7c]/10 transition-all duration-300 px-4 py-2 rounded-xl"
            >
              <Download size={16} />
              Download All
            </Button>
          )}

          <Button
            variant={showOnlyCommented ? "default" : "outline"}
            onClick={() => setShowOnlyCommented(!showOnlyCommented)}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl transition-all duration-300 ${showOnlyCommented
              ? "bg-gradient-to-r from-[#16ad7c] to-[#5ce1e6] text-black font-semibold shadow-lg hover:shadow-[0_8px_25px_rgba(22,173,124,0.3)]"
              : "border-[#2a2a2a] hover:border-[#16ad7c]/30 text-gray-300 hover:text-white hover:bg-[#16ad7c]/10"
              }`}
          >
            <MessageCircle size={16} />
            <span className="hidden sm:inline">
              {showOnlyCommented ? "Show All Images" : "Show Images with Comments"}
            </span>
            <span className="sm:hidden">
              {showOnlyCommented ? "Show All" : "Comments"}
            </span>
            {!showOnlyCommented && commentsCount > 0 && (
              <span className="ml-1 px-2 py-1 bg-[#16ad7c]/20 border border-[#16ad7c]/30 text-[#16ad7c] text-xs rounded-full font-medium">
                {commentsCount}
              </span>
            )}
          </Button>
        </div>

        {/* Enhanced Folder Grid Section */}
        {layoutType === "grid" && folders.length > 0 && (
          <div className="mb-8">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-8 h-8 bg-gradient-to-br from-[#8b5cf6] to-[#7c3aed] rounded-lg flex items-center justify-center">
                <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-5l-2-2H5a2 2 0 00-2 2z" />
                </svg>
              </div>
              <h2 className="text-xl font-bold text-white">Project Folders</h2>
              <Badge className="bg-[#8b5cf6]/20 border-[#8b5cf6]/30 text-[#8b5cf6] text-xs px-2 py-1">
                {folders.length} Folders
              </Badge>
            </div>
            <FolderGrid
              folders={folders}
              onFolderClick={handleFolderClick}
              projectId={projectId}
              currentFolderId={currentFolderId}
              showActions={project?.visibility !== "public" || isProjectOwner}
            />
          </div>
        )}

        {/* Enhanced Image Grid Section */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-8 h-8 bg-gradient-to-br from-[#16ad7c] to-[#5ce1e6] rounded-lg flex items-center justify-center">
              <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </div>
            <h2 className="text-xl font-bold text-white">Project Images</h2>
            <Badge className="bg-[#16ad7c]/20 border-[#16ad7c]/30 text-[#16ad7c] text-xs px-2 py-1">
              {filteredImages.length} Images
            </Badge>
            {showOnlyCommented && commentsCount > 0 && (
              <Badge className="bg-[#f59e0b]/20 border-[#f59e0b]/30 text-[#f59e0b] text-xs px-2 py-1">
                {commentsCount} with Comments
              </Badge>
            )}
          </div>

          <ImageGrid
            images={filteredImages}
            folders={folders}
            layoutType={layoutType}
            onImageClick={handleImageClick}
            onFolderClick={handleFolderClick}
            onDeleteImage={handleDeleteImage}
            onDownloadImage={handleDownloadImage}
            onUpdateMarker={handleUpdateMarker}
            onAddImage={handleAddImage}
            onAddMultipleImages={handleAddMultipleImages}
            currentFolder={!!currentFolderId}
            canAddImages={canAddImages}
            isCommentFiltered={showOnlyCommented}
            showActions={project?.visibility !== "public" || isProjectOwner}
            onThumbnailChange={handleThumbnailChange}
          />
        </div>


      </main>

      <EditProjectDialog
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        onSubmit={handleSaveEditedProject}
        initialName={currentFolder ? currentFolder.name : project?.name || ""}
        initialDate={currentFolder ? currentFolder.date : project?.date || ""}
      />

      <ImageDetailView
        open={isCommentsSidebarOpen}
        onOpenChange={setIsCommentsSidebarOpen}
        image={selectedImage}
        projectId={projectId}
        onNextImage={navigateToNextImage}
        onPreviousImage={navigateToPreviousImage}
        onDownloadImage={handleDownloadImage}
        showComments={true}
        showActions={project?.visibility !== "public" || isProjectOwner}
      />

      <CreateFolderDialog
        isOpen={isCreateFolderOpen}
        onOpenChange={setIsCreateFolderOpen}
        onCreateFolder={handleCreateFolder}
      />

      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
        redirectAction={authRedirectAction}
      />

      <ThumbnailSelector
        open={isThumbnailSelectorOpen}
        onOpenChange={setIsThumbnailSelectorOpen}
        projectId={projectId || ''}
        currentThumbnailUrl={project?.thumbnailUrl}
        onThumbnailUpdate={handleThumbnailUpdate}
      />
    </div>
  );
};

export default Project;
