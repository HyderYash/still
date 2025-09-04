
import { useState, useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  getImages,
  uploadImage,
  deleteImage,
  downloadImage,
  downloadAllImages,
  MarkerInfo,
  ImageMetadata,
} from "@/services/imageService";
import { useUser } from "@/contexts/UserContext";

export type ImageData = {
  id: string;
  url: string;
  name: string;
  blob?: string;
  comments?: Comment[];
  marker?: MarkerInfo;
  has_comments: boolean;
  is_approved?: boolean;
  approved_by?: string | null;
};

export type Comment = {
  id: string;
  author: string;
  timestamp: string;
  content: string;
  timeMarker?: string;
};

interface UseProjectImagesProps {
  projectId: string | undefined;
  currentFolderId: string | null;
  isLoggedIn: boolean;
  openAuthModal: (redirectAction?: () => void) => void;
  projectVisibility?: string;
}

export const useProjectImages = ({
  projectId,
  currentFolderId,
  isLoggedIn,
  openAuthModal,
  projectVisibility,
}: UseProjectImagesProps) => {
  const queryClient = useQueryClient();
  const [selectedImage, setSelectedImage] = useState<ImageData | null>(null);
  const [isCommentsSidebarOpen, setIsCommentsSidebarOpen] = useState(false);
  const { user } = useUser();

  // Use react-query to fetch images
  const { data: fetchedImages = [], isLoading: imagesLoading } = useQuery({
    queryKey: ["images", projectId, currentFolderId],
    queryFn: () => getImages(projectId || "", currentFolderId),
    enabled: !!projectId,
  });

  // Process images to add metadata and handle loading states
  const processedImages = useMemo(() => {
    if (!fetchedImages || fetchedImages.length === 0) {
      return [];
    }

    return fetchedImages.map((image) => ({
      id: image.id,
      url: image.url || "",
      name: image.file_name,
      has_comments: image.has_comments || false,
      is_approved: image.is_approved || false,
      approved_by: image.approved_by || null,
      isLoading: false,
      error: null,
    }));
  }, [fetchedImages]);

  const handleAddMultipleImages = async (files: File[]) => {
    if (!isLoggedIn && projectVisibility !== "public") {
      openAuthModal(() => handleAddMultipleImages(files));
      return;
    }

    if (!projectId) return;

    // Upload images in parallel
    const uploadPromises = files.map((file) =>
      uploadImage(file, projectId, currentFolderId)
    );

    try {
      await Promise.all(uploadPromises);
      // Refresh the images from the server
      queryClient.invalidateQueries({
        queryKey: ["images", projectId, currentFolderId],
      });
    } catch (error) {
      console.error("Error adding images:", error);
      toast.error("Failed to add some images.");
    }
  };

  const handleAddImage = async (file: File) => {
    if (!isLoggedIn && projectVisibility !== "public") {
      openAuthModal(() => handleAddImage(file));
      return;
    }

    if (!projectId) return;

    try {
      // Upload image using our service
      const uploadedImage = await uploadImage(file, projectId, currentFolderId);

      if (!uploadedImage) {
        return;
      }

      // Refresh the images from the server
      queryClient.invalidateQueries({
        queryKey: ["images", projectId, currentFolderId],
      });
    } catch (error) {
      console.error("Error adding image:", error);
      toast.error("Failed to add image.");
    }
  };

  const handleDeleteImage = async (imageId: string) => {
    if (!isLoggedIn && projectVisibility !== "public") {
      openAuthModal(() => handleDeleteImage(imageId));
      return;
    }

    try {
      // Delete image from storage and database
      const success = await deleteImage(imageId);

      if (!success) {
        return;
      }

      // Refresh the images from the server
      if (projectId) {
        queryClient.invalidateQueries({
          queryKey: ["images", projectId, currentFolderId],
        });
      }
    } catch (error) {
      console.error("Error deleting image:", error);
      toast.error("Failed to delete image");
    }
  };

  const handleDownloadImage = async (imageUrl: string, imageName: string) => {
    if (!isLoggedIn && projectVisibility !== "public") {
      openAuthModal(() => handleDownloadImage(imageUrl, imageName));
      return;
    }

    try {
      // Extract s3Key from the imageUrl
      const s3Key = imageUrl.split('/').slice(3).join('/').split('?')[0];
      await downloadImage(s3Key, imageName);
      toast.success(`Downloading ${imageName}`);
    } catch (error) {
      console.error('Error downloading image:', error);
      toast.error('Failed to download image');
    }
  };

  const handleDownloadAllImages = async (folderName?: string) => {
    if (!isLoggedIn && projectVisibility !== "public") {
      openAuthModal(() => handleDownloadAllImages(folderName));
      return;
    }

    try {
      await downloadAllImages(processedImages, folderName || `images-${Date.now()}`);
    } catch (error) {
      console.error('Error downloading all images:', error);
      toast.error('Failed to download all images');
    }
  };

  const handleImageClick = (image: ImageData) => {
    if (!isLoggedIn && projectVisibility !== "public") {
      openAuthModal(() => {
        setSelectedImage(image);
        setIsCommentsSidebarOpen(true);
      });
      return;
    }

    setSelectedImage(image);
    setIsCommentsSidebarOpen(true);
  };

  const navigateToNextImage = () => {
    if (!selectedImage || !processedImages.length) return;

    const currentIndex = processedImages.findIndex(img => img.id === selectedImage.id);
    if (currentIndex === -1) return;

    const nextIndex = (currentIndex + 1) % processedImages.length;
    setSelectedImage(processedImages[nextIndex]);
  };

  const navigateToPreviousImage = () => {
    if (!selectedImage || !processedImages.length) return;

    const currentIndex = processedImages.findIndex(img => img.id === selectedImage.id);
    if (currentIndex === -1) return;

    const prevIndex = (currentIndex - 1 + processedImages.length) % processedImages.length;
    setSelectedImage(processedImages[prevIndex]);
  };

  const handleUpdateMarker = (
    imageId: string,
    marker: MarkerInfo | undefined
  ) => {
    if (!isLoggedIn && projectVisibility !== "public") {
      openAuthModal(() => handleUpdateMarker(imageId, marker));
      return;
    }

    // Find the image in our local state
    const updatedImage = processedImages.find((img) => img.id === imageId);
    if (updatedImage) {
      updatedImage.marker = marker;

      // This could be expanded to save marker data to the database
      toast.success(marker ? `Marked as ${marker.label}` : "Marker removed");
    }
  };

  const handleAddComment = (imageId: string, commentText: string) => {
    if (!isLoggedIn && projectVisibility !== "public") {
      openAuthModal(() => handleAddComment(imageId, commentText));
      return;
    }

    if (!commentText.trim()) return;

    // Find the image in our local state
    const updatedImage = processedImages.find((img) => img.id === imageId);
    if (updatedImage) {
      const newComment = {
        id: `comment-${Date.now()}`,
        author: "You",
        timestamp: new Date().toLocaleTimeString(),
        content: commentText,
      };

      updatedImage.comments = [...(updatedImage.comments || []), newComment];

      if (selectedImage && selectedImage.id === imageId) {
        setSelectedImage(updatedImage);
      }

      // This could be expanded to save comments to the database
      toast.success("Comment added");
    }
  };

  const handleEditComment = (
    imageId: string,
    commentId: string,
    newContent: string
  ) => {
    if (!isLoggedIn && projectVisibility !== "public") {
      openAuthModal(() => handleEditComment(imageId, commentId, newContent));
      return;
    }

    if (!newContent.trim()) return;

    // Find the image in our local state
    const updatedImage = processedImages.find((img) => img.id === imageId);
    if (updatedImage && updatedImage.comments) {
      updatedImage.comments = updatedImage.comments.map((comment) => {
        if (comment.id === commentId) {
          return {
            ...comment,
            content: newContent,
            timestamp: `${comment.timestamp} (edited)`,
          };
        }
        return comment;
      });

      if (selectedImage && selectedImage.id === imageId) {
        setSelectedImage(updatedImage);
      }

      toast.success("Comment updated");
    }
  };

  const handleDeleteComment = (imageId: string, commentId: string) => {
    if (!isLoggedIn && projectVisibility !== "public") {
      openAuthModal(() => handleDeleteComment(imageId, commentId));
      return;
    }

    // Find the image in our local state
    const updatedImage = processedImages.find((img) => img.id === imageId);
    if (updatedImage && updatedImage.comments) {
      updatedImage.comments = updatedImage.comments.filter(
        (comment) => comment.id !== commentId
      );

      if (selectedImage && selectedImage.id === imageId) {
        setSelectedImage(updatedImage);
      }

      toast.success("Comment deleted");
    }
  };

  return {
    processedImages,
    imagesLoading,
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
    handleAddComment,
    handleEditComment,
    handleDeleteComment,
    navigateToNextImage,
    navigateToPreviousImage,
  };
};
