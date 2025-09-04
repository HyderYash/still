import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  PlusCircle,
  FolderOpen,
  Image,
  Archive,
  ChevronUp,
  Share2Icon,
  Search,
  Filter,
  Grid3X3,
  List,
  Calendar,
  Users,
  Eye,
  EyeOff,
  Sparkles,
  TrendingUp,
  Clock,
  MoreVertical,
} from "lucide-react";
import { useState, useMemo } from "react";
import ProjectModal from "@/components/ProjectModal";
import EditProjectDialog from "@/components/EditProjectDialog";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import ProjectActions from "@/components/ProjectActions";
import ShareDialog from "@/components/ShareDialog";
import { useUser } from "@/contexts/UserContext";
import AuthModal from "@/components/AuthModal";
import { Badge } from "@/components/ui/badge";
import { motion, AnimatePresence } from "framer-motion";
import ProjectVisibilityIndicator from "@/components/ProjectVisibilityIndicator";
import { getProjects } from "@/services/projectShareService";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { createProject } from "@/services/projectService";
import { LazyLoadImage } from "react-lazy-load-image-component";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import "react-lazy-load-image-component/src/effects/blur.css";

// Updated type to match actual data structure from getProjects service
type ProjectData = {
  id: string;
  name: string;
  user_id: string;
  visibility: string;
  created_at: string;
  updated_at: string;
  date: string;
  isShared: boolean;
  sharedById: string;
  sharedByName: string;
  thumbnailUrl: string | null;
  // Optional properties for compatibility
  images?: Array<{
    id: string;
    url: string;
    name: string;
    blob?: string;
  }>;
  archived?: boolean;
  shareStatus?: "pending" | "accepted" | "rejected";
};

type ViewMode = "grid" | "list";
type SortOption = "recent" | "name" | "shared" | "visibility";

