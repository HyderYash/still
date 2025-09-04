import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { LazyLoadImage } from 'react-lazy-load-image-component';
import { Image, Upload, X, CheckCircle } from "lucide-react";
import { toast } from "sonner";
import { updateProjectThumbnail, removeProjectThumbnail, getProjectImagesForThumbnail } from "@/services/thumbnailService";
import { getSignedUrlForObject } from "@/integrations/aws/client";

interface ThumbnailSelectorProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    projectId: string;
    currentThumbnailUrl?: string | null;
    onThumbnailUpdate?: () => void;
}

interface ProjectImage {
    id: string;
    s3_key: string;
    file_name: string;
    created_at: string;
    url?: string;
}

export const ThumbnailSelector: React.FC<ThumbnailSelectorProps> = ({
    open,
    onOpenChange,
    projectId,
    currentThumbnailUrl,
    onThumbnailUpdate
}) => {
    const [images, setImages] = useState<ProjectImage[]>([]);
    const [loading, setLoading] = useState(false);
    const [selectedImageId, setSelectedImageId] = useState<string | null>(null);
    const [updating, setUpdating] = useState(false);

    // Load project images when component opens
    useEffect(() => {
        if (open && projectId) {
            loadProjectImages();
        }
    }, [open, projectId]);

    const loadProjectImages = async () => {
        setLoading(true);
        try {
            const projectImages = await getProjectImagesForThumbnail(projectId);

            // Generate signed URLs for each image
            const imagesWithUrls = await Promise.all(
                projectImages.map(async (image) => {
                    try {
                        const url = await getSignedUrlForObject(image.s3_key);
                        return { ...image, url };
                    } catch (error) {
                        console.error(`Error generating URL for image ${image.id}:`, error);
                        return { ...image, url: '/placeholder.svg' };
                    }
                })
            );

            setImages(imagesWithUrls);
        } catch (error) {
            console.error('Error loading project images:', error);
            toast.error('Failed to load project images');
        } finally {
            setLoading(false);
        }
    };

    const handleImageSelect = (imageId: string) => {
        setSelectedImageId(imageId);
    };

    const handleUpdateThumbnail = async () => {
        if (!selectedImageId) {
            toast.error('Please select an image first');
            return;
        }

        setUpdating(true);
        try {
            const success = await updateProjectThumbnail(projectId, selectedImageId);
            if (success) {
                toast.success('Project thumbnail updated successfully!');
                onThumbnailUpdate?.();
                onOpenChange(false);
            }
        } catch (error) {
            console.error('Error updating thumbnail:', error);
            toast.error('Failed to update thumbnail');
        } finally {
            setUpdating(false);
        }
    };

    const handleRemoveThumbnail = async () => {
        setUpdating(true);
        try {
            const success = await removeProjectThumbnail(projectId);
            if (success) {
                toast.success('Project thumbnail removed successfully!');
                onThumbnailUpdate?.();
                onOpenChange(false);
            }
        } catch (error) {
            console.error('Error removing thumbnail:', error);
            toast.error('Failed to remove thumbnail');
        } finally {
            setUpdating(false);
        }
    };



    const formatDate = (dateString: string): string => {
        return new Date(dateString).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
        });
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-4xl max-h-[80vh] overflow-hidden">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <Image className="h-5 w-5" />
                        Change Project Thumbnail
                    </DialogTitle>
                    <DialogDescription>
                        Select an image from your project to use as the thumbnail. This will be displayed in project lists and previews.
                    </DialogDescription>
                </DialogHeader>

                <div className="flex flex-col h-full">
                    {/* Current Thumbnail Display */}
                    {currentThumbnailUrl && (
                        <div className="mb-4 p-4 bg-gray-50 rounded-lg">
                            <h3 className="text-sm font-medium text-gray-700 mb-2">Current Thumbnail</h3>
                            <div className="relative w-24 h-24 rounded-lg overflow-hidden border-2 border-gray-200">
                                <LazyLoadImage
                                    src={currentThumbnailUrl}
                                    alt="Current thumbnail"
                                    effect="blur"
                                    className="w-full h-full object-cover"
                                />
                            </div>
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={handleRemoveThumbnail}
                                disabled={updating}
                                className="mt-2"
                            >
                                <X className="h-4 w-4 mr-2" />
                                Remove Thumbnail
                            </Button>
                        </div>
                    )}

                    {/* Images Grid */}
                    <div className="flex-1 overflow-y-auto">
                        {loading ? (
                            <div className="flex items-center justify-center h-32">
                                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#16ad7c]"></div>
                            </div>
                        ) : images.length === 0 ? (
                            <div className="text-center py-8 text-gray-500">
                                <Image className="h-12 w-12 mx-auto mb-3 opacity-40" />
                                <p>No images found in this project</p>
                                <p className="text-sm">Upload some images first to set a thumbnail</p>
                            </div>
                        ) : (
                            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                                {images.map((image) => (
                                    <div
                                        key={image.id}
                                        className={`relative group cursor-pointer rounded-lg overflow-hidden border-2 transition-all duration-200 ${selectedImageId === image.id
                                            ? 'border-[#16ad7c] ring-2 ring-[#16ad7c]/20'
                                            : 'border-gray-200 hover:border-[#16ad7c]/50'
                                            }`}
                                        onClick={() => handleImageSelect(image.id)}
                                    >
                                        {/* Image */}
                                        <div className="aspect-square relative">
                                            <LazyLoadImage
                                                src={image.url || '/placeholder.svg'}
                                                alt={image.file_name}
                                                effect="blur"
                                                className="w-full h-full object-cover"
                                            />

                                            {/* Selection Indicator */}
                                            {selectedImageId === image.id && (
                                                <div className="absolute top-2 right-2 bg-[#16ad7c] text-white rounded-full p-1">
                                                    <CheckCircle className="h-4 w-4" />
                                                </div>
                                            )}

                                            {/* Hover Overlay */}
                                            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors duration-200" />
                                        </div>

                                        {/* Image Info */}
                                        <div className="p-2 bg-white">
                                            <p className="text-xs font-medium text-gray-900 truncate" title={image.file_name}>
                                                {image.file_name}
                                            </p>
                                            <div className="flex justify-between text-xs text-gray-500 mt-1">
                                                <span>{formatDate(image.created_at)}</span>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Action Buttons */}
                    <div className="flex justify-end gap-3 pt-4 border-t">
                        <Button
                            variant="outline"
                            onClick={() => onOpenChange(false)}
                            disabled={updating}
                        >
                            Cancel
                        </Button>
                        <Button
                            onClick={handleUpdateThumbnail}
                            disabled={!selectedImageId || updating}
                            className="bg-[#16ad7c] hover:bg-[#16ad7c]/80"
                        >
                            {updating ? (
                                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                            ) : (
                                <Upload className="h-4 w-4 mr-2" />
                            )}
                            Update Thumbnail
                        </Button>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
};
