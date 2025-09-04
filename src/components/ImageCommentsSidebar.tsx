import React, { useState, useEffect, useRef } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Pencil, Trash2, Send, MessageCircle, Reply } from "lucide-react";
import { useUser } from "@/contexts/UserContext";
import {
  addComment,
  updateComment,
  deleteComment,
  getImageComments,
  ImageComment
} from "@/services/commentService";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

interface ImageCommentsSidebarProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  imageName?: string;
  imageId?: string;
}

const ImageCommentsSidebar: React.FC<ImageCommentsSidebarProps> = ({
  open,
  onOpenChange,
  imageName,
  imageId,
}) => {
  const queryClient = useQueryClient();
  const { user, isLoggedIn } = useUser();
  const [newComment, setNewComment] = useState("");
  const [editingComment, setEditingComment] = useState<string | null>(null);
  const [editedContent, setEditedContent] = useState("");
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [comments, setComments] = useState<ImageComment[]>([]);
  const commentInputRef = useRef<HTMLTextAreaElement>(null);
  const replyInputRef = useRef<HTMLTextAreaElement>(null);

  const { data: commentsData = [], isLoading } = useQuery({
    queryKey: ["comments", imageId],
    queryFn: () => getImageComments(imageId || ""),
    enabled: !!imageId && open,
  });

  const addCommentMutation = useMutation({
    mutationFn: ({ imageId, content, replyTo }: { imageId: string, content: string, replyTo?: string }) =>
      addComment(imageId, content, undefined, replyTo),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["comments", imageId] });
      setNewComment("");
      setReplyingTo(null);
    }
  });

  const updateCommentMutation = useMutation({
    mutationFn: ({ commentId, content }: { commentId: string, content: string }) =>
      updateComment(commentId, content),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["comments", imageId] });
      setEditingComment(null);
    }
  });

  const deleteCommentMutation = useMutation({
    mutationFn: (commentId: string) => deleteComment(commentId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["comments", imageId] });
    }
  });

  useEffect(() => {
    if (open && imageId) {
      // Set up real-time subscription for new comments
      const channel = supabase
        .channel('public:image_comments')
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'image_comments',
            filter: `image_id=eq.${imageId}`
          },
          (_) => {
            // Invalidate the query cache when we receive real-time updates
            queryClient.invalidateQueries({ queryKey: ["comments", imageId] });
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [open, imageId, queryClient]);

  const handleSubmit = async () => {
    if (!newComment.trim() || !imageId) return;
    addCommentMutation.mutate({ imageId, content: newComment });
  };

  const handleReply = async () => {
    if (!newComment.trim() || !imageId || !replyingTo) return;
    addCommentMutation.mutate({ imageId, content: newComment, replyTo: replyingTo });
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
    deleteCommentMutation.mutate(commentId);
  };

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

  // Group comments into threads based on replies
  const groupedComments = commentsData.reduce((acc, comment) => {
    if (!comment.is_reply_to) {
      // This is a parent comment
      if (!acc[comment.id]) {
        acc[comment.id] = {
          parent: comment,
          replies: []
        };
      } else {
        acc[comment.id].parent = comment;
      }
    } else {
      // This is a reply
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

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-md md:max-w-lg bg-[#1E1E1E] border-[#333] text-white">
        <SheetHeader>
          <SheetTitle className="text-white flex items-center">
            <MessageCircle className="h-5 w-5 mr-2 text-[#16ad7c]" />
            {imageName ? `Comments on ${imageName}` : "Comments"}
          </SheetTitle>
        </SheetHeader>
        <div className="mt-6 flex flex-col h-[calc(100vh-140px)]">
          <ScrollArea className="flex-1 pr-4">
            {isLoading ? (
              <div className="flex justify-center items-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#16ad7c]"></div>
              </div>
            ) : commentsData.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <MessageCircle className="h-10 w-10 mx-auto mb-2 opacity-30" />
                <p>No comments yet</p>
                <p className="text-sm">Be the first to comment on this image</p>
              </div>
            ) : (
              <div className="space-y-8">
                {Object.values(groupedComments).map(thread => (
                  thread.parent && (
                    <div key={thread.parent.id} className="comment-thread">
                      <div className="flex items-start gap-3 group">
                        <Avatar className="h-8 w-8">
                          <AvatarImage src={thread.parent.author_avatar} />
                          <AvatarFallback className="bg-[#16ad7c]/30 text-[#16ad7c]">
                            {thread.parent.author_name?.charAt(0) || '?'}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1">
                          <div className="flex justify-between">
                            <div>
                              <span className="font-medium text-sm">
                                {thread.parent.author_name}
                              </span>
                              <span className="text-muted-foreground text-xs ml-2">
                                {formatDate(thread.parent.created_at)}
                              </span>
                            </div>
                            {isOwnComment(thread.parent.user_id) && (
                              <div className="space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-7 w-7 p-0 text-muted-foreground hover:text-white"
                                  onClick={() => handleEdit(thread.parent!)}
                                >
                                  <Pencil className="h-3.5 w-3.5" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-7 w-7 p-0 text-muted-foreground hover:text-red-500"
                                  onClick={() => handleDelete(thread.parent!.id)}
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                </Button>
                              </div>
                            )}
                          </div>

                          {editingComment === thread.parent.id ? (
                            <div className="mt-1">
                              <Textarea
                                value={editedContent}
                                onChange={(e) => setEditedContent(e.target.value)}
                                className="bg-[#292929] border-[#444] min-h-[60px]"
                              />
                              <div className="flex justify-end mt-2 space-x-2">
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="h-8 border-[#444] text-muted-foreground hover:bg-[#333]"
                                  onClick={() => setEditingComment(null)}
                                >
                                  Cancel
                                </Button>
                                <Button
                                  size="sm"
                                  className="h-8 bg-[#16ad7c] hover:bg-[#16ad7c]/80 text-black"
                                  onClick={handleUpdate}
                                >
                                  Save
                                </Button>
                              </div>
                            </div>
                          ) : (
                            <>
                              <p className="mt-1 text-sm leading-relaxed break-words">
                                {thread.parent.content}
                              </p>

                              {!replyingTo && isLoggedIn && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-7 mt-1 px-2 text-xs text-muted-foreground hover:text-white hover:bg-[#333]"
                                  onClick={() => setReplyingTo(thread.parent!.id)}
                                >
                                  <Reply className="h-3 w-3 mr-1" />
                                  Reply
                                </Button>
                              )}
                            </>
                          )}
                        </div>
                      </div>

                      {/* Replies */}
                      {thread.replies.length > 0 && (
                        <div className="ml-10 mt-3 space-y-4 border-l border-[#333] pl-4">
                          {thread.replies.map(reply => (
                            <div key={reply.id} className="flex items-start gap-3 group">
                              <Avatar className="h-7 w-7">
                                <AvatarImage src={reply.author_avatar} />
                                <AvatarFallback className="bg-[#333] text-[#16ad7c]">
                                  {reply.author_name?.charAt(0) || '?'}
                                </AvatarFallback>
                              </Avatar>
                              <div className="flex-1">
                                <div className="flex justify-between">
                                  <div>
                                    <span className="font-medium text-xs">
                                      {reply.author_name}
                                    </span>
                                    <span className="text-muted-foreground text-xs ml-2">
                                      {formatDate(reply.created_at)}
                                    </span>
                                  </div>
                                  {isOwnComment(reply.user_id) && (
                                    <div className="space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        className="h-6 w-6 p-0 text-muted-foreground hover:text-white"
                                        onClick={() => handleEdit(reply)}
                                      >
                                        <Pencil className="h-3 w-3" />
                                      </Button>
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        className="h-6 w-6 p-0 text-muted-foreground hover:text-red-500"
                                        onClick={() => handleDelete(reply.id)}
                                      >
                                        <Trash2 className="h-3 w-3" />
                                      </Button>
                                    </div>
                                  )}
                                </div>

                                {editingComment === reply.id ? (
                                  <div className="mt-1">
                                    <Textarea
                                      value={editedContent}
                                      onChange={(e) => setEditedContent(e.target.value)}
                                      className="bg-[#292929] border-[#444] min-h-[60px]"
                                    />
                                    <div className="flex justify-end mt-2 space-x-2">
                                      <Button
                                        variant="outline"
                                        size="sm"
                                        className="h-7 border-[#444] text-muted-foreground hover:bg-[#333]"
                                        onClick={() => setEditingComment(null)}
                                      >
                                        Cancel
                                      </Button>
                                      <Button
                                        size="sm"
                                        className="h-7 bg-[#16ad7c] hover:bg-[#16ad7c]/80 text-black"
                                        onClick={handleUpdate}
                                      >
                                        Save
                                      </Button>
                                    </div>
                                  </div>
                                ) : (
                                  <p className="mt-0.5 text-xs leading-relaxed break-words">
                                    {reply.content}
                                  </p>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Reply input field */}
                      {replyingTo === thread.parent.id && (
                        <div className="ml-10 mt-3 pl-4 border-l border-[#333]">
                          <div className="flex items-start gap-2">
                            <Avatar className="h-7 w-7 mt-1">
                              <AvatarImage src={user?.profile?.avatar_url} />
                              <AvatarFallback className="bg-[#16ad7c]/30 text-[#16ad7c]">
                                {user?.profile?.first_name?.charAt(0) || 'U'}
                              </AvatarFallback>
                            </Avatar>
                            <div className="flex-1">
                              <Textarea
                                ref={replyInputRef}
                                placeholder="Write a reply..."
                                value={newComment}
                                onChange={(e) => setNewComment(e.target.value)}
                                className="bg-[#292929] border-[#444] min-h-[60px] text-sm"
                              />
                              <div className="flex justify-end mt-2 space-x-2">
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="h-8 border-[#444] text-muted-foreground hover:bg-[#333]"
                                  onClick={() => setReplyingTo(null)}
                                >
                                  Cancel
                                </Button>
                                <Button
                                  size="sm"
                                  className="h-8 bg-[#16ad7c] hover:bg-[#16ad7c]/80 text-black"
                                  disabled={!newComment.trim()}
                                  onClick={handleReply}
                                >
                                  <Reply className="h-3.5 w-3.5 mr-1" />
                                  Reply
                                </Button>
                              </div>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  )
                ))}
              </div>
            )}
          </ScrollArea>

          <Separator className="my-4 bg-[#333]" />

          {!isLoggedIn ? (
            <div className="text-center p-4 bg-[#292929] rounded-md">
              <p className="text-sm text-muted-foreground">
                You need to be logged in to comment
              </p>
            </div>
          ) : replyingTo ? null : (
            <div className="flex items-start gap-2">
              <Avatar className="h-9 w-9 mt-1">
                <AvatarImage src={user?.profile?.avatar_url} />
                <AvatarFallback className="bg-[#16ad7c]/30 text-[#16ad7c]">
                  {user?.profile?.first_name?.charAt(0) || 'U'}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1">
                <Textarea
                  ref={commentInputRef}
                  placeholder="Add a comment..."
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  className="bg-[#292929] border-[#444] min-h-[80px]"
                />
                <div className="flex justify-end mt-2">
                  <Button
                    className="bg-[#16ad7c] hover:bg-[#16ad7c]/80 text-black"
                    disabled={!newComment.trim()}
                    onClick={handleSubmit}
                  >
                    <Send className="h-4 w-4 mr-2" />
                    Comment
                  </Button>
                </div>
              </div>
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
};

export default ImageCommentsSidebar;
