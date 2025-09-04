import React, { useState, useRef, useEffect } from "react";
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { Pencil, Trash2, Send, MessageCircle, Reply, X, ChevronLeft, ChevronRight, Download, CheckCircle, XCircle, Heart, Share2, MapPin, MousePointer } from "lucide-react";
import { useUser } from "@/contexts/UserContext";
import {
  addComment,
  updateComment,
  deleteComment,
  getImageComments,
  ImageComment
} from "@/services/commentService";
import { approveImage, unapproveImage } from "@/services/imageService";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { ImageData } from "@/hooks/useProjectImages";
import { cn } from "@/lib/utils";
import ImageMarkingCanvas from "./ImageMarkingCanvas";
import { ImageMark } from "@/integrations/supabase/types";
import * as imageMarkService from "@/services/imageMarkService";

interface ImageDetailViewProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  image: ImageData | null;
  projectId: string; // Add project ID for database operations
  onNextImage?: () => void;
  onPreviousImage?: () => void;
  onDownloadImage?: (imageUrl: string, imageName: string) => void;
  showComments?: boolean;
  showActions?: boolean;
}

const ImageDetailView: React.FC<ImageDetailViewProps> = ({
  open,
  onOpenChange,
  image,
  projectId,
  onNextImage,
  onPreviousImage,
  onDownloadImage,
  showComments = true,
  showActions = true,
}) => {
  const queryClient = useQueryClient();
  const { user, isLoggedIn } = useUser();
  const [newComment, setNewComment] = useState("");
  const [editingComment, setEditingComment] = useState<string | null>(null);
  const [editedContent, setEditedContent] = useState("");
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [isLiked, setIsLiked] = useState(false);
  const [isMarkingMode, setIsMarkingMode] = useState(false);
  const [imageMarks, setImageMarks] = useState<ImageMark[]>([]);
  const [isLoadingMarks, setIsLoadingMarks] = useState(false);
  const commentInputRef = useRef<HTMLTextAreaElement>(null);
  const replyInputRef = useRef<HTMLTextAreaElement>(null);

  // Get comments for the selected image
  const {
    data: commentsData = [],
    isLoading: commentsLoading,
    refetch: refetchComments,
  } = useQuery({
    queryKey: ["imageComments", image?.id],
    queryFn: () => getImageComments(image?.id || ""),
    enabled: !!image?.id,
  });

  // Use API comments directly
  const effectiveComments = commentsData;

  // Group comments into threads based on replies
  const groupedComments = effectiveComments.reduce((acc, comment) => {
    if (!comment.is_reply_to) {
      if (!acc[comment.id]) {
        acc[comment.id] = {
          parent: comment,
          replies: []
        };
      } else {
        acc[comment.id].parent = comment;
      }
    } else {
      if (!acc[comment.is_reply_to]) {
        acc[comment.is_reply_to] = {
          parent: null,
          replies: [comment]
        };
      } else {
        acc[comment.is_reply_to].replies.push(comment);
      }
    }
    return acc;
  }, {} as Record<string, { parent: ImageComment | null, replies: ImageComment[] }>);

  const addCommentMutation = useMutation({
    mutationFn: ({ imageId, content, replyTo }: { imageId: string, content: string, replyTo?: string }) =>
      addComment(imageId, content, undefined, replyTo),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["imageComments", image?.id] });
      setNewComment("");
      setReplyingTo(null);
    }
  });

  const updateCommentMutation = useMutation({
    mutationFn: ({ commentId, content }: { commentId: string, content: string }) =>
      updateComment(commentId, content),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["imageComments", image?.id] });
      setEditingComment(null);
    }
  });

  const deleteCommentMutation = useMutation({
    mutationFn: (commentId: string) => deleteComment(commentId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["imageComments", image?.id] });
    }
  });

  const approveImageMutation = useMutation({
    mutationFn: (imageId: string) => approveImage(imageId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["images"] });
    }
  });

  const unapproveImageMutation = useMutation({
    mutationFn: (imageId: string) => unapproveImage(imageId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["images"] });
    }
  });

  useEffect(() => {
    if (open && image?.id && showComments) {
      const channel = supabase
        .channel('public:image_comments')
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'image_comments',
            filter: `image_id=eq.${image.id}`
          },
          (_) => {
            queryClient.invalidateQueries({ queryKey: ["imageComments", image.id] });
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [open, image?.id, queryClient, showComments]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!open) return;

      if (e.key === 'ArrowLeft' && onPreviousImage) {
        onPreviousImage();
      } else if (e.key === 'ArrowRight' && onNextImage) {
        onNextImage();
      } else if (e.key === 'Escape') {
        onOpenChange(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [open, onOpenChange, onNextImage, onPreviousImage]);

  const handleSubmit = async () => {
    if (!newComment.trim() || !image?.id) return;
    addCommentMutation.mutate({ imageId: image.id, content: newComment });
  };

  const handleReply = async () => {
    if (!newComment.trim() || !image?.id || !replyingTo) return;
    addCommentMutation.mutate({ imageId: image.id, content: newComment, replyTo: replyingTo });
  };

  const handleEdit = (comment: ImageComment) => {
    setEditingComment(comment.id);
    setEditedContent(comment.content);
  };

  const handleUpdate = async () => {
    if (!editingComment || !editedContent.trim()) return;
    updateCommentMutation.mutate({ commentId: editingComment, content: editedContent });
  };

  const handleDelete = async (commentId: string) => {
    if (confirm("Are you sure you want to delete this comment?")) {
      deleteCommentMutation.mutate(commentId);
    }
  };

  const handleApprove = async () => {
    if (!image?.id) return;
    approveImageMutation.mutate(image.id);
  };

  const handleUnapprove = async () => {
    if (!image?.id) return;
    unapproveImageMutation.mutate(image.id);
  };

  const handleAddMark = async (mark: Omit<ImageMark, 'id' | 'timestamp'>) => {
    if (image && user) {
      try {
        setIsLoadingMarks(true);
        const savedMark = await imageMarkService.addImageMark(
          image.id,
          projectId,
          mark,
          user.id,
          user.name || user.email || 'Unknown User'
        );
        if (savedMark) {
          setImageMarks(prev => [...prev, savedMark]);
          toast.success("Mark added successfully!");
        }
      } catch (error) {
        console.error('Error adding mark:', error);
        toast.error("Failed to add mark");
      } finally {
        setIsLoadingMarks(false);
      }
    }
  };

  const handleUpdateMark = async (markId: string, updates: Partial<ImageMark>) => {
    try {
      setIsLoadingMarks(true);
      const updatedMark = await imageMarkService.updateImageMark(markId, updates);
      if (updatedMark) {
        const updatedMarks = imageMarks.map(mark =>
          mark.id === markId ? updatedMark : mark
        );
        setImageMarks(updatedMarks);
        toast.success("Mark updated successfully!");
      }
    } catch (error) {
      console.error('Error updating mark:', error);
      toast.error("Failed to update mark");
    } finally {
      setIsLoadingMarks(false);
    }
  };

  const handleDeleteMark = async (markId: string) => {
    try {
      setIsLoadingMarks(true);
      const success = await imageMarkService.deleteImageMark(markId);
      if (success) {
        const filteredMarks = imageMarks.filter(mark => mark.id !== markId);
        setImageMarks(filteredMarks);
        toast.success("Mark deleted successfully!");
      }
    } catch (error) {
      console.error('Error deleting mark:', error);
      toast.error("Failed to delete mark");
    } finally {
      setIsLoadingMarks(false);
    }
  };

  const toggleMarkingMode = () => {
    setIsMarkingMode(!isMarkingMode);
  };

  // Load existing marks when image changes and subscribe to real-time updates
  useEffect(() => {
    if (image?.id) {
      const loadMarks = async () => {
        setIsLoadingMarks(true);
        try {
          const existingMarks = await imageMarkService.getImageMarks(image.id);
          setImageMarks(existingMarks);
        } catch (error) {
          console.error('Error loading marks:', error);
          toast.error("Failed to load annotations");
        } finally {
          setIsLoadingMarks(false);
        }
      };
      loadMarks();

      // Subscribe to real-time updates
      const subscription = imageMarkService.subscribeToImageMarks(image.id, (updatedMarks) => {
        setImageMarks(updatedMarks);
      });

      // Cleanup subscription on unmount or image change
      return () => {
        subscription.unsubscribe();
      };
    }
  }, [image?.id]);



  function formatDate(dateString: string) {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat("en-US", {
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "numeric",
    }).format(date);
  }

  const isOwnComment = (userId: string) => {
    return isLoggedIn && user?.id === userId;
  };

  if (!image) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[98vw] lg:max-w-[95vw] h-[95vh] p-0 overflow-hidden bg-black/95 backdrop-blur-xl border-0">
        <DialogTitle className="sr-only">Image Detail View</DialogTitle>
        <DialogDescription className="sr-only">View and interact with image details, comments, and marks</DialogDescription>
        <div className={cn(
          "grid h-full transition-all duration-500 ease-out",
          showComments
            ? "grid-cols-1 md:grid-cols-[1fr,400px] lg:grid-cols-[1fr,450px]"
            : "grid-cols-1"
        )}>

          {/* Enhanced Image Section */}
          <div className="relative bg-gradient-to-br from-black via-gray-900 to-black overflow-hidden flex items-center justify-center h-full group">
            {/* Background Pattern */}
            <div className="absolute inset-0 opacity-20">
              <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(circle_at_50%_50%,rgba(22,173,124,0.1),transparent_50%)]"></div>
            </div>

            {isMarkingMode ? (
              <ImageMarkingCanvas
                imageUrl={image.url}
                imageName={image.name}
                marks={imageMarks}
                onAddMark={handleAddMark}
                onUpdateMark={handleUpdateMark}
                onDeleteMark={handleDeleteMark}
                isMarkingMode={isMarkingMode}
                onToggleMarkingMode={toggleMarkingMode}
                isLoadingMarks={isLoadingMarks}
              />
            ) : (
              <img
                src={image.url}
                alt={image.name}
                className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-[1.02]"
              />
            )}

            {/* Enhanced Navigation Arrows */}
            {onPreviousImage && (
              <Button
                variant="ghost"
                size="icon"
                className="absolute left-4 top-1/2 -translate-y-1/2 bg-black/40 hover:bg-black/60 text-white hover:text-[#16ad7c] border border-white/20 hover:border-[#16ad7c]/40 transition-all duration-300 rounded-full h-12 w-12 backdrop-blur-sm"
                onClick={onPreviousImage}
              >
                <ChevronLeft className="h-6 w-6" />
              </Button>
            )}

            {onNextImage && (
              <Button
                variant="ghost"
                size="icon"
                className="absolute right-4 top-1/2 -translate-y-1/2 bg-black/40 hover:bg-black/60 text-white hover:text-[#16ad7c] border border-white/20 hover:border-[#16ad7c]/40 transition-all duration-300 rounded-full h-12 w-12 backdrop-blur-sm"
                onClick={onNextImage}
              >
                <ChevronRight className="h-6 w-6" />
              </Button>
            )}

            {/* Enhanced Action Buttons */}
            {showActions && (
              <div className="absolute top-6 right-6 flex gap-3">
                {/* Like Button */}
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setIsLiked(!isLiked)}
                  className={cn(
                    "bg-black/40 hover:bg-black/60 border border-white/20 hover:border-red-500/40 text-white hover:text-red-500 rounded-full h-10 w-10 backdrop-blur-sm transition-all duration-300",
                    isLiked && "bg-red-500/20 border-red-500/40 text-red-500"
                  )}
                >
                  <Heart className={cn("h-5 w-5", isLiked && "fill-current")} />
                </Button>

                {/* Share Button */}
                <Button
                  variant="ghost"
                  size="icon"
                  className="bg-black/40 hover:bg-black/60 border border-white/20 hover:border-[#16ad7c]/40 text-white hover:text-[#16ad7c] rounded-full h-10 w-10 backdrop-blur-sm transition-all duration-300"
                >
                  <Share2 className="h-5 w-5" />
                </Button>

                {/* Marking Mode Button */}
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={toggleMarkingMode}
                  className={cn(
                    "bg-black/40 hover:bg-black/60 border border-white/20 hover:border-[#16ad7c]/40 text-white hover:text-[#16ad7c] rounded-full h-10 w-10 backdrop-blur-sm transition-all duration-300",
                    isMarkingMode && "bg-[#16ad7c]/20 border-[#16ad7c]/40 text-[#16ad7c]"
                  )}
                >
                  <MousePointer className="h-5 w-5" />
                </Button>

                {/* Demo Marks Button - Remove this in production */}
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => {
                    const demoMarks: ImageMark[] = [
                      {
                        id: 'demo1',
                        type: 'circle',
                        x: 100,
                        y: 100,
                        radius: 50,
                        color: 'blue',
                        comment: 'This is a demo circle mark',
                        author: 'Demo User',
                        timestamp: new Date().toISOString()
                      },
                      {
                        id: 'demo2',
                        type: 'rectangle',
                        x: 200,
                        y: 150,
                        width: 80,
                        height: 60,
                        color: 'green',
                        comment: 'This is a demo rectangle mark',
                        author: 'Demo User',
                        timestamp: new Date().toISOString()
                      },
                      {
                        id: 'demo3',
                        type: 'point',
                        x: 300,
                        y: 200,
                        color: 'red',
                        comment: 'This is a demo point mark',
                        author: 'Demo User',
                        timestamp: new Date().toISOString()
                      }
                    ];
                    setImageMarks(demoMarks);
                    // Note: Demo marks are not saved to database - they're just for UI testing
                    toast.success("Demo marks added!");
                  }}
                  className="bg-black/40 hover:bg-black/60 border border-white/20 hover:border-purple-500/40 text-white hover:text-purple-500 rounded-full h-10 w-10 backdrop-blur-sm transition-all duration-300"
                  title="Add Demo Marks"
                >
                  <MapPin className="h-5 w-5" />
                </Button>

                {/* Approval Button */}
                {isLoggedIn && !image.is_approved && (
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={handleApprove}
                    disabled={approveImageMutation.isPending}
                    className="bg-black/40 hover:bg-black/60 border border-white/20 hover:border-green-500/40 text-white hover:text-green-500 rounded-full h-10 w-10 backdrop-blur-sm transition-all duration-300"
                  >
                    <CheckCircle className="h-5 w-5" />
                  </Button>
                )}

                {/* Unapprove Button */}
                {isLoggedIn && image.is_approved && (
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={handleUnapprove}
                    disabled={unapproveImageMutation.isPending}
                    className="bg-green-500/20 hover:bg-green-500/40 border border-green-500/40 text-green-500 rounded-full h-10 w-10 backdrop-blur-sm transition-all duration-300"
                  >
                    <XCircle className="h-5 w-5" />
                  </Button>
                )}

                {/* Download Button */}
                {onDownloadImage && (
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => onDownloadImage(image.url, image.name)}
                    className="bg-black/40 hover:bg-black/60 border border-white/20 hover:border-[#16ad7c]/40 text-white hover:text-[#16ad7c] rounded-full h-10 w-10 backdrop-blur-sm transition-all duration-300"
                  >
                    <Download className="h-5 w-5" />
                  </Button>
                )}
              </div>
            )}




          </div>

          {/* Enhanced Comments Section */}
          {showComments && (
            <div
              className="fixed inset-0 z-50 bg-gradient-to-br from-[#0f0f0f] via-[#1a1a1a] to-[#0f0f0f] flex flex-col border-l border-[#333]/50 transition-all duration-500 ease-out md:static md:z-auto md:h-full"
            >
              {/* Enhanced Header */}
              <div className="p-6 border-b border-[#333]/50 flex-shrink-0 bg-gradient-to-r from-[#1a1a1a] to-[#151515]">
                {/* Header Row 1: Title and Controls */}
                <div className="flex items-center justify-between mb-4">
                  <div className="flex flex-col gap-3">
                    <div>
                      <h2 className="text-xl font-bold text-white mb-1">{image.name}</h2>
                      <p className="text-sm text-gray-400">Image details and discussion</p>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-gradient-to-br from-[#16ad7c] to-[#5ce1e6] rounded-lg flex items-center justify-center">
                        <MessageCircle className="h-4 w-4 text-black" />
                      </div>
                      <div>
                        <h3 className="text-lg font-semibold text-white">Comments</h3>
                        <div className="flex items-center gap-2">
                          {effectiveComments.length > 0 && (
                            <span className="text-xs text-gray-400">{effectiveComments.length} comment{effectiveComments.length !== 1 ? 's' : ''}</span>
                          )}
                          {imageMarks.length > 0 && (
                            <>
                              <span className="text-xs text-gray-400">•</span>
                              <div className="flex items-center gap-1">
                                <MapPin className="h-3 w-3 text-[#11ffb4]" />
                                <span className="text-xs text-[#11ffb4]">{imageMarks.length} mark{imageMarks.length !== 1 ? 's' : ''}</span>
                              </div>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>


                </div>

                {/* Header Row 2: Approval Status and Mobile Close */}
                <div className="flex items-center justify-between">
                  {/* Approval Status */}
                  {image.is_approved && (
                    <div className="flex items-center gap-2 px-3 py-2 bg-green-500/20 border border-green-500/30 text-green-400 rounded-xl text-sm">
                      <CheckCircle className="h-4 w-4" />
                      Approved
                    </div>
                  )}


                </div>
              </div>

              {/* Enhanced Comments Content */}
              <ScrollArea className="flex-1 p-6">
                {commentsLoading ? (
                  <div className="flex flex-col items-center justify-center py-12">
                    <div className="w-16 h-16 border-4 border-[#16ad7c]/20 border-t-[#16ad7c] rounded-full animate-spin mb-4"></div>
                    <p className="text-gray-400 text-lg">Loading comments...</p>
                  </div>
                ) : effectiveComments.length === 0 ? (
                  <div className="text-center py-12">
                    <div className="w-20 h-20 bg-gradient-to-br from-[#16ad7c]/20 to-[#5ce1e6]/20 rounded-full flex items-center justify-center mx-auto mb-4">
                      <MessageCircle className="h-10 w-10 text-[#16ad7c]" />
                    </div>
                    <h4 className="text-lg font-semibold text-white mb-2">No comments yet</h4>
                    <p className="text-gray-400">Be the first to comment on this image</p>
                  </div>
                ) : (
                  <div className="space-y-6">
                    {Object.values(groupedComments).map(thread => (
                      thread.parent && (
                        <div key={thread.parent.id} className="comment-thread">
                          <div className="bg-gradient-to-br from-[#1a1a1a] to-[#151515] rounded-2xl p-4 border border-[#333]/30 hover:border-[#16ad7c]/20 transition-all duration-300">
                            <div className="flex items-start gap-4">
                              <Avatar className="h-10 w-10 flex-shrink-0 border-2 border-[#16ad7c]/30">
                                <AvatarImage src={thread.parent.author_avatar} />
                                <AvatarFallback className="bg-gradient-to-br from-[#16ad7c] to-[#5ce1e6] text-black font-semibold">
                                  {thread.parent.author_name?.charAt(0) || '?'}
                                </AvatarFallback>
                              </Avatar>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center justify-between mb-2">
                                  <div className="flex items-center gap-2">
                                    <span className="font-semibold text-white text-sm">
                                      {thread.parent.author_name}
                                    </span>
                                    <span className="text-gray-400 text-xs">
                                      {formatDate(thread.parent.created_at)}
                                    </span>
                                  </div>
                                  {isOwnComment(thread.parent.user_id) && (
                                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        className="h-7 w-7 p-0 text-gray-400 hover:text-white hover:bg-[#333]/50 rounded-lg"
                                        onClick={() => handleEdit(thread.parent!)}
                                      >
                                        <Pencil className="h-3.5 w-3.5" />
                                      </Button>
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        className="h-7 w-7 p-0 text-gray-400 hover:text-red-400 hover:bg-red-500/20 rounded-lg"
                                        onClick={() => handleDelete(thread.parent!.id)}
                                      >
                                        <Trash2 className="h-3.5 w-3.5" />
                                      </Button>
                                    </div>
                                  )}
                                </div>

                                {editingComment === thread.parent.id ? (
                                  <div className="space-y-3">
                                    <Textarea
                                      value={editedContent}
                                      onChange={(e) => setEditedContent(e.target.value)}
                                      className="bg-[#292929] border-[#444] text-white min-h-[80px] resize-none focus:border-[#16ad7c] transition-colors"
                                      placeholder="Edit your comment..."
                                    />
                                    <div className="flex justify-end gap-2">
                                      <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => setEditingComment(null)}
                                        className="border-[#444] text-gray-400 hover:bg-[#333] hover:text-white"
                                      >
                                        Cancel
                                      </Button>
                                      <Button
                                        size="sm"
                                        onClick={handleUpdate}
                                        className="bg-gradient-to-r from-[#16ad7c] to-[#5ce1e6] text-black font-semibold hover:from-[#5ce1e6] hover:to-[#16ad7c]"
                                      >
                                        Save
                                      </Button>
                                    </div>
                                  </div>
                                ) : (
                                  <>
                                    <p className="text-gray-200 text-sm leading-relaxed mb-3">
                                      {thread.parent.content}
                                    </p>
                                    {!replyingTo && isLoggedIn && (
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => setReplyingTo(thread.parent!.id)}
                                        className="text-[#16ad7c] hover:text-[#5ce1e6] hover:bg-[#16ad7c]/10 px-3 py-1 rounded-lg transition-all duration-300"
                                      >
                                        <Reply className="h-3.5 w-3.5 mr-1" />
                                        Reply
                                      </Button>
                                    )}
                                  </>
                                )}
                              </div>
                            </div>

                            {/* Replies */}
                            {thread.replies.length > 0 && (
                              <div className="mt-4 ml-14 space-y-3">
                                <Separator className="bg-[#333]/50" />
                                {thread.replies.map(reply => (
                                  <div key={reply.id} className="flex items-start gap-3 group">
                                    <Avatar className="h-8 w-8 flex-shrink-0 border border-[#333]">
                                      <AvatarImage src={reply.author_avatar} />
                                      <AvatarFallback className="bg-[#333] text-[#16ad7c] text-xs">
                                        {reply.author_name?.charAt(0) || '?'}
                                      </AvatarFallback>
                                    </Avatar>
                                    <div className="flex-1 min-w-0">
                                      <div className="flex items-center justify-between mb-1">
                                        <div className="flex items-center gap-2">
                                          <span className="font-medium text-white text-xs">
                                            {reply.author_name}
                                          </span>
                                          <span className="text-gray-500 text-xs">
                                            {formatDate(reply.created_at)}
                                          </span>
                                        </div>
                                        {isOwnComment(reply.user_id) && (
                                          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                            <Button
                                              variant="ghost"
                                              size="sm"
                                              className="h-6 w-6 p-0 text-gray-400 hover:text-white hover:bg-[#333]/50 rounded"
                                              onClick={() => handleEdit(reply)}
                                            >
                                              <Pencil className="h-3 w-3" />
                                            </Button>
                                            <Button
                                              variant="ghost"
                                              size="sm"
                                              className="h-6 w-6 p-0 text-gray-400 hover:text-red-400 hover:bg-red-500/20 rounded"
                                              onClick={() => handleDelete(reply.id)}
                                            >
                                              <Trash2 className="h-3 w-3" />
                                            </Button>
                                          </div>
                                        )}
                                      </div>
                                      <p className="text-gray-300 text-xs leading-relaxed">
                                        {reply.content}
                                      </p>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        </div>
                      )
                    ))}
                  </div>
                )}
              </ScrollArea>

              {/* Enhanced Comment Input */}
              {isLoggedIn && (
                <div className="p-6 border-t border-[#333]/50 bg-gradient-to-r from-[#1a1a1a] to-[#151515]">
                  {replyingTo ? (
                    <div className="mb-3 p-3 bg-[#16ad7c]/10 border border-[#16ad7c]/20 rounded-lg">
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-[#16ad7c]">Replying to comment</span>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setReplyingTo(null)}
                          className="h-6 w-6 p-0 text-[#16ad7c] hover:text-[#5ce1e6] hover:bg-[#16ad7c]/20"
                        >
                          <X className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  ) : null}

                  <div className="flex gap-3">
                    <Textarea
                      ref={commentInputRef}
                      value={newComment}
                      onChange={(e) => setNewComment(e.target.value)}
                      placeholder={replyingTo ? "Write your reply..." : "Add a comment..."}
                      className="flex-1 bg-[#292929] border-[#444] text-white placeholder:text-gray-500 resize-none focus:border-[#16ad7c] transition-colors min-h-[60px]"
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && !e.shiftKey) {
                          e.preventDefault();
                          if (replyingTo) {
                            handleReply();
                          } else {
                            handleSubmit();
                          }
                        }
                      }}
                    />
                    <Button
                      onClick={replyingTo ? handleReply : handleSubmit}
                      disabled={!newComment.trim() || addCommentMutation.isPending}
                      className="bg-gradient-to-r from-[#16ad7c] to-[#5ce1e6] hover:from-[#5ce1e6] hover:to-[#16ad7c] text-black font-semibold px-4 py-2 rounded-xl transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {addCommentMutation.isPending ? (
                        <div className="w-4 h-4 border-2 border-black/30 border-t-black rounded-full animate-spin" />
                      ) : (
                        <Send className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ImageDetailView;
