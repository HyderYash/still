import React, { useState, useEffect, useCallback } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useUser } from "@/contexts/UserContext";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import AuthModal from "@/components/AuthModal";
import { Timer, Check, Vote, Maximize, Award, Sparkles, Camera, Share2, MessageCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

interface ImageItem {
  id: string;
  src: string;
  alt: string;
  name: string;
}

interface VoteCount {
  image_id: string;
  vote_count: number;
}

// This is updated mock data with better images
const MOCK_IMAGES: ImageItem[] = [
  {
    id: "img_zherebtsov_cinema_01",
    src: "/vote-images/@Zherebtsov.cinema.jpg",
    alt: "Photo by @zherebtsov.cinema",
    name: "@zherebtsov.cinema",
  },
  {
    id: "img_7_vsm_02",
    src: "/vote-images/@7_vsm.jpg",
    alt: "Photo by @7_vsm",
    name: "@7_vsm",
  },
  {
    id: "img_4_swin_03",
    src: "/vote-images/@4.swin.jpg",
    alt: "Photo by @4.swin",
    name: "@4.swin",
  },
  {
    id: "img_runomaticcolors_04",
    src: "/vote-images/@runomaticcolors.jpg",
    alt: "Photo by @runomaticcolors",
    name: "@runomaticcolors",
  },
  {
    id: "img_filmicbro_05",
    src: "/vote-images/@filmicbro.jpg",
    alt: "Photo by @filmicbro",
    name: "@filmicbro",
  },
  {
    id: "img_samdavisoncolour_06",
    src: "/vote-images/@Samdavisoncolour.jpg",
    alt: "Photo by @samdavisoncolour",
    name: "@samdavisoncolour",
  },
  {
    id: "img_cinematic_hue_07",
    src: "/vote-images/@cinematic_hue.jpg",
    alt: "Photo by @cinematic_hue",
    name: "@cinematic_hue",
  },
  {
    id: "img_sylvain_baldet_08",
    src: "/vote-images/@sylvain_baldet.jpg",
    alt: "Photo by @sylvain_baldet",
    name: "@sylvain_baldet",
  },
  {
    id: "img_xx_mike_09",
    src: "/vote-images/@Xx_mike.jpg",
    alt: "Photo by @xx_.mike",
    name: "@xx_.mike",
  },
  {
    id: "img_its_premg_10",
    src: "/vote-images/@its_premg.jpg",
    alt: "Photo by @its_premg",
    name: "@its_premg",
  },
  {
    id: "img_rian_galery_11",
    src: "/vote-images/@rian.galery.jpg",
    alt: "Photo by @rian.galery",
    name: "@rian.galery",
  },
  {
    id: "img_kabirwithcolors_12",
    src: "/vote-images/@kabirwithcolors.jpg",
    alt: "Photo by @kabirwithcolors",
    name: "@kabirwithcolors",
  },
  {
    id: "img_sibaprasadparida_13",
    src: "/vote-images/@_sibaprasadparida_.jpg",
    alt: "Photo by @_sibaprasadparida_",
    name: "@_sibaprasadparida_",
  },
  {
    id: "img_nufails_14",
    src: "/vote-images/@nufails.jpg",
    alt: "Photo by @nufails",
    name: "@nufails",
  },
  {
    id: "img_elcrismontiel_15",
    src: "/vote-images/@elcrismontiel.jpg",
    alt: "Photo by @elcrismontiel",
    name: "@elcrismontiel",
  },
];

const STORAGE_KEY_SELECTED_IMAGES = "voting_selected_images";

const VotePage: React.FC = () => {
  const { user, isLoggedIn } = useUser();
  const navigate = useNavigate();
  const location = useLocation();
  const queryClient = useQueryClient();
  const [selectedImages, setSelectedImages] = useState<ImageItem[]>([]);
  const [selectedImage, setSelectedImage] = useState<ImageItem | null>(null);
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [hasVoted, setHasVoted] = useState(false);
  const [showVotePrompt, setShowVotePrompt] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [pendingVote, setPendingVote] = useState(false);

  // Event end time - this will be changed later as mentioned
  const eventEndTime = new Date("2025-05-18T23:59:59");
  const [timeLeft, setTimeLeft] = useState<{
    days: number;
    hours: number;
    minutes: number;
    seconds: number;
  }>({
    days: 0,
    hours: 0,
    minutes: 0,
    seconds: 0,
  });

  // Fetch vote counts using React Query
  const { data: voteCounts = [] } = useQuery({
    queryKey: ["voteCounts"],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_image_vote_counts");

      if (error) {
        console.error("Error fetching vote counts:", error);
        return [] as VoteCount[];
      }

      return data as VoteCount[];
    },
  });

  // Check if user has already voted
  const { data: userVotes, isLoading: isLoadingVotes } = useQuery({
    queryKey: ["userVotes", user?.id],
    queryFn: async () => {
      if (!user?.id) return [];

      const { data, error } = await supabase
        .from("image_votes")
        .select("image_id")
        .eq("user_id", user.id);

      if (error) {
        console.error("Error fetching user votes:", error);
        return [];
      }

      return data;
    },
    enabled: !!user?.id,
  });

  // Set hasVoted based on if the user has already voted
  useEffect(() => {
    // Skip if votes are still loading
    if (isLoadingVotes) return;

    if (userVotes && userVotes.length > 0) {
      // User has voted before
      setHasVoted(true);

      // Pre-select the images the user has already voted for
      const userVotedImageIds = userVotes.map(vote => vote.image_id);
      const userVotedImages = MOCK_IMAGES.filter(img =>
        userVotedImageIds.includes(img.id)
      );
      setSelectedImages(userVotedImages);
    } else if (user?.id) {
      // User is logged in but hasn't voted
      setHasVoted(false);
      // Don't clear existing selections - allow them to continue selecting
    }
  }, [userVotes, user?.id, isLoadingVotes]);

  // Calculate time left
  useEffect(() => {
    const calculateTimeLeft = () => {
      const difference = eventEndTime.getTime() - new Date().getTime();

      if (difference > 0) {
        setTimeLeft({
          days: Math.floor(difference / (1000 * 60 * 60 * 24)),
          hours: Math.floor((difference / (1000 * 60 * 60)) % 24),
          minutes: Math.floor((difference / 1000 / 60) % 60),
          seconds: Math.floor((difference / 1000) % 60),
        });
      } else {
        // Event has ended
        setTimeLeft({ days: 0, hours: 0, minutes: 0, seconds: 0 });
      }
    };

    calculateTimeLeft();
    const timer = setInterval(calculateTimeLeft, 1000);

    return () => clearInterval(timer);
  }, []);

  // Load selected images from localStorage on initial load
  useEffect(() => {
    const savedImagesJson = localStorage.getItem(STORAGE_KEY_SELECTED_IMAGES);
    if (savedImagesJson) {
      try {
        const savedImages = JSON.parse(savedImagesJson);
        if (Array.isArray(savedImages) && savedImages.length > 0 && !hasVoted) {
          console.log("Loaded saved images from localStorage:", savedImages);
          setSelectedImages(savedImages);

          // Remove from localStorage after loading to prevent state duplication issues
          localStorage.removeItem(STORAGE_KEY_SELECTED_IMAGES);
          console.log("Cleared localStorage after loading selections");
        }
      } catch (e) {
        console.error("Error parsing saved images:", e);
        localStorage.removeItem(STORAGE_KEY_SELECTED_IMAGES);
      }
    }
  }, []);

  // Check for auth action in URL params on component mount
  useEffect(() => {
    // Check for redirect from OAuth (Google login)
    const params = new URLSearchParams(location.search);
    const authAction = params.get('auth_action');

    console.log("Auth state check:", {
      authAction,
      isLoggedIn,
      selectedImagesCount: selectedImages.length,
      hasVoted
    });

    // If we just returned from Google auth and are logged in
    if (authAction === 'login' && isLoggedIn) {
      console.log("Detected return from Google auth");
      // Clear the parameter from URL without page refresh
      navigate('/vote', { replace: true });

      // No longer auto-submitting - user will manually click the button
      // Just display a toast to remind them to submit their votes
      if (selectedImages.length === 2 && !hasVoted) {
        toast.success("You're logged in! Click 'Submit Votes' to cast your vote.");
      }
    }

    // Cleanup function - clear pending votes when component unmounts
    return () => {
      if (pendingVote) {
        setPendingVote(false);
      }
    };
  }, [isLoggedIn, location.search, selectedImages, hasVoted, pendingVote]);

  // Helper function to save selections to localStorage
  const saveSelectionsToStorage = useCallback((selections: ImageItem[]) => {
    if (selections.length > 0) {
      console.log("Saving selections to localStorage:", selections);
      localStorage.setItem(STORAGE_KEY_SELECTED_IMAGES, JSON.stringify(selections));
    } else {
      console.log("Clearing selections from localStorage");
      localStorage.removeItem(STORAGE_KEY_SELECTED_IMAGES);
    }
  }, []);

  // Function to prepare for Google sign-in
  const prepareForGoogleSignIn = useCallback(() => {
    console.log("Preparing for Google sign-in, selected images:", selectedImages);

    // Explicitly save the current selections to localStorage before Google redirect
    if (selectedImages.length > 0) {
      saveSelectionsToStorage(selectedImages);
    }

    // Set pending vote to false - no auto submission
    setPendingVote(false);
  }, [selectedImages, saveSelectionsToStorage]);

  // Handle auth modal close
  const handleAuthModalClose = useCallback(() => {
    setAuthModalOpen(false);

    // Show a toast if they have images selected to remind them to submit manually
    if (selectedImages.length === 2 && isLoggedIn && !hasVoted) {
      toast.success("You can now submit your votes!", {
        description: "Click the 'Submit Votes' button when you're ready.",
        duration: 5000
      });
    }

    // Reset pending vote state if user manually closes the modal
    setPendingVote(false);
  }, [selectedImages, isLoggedIn, hasVoted]);

  const toggleImageSelection = (image: ImageItem) => {
    // If user has already voted, don't allow new selections
    if (hasVoted) {
      toast.warning("You have already submitted your votes");
      return;
    }

    // Store a copy of the current selections
    const currentSelections = [...selectedImages];
    const isAlreadySelected = currentSelections.some((img) => img.id === image.id);
    let newSelections: ImageItem[];

    if (isAlreadySelected) {
      // Remove image if already selected
      newSelections = currentSelections.filter((img) => img.id !== image.id);
      setSelectedImages(newSelections);
    } else {
      // Add image if not already selected (max 2)
      if (currentSelections.length < 2) {
        newSelections = [...currentSelections, image];
        setSelectedImages(newSelections);

        // If this selection makes it 2 images, prompt user to submit their vote
        if (currentSelections.length === 1) {
          toast.info("You've selected 2 images. Click 'Submit Votes' to cast your vote!", {
            duration: 5000
          });
        }
      } else {
        toast.warning("You can only select 2 images. Unselect one before selecting another.");
        return;
      }
    }

    // Save the updated selections to localStorage
    saveSelectionsToStorage(newSelections);
  };

  const handleSubmitVote = async () => {
    console.log("Handling vote submission:", { isLoggedIn, selectedImageCount: selectedImages.length });

    // Check if user is logged in
    if (!isLoggedIn || !user?.id) {
      console.log("User not logged in, showing prompt");
      // Keep track of the fact that a vote was attempted
      setPendingVote(true);
      setShowVotePrompt(true);
      return;
    }

    // Validate the image selection
    if (selectedImages.length !== 2) {
      console.log("Invalid number of images selected");
      toast.warning("Please select exactly 2 images");
      return;
    }

    // If already submitted, prevent duplicate submissions
    if (hasVoted || isSubmitting) {
      console.log("Vote already submitted or in progress");
      toast.info("Your vote has already been submitted");
      return;
    }

    console.log("Proceeding with vote submission for user", user.id);

    // Submit the vote
    setIsSubmitting(true);
    submitVoteMutation.mutate(selectedImages.map(img => img.id));
  };

  // Helper to get vote count for an image
  const getVoteCount = (imageId: string): number => {
    const found = voteCounts.find(v => v.image_id === imageId);
    return found ? Number(found.vote_count) : 0;
  };

  const handleRedirectToMainPage = () => {
    navigate("/");
  };

  const handleTryMoreFeatures = () => {
    navigate("/");
  };

  // After successful vote, clear saved selections
  useEffect(() => {
    if (hasVoted) {
      localStorage.removeItem(STORAGE_KEY_SELECTED_IMAGES);
    }
  }, [hasVoted]);

  // Update button text to indicate user needs to click after logging in
  const getSubmitButtonText = () => {
    if (isSubmitting) return "Submitting...";
    if (hasVoted) return "Votes Submitted";
    if (isLoggedIn && selectedImages.length === 2) return "Submit Votes";
    if (!isLoggedIn && selectedImages.length === 2) return "Login & Submit";
    return "Submit Votes";
  };

  // Submit vote mutation
  const submitVoteMutation = useMutation({
    mutationFn: async (imageIds: string[]) => {
      if (!user?.id) throw new Error("User not authenticated");

      try {
        // Create vote records for each selected image
        const votePromises = imageIds.map(imageId =>
          supabase
            .from("image_votes")
            .upsert({
              user_id: user.id,
              image_id: imageId
            })
        );

        const results = await Promise.all(votePromises);
        const errors = results.filter(result => result.error);

        if (errors.length > 0) {
          console.error("Errors submitting votes:", errors);
          throw new Error("Failed to submit some votes");
        }

        return results;
      } catch (error) {
        console.error("Error in vote submission:", error);
        throw error;
      }
    },
    onSuccess: () => {
      toast.success("Your vote has been submitted!");
      setHasVoted(true);
      setShowSuccessModal(true);
      queryClient.invalidateQueries({ queryKey: ["voteCounts"] });
      queryClient.invalidateQueries({ queryKey: ["userVotes"] });

      // Clear pending vote state and stored selections
      setPendingVote(false);
      localStorage.removeItem(STORAGE_KEY_SELECTED_IMAGES);
    },
    onError: (error) => {
      console.error("Error submitting vote:", error);
      toast.error("Failed to submit your vote. Please try again.");

      // If we were redirected from Google auth and failed, let's retry once
      const params = new URLSearchParams(window.location.search);
      const authAction = params.get('auth_action');

      if (authAction === 'login' && user?.id) {
        toast.info("Retrying vote submission...");
        // Retry after a short delay
        setTimeout(() => {
          if (selectedImages.length === 2) {
            submitVoteMutation.mutate(selectedImages.map(img => img.id));
          }
        }, 1000);
      }
    },
    onSettled: () => {
      setIsSubmitting(false);
    },
    retry: 2, // Allow up to 2 retries
  });

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Countdown Timer */}
      <div className="mb-8 text-center">
        <div className="flex items-center justify-center gap-2 mb-4">
          <Timer className="w-6 h-6 text-primary" />
          <h1 className="text-3xl font-bold">Voting Ends In</h1>
        </div>
        <div className="inline-flex items-center justify-center gap-2 bg-card/50 backdrop-blur-sm p-4 rounded-xl shadow-sm">
          <div className="bg-primary/10 rounded-lg p-3 min-w-16 text-center border border-primary/20">
            <span className="text-3xl font-bold block text-primary">
              {String(timeLeft.days).padStart(2, "0")}
            </span>
            <span className="text-xs text-muted-foreground">Days</span>
          </div>
          <span className="text-2xl font-bold text-primary">:</span>
          <div className="bg-primary/10 rounded-lg p-3 min-w-16 text-center border border-primary/20">
            <span className="text-3xl font-bold block text-primary">
              {String(timeLeft.hours).padStart(2, "0")}
            </span>
            <span className="text-xs text-muted-foreground">Hours</span>
          </div>
          <span className="text-2xl font-bold text-primary">:</span>
          <div className="bg-primary/10 rounded-lg p-3 min-w-16 text-center border border-primary/20">
            <span className="text-3xl font-bold block text-primary">
              {String(timeLeft.minutes).padStart(2, "0")}
            </span>
            <span className="text-xs text-muted-foreground">Minutes</span>
          </div>
          <span className="text-2xl font-bold text-primary">:</span>
          <div className="bg-primary/10 rounded-lg p-3 min-w-16 text-center border border-primary/20">
            <span className="text-3xl font-bold block text-primary">
              {String(timeLeft.seconds).padStart(2, "0")}
            </span>
            <span className="text-xs text-muted-foreground">Seconds</span>
          </div>
        </div>
      </div>

      {/* Show voting ended message if time is up */}
      {timeLeft.days === 0 && timeLeft.hours === 0 && timeLeft.minutes === 0 && timeLeft.seconds === 0 ? (
        <div className="flex flex-col items-center justify-center min-h-[60vh] text-center">
          <div className="w-24 h-24 rounded-full bg-primary/10 flex items-center justify-center mb-6">
            <Timer className="h-12 w-12 text-primary" />
          </div>
          <h2 className="text-4xl font-bold mb-4">Voting Period Has Ended</h2>
          <p className="text-xl text-muted-foreground mb-8 max-w-2xl">
            Thank you for your participation! The voting period for this event has concluded.
            Stay tuned for the results and future events.
          </p>
          <div className="flex gap-4">
            <Button
              variant="outline"
              onClick={handleRedirectToMainPage}
              className="border-primary/20 hover:bg-primary/5"
            >
              Return to Home
            </Button>
            <Button
              onClick={handleTryMoreFeatures}
              className="bg-gradient-to-r from-primary to-primary-foreground/20 hover:opacity-90 transition-all"
            >
              Explore More Features <Sparkles className="ml-2 h-4 w-4" />
            </Button>
          </div>
        </div>
      ) : (
        <>
          {/* Image Gallery Section */}
          <div className="w-full animate-fade-in">
            <div className="my-6">
              <p className="text-lg text-center text-muted-foreground mb-2">
                {hasVoted
                  ? "Thank you for voting!"
                  : `Select two of your favorite images (${selectedImages.length}/2 selected)`}
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4 sm:gap-6">
              {MOCK_IMAGES.map((image) => {
                const isSelected = selectedImages.some(
                  (img) => img.id === image.id
                );
                const voteCount = getVoteCount(image.id);
                return (
                  <div
                    key={image.id}
                    className={cn("voting-card group", isSelected && "selected")}
                  >
                    <div className="aspect-[2/3] relative">
                      <img
                        src={image.src}
                        alt={image.alt}
                        className="object-cover w-full h-full rounded-md"
                      />
                      <div
                        className={cn(
                          "absolute inset-0 bg-gradient-to-t from-black to-transparent opacity-70 rounded-md",
                          isSelected
                            ? "bg-gradient-to-t from-primary/80 to-transparent"
                            : ""
                        )}
                      />
                      <div className="absolute inset-x-0 top-0 p-3 bg-gradient-to-b from-black/80 to-transparent rounded-t-md flex justify-between items-start">
                        <h3 className="text-white font-semibold text-sm truncate max-w-[70%]">
                          {image.name}
                        </h3>

                        {/* Vote Count Badge - Always show vote count, even if 0 */}
                        {/* <Badge variant="outline" className="bg-black/50 border-primary text-white flex items-center gap-1">
                          <Award className="h-3 w-3" /> {voteCount}
                        </Badge> */}
                      </div>

                      {/* Bottom Action Buttons */}
                      <div className="absolute bottom-3 right-3 flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setSelectedImage(image)}
                          className="bg-black/50 border-gray-500 hover:bg-black/80 hover:border-primary"
                        >
                          <Maximize className="h-4 w-4" />
                        </Button>
                        {hasVoted ? (
                          <Button
                            variant="outline"
                            size="sm"
                            disabled={true}
                            className={cn(
                              "bg-black/50 border-gray-500",
                              isSelected &&
                              "bg-primary text-primary-foreground border-transparent"
                            )}
                          >
                            {isSelected ? (
                              <>
                                <Check className="mr-1 h-4 w-4" />
                                Voted
                              </>
                            ) : (
                              <>
                                <Vote className="mr-1 h-4 w-4" />
                                Vote
                              </>
                            )}
                          </Button>
                        ) : (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => toggleImageSelection(image)}
                            className={cn(
                              "bg-black/50 border-gray-500 hover:bg-black/80 hover:border-primary",
                              isSelected &&
                              "bg-primary text-primary-foreground border-transparent hover:bg-primary/90 hover:opacity-90"
                            )}
                          >
                            {isSelected ? (
                              <>
                                <Check className="mr-1 h-4 w-4" />
                                Selected
                              </>
                            ) : (
                              <>
                                <Vote className="mr-1 h-4 w-4" />
                                Vote
                              </>
                            )}
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="mt-8 flex justify-center my-[50px] px-[37px] mx-[60px] py-[29px]">
              <Button
                onClick={handleSubmitVote}
                disabled={hasVoted || isSubmitting || selectedImages.length !== 2}
                className={cn(
                  "bg-gradient-to-r from-primary to-primary-foreground/20 hover:opacity-90 transition-all px-8 py-6 text-lg",
                  (hasVoted || selectedImages.length !== 2) && "opacity-50 pointer-events-none"
                )}
              >
                {getSubmitButtonText()}
              </Button>
            </div>
          </div>

          {/* Image Detail Modal */}
          <Dialog
            open={!!selectedImage}
            onOpenChange={(open) => !open && setSelectedImage(null)}
          >
            <DialogContent className="max-w-4xl h-auto">
              {selectedImage && (
                <>
                  <DialogTitle className="text-xl flex items-center justify-between">
                    {selectedImage.name}
                    {/* <Badge className="ml-2 bg-primary">
                      <Award className="h-4 w-4 mr-1" /> {getVoteCount(selectedImage.id)} votes
                    </Badge> */}
                  </DialogTitle>
                  <div className="flex justify-center my-4">
                    <img
                      src={selectedImage.src}
                      alt={selectedImage.alt}
                      className="max-h-[70vh] max-w-full object-contain"
                    />
                  </div>
                  <div className="flex justify-end gap-2 mt-4">
                    <Button
                      variant="outline"
                      onClick={() => setSelectedImage(null)}
                    >
                      Close
                    </Button>
                    {!hasVoted && (
                      <Button
                        onClick={() => {
                          toggleImageSelection(selectedImage);
                          setSelectedImage(null);
                        }}
                        variant={
                          selectedImages.some((img) => img.id === selectedImage.id)
                            ? "destructive"
                            : "default"
                        }
                      >
                        {selectedImages.some((img) => img.id === selectedImage.id)
                          ? "Unselect"
                          : "Select"}
                      </Button>
                    )}
                  </div>
                </>
              )}
            </DialogContent>
          </Dialog>

          {/* Vote Authentication Prompt */}
          <Dialog
            open={showVotePrompt}
            onOpenChange={(open) => !open && setShowVotePrompt(false)}
          >
            <DialogContent className="max-w-md">
              <DialogTitle className="text-xl font-bold">
                Authentication Required
              </DialogTitle>
              <DialogDescription>
                Please login or create an account to submit your vote
              </DialogDescription>
              <div className="flex justify-end gap-2 mt-4">
                <Button variant="outline" onClick={() => setShowVotePrompt(false)}>
                  Cancel
                </Button>
                <Button
                  onClick={() => {
                    setShowVotePrompt(false);
                    setAuthModalOpen(true);
                  }}
                >
                  Continue to Login
                </Button>
              </div>
            </DialogContent>
          </Dialog>

          {/* Auth Modal */}
          <AuthModal
            isOpen={authModalOpen}
            onClose={handleAuthModalClose}
            defaultTab="signin"
            redirectAction={prepareForGoogleSignIn}
          />

          {/* Success Modal */}
          <Dialog
            open={showSuccessModal}
            onOpenChange={(open) => {
              // Only allow programmatic closing, not user-initiated closing
              if (open === false) {
                // Prevent closing by doing nothing
                return;
              }
              setShowSuccessModal(open);
            }}
          >
            <DialogContent
              className="max-w-lg p-0 overflow-hidden"
              onInteractOutside={(e) => e.preventDefault()}
            >
              <div className="relative">
                {/* Top decorative elements */}
                <div className="absolute inset-0 bg-gradient-to-br from-primary/20 via-primary/10 to-transparent pointer-events-none" />
                <div className="absolute top-4 right-4 z-10">
                  {/* Override the close button by placing an element on top of it */}
                  <div className="absolute -right-4 -top-4 w-12 h-12 bg-transparent"></div>
                  <Sparkles className="h-8 w-8 text-primary animate-pulse" />
                </div>
                <div className="absolute top-6 left-6">
                  <Sparkles className="h-6 w-6 text-primary/70 animate-pulse" style={{ animationDelay: "0.5s" }} />
                </div>

                {/* Content */}
                <div className="pt-8 px-6">
                  <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
                    <Award className="h-10 w-10 text-primary" />
                  </div>

                  <DialogTitle className="text-2xl font-bold text-center mb-2">
                    Thank You for Voting!
                  </DialogTitle>

                  <DialogDescription className="text-center px-4 pb-4">
                    <p className="text-lg font-medium text-primary mb-4">Your vote has been successfully recorded!</p>
                    <p className="mb-5">Your contribution helps us identify the best images in our collection. We appreciate your participation in our community.</p>
                  </DialogDescription>
                </div>

                {/* Footer with gradient background */}
                <div className="bg-gradient-to-r from-primary/5 to-primary/10 p-6">
                  <div className="flex flex-col sm:flex-row gap-3 justify-center sm:justify-between">
                    <Button
                      variant="outline"
                      onClick={handleRedirectToMainPage}
                      className="w-full sm:w-auto border-primary/20 hover:bg-primary/5"
                    >
                      Return to Home
                    </Button>
                    <Button
                      onClick={handleTryMoreFeatures}
                      className="w-full sm:w-auto bg-gradient-to-r from-primary to-primary-foreground/20 hover:opacity-90 transition-all"
                    >
                      Try More Features <Sparkles className="ml-2 h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </>
      )}
    </div>
  );
};

export default VotePage;
