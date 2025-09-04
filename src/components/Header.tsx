import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { User, LogOut, Settings, Share2, Bell, Zap, Crown, Star } from "lucide-react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { useUser } from "@/contexts/UserContext";
import { UserDropdown } from "@/components/UserDropdown";
import AuthModal from "@/components/AuthModal";
import { Badge } from "@/components/ui/badge";
import { motion, AnimatePresence } from "framer-motion";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

const Header = () => {
  const { user, isLoggedIn, logout, isLoading } = useUser();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [authModalTab, setAuthModalTab] = useState<"signin" | "signup">(
    "signin"
  );
  const [authRedirectAction, setAuthRedirectAction] = useState<
    (() => void) | undefined
  >(undefined);
  const [hasNewShareRequests] = useState(true); // In a real app, this would come from an API

  // Check for auth parameter in URL when component mounts
  useEffect(() => {
    const authParam = searchParams.get("auth");
    if (authParam === "signin" || authParam === "signup") {
      openAuthModal(authParam);
      // Remove the auth parameter from URL without refreshing the page
      const newUrl =
        window.location.pathname +
        window.location.search.replace(/[?&]auth=[^&]+(&|$)/, "");
      window.history.replaceState({}, "", newUrl);
    }
  }, [searchParams]);

  const openAuthModal = (
    tab: "signin" | "signup" = "signin",
    redirectAction?: () => void
  ) => {
    setAuthModalTab(tab);
    setAuthRedirectAction(() => redirectAction);
    setIsAuthModalOpen(true);
  };

  const handleAuth = () => {
    if (isLoggedIn) {
      logout();
    } else {
      openAuthModal("signin");
    }
  };

  const goToSettings = () => {
    navigate("/settings");
  };

  const goToShareRequests = () => {
    navigate("/share-requests");
  };

  // Logo animation variants
  const logoVariants = {
    hidden: { opacity: 0, scale: 0.8 },
    visible: {
      opacity: 1,
      scale: 1,
      transition: {
        duration: 0.6,
        ease: "easeOut",
      },
    },
  };

  // Text label variants
  const labelVariants = {
    hidden: { opacity: 0, y: 5 },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        delay: 0.3,
        duration: 0.4,
      },
    },
  };

  return (
    <>
      <header className="bg-gradient-to-r from-black/90 via-[#0a0a0a]/90 to-black/90 backdrop-blur-xl border-b border-[#16ad7c]/20 py-4 sticky top-0 z-50 shadow-lg">
        {/* Enhanced Background with Subtle Elements */}
        <div className="absolute inset-0 bg-gradient-to-r from-[#16ad7c]/5 via-transparent to-[#5ce1e6]/5 opacity-30"></div>

        <div className="container mx-auto px-4 sm:px-6 flex justify-between items-center relative z-10">
          {/* Logo Section */}
          <div className="flex items-center h-full">
            <Link to="/" className="group">
              <motion.div
                className="flex items-center gap-3"
                initial="hidden"
                animate="visible"
                variants={logoVariants}
                whileHover={{ scale: 1.02 }}
                transition={{ type: "spring", stiffness: 300 }}
              >
                <div className="relative">
                  <div className="w-10 h-10 bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl flex items-center justify-center shadow-lg group-hover:shadow-[0_8px_25px_rgba(0,0,0,0.3)] transition-all duration-300">
                    <img src="/logo-icon.png" alt="StillCollab" className="w-6 h-6" />
                  </div>
                  <div className="absolute inset-0 w-10 h-10 bg-[#2a2a2a] rounded-xl blur-xl opacity-20 group-hover:opacity-30 transition-all duration-300"></div>
                </div>
                <div className="flex flex-col">
                  <span className="text-white font-bold text-2xl sm:text-3xl tracking-wide">
                    StillCollab
                  </span>
                  <motion.span
                    className="text-xs text-gray-400 font-medium"
                    initial="hidden"
                    animate="visible"
                    variants={labelVariants}
                  >
                    Creative Collaboration Platform
                  </motion.span>
                </div>
              </motion.div>
            </Link>
          </div>

          {/* Navigation Section */}
          <div className="flex items-center gap-2 sm:gap-4">
            {isLoggedIn && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    onClick={goToShareRequests}
                    className="relative text-gray-300 hover:text-white hover:bg-[#16ad7c]/20 transition-all duration-300 px-3 sm:px-4 py-2 rounded-xl group"
                  >
                    <div className="flex items-center gap-2">
                      <Share2 className="h-4 w-4 group-hover:scale-110 transition-transform duration-300" />
                      <span className="hidden sm:inline">Sharing</span>
                    </div>
                    {hasNewShareRequests && (
                      <motion.div
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        className="absolute -top-1 -right-1 w-3 h-3 bg-gradient-to-r from-[#f59e0b] to-[#ef4444] rounded-full border-2 border-[#0a0a0a]"
                      >
                        <div className="w-full h-full bg-gradient-to-r from-[#f59e0b] to-[#ef4444] rounded-full animate-pulse"></div>
                      </motion.div>
                    )}
                  </Button>
                </TooltipTrigger>
                <TooltipContent className="bg-[#1A1A1A] border-[#333] text-white p-3">
                  <div className="flex items-center gap-2">
                    <Share2 className="h-4 w-4 text-[#16ad7c]" />
                    <span>View sharing requests</span>
                    {hasNewShareRequests && (
                      <Badge className="bg-[#f59e0b] text-black text-xs px-2 py-0.5">
                        New
                      </Badge>
                    )}
                  </div>
                </TooltipContent>
              </Tooltip>
            )}

            {/* User Section */}
            {isLoggedIn ? (
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.5 }}
              >
                <UserDropdown />
              </motion.div>
            ) : (
              <div className="flex items-center gap-2 sm:gap-3">
                <Button
                  variant="ghost"
                  onClick={handleAuth}
                  className="text-gray-300 hover:text-white hover:bg-[#16ad7c]/20 transition-all duration-300 px-3 sm:px-4 py-2 rounded-xl group"
                  disabled={isLoading}
                >
                  <User className="h-4 w-4 mr-2 group-hover:scale-110 transition-transform duration-300" />
                  <span className="hidden sm:inline">Sign In</span>
                </Button>

                <Button
                  onClick={() => openAuthModal("signup")}
                  className="bg-gradient-to-r from-[#16ad7c] to-[#5ce1e6] hover:from-[#5ce1e6] hover:to-[#16ad7c] text-black font-semibold transition-all duration-300 px-4 sm:px-6 py-2 rounded-xl shadow-lg hover:shadow-[0_8px_25px_rgba(22,173,124,0.3)] transform hover:-translate-y-0.5"
                  disabled={isLoading}
                >
                  <Star className="h-4 w-4 mr-2" />
                  <span className="hidden sm:inline">Sign Up</span>
                </Button>
              </div>
            )}
          </div>
        </div>

        {/* Enhanced Bottom Border */}
        <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-[#16ad7c]/50 to-transparent"></div>
      </header>

      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
        defaultTab={authModalTab}
        redirectAction={authRedirectAction}
      />
    </>
  );
};

export default Header;