const Index = () => {
  const navigate = useNavigate();
  const { isLoggedIn, user } = useUser();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [currentProject, setCurrentProject] = useState<ProjectData | null>(null);
  const [showArchived, setShowArchived] = useState(false);
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [projectToShare, setProjectToShare] = useState<ProjectData | null>(null);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [authRedirectAction, setAuthRedirectAction] = useState<(() => void) | undefined>(undefined);

  // New state for enhanced UI
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [searchTerm, setSearchTerm] = useState('');
  const [visibilityFilter, setVisibilityFilter] = useState<string>('all');
  const [sortBy, setSortBy] = useState<string>('recent');
  const [showScrollToTop, setShowScrollToTop] = useState(false);

  // Query for fetching projects
  const {
    data: projects = [],
    refetch: refetchProjects,
    isLoading,
    error,
  } = useQuery({
    queryKey: ["projects"],
    queryFn: () => getProjects(undefined, false),
    enabled: isLoggedIn,
  });

  // Filter and sort projects
  const filteredAndSortedProjects = useMemo(() => {
    let filtered = projects;

    // Apply search filter
    if (searchTerm) {
      filtered = filtered.filter(project =>
        project.name.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Apply visibility filter
    if (visibilityFilter !== 'all') {
      filtered = filtered.filter(project => project.visibility === visibilityFilter);
    }

    // Apply sorting
    switch (sortBy) {
      case 'name':
        filtered = [...filtered].sort((a, b) => a.name.localeCompare(b.name));
        break;
      case 'recent':
        filtered = [...filtered].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
        break;
      case 'oldest':
        filtered = [...filtered].sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
        break;
      case 'images':
        filtered = [...filtered].sort((a, b) => {
          const aCount = (a as any).images?.length || 0;
          const bCount = (b as any).images?.length || 0;
          return bCount - aCount;
        });
        break;
      default:
        break;
    }

    return filtered;
  }, [projects, searchTerm, visibilityFilter, sortBy]);

  // Use filtered projects for display
  const displayProjects = filteredAndSortedProjects;

  const openAuthModal = (redirectAction?: () => void) => {
    setAuthRedirectAction(() => redirectAction);
    setIsAuthModalOpen(true);
  };

  const addNewProject = async (projectName: string) => {
    if (!isLoggedIn) {
      openAuthModal(() => addNewProject(projectName));
      return;
    }

    const projectId = await createProject(projectName);
    if (projectId) {
      refetchProjects();
      toast.success(`Project "${projectName}" created successfully!`);
    }
    setIsModalOpen(false);
  };

  const handleOpenProject = (projectId: string, projectName: string) => {
    if (!isLoggedIn) {
      openAuthModal(() => navigate(`/project/${projectId}`));
      return;
    }

    navigate(`/project/${projectId}`);
    toast.info(`Opening project: ${projectName}`);
  };

  const handleShareProject = (projectId: string, projectName: string, e: React.MouseEvent) => {
    e.stopPropagation();

    if (!isLoggedIn) {
      openAuthModal(() => {
        const projectToShare = projects.find((p) => p.id === projectId);
        if (projectToShare) {
          setProjectToShare(projectToShare);
          setIsShareModalOpen(true);
        }
      });
      return;
    }

    const projectToShare = projects.find((p) => p.id === projectId);
    if (projectToShare) {
      setProjectToShare(projectToShare);
      setIsShareModalOpen(true);
    }
  };

  const handleEditProject = (projectId: string) => {
    const projectToEdit = projects.find((p) => p.id === projectId);
    if (projectToEdit) {
      setCurrentProject(projectToEdit);
      setIsEditModalOpen(true);
    }
  };

  const handleSaveEditedProject = async (projectName: string, projectDate: string) => {
    if (!currentProject) return;

    try {
      const { error } = await supabase
        .from("projects")
        .update({ name: projectName })
        .eq("id", currentProject.id);

      if (error) throw error;

      refetchProjects();
      toast.success(`Project "${projectName}" updated successfully!`);
    } catch (error) {
      console.error("Error updating project:", error);
      toast.error("Failed to update project");
    }
  };

  const handleDeleteProject = async (projectId: string) => {
    const projectToDelete = projects.find((p) => p.id === projectId);
    if (!projectToDelete) return;

    try {
      const { error } = await supabase
        .from("projects")
        .delete()
        .eq("id", projectId);

      if (error) throw error;

      refetchProjects();
      toast.success(`Project "${projectToDelete.name}" deleted successfully!`);
    } catch (error) {
      console.error("Error deleting project:", error);
      toast.error("Failed to delete project");
    }
  };

  const getProjectThumbnail = (project: ProjectData) => {
    const thumbnail = project.thumbnailUrl;
    if (thumbnail) {
      return (
        <LazyLoadImage
          src={thumbnail}
          alt={project.name}
          effect="blur"
          className="w-full h-full object-cover absolute inset-0"
          wrapperClassName="w-full h-full absolute inset-0"
          placeholderSrc={thumbnail}
          threshold={100}
          delayTime={0}
          loading="eager"
        />
      );
    }

    return (
      <div className="flex flex-col h-full items-center justify-center text-gray-500 bg-gradient-to-br from-gray-800/50 to-gray-900/50">
        <div className="relative">
          <Image className="h-12 w-12 mb-3 opacity-40" />
          <div className="absolute inset-0 bg-[#16ad7c]/20 rounded-full blur-xl"></div>
        </div>
        <p className="text-sm font-medium text-gray-400">No Images</p>
        <p className="text-xs text-gray-500 mt-1">Upload some images to get started</p>
      </div>
    );
  };

  const getProjectStats = () => {
    const totalProjects = projects.length;
    const sharedProjects = projects.filter(p => p.isShared).length;
    const publicProjects = projects.filter(p => p.visibility === "public").length;

    return { totalProjects, sharedProjects, publicProjects };
  };

  const stats = getProjectStats();

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
      },
    },
  };

  const itemVariants = {
    hidden: { y: 20, opacity: 0 },
    visible: {
      y: 0,
      opacity: 1,
      transition: {
        type: "spring",
        stiffness: 100,
        damping: 12,
      },
    },
  };

  if (error) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] bg-gradient-to-b from-black to-[#101014] flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 bg-red-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
            <div className="w-8 h-8 bg-red-500 rounded-full"></div>
          </div>
          <h2 className="text-2xl font-bold text-white mb-2">Something went wrong</h2>
          <p className="text-gray-400 mb-6">Failed to load your projects</p>
          <Button onClick={() => refetchProjects()} className="bg-[#16ad7c] hover:bg-[#16ad7c]/80">
            Try Again
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0a0a0a] bg-gradient-to-b from-black to-[#101014]">
      <main className="container mx-auto py-8 px-4">
        {/* Enhanced Header Section */}
        <div className="mb-8">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6 mb-8">
            <div className="flex items-center space-x-4">
              <div className="relative">
                <h1 className="text-4xl font-bold gradient-text tracking-tight">
                  Your Projects
                </h1>
                <div className="absolute inset-0 bg-gradient-to-r from-[#16ad7c]/20 via-transparent to-transparent -z-10 blur-3xl opacity-20 h-24 rounded-full"></div>
              </div>
              {isLoggedIn && (
                <div className="flex items-center space-x-2">
                  <Badge variant="outline" className="bg-[#16ad7c]/10 border-[#16ad7c]/30 text-[#16ad7c]">
                    {stats.totalProjects} {stats.totalProjects === 1 ? 'Project' : 'Projects'}
                  </Badge>
                  {stats.sharedProjects > 0 && (
                    <Badge variant="outline" className="bg-blue-500/10 border-blue-500/30 text-blue-400">
                      {stats.sharedProjects} Shared
                    </Badge>
                  )}
                </div>
              )}
            </div>

            <div className="flex items-center space-x-3">
              <Button
                onClick={() =>
                  isLoggedIn
                    ? setIsModalOpen(true)
                    : openAuthModal(() => setIsModalOpen(true))
                }
                className="bg-gradient-to-r from-[#16ad7c] to-[#109d73] hover:from-[#109d73] hover:to-[#0b7d5a] text-black font-semibold rounded-full px-6 transition-all duration-300 shadow-[0_4px_20px_rgba(22,173,124,0.3)] transform hover:translate-y-[-2px] hover:shadow-[0_8px_30px_rgba(22,173,124,0.4)]"
              >
                <PlusCircle className="h-5 w-5 mr-2" />
                New Project
              </Button>
            </div>
          </div>

          {/* Enhanced Search and Filter Bar */}
          {isLoggedIn && displayProjects.length > 0 && (
            <div className="bg-[#151515]/50 backdrop-blur-sm border border-[#2a2a2a] rounded-xl p-4 mb-6">
              <div className="flex flex-col sm:flex-row gap-4 items-center">
                {/* Search */}
                <div className="relative flex-1 max-w-md">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    placeholder="Search projects..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10 bg-[#1a1a1a] border-[#333] text-white focus:border-[#16ad7c] focus:ring-[#16ad7c]/20"
                  />
                </div>

                {/* Filter by Visibility */}
                <Select value={visibilityFilter} onValueChange={setVisibilityFilter}>
                  <SelectTrigger className="w-[140px] bg-[#1a1a1a] border-[#333] text-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-[#1a1a1a] border-[#333] text-white">
                    <SelectItem value="all">All Projects</SelectItem>
                    <SelectItem value="private">Private</SelectItem>
                    <SelectItem value="public">Public</SelectItem>
                  </SelectContent>
                </Select>

                {/* Sort Options */}
                <Select value={sortBy} onValueChange={(value) => setSortBy(value as string)}>
                  <SelectTrigger className="w-[140px] bg-[#1a1a1a] border-[#333] text-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-[#1a1a1a] border-[#333] text-white">
                    <SelectItem value="recent">Most Recent</SelectItem>
                    <SelectItem value="name">Name A-Z</SelectItem>
                    <SelectItem value="oldest">Oldest First</SelectItem>
                    <SelectItem value="images">Most Images</SelectItem>
                  </SelectContent>
                </Select>

                {/* View Mode Toggle */}
                <div className="flex items-center bg-[#1a1a1a] rounded-lg p-1 border border-[#333]">
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant={viewMode === "grid" ? "default" : "ghost"}
                        size="sm"
                        onClick={() => setViewMode("grid")}
                        className={`h-8 w-8 p-0 ${viewMode === "grid" ? "bg-[#16ad7c] text-black" : "text-gray-400 hover:text-white"}`}
                      >
                        <Grid3X3 className="h-4 w-4" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>Grid View</TooltipContent>
                  </Tooltip>

                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant={viewMode === "list" ? "default" : "ghost"}
                        size="sm"
                        onClick={() => setViewMode("list")}
                        className={`h-8 w-8 p-0 ${viewMode === "list" ? "bg-[#16ad7c] text-black" : "text-gray-400 hover:text-white"}`}
                      >
                        <List className="h-4 w-4" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>List View</TooltipContent>
                  </Tooltip>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Loading State */}
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-20">
            <div className="relative">
              <div className="animate-spin rounded-full h-16 w-16 border-4 border-[#16ad7c]/20 border-t-[#16ad7c]"></div>
              <div className="absolute inset-0 rounded-full border-4 border-transparent border-t-[#5ce1e6] animate-spin" style={{ animationDirection: 'reverse', animationDuration: '1.5s' }}></div>
            </div>
            <p className="text-gray-400 mt-4 text-lg">Loading your projects...</p>
          </div>
        ) : (
          <>
            {/* Projects Display */}
            {displayProjects.length > 0 ? (
              <AnimatePresence mode="wait">
                <motion.div
                  key={`${viewMode}-${sortBy}-${visibilityFilter}`}
                  className={viewMode === "grid"
                    ? "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6"
                    : "space-y-4"
                  }
                  variants={containerVariants}
                  initial="hidden"
                  animate="visible"
                  exit="hidden"
                >
                  {displayProjects.map((project) => (
                    <motion.div key={project.id} variants={itemVariants}>
                      <Card
                        className={`group cursor-pointer transition-all duration-500 hover:shadow-[0_20px_60px_rgba(22,173,124,0.15)] transform hover:-translate-y-2 ${viewMode === "grid"
                          ? "bg-[#151515] backdrop-blur-sm border-[#2a2a2a] hover:border-[#16ad7c]/40 rounded-xl overflow-hidden"
                          : "bg-[#151515] backdrop-blur-sm border-[#2a2a2a] hover:border-[#16ad7c]/40 rounded-xl"
                          }`}
                        onClick={() => handleOpenProject(project.id, project.name)}
                      >
                        <CardContent className={`p-0 ${viewMode === "grid" ? "h-[280px]" : "h-[120px]"} relative overflow-hidden`}>
                          {/* Subtle gradient overlay */}
                          <div className="absolute inset-0 bg-gradient-to-b from-black/20 via-transparent to-black/80 z-10 group-hover:from-black/10 group-hover:to-black/70 transition-all duration-500"></div>

                          {/* Project Visibility Indicator - Simplified */}
                          <div className="absolute top-3 left-3 z-20">
                            <ProjectVisibilityIndicator
                              isShared={project.isShared}
                              sharedBy={project.sharedByName}
                              visibility={project.visibility as "private" | "public"}
                              shareStatus={undefined}
                            />
                          </div>

                          {/* Action Buttons - Simplified */}
                          {!project.isShared && (
                            <div className="absolute top-3 right-3 z-20 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                              <div className="flex items-center gap-2">
                                <ProjectActions
                                  projectId={project.id}
                                  projectName={project.name}
                                  onRename={() => handleEditProject(project.id)}
                                  onDelete={() => handleDeleteProject(project.id)}
                                  onArchive={() => { }}
                                />
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <div
                                      onClick={(e) => handleShareProject(project.id, project.name, e)}
                                      className="p-2 rounded-full cursor-pointer bg-black/60 backdrop-blur-md hover:bg-[#16ad7c]/20 border border-transparent hover:border-[#16ad7c]/30 transition-all duration-300"
                                    >
                                      <Share2Icon className="h-4 w-4 text-gray-300 group-hover:text-white transition-colors" />
                                    </div>
                                  </TooltipTrigger>
                                  <TooltipContent>Share Project</TooltipContent>
                                </Tooltip>
                              </div>
                            </div>
                          )}

                          {/* Project Thumbnail */}
                          <div className="w-full h-full">
                            {getProjectThumbnail(project)}
                          </div>

                          {/* Project Info - Clean and Simple */}
                          <div className="absolute bottom-0 left-0 w-full p-4 z-10">
                            <div className="space-y-2">
                              {/* Project Name */}
                              <h3 className="text-lg font-semibold text-white truncate leading-tight">
                                {project.name}
                              </h3>

                              {/* Project Meta - Simplified */}
                              <div className="flex items-center gap-3 text-sm text-gray-300">
                                <div className="flex items-center gap-1.5">
                                  <Calendar className="h-3.5 w-3.5" />
                                  <span>{project.date}</span>
                                </div>
                                {project.isShared && project.sharedByName && (
                                  <div className="flex items-center gap-1.5 text-blue-400">
                                    <Users className="h-3.5 w-3.5" />
                                    <span className="truncate">from {project.sharedByName}</span>
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    </motion.div>
                  ))}
                </motion.div>
              </AnimatePresence>
            ) : (
              /* Enhanced Empty State */
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="flex flex-col items-center justify-center py-20 text-center"
              >
                <div className="relative mb-8">
                  <div className="bg-gradient-to-br from-[#16ad7c]/20 to-[#5ce1e6]/20 p-8 rounded-full">
                    <FolderOpen className="h-20 w-20 text-[#16ad7c]" />
                  </div>
                  <div className="absolute inset-0 bg-gradient-to-br from-[#16ad7c]/10 to-[#5ce1e6]/10 rounded-full blur-2xl"></div>
                </div>

                <h3 className="text-3xl font-bold text-white mb-4">
                  {searchTerm || visibilityFilter !== "all"
                    ? "No projects found"
                    : `No ${showArchived ? "archived" : "active"} projects yet`
                  }
                </h3>

                <p className="text-gray-400 max-w-lg mb-8 text-lg leading-relaxed">
                  {searchTerm || visibilityFilter !== "all"
                    ? "Try adjusting your search or filters to find what you're looking for."
                    : isLoggedIn
                      ? showArchived
                        ? "You haven't archived any projects yet. When you archive projects, they'll appear here."
                        : "Get started by creating your first project to manage your creative resources and collaborate with your team."
                      : "Please log in to see your projects or create new ones."
                  }
                </p>

                {!showArchived && (
                  <div className="flex flex-col sm:flex-row gap-4">
                    <Button
                      onClick={() =>
                        isLoggedIn
                          ? setIsModalOpen(true)
                          : openAuthModal(() => setIsModalOpen(true))
                      }
                      className="bg-gradient-to-r from-[#16ad7c] to-[#109d73] hover:from-[#109d73] hover:to-[#0b7d5a] text-black font-semibold rounded-full px-8 py-6 text-lg transition-all duration-300 shadow-lg hover:shadow-[0_8px_30px_rgba(22,173,124,0.4)] transform hover:translate-y-[-2px]"
                    >
                      <PlusCircle className="mr-3 h-6 w-6" />
                      {isLoggedIn ? "Create Your First Project" : "Log In to Create Projects"}
                    </Button>

                    {isLoggedIn && (
                      <Button
                        variant="outline"
                        onClick={() => {
                          setSearchTerm("");
                          setVisibilityFilter("all");
                          setSortBy("recent");
                        }}
                        className="border-[#16ad7c]/30 text-[#16ad7c] hover:bg-[#16ad7c]/10 rounded-full px-6 py-6 text-lg"
                      >
                        <Sparkles className="mr-2 h-5 w-5" />
                        Explore Templates
                      </Button>
                    )}
                  </div>
                )}
              </motion.div>
            )}
          </>
        )}
      </main>

      {/* Enhanced Scroll to Top Button */}
      <motion.div
        className="fixed bottom-6 right-6 z-50"
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 1 }}
      >
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
              className="bg-gradient-to-r from-[#16ad7c]/90 to-[#5ce1e6]/90 hover:from-[#16ad7c] hover:to-[#5ce1e6] text-black rounded-full w-12 h-12 p-0 shadow-lg hover:shadow-[0_8px_25px_rgba(22,173,124,0.4)] transform hover:scale-110 transition-all duration-300"
            >
              <ChevronUp className="h-6 w-6" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Scroll to top</TooltipContent>
        </Tooltip>
      </motion.div>

      {/* Modals */}
      <ProjectModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSubmit={addNewProject}
      />

      {currentProject && (
        <EditProjectDialog
          isOpen={isEditModalOpen}
          onClose={() => setIsEditModalOpen(false)}
          onSubmit={handleSaveEditedProject}
          initialName={currentProject.name}
          initialDate={currentProject.date}
        />
      )}

      {projectToShare && (
        <ShareDialog
          isOpen={isShareModalOpen}
          onClose={() => setIsShareModalOpen(false)}
          projectName={projectToShare.name}
          projectId={projectToShare.id}
        />
      )}

      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
        redirectAction={authRedirectAction}
      />
    </div>
  );
};

export default Index;
