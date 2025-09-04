import React, { useState, useEffect, useRef } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { motion, AnimatePresence } from "framer-motion";
import { User, Image, Globe2, Lock, AlertTriangle, Pencil, Camera, Settings, Calendar, MapPin, Mail, ExternalLink, Heart, Eye, Share2, Star, Zap, Crown } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useUser } from "@/contexts/UserContext";
import ProjectVisibilityIndicator from "@/components/ProjectVisibilityIndicator";

import { LazyLoadImage } from "react-lazy-load-image-component";
import "react-lazy-load-image-component/src/effects/blur.css";
import { getProjects } from "@/services/projectShareService";
import { toast } from "sonner";

type ProfileProject = {
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
  images: Array<{
    id: string;
    url: string;
    name: string;
    blob?: string;
  }>;
  shareStatus?: "pending" | "accepted" | "rejected";
  likes?: number;
  views?: number;
  category?: string;
};

type ProfileUser = {
  id: string;
  username: string;
  first_name: string | null;
  last_name: string | null;
  avatar_url: string | null;
  profile_page_text?: string | null;
  bio?: string;
  location?: string;
  website?: string;
  joinDate?: Date;
  followers?: number;
  following?: number;
  totalProjects?: number;
  totalLikes?: number;
};

const ProfilePage = () => {
  const { username } = useParams<{ username: string }>();
  const { user: currentUser } = useUser();
  const navigate = useNavigate();
  const [profileText, setProfileText] = useState<string>("");
  const [isEditing, setIsEditing] = useState<boolean>(false);
  const textInputRef = useRef<HTMLTextAreaElement>(null);
  const [inputWidth, setInputWidth] = useState<number>(0);




  // Simple state management
  const [profileUser, setProfileUser] = useState<ProfileUser | null>(null);
  const [projects, setProjects] = useState<ProfileProject[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Simple data fetching
  useEffect(() => {
    const fetchProfile = async () => {
      if (!username) return;

      setIsLoading(true);
      setError(null);

      try {
        console.log("Fetching profile for:", username);

        const { data, error } = await supabase
          .from("profiles")
          .select("*")
          .eq("username", username)
          .single();

        if (error) {
          throw new Error(error.message || "User not found");
        }

        if (!data) {
          throw new Error("User not found");
        }

        console.log("Profile loaded:", data);
        setProfileUser(data);
        setProfileText(data.profile_page_text || "");

        // Fetch projects after profile loads
        if (data.id) {
          const fetchedProjects = await getProjects(data.id, true);
          const formattedProjects = fetchedProjects.map(project => ({
            ...project,
            images: [] as Array<{ id: string; url: string; name: string; blob?: string }>,
            shareStatus: undefined as "pending" | "accepted" | "rejected" | undefined
          }));
          setProjects(formattedProjects);
        }

      } catch (err: any) {
        console.error("Error fetching profile:", err);
        setError(err.message || "Failed to load profile");
      } finally {
        setIsLoading(false);
      }
    };

    fetchProfile();
  }, [username]);

  // Use real data for display
  const displayProfile = profileUser;
  const displayProjects = projects;

  // Show loading state
  const isDataLoading = isLoading;

  // Check if this is the current user's own profile
  const isOwnProfile = currentUser && profileUser && currentUser.id === profileUser.id;



  // Set profile text when profile data is available
  useEffect(() => {
    if (profileUser?.profile_page_text) {
      setProfileText(profileUser.profile_page_text);
    }
  }, [profileUser]);

  // Handle text area resize
  useEffect(() => {
    if (textInputRef.current) {
      textInputRef.current.style.height = "auto";
      textInputRef.current.style.height = textInputRef.current.scrollHeight + "px";
    }
  }, [profileText]);

  // Handle text input width adjustment
  useEffect(() => {
    if (textInputRef.current) {
      const textWidth = textInputRef.current.scrollWidth;
      setInputWidth(Math.max(textWidth, 200));
    }
  }, [profileText]);



  // Debug logging
  console.log("ProfilePage Debug:", {
    username,
    isLoading,
    isDataLoading,
    profileUser: !!profileUser,
    error: !!error,
    projects: projects.length,
    supabaseAvailable: !!supabase
  });





  // Handle loading state
  if (isDataLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#0a0a0a] via-[#1a1a1a] to-[#0a0a0a]">
        <div className="container mx-auto px-4 py-8">
          <div className="flex items-center justify-center min-h-[60vh]">
            <div className="text-center">
              <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-[#16ad7c] mx-auto mb-4"></div>
              <p className="text-gray-400 text-lg">Loading profile...</p>
              <div className="text-sm text-gray-500 mt-2">
                Loading profile...
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }



  // Handle error state
  if (error && !profileUser) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#0a0a0a] via-[#1a1a1a] to-[#0a0a0a]">
        <div className="container mx-auto px-4 py-8">
          <div className="flex items-center justify-center min-h-[60vh]">
            <div className="text-center">
              <div className="text-red-400 text-6xl mb-4">⚠️</div>
              <h1 className="text-2xl font-bold text-white mb-2">Profile Not Found</h1>
              <p className="text-gray-400 mb-4">
                {error === "User not found"
                  ? "The user profile you're looking for doesn't exist."
                  : `Error: ${error}`
                }
              </p>
              <div className="text-sm text-gray-500 mb-4">
                Username: {username}
              </div>
              <Button onClick={() => navigate('/')} variant="outline">
                Go Home
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Handle no profile data
  if (!displayProfile) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#0a0a0a] via-[#1a1a1a] to-[#0a0a0a]">
        <div className="container mx-auto px-4 py-8">
          <div className="flex items-center justify-center min-h-[60vh]">
            <div className="text-center">
              <div className="text-gray-400 text-6xl mb-4">👤</div>
              <h1 className="text-2xl font-bold text-white mb-2">No Profile Data</h1>
              <p className="text-gray-400 mb-4">This user hasn't set up their profile yet.</p>
              <Button onClick={() => navigate('/')} variant="outline">
                Go Home
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const handleSaveProfileText = async () => {
    if (!profileUser) return;

    try {
      const { error } = await supabase
        .from("profiles")
        .update({ profile_page_text: profileText })
        .eq("id", profileUser.id);

      if (error) throw error;

      toast.success("Profile text updated successfully!");
    } catch (error) {
      console.error("Error updating profile text:", error);
      toast.error("Failed to update profile text");
    }
  };

  const handleFollow = () => {
    toast.info("Follow functionality coming soon!");
  };

  const handleMessage = () => {
    toast.info("Messaging functionality coming soon!");
  };

  const handleCameraClick = () => {
    toast.info("Camera functionality coming soon!");
  };

  const handleProjectClick = (projectId: string) => {
    navigate(`/project/${projectId}`);
  };

  const handleLikeProject = (projectId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    toast.info("Like functionality coming soon!");
  };

  const handleShareProject = (projectId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    toast.info("Share functionality coming soon!");
  };

  const handleViewProject = (projectId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    navigate(`/project/${projectId}`);
  };

  // Build full name from profile data
  const fullName = displayProfile ?
    `${displayProfile.first_name || ''} ${displayProfile.last_name || ''}`.trim() :
    '';

  // Get initials for the avatar fallback
  const initials = fullName
    ? fullName.split(' ').map(n => n[0]).join('').toUpperCase().substring(0, 2)
    : username?.substring(0, 2).toUpperCase() || 'U';





  // Save profile text to database
  const saveProfileText = async () => {
    if (!isOwnProfile || !profileUser) return;

    try {
      const { error } = await supabase
        .from("profiles")
        .update({ profile_page_text: profileText })
        .eq("id", profileUser.id);

      if (error) {
        throw error;
      }

      toast.success("Profile text updated");
      setIsEditing(false);
    } catch (err) {
      console.error("Error updating profile text:", err);
      toast.error("Failed to update profile text");
    }
  };

  // Handle edit mode
  const startEditing = () => {
    setIsEditing(true);
    // Focus the input after rendering
    setTimeout(() => {
      if (textInputRef.current) {
        textInputRef.current.focus();
      }
    }, 0);
  };

  // Handle keyboard events when editing
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      saveProfileText();
    } else if (e.key === 'Escape') {
      setIsEditing(false);
      // Reset to the original text
      setProfileText(profileUser?.profile_page_text || "");
    }
  };

  // Build display text for profile header
  const getProfileDisplayText = () => {
    if (profileText) {
      return profileText;
    }
    return displayProfile.profile_page_text || `I'm ${fullName || username}`;
  };

  const getProjectThumbnail = (project: ProfileProject) => {
    if (project.thumbnailUrl) {
      return (
        <LazyLoadImage
          src={project.thumbnailUrl}
          alt={project.name}
          effect="blur"
          className="w-full h-full object-cover absolute inset-0"
          wrapperClassName="w-full h-full absolute inset-0"
          placeholderSrc={project.thumbnailUrl}
          threshold={100}
          delayTime={0}
          loading="eager"
        />
      );
    }

    return (
      <div className="flex flex-col h-full items-center justify-center text-gray-500">
        <Image className="h-10 w-10 mb-2 opacity-30" />
        <p>Empty</p>
      </div>
    );
  };

  const getVisibilityType = (visibility: string): 'public' | 'private' => {
    // Safely map the visibility string to expected type
    return visibility === 'public' ? 'public' : 'private';
  };

  const getCategoryColor = (category: string) => {
    switch (category?.toLowerCase()) {
      case 'photography': return 'from-[#3b82f6] to-[#1d4ed8]';
      case 'design': return 'from-[#16ad7c] to-[#10b981]';
      case 'ui/ux': return 'from-[#8b5cf6] to-[#7c3aed]';
      case 'illustration': return 'from-[#f59e0b] to-[#d97706]';
      case 'mobile design': return 'from-[#ec4899] to-[#be185d]';
      default: return 'from-[#6b7280] to-[#4b5563]';
    }
  };

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



  // Only show error page if we have a username and there's an actual error
  if (username && error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#0a0a0a] to-[#101014] flex items-center justify-center">
        <div className="container mx-auto px-4 py-16 text-center">
          <motion.div
            className="flex flex-col items-center justify-center gap-6"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <div className="w-20 h-20 bg-gradient-to-br from-yellow-500/20 to-orange-500/20 rounded-full flex items-center justify-center">
              <AlertTriangle className="h-10 w-10 text-yellow-500" />
            </div>
            <h1 className="text-3xl font-bold text-white">Profile Not Found</h1>
            <p className="text-gray-400 max-w-md text-lg">
              The user profile you're looking for doesn't exist or may have been removed.
            </p>
            <Button asChild variant="default" className="mt-4 bg-gradient-to-r from-[#16ad7c] to-[#10b981] hover:from-[#10b981] hover:to-[#059669] text-white">
              <Link to="/">Return Home</Link>
            </Button>
          </motion.div>
        </div>
      </div>
    );
  }

  return (
    <div className="relative min-h-screen bg-[#0a0a0a]">
      {/* Subtle Background Pattern */}
      <div className="fixed inset-0 opacity-30">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,#16ad7c0a_0%,transparent_50%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_80%,#5ce1e60a_0%,transparent_50%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_80%_20%,#6366f10a_0%,transparent_50%)]" />
      </div>

      <div className="container mx-auto px-4 sm:px-6 py-8 sm:py-12 relative z-10 max-w-7xl">
        {/* Hero Section */}
        <motion.div
          className="text-center mb-12 sm:mb-16"
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
        >
          {/* Profile Avatar */}
          <div className="relative inline-block mb-6 sm:mb-8">
            <div className="relative">
              <div className="absolute inset-0 bg-gradient-to-r from-[#16ad7c] via-[#5ce1e6] to-[#6366f1] rounded-full blur-2xl opacity-30 animate-pulse"></div>
              <Avatar className="h-32 w-32 sm:h-40 sm:w-40 border-4 border-[#1a1a1a] shadow-2xl relative z-10 bg-gradient-to-br from-[#1a1a1a] to-[#151515]">
                <AvatarImage src={displayProfile.avatar_url || undefined} alt={displayProfile.username} />
                <AvatarFallback className="text-4xl sm:text-6xl font-bold bg-gradient-to-br from-[#16ad7c] to-[#5ce1e6] text-black">
                  {initials}
                </AvatarFallback>
              </Avatar>
            </div>

            {isOwnProfile && (
              <motion.button
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => {/* Handle avatar change */ }}
                className="absolute -bottom-1 -right-1 sm:-bottom-2 sm:-right-2 w-10 h-10 sm:w-14 sm:h-14 bg-gradient-to-br from-[#16ad7c] to-[#5ce1e6] rounded-full flex items-center justify-center shadow-xl hover:shadow-[0_8px_30px_rgba(22,173,124,0.4)] transition-all duration-300 border-4 border-[#0a0a0a]"
              >
                <Camera className="h-5 w-5 sm:h-7 sm:w-7 text-black" />
              </motion.button>
            )}
          </div>

          {/* Profile Name */}
          <div className="mb-6 sm:mb-8 px-4">
            {isEditing ? (
              <motion.div
                className="w-full max-w-4xl mx-auto"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.3 }}
              >
                <textarea
                  ref={textInputRef}
                  value={profileText}
                  onChange={(e) => setProfileText(e.target.value)}
                  onBlur={saveProfileText}
                  onKeyDown={handleKeyDown}
                  className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold mb-4 bg-transparent border-b-2 border-[#16ad7c] text-center outline-none w-full resize-none overflow-hidden text-white placeholder:text-gray-500 focus:border-[#5ce1e6] transition-colors"
                  placeholder={`I'm ${fullName || username}`}
                  rows={1}
                  style={{ maxWidth: '100%' }}
                />
                <p className="text-sm text-gray-400">Press Enter to save or Escape to cancel</p>
              </motion.div>
            ) : (
              <motion.div
                className="relative inline-block max-w-full"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
              >
                <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold mb-4 text-white break-words">
                  {getProfileDisplayText()}
                </h1>
                {isOwnProfile && (
                  <motion.button
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={startEditing}
                    className="absolute -right-16 sm:-right-20 top-1/2 transform -translate-y-1/2 p-2 sm:p-3 text-gray-400 hover:text-[#16ad7c] transition-colors bg-[#1a1a1a]/80 rounded-full hover:bg-[#1a1a1a] backdrop-blur-sm border border-[#2a2a2a]"
                    aria-label="Edit profile text"
                  >
                    <Pencil className="h-5 w-5 sm:h-6 sm:w-6" />
                  </motion.button>
                )}
              </motion.div>
            )}
          </div>

          {/* Profile Stats */}
          <motion.div
            className="flex flex-wrap justify-center gap-4 sm:gap-6 md:gap-8 mb-8 sm:mb-12 px-4"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
          >
            <div className="text-center min-w-[80px]">
              <div className="text-2xl sm:text-3xl font-bold text-[#16ad7c] mb-1">{displayProfile.totalProjects || 0}</div>
              <div className="text-xs sm:text-sm text-gray-400 font-medium">Projects</div>
            </div>
            <div className="text-center min-w-[80px]">
              <div className="text-2xl sm:text-3xl font-bold text-[#5ce1e6] mb-1">{displayProfile.followers || 0}</div>
              <div className="text-xs sm:text-sm text-gray-400 font-medium">Followers</div>
            </div>
            <div className="text-center min-w-[80px]">
              <div className="text-2xl sm:text-3xl font-bold text-[#8b5cf6] mb-1">{displayProfile.following || 0}</div>
              <div className="text-xs sm:text-sm text-gray-400 font-medium">Following</div>
            </div>
            <div className="text-center min-w-[80px]">
              <div className="text-2xl sm:text-3xl font-bold text-[#f59e0b] mb-1">{displayProfile.totalLikes || 0}</div>
              <div className="text-xs sm:text-sm text-gray-400 font-medium">Likes</div>
            </div>
          </motion.div>

          {/* Profile Info Cards */}
          <motion.div
            className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6 max-w-4xl mx-auto px-4"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.4 }}
          >
            {displayProfile.bio && (
              <Card className="bg-[#1a1a1a]/80 border-[#2a2a2a] backdrop-blur-sm hover:border-[#16ad7c]/30 transition-all duration-300">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium text-gray-400 flex items-center gap-2">
                    <div className="w-8 h-8 bg-[#16ad7c]/20 rounded-lg flex items-center justify-center">
                      <User className="h-4 w-4 text-[#16ad7c]" />
                    </div>
                    About
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-white text-sm leading-relaxed">{displayProfile.bio}</p>
                </CardContent>
              </Card>
            )}

            {displayProfile.location && (
              <Card className="bg-[#1a1a1a]/80 border-[#2a2a2a] backdrop-blur-sm hover:border-[#5ce1e6]/30 transition-all duration-300">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium text-gray-400 flex items-center gap-2">
                    <div className="w-8 h-8 bg-[#5ce1e6]/20 rounded-lg flex items-center justify-center">
                      <MapPin className="h-4 w-4 text-[#5ce1e6]" />
                    </div>
                    Location
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-white text-sm">{displayProfile.location}</p>
                </CardContent>
              </Card>
            )}

            {displayProfile.website && (
              <Card className="bg-[#1a1a1a]/80 border-[#2a2a2a] backdrop-blur-sm hover:border-[#8b5cf6]/30 transition-all duration-300">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium text-gray-400 flex items-center gap-2">
                    <div className="w-8 h-8 bg-[#8b5cf6]/20 rounded-lg flex items-center justify-center">
                      <ExternalLink className="h-4 w-4 text-[#8b5cf6]" />
                    </div>
                    Website
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <a
                    href={displayProfile.website}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[#8b5cf6] hover:text-[#a855f7] text-sm transition-colors font-medium"
                  >
                    {displayProfile.website.replace(/^https?:\/\//, '')}
                  </a>
                </CardContent>
              </Card>
            )}
          </motion.div>
        </motion.div>

        {/* Projects Section */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.6 }}
          className="mt-16 sm:mt-20"
        >
          <div className="text-center mb-8 sm:mb-12 px-4">
            <div className="inline-flex items-center gap-2 sm:gap-3 mb-3 sm:mb-4">
              <div className="w-8 h-8 sm:w-10 sm:h-10 bg-gradient-to-br from-[#16ad7c] to-[#5ce1e6] rounded-xl flex items-center justify-center">
                <Globe2 className="h-4 w-4 sm:h-5 sm:w-5 text-black" />
              </div>
              <h2 className="text-xl sm:text-2xl font-bold text-white">Public Projects</h2>
            </div>
            <p className="text-gray-400 text-xs sm:text-sm mb-4 sm:mb-6">Showcasing creative work and designs</p>
            <Badge className="bg-[#16ad7c]/20 border-[#16ad7c]/30 text-[#16ad7c] text-xs sm:text-sm px-3 sm:px-4 py-1 sm:py-2">
              {displayProjects.length} Projects
            </Badge>
          </div>

          {displayProjects.length === 0 ? (
            <motion.div
              className="text-center py-20 bg-[#1a1a1a]/60 rounded-2xl border border-[#2a2a2a] backdrop-blur-sm max-w-2xl mx-auto"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.5 }}
            >
              <div className="w-20 h-20 bg-[#2a2a2a] rounded-full flex items-center justify-center mx-auto mb-6">
                <Lock className="h-10 w-10 text-gray-500" />
              </div>
              <h3 className="text-xl font-semibold text-white mb-2">No Public Projects</h3>
              <p className="text-gray-400 max-w-md mx-auto">
                {isOwnProfile
                  ? "You haven't made any projects public yet. Share your work with the world!"
                  : "This user hasn't made any projects public yet."}
              </p>
            </motion.div>
          ) : (
            <motion.div
              className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 lg:gap-8 px-4"
              variants={containerVariants}
              initial="hidden"
              animate="visible"
            >
              {displayProjects.map((project, index) => {
                const typedProject: ProfileProject = {
                  ...project,
                  images: [],
                  shareStatus: undefined
                };

                return (
                  <motion.div
                    key={project.id}
                    variants={itemVariants}
                    whileHover={{ y: -8 }}
                    transition={{ type: "spring", stiffness: 300 }}
                  >
                    <Card
                      className="bg-[#1a1a1a]/80 backdrop-blur-sm border-[#2a2a2a] hover:border-[#16ad7c]/30 rounded-2xl overflow-hidden group transition-all duration-500 hover:shadow-[0_20px_60px_rgba(22,173,124,0.15)] cursor-pointer"
                      onClick={() => navigate(`/project/${project.id}`)}
                    >
                      <CardContent className="p-0 h-[300px] relative overflow-hidden">
                        {/* Gradient Overlay */}
                        <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-transparent to-black/90 z-10 group-hover:from-black/40 group-hover:to-black/80 transition-all duration-500"></div>

                        {/* Category Badge */}
                        {typedProject.category && (
                          <div className="absolute top-4 left-4 z-20">
                            <Badge className={`bg-gradient-to-r ${getCategoryColor(typedProject.category)} text-white border-0 text-xs px-3 py-1`}>
                              {typedProject.category}
                            </Badge>
                          </div>
                        )}

                        {/* Project Thumbnail */}
                        <div className="w-full h-full">
                          {getProjectThumbnail(typedProject)}
                        </div>

                        {/* Project Stats */}
                        <div className="absolute top-4 right-4 z-20 flex items-center gap-2">
                          <div className="flex items-center gap-1 text-white/80 text-xs bg-black/40 px-2 py-1 rounded-full backdrop-blur-sm">
                            <Eye className="h-3 w-3" />
                            {typedProject.views || 0}
                          </div>
                          <div className="flex items-center gap-1 text-white/80 text-xs bg-black/40 px-2 py-1 rounded-full backdrop-blur-sm">
                            <Heart className="h-3 w-3" />
                            {typedProject.likes || 0}
                          </div>
                        </div>

                        {/* Project Info */}
                        <div className="absolute bottom-0 left-0 w-full p-6 z-20">
                          <h3 className="text-xl font-bold text-white mb-2 tracking-tight">
                            {typedProject.name}
                          </h3>
                          <div className="flex items-center justify-between">
                            <p className="text-gray-300 text-sm opacity-80">
                              {typedProject.date}
                            </p>
                            <div className="flex items-center gap-2">
                              <Button
                                size="sm"
                                variant="ghost"
                                className="h-8 w-8 p-0 text-white/80 hover:text-white hover:bg-white/10"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  // Handle like
                                }}
                              >
                                <Heart className="h-4 w-4" />
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                className="h-8 w-8 p-0 text-white/80 hover:text-white hover:bg-white/10"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  // Handle share
                                }}
                              >
                                <Share2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                );
              })}
            </motion.div>
          )}
        </motion.div>
      </div>

      {/* Footer */}
      <motion.div
        className="fixed bottom-0 w-full text-center py-4 sm:py-6 bg-gradient-to-t from-[#0a0a0a] to-transparent px-4"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.8 }}
      >
        <div className="flex items-center justify-center gap-2 text-xs sm:text-sm text-gray-400">
          <div className="w-5 h-5 sm:w-6 sm:h-6 bg-[#16ad7c]/20 rounded-lg flex items-center justify-center">
            <Zap className="h-2.5 w-2.5 sm:h-3 sm:w-3 text-[#16ad7c]" />
          </div>
          <span className="whitespace-nowrap">Powered by</span>
          <a
            href="https://stillcollab.com"
            target="_blank"
            rel="noopener noreferrer"
            className="text-[#16ad7c] hover:text-[#5ce1e6] transition-colors duration-200 font-medium whitespace-nowrap"
          >
            StillCollab
          </a>
        </div>
      </motion.div>
    </div>
  );
};

export default ProfilePage;