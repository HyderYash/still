import { useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { ChevronDown, User, Settings, CreditCard, LogOut, BookOpen, FilePlus, Info, ChevronRight, Copy, ExternalLink } from "lucide-react";
import { useUser, UserSubscriptionPlan } from "@/contexts/UserContext";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";

const getPlanColor = (plan: UserSubscriptionPlan | undefined) => {
  switch (plan) {
    case "free":
      return "text-gray-400";
    case "pro":
      return "text-[#16ad7c]";
    case "enterprise":
      return "text-indigo-400";
    default:
      return "text-gray-400";
  }
};

const getStorageColor = (percentage: number) => {
  if (percentage < 50) return "bg-[#16ad7c]";
  if (percentage < 80) return "bg-yellow-500";
  return "bg-red-500";
};

export const UserDropdown = () => {
  const { user, isLoggedIn, logout } = useUser();
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState(false);

  const storagePercentage = user ? (user.storageUsed / user.storageLimit) * 100 : 0;

  if (!isLoggedIn || !user) {
    return null;
  }

  const handleLogout = () => {
    logout();
    setIsOpen(false);
    navigate("/");
  };

  const handleNavigation = (path: string) => {
    setIsOpen(false);
    navigate(path);
  };

  const handleCopyProfileUrl = () => {
    const username = user.profile?.username;
    if (username) {
      const profileUrl = `${window.location.origin}/${username}`;
      navigator.clipboard.writeText(profileUrl)
        .then(() => {
          toast.success("Profile URL copied to clipboard!");
        })
        .catch(() => {
          toast.error("Failed to copy URL");
        });
    } else {
      toast.error("Username not available");
    }
    setIsOpen(false);
  };

  const dropdownAnimation = {
    initial: { opacity: 0, y: -20, scale: 0.95 },
    animate: { opacity: 1, y: 0, scale: 1 },
    exit: { opacity: 0, y: -20, scale: 0.95 },
    transition: { duration: 0.2 }
  };

  // Safe fallback for name
  const userInitials = user.name ? user.name.substring(0, 2) : "U";
  const userPlanName = user.subscriptionPlan ?
    user.subscriptionPlan.charAt(0).toUpperCase() + user.subscriptionPlan.slice(1) :
    "Free";

  // Get username from user profile object
  const username = user.profile?.username;

  return (
    <TooltipProvider>
      <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            className="relative group px-2 py-2 hover:bg-[#16ad7c]/10 transition-all duration-300 border border-transparent hover:border-[#16ad7c]/20 rounded-lg"
          >
            <div className="flex items-center gap-2">
              <Avatar className="h-8 w-8 border-2 border-[#16ad7c]/30 transition-all duration-300 group-hover:border-[#16ad7c]">
                <AvatarImage src={user.avatar} alt={user.name || "User"} />
                <AvatarFallback className="bg-[#16ad7c]/20 text-[#16ad7c]">
                  {userInitials}
                </AvatarFallback>
              </Avatar>
              <div className="hidden md:block text-left">
                <p className="text-sm font-medium">{user.name || "User"}</p>
                <p className={`text-xs ${getPlanColor(user.subscriptionPlan)}`}>
                  {userPlanName}
                </p>
              </div>
              <ChevronDown className={`h-4 w-4 transition-transform duration-300 ${isOpen ? 'rotate-180' : ''}`} />
            </div>
            <span className="absolute -bottom-px left-0 w-full h-[2px] bg-gradient-to-r from-[#16ad7c]/0 via-[#16ad7c] to-[#16ad7c]/0 scale-x-0 group-hover:scale-x-100 transition-transform duration-300" />
          </Button>
        </DropdownMenuTrigger>

        <AnimatePresence>
          {isOpen && (
            <DropdownMenuContent
              align="end"
              sideOffset={8}
              className="w-72 bg-[#1A1A1A] border border-white/10 shadow-xl backdrop-blur-sm rounded-xl overflow-hidden"
              asChild
              forceMount
            >
              <motion.div
                {...dropdownAnimation}
              >
                {/* User Section */}
                <div className="p-4 bg-gradient-to-b from-[#16ad7c]/10 to-transparent border-b border-white/5">
                  <div className="flex items-center gap-3">
                    <Avatar className="h-10 w-10 border-2 border-[#16ad7c]/50">
                      <AvatarImage src={user.avatar} alt={user.name || "User"} />
                      <AvatarFallback className="bg-[#16ad7c]/20 text-[#16ad7c]">
                        {userInitials}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="font-medium text-white">{user.name || "User"}</p>
                      <p className="text-xs text-gray-400">{user.email || ""}</p>
                    </div>
                  </div>

                  <div className="mt-3 text-xs">
                    <span className={`px-2 py-0.5 rounded-full ${getPlanColor(user.subscriptionPlan)} bg-white/5 font-medium`}>
                      {userPlanName} Plan
                    </span>
                  </div>
                </div>

                <DropdownMenuGroup className="p-2">
                  <DropdownMenuItem
                    className="flex items-center gap-2 px-3 py-2 cursor-pointer rounded-lg hover:bg-white/5 transition-colors focus:bg-white/5"
                    onClick={() => handleNavigation('/settings')}
                  >
                    <User className="h-4 w-4 text-[#16ad7c]" />
                    <span>Profile</span>
                  </DropdownMenuItem>

                  {username && (
                    <>
                      <DropdownMenuItem
                        className="flex items-center gap-2 px-3 py-2 cursor-pointer rounded-lg hover:bg-white/5 transition-colors focus:bg-white/5"
                        onClick={() => handleNavigation(`/${username}`)}
                      >
                        <ExternalLink className="h-4 w-4 text-[#16ad7c]" />
                        <span>View Profile Page</span>
                      </DropdownMenuItem>

                      <DropdownMenuItem
                        className="flex items-center gap-2 px-3 py-2 cursor-pointer rounded-lg hover:bg-white/5 transition-colors focus:bg-white/5"
                        onClick={handleCopyProfileUrl}
                      >
                        <Copy className="h-4 w-4 text-[#16ad7c]" />
                        <span>Copy Profile URL</span>
                      </DropdownMenuItem>
                    </>
                  )}

                  <DropdownMenuItem
                    className="flex items-center gap-2 px-3 py-2 cursor-pointer rounded-lg hover:bg-white/5 transition-colors focus:bg-white/5"
                    onClick={() => handleNavigation('/settings')}
                  >
                    <Settings className="h-4 w-4 text-[#16ad7c]" />
                    <span>Settings</span>
                  </DropdownMenuItem>

                  <DropdownMenuItem
                    className="flex items-center gap-2 px-3 py-2 cursor-pointer rounded-lg hover:bg-white/5 transition-colors focus:bg-white/5"
                    onClick={() => handleNavigation('/settings?tab=subscription')}
                  >
                    <CreditCard className="h-4 w-4 text-[#16ad7c]" />
                    <span>Billing</span>
                  </DropdownMenuItem>
                </DropdownMenuGroup>

                <DropdownMenuSeparator className="mx-2 bg-white/5" />

                {/* Blog Section */}
                <DropdownMenuLabel className="px-3 py-2 text-xs text-gray-400">Blog</DropdownMenuLabel>
                <DropdownMenuGroup className="p-2 pt-0">
                  <DropdownMenuItem
                    className="flex items-center gap-2 px-3 py-2 cursor-pointer rounded-lg hover:bg-white/5 transition-colors focus:bg-white/5"
                    onClick={() => handleNavigation('/blog')}
                  >
                    <BookOpen className="h-4 w-4 text-[#16ad7c]" />
                    <span>View Articles</span>
                  </DropdownMenuItem>

                  {user.subscriptionPlan !== "free" && (
                    <DropdownMenuItem
                      className="flex items-center gap-2 px-3 py-2 cursor-pointer rounded-lg hover:bg-white/5 transition-colors focus:bg-white/5"
                      onClick={() => handleNavigation('/blog/new')}
                    >
                      <FilePlus className="h-4 w-4 text-[#16ad7c]" />
                      <span>New Article</span>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <div className="ml-1 opacity-50 hover:opacity-100 transition-opacity">
                            <Info className="h-3 w-3" />
                          </div>
                        </TooltipTrigger>
                        <TooltipContent className="bg-[#242424] border-white/10">
                          <p className="text-xs">Create and publish new content</p>
                        </TooltipContent>
                      </Tooltip>
                    </DropdownMenuItem>
                  )}
                </DropdownMenuGroup>

                <DropdownMenuSeparator className="mx-2 bg-white/5" />

                {/* About Section */}
                <DropdownMenuGroup className="p-2">
                  <DropdownMenuItem
                    className="flex items-center gap-2 px-3 py-2 cursor-pointer rounded-lg hover:bg-white/5 transition-colors focus:bg-white/5"
                    onClick={() => handleNavigation('/about')}
                  >
                    <Info className="h-4 w-4 text-[#16ad7c]" />
                    <span>About StillCollab</span>
                  </DropdownMenuItem>
                </DropdownMenuGroup>

                <DropdownMenuSeparator className="mx-2 bg-white/5" />

                {/* Storage Section - Sticky Footer */}
                <div className="p-4 border-t border-white/5 bg-black/20">
                  <div className="flex justify-between items-center text-xs mb-1.5">
                    <span className="text-gray-400">Storage</span>
                    <span className="text-white">{user.storageUsed} GB of {user.storageLimit} GB</span>
                  </div>

                  <div className="relative h-2 w-full bg-white/10 rounded-full overflow-hidden">
                    <div
                      className={`absolute top-0 left-0 h-full ${getStorageColor(storagePercentage)} transition-all duration-500 rounded-full`}
                      style={{ width: `${storagePercentage}%` }}
                    />
                  </div>

                  <Button
                    className="w-full mt-3 bg-gradient-to-r from-[#16ad7c] to-[#16ad7c]/80 hover:brightness-110 text-black transition-all duration-300 relative overflow-hidden group"
                    onClick={() => handleNavigation('/settings?tab=subscription')}
                  >
                    <span className="relative z-10 flex items-center gap-1">
                      Upgrade Storage
                      <ChevronRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                    </span>
                    <span className="absolute inset-0 bg-white/20 transform translate-y-full group-hover:translate-y-0 transition-transform duration-300"></span>
                  </Button>
                </div>

                <DropdownMenuSeparator className="mx-2 bg-white/5" />

                {/* Logout */}
                <DropdownMenuItem
                  className="flex items-center gap-2 m-2 px-3 py-2 cursor-pointer rounded-lg text-red-400 hover:bg-red-500/10 hover:text-red-300 transition-colors focus:bg-red-500/10"
                  onClick={handleLogout}
                >
                  <LogOut className="h-4 w-4" />
                  <span>Log Out</span>
                </DropdownMenuItem>
              </motion.div>
            </DropdownMenuContent>
          )}
        </AnimatePresence>
      </DropdownMenu>
    </TooltipProvider>
  );
};
