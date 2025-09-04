import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate, useLocation } from "react-router-dom";
import { Check, X, Share2, Bell, ArrowLeft, Users, Clock, User, Calendar, Mail, Shield } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { useUser } from "@/contexts/UserContext";
import { getShareRequests, acceptShareRequest, declineShareRequest, ShareRequest, subscribeToProjects } from "@/services/projectShareService";
import { supabase } from "@/integrations/supabase/client";
import AuthModal from "@/components/AuthModal";

const ShareRequests = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { isLoggedIn } = useUser();
  const [shareRequests, setShareRequests] = useState<ShareRequest[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [authModalOpen, setAuthModalOpen] = useState(false);

  useEffect(() => {
    // Show auth modal immediately if user is not logged in
    if (!isLoggedIn) {
      setAuthModalOpen(true);
      setIsLoading(false);
      return;
    }

    const fetchShareRequests = async () => {
      setIsLoading(true);
      const requests = await getShareRequests();
      setShareRequests(requests);
      setIsLoading(false);
    };

    fetchShareRequests();

    // Set up real-time subscription using the proper subscription method
    const subscription = subscribeToProjects(() => {
      fetchShareRequests();
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [isLoggedIn]);

  // Check for auth action in URL params on component mount (for Google login)
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const authAction = params.get('auth_action');

    // If we just returned from Google auth and are logged in
    if (authAction === 'login' && isLoggedIn) {
      // Clear the parameter from URL without page refresh
      navigate('/share-requests', { replace: true });

      toast.success("You're logged in! Now you can view your sharing requests.");
    }
  }, [isLoggedIn, location.search, navigate]);

  // Handle auth modal close
  const handleAuthModalClose = useCallback(() => {
    setAuthModalOpen(false);

    if (isLoggedIn) {
      toast.success("You're logged in!", {
        description: "Now you can view your sharing requests."
      });
    } else {
      // If they close without logging in, redirect to dashboard
      navigate('/');
    }
  }, [isLoggedIn, navigate]);

  // Function to prepare for Google sign-in
  const prepareForGoogleSignIn = useCallback(() => {
    console.log("Preparing for Google sign-in");
    // Nothing specific to save here unlike VotePage
  }, []);

  const handleAccept = async (request: ShareRequest) => {
    const success = await acceptShareRequest(request.id);

    if (success) {
      setShareRequests(shareRequests.filter(req => req.id !== request.id));

      toast.success(`You've accepted '${request.projectName}'`, {
        description: `This project is now available on your dashboard`
      });
    }
  };

  const handleDecline = async (request: ShareRequest) => {
    const success = await declineShareRequest(request.id);

    if (success) {
      setShareRequests(shareRequests.filter(req => req.id !== request.id));

      toast.info(`You've declined '${request.projectName}'`, {
        description: `The invitation has been removed from your requests`
      });
    }
  };

  // Animation variants for list items
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1
      }
    }
  };

  const itemVariants = {
    hidden: { y: 20, opacity: 0 },
    visible: {
      y: 0,
      opacity: 1,
      transition: {
        type: "spring",
        stiffness: 100,
        damping: 12
      }
    }
  };

  // Render main content regardless of login state, the auth modal will handle the authentication
  return (
    <div className="relative min-h-screen bg-[#0a0a0a]">
      {/* Enhanced Background with Subtle Elements */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-20 left-10 w-72 h-72 bg-[#16ad7c]/3 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute bottom-20 right-10 w-96 h-96 bg-[#5ce1e6]/3 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '2s' }}></div>
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-[#6366f1]/2 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }}></div>
      </div>

      <main className="container mx-auto pt-24 pb-8 sm:pt-28 sm:pb-12 px-4 sm:px-6 relative z-10 max-w-7xl">
        {/* Enhanced Header Section */}
        <motion.div
          className="mb-12 sm:mb-16"
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
        >
          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-6">
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 bg-gradient-to-br from-[#16ad7c] to-[#5ce1e6] rounded-xl flex items-center justify-center shadow-lg">
                  <Share2 className="h-6 w-6 text-black" />
                </div>
                <div>
                  <h1 className="text-3xl sm:text-4xl font-bold text-white">Sharing Requests</h1>
                  <p className="text-gray-400 text-sm sm:text-base mt-1">Manage collaboration invitations from other users</p>
                </div>
              </div>

              {/* Stats Row */}
              <div className="flex flex-wrap items-center gap-4 mt-6">
                <div className="flex items-center gap-2 text-sm text-gray-400">
                  <Users className="h-4 w-4 text-[#16ad7c]" />
                  <span>{shareRequests.length} Pending Requests</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-gray-400">
                  <Clock className="h-4 w-4 text-[#5ce1e6]" />
                  <span>Real-time Updates</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-gray-400">
                  <Shield className="h-4 w-4 text-[#8b5cf6]" />
                  <span>Secure Sharing</span>
                </div>
              </div>
            </div>

            <Button
              onClick={() => navigate('/')}
              variant="outline"
              className="border-[#16ad7c]/30 hover:bg-[#16ad7c]/10 text-white hover:text-[#16ad7c] transition-all duration-300 px-6 py-2"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Return to Dashboard
            </Button>
          </div>
        </motion.div>

        {isLoading ? (
          <motion.div
            className="flex justify-center items-center py-20"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5 }}
          >
            <div className="relative">
              <div className="w-16 h-16 border-4 border-[#16ad7c]/20 rounded-full"></div>
              <div className="absolute top-0 left-0 w-16 h-16 border-4 border-[#16ad7c] rounded-full animate-spin border-t-transparent"></div>
            </div>
          </motion.div>
        ) : isLoggedIn ? (
          <>
            {shareRequests.length > 0 ? (
              <motion.div
                className="grid grid-cols-1 lg:grid-cols-2 gap-6 sm:gap-8"
                variants={containerVariants}
                initial="hidden"
                animate="visible"
              >
                {shareRequests.map((request) => (
                  <motion.div key={request.id} variants={itemVariants}>
                    <Card className="bg-gradient-to-br from-[#1a1a1a]/90 to-[#151515]/90 border-[#2a2a2a] hover:border-[#16ad7c]/30 rounded-2xl overflow-hidden transition-all duration-500 hover:shadow-[0_20px_60px_rgba(22,173,124,0.15)] group">
                      <CardHeader className="pb-4">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <Badge className="mb-3 bg-gradient-to-r from-[#16ad7c]/20 to-[#5ce1e6]/20 text-[#16ad7c] border-[#16ad7c]/30 text-xs px-3 py-1">
                              <Share2 className="h-3 w-3 mr-1" /> Share Request
                            </Badge>
                            <h3 className="text-xl font-bold text-white mb-2 group-hover:text-[#16ad7c] transition-colors duration-300">
                              {request.projectName}
                            </h3>
                          </div>
                          <div className="w-12 h-12 bg-gradient-to-br from-[#16ad7c]/20 to-[#5ce1e6]/20 rounded-xl flex items-center justify-center group-hover:from-[#16ad7c]/30 group-hover:to-[#5ce1e6]/30 transition-all duration-300">
                            <Share2 className="h-6 w-6 text-[#16ad7c]" />
                          </div>
                        </div>
                      </CardHeader>

                      <CardContent className="pb-4">
                        <div className="space-y-3">
                          <div className="flex items-center gap-2 text-sm text-gray-400">
                            <User className="h-4 w-4 text-[#5ce1e6]" />
                            <span>From: <span className="text-white font-medium">{request.senderName}</span></span>
                          </div>
                          <div className="flex items-center gap-2 text-sm text-gray-400">
                            <Calendar className="h-4 w-4 text-[#8b5cf6]" />
                            <span>Received: <span className="text-white font-medium">{request.date}</span></span>
                          </div>
                          <div className="flex items-center gap-2 text-sm text-gray-400">
                            <Mail className="h-4 w-4 text-[#f59e0b]" />
                            <span>Status: <span className="text-[#16ad7c] font-medium">Pending Response</span></span>
                          </div>
                        </div>
                      </CardContent>

                      <Separator className="bg-[#2a2a2a]" />

                      <CardFooter className="flex justify-between p-6 bg-gradient-to-br from-[#111111]/80 to-[#0a0a0a]/80">
                        <Button
                          variant="outline"
                          size="lg"
                          className="border-red-500/30 hover:bg-red-500/10 text-red-400 hover:text-red-300 hover:border-red-500/50 transition-all duration-300 px-6"
                          onClick={() => handleDecline(request)}
                        >
                          <X className="h-4 w-4 mr-2" />
                          Decline
                        </Button>
                        <Button
                          size="lg"
                          className="bg-gradient-to-r from-[#16ad7c] to-[#5ce1e6] hover:from-[#5ce1e6] hover:to-[#16ad7c] text-black font-semibold transition-all duration-300 px-6 shadow-lg hover:shadow-[0_8px_25px_rgba(22,173,124,0.3)]"
                          onClick={() => handleAccept(request)}
                        >
                          <Check className="h-4 w-4 mr-2" />
                          Accept
                        </Button>
                      </CardFooter>
                    </Card>
                  </motion.div>
                ))}
              </motion.div>
            ) : (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="flex flex-col items-center justify-center py-20 text-center max-w-2xl mx-auto"
              >
                <div className="relative mb-8">
                  <div className="w-24 h-24 bg-gradient-to-br from-[#16ad7c]/20 to-[#5ce1e6]/20 rounded-full flex items-center justify-center mb-4">
                    <Bell className="h-12 w-12 text-[#16ad7c]" />
                  </div>
                  <div className="absolute inset-0 w-24 h-24 bg-gradient-to-br from-[#16ad7c]/10 to-[#5ce1e6]/10 rounded-full blur-xl animate-pulse"></div>
                </div>

                <h3 className="text-2xl sm:text-3xl font-bold text-white mb-4">No pending share requests</h3>
                <p className="text-gray-400 text-sm sm:text-base max-w-md mb-8 leading-relaxed">
                  When someone invites you to collaborate on a project, you'll see it here.
                  All requests are updated in real-time.
                </p>

                <div className="flex flex-col sm:flex-row gap-4">
                  <Button
                    onClick={() => navigate('/')}
                    className="bg-gradient-to-r from-[#16ad7c] to-[#5ce1e6] hover:from-[#5ce1e6] hover:to-[#16ad7c] text-black font-semibold rounded-xl px-8 py-3 transition-all duration-300 shadow-lg hover:shadow-[0_8px_25px_rgba(22,173,124,0.3)]"
                  >
                    <ArrowLeft className="h-4 w-4 mr-2" />
                    Return to Dashboard
                  </Button>

                  <Button
                    variant="outline"
                    onClick={() => window.location.reload()}
                    className="border-[#2a2a2a] hover:border-[#16ad7c]/30 text-gray-400 hover:text-[#16ad7c] transition-all duration-300 rounded-xl px-8 py-3"
                  >
                    <Share2 className="h-4 w-4 mr-2" />
                    Refresh
                  </Button>
                </div>
              </motion.div>
            )}
          </>
        ) : null}
      </main>

      {/* Auth Modal */}
      <AuthModal
        isOpen={authModalOpen}
        onClose={handleAuthModalClose}
        defaultTab="signin"
        redirectAction={prepareForGoogleSignIn}
      />
    </div>
  );
};

export default ShareRequests;
