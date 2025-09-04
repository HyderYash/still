
import React from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Trash2, Download, FolderPlus, CheckCircle, Image } from "lucide-react";
import ImageMarker, { MarkerColor, MarkerInfo as ImageMarkerInfo } from "@/components/ImageMarker";
import ImageUploader from "@/components/ImageUploader";
import { MarkerInfo } from "@/services/imageService";
import { Folder } from "@/services/folderService";
import { ImageData } from "@/hooks/useProjectImages";
import { getImageMarksCount } from "@/services/imageMarkService";
import { useState, useEffect } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

import {
  StaggeredAlignment,
  StaggeredGrid,
  StaggeredGridItem,
  StaggeredGridItemFunctional,
  StaggeredItemSpan,
} from "react-staggered-grid";
import { useMediaQuery } from "@/hooks/useMediaQuery";

type Comment = {
  id: string;
  author: string;
  timestamp: string;
  content: string;
  timeMarker?: string;
};

interface ImageGridProps {
  images: ImageData[];
  folders: Folder[];
  layoutType: "grid" | "rows";
  onImageClick: (image: ImageData) => void;
  onFolderClick: (folderId: string, folderName: string) => void;
  onDeleteImage: (imageId: string) => void;
  onDownloadImage: (imageUrl: string, imageName: string) => void;
  onUpdateMarker: (imageId: string, marker: MarkerInfo | undefined) => void;
  onAddImage: (file: File) => Promise<void>;
  onAddMultipleImages?: (files: File[]) => Promise<void>;
  currentFolder: boolean;
  canAddImages?: boolean;
  isCommentFiltered?: boolean;
  showActions?: boolean;
  onThumbnailChange?: (imageId: string) => void;
}

const ImageGrid: React.FC<ImageGridProps> = ({
  images,
  folders,
  layoutType,
  onImageClick,
  onFolderClick,
  onDeleteImage,
  onDownloadImage,
  onUpdateMarker,
  onAddImage,
  onAddMultipleImages,
  currentFolder,
  canAddImages = true,
  isCommentFiltered = false,
  showActions = true,
  onThumbnailChange,
}) => {
  const [marksCounts, setMarksCounts] = useState<Record<string, number>>({});
  const [isLoadingMarksCounts, setIsLoadingMarksCounts] = useState(false);

  // Load marks count for all images
  useEffect(() => {
    const loadMarksCounts = async () => {
      setIsLoadingMarksCounts(true);
      try {
        const counts: Record<string, number> = {};
        for (const image of images) {
          counts[image.id] = await getImageMarksCount(image.id);
        }
        setMarksCounts(counts);
      } catch (error) {
        console.error('Error loading marks counts:', error);
      } finally {
        setIsLoadingMarksCounts(false);
      }
    };

    if (images.length > 0) {
      loadMarksCounts();
    }
  }, [images]);

  const isMobile = useMediaQuery("(max-width: 768px)");
  const isTablet = useMediaQuery("(min-width: 769px) and (max-width: 1024px)");
  const isSmallDesktop = useMediaQuery("(min-width: 1025px) and (max-width: 1280px)");


  if (images.length === 0 && folders.length === 0) {
    return (
      <div className="col-span-full flex flex-col items-center justify-center py-16 border border-dashed border-[#16ad7c]/40 rounded-lg">
        <p className="text-lg text-muted-foreground mb-4">
          {isCommentFiltered
            ? "No images with comments found"
            : `No images in this ${currentFolder ? "folder" : "project"} yet`
          }
        </p>
        {canAddImages && !isCommentFiltered && (
          <ImageUploader
            onAddImage={onAddImage}
            onAddMultipleImages={onAddMultipleImages}
            multiple={true}
          />
        )}
      </div>
    );
  }

  if (layoutType === "rows") {
    return (
      <div className="space-y-4">
        <div className="rounded-lg border border-[#16ad7c]/30 overflow-hidden bg-[#1E1E1E]/80 backdrop-blur-sm">
          <Table>
            <TableHeader>
              <TableRow className="border-b border-[#16ad7c]/30 hover:bg-transparent">
                <TableHead className="w-[100px] text-[#83ebc4] font-medium">Preview</TableHead>
                <TableHead className="text-[#83ebc4] font-medium">Name</TableHead>
                <TableHead className="text-[#83ebc4] font-medium">Type</TableHead>
                <TableHead className="text-[#83ebc4] font-medium">Status</TableHead>
                <TableHead className="text-right text-[#83ebc4] font-medium">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {folders.map((folder) => (
                <TableRow
                  key={folder.id}
                  className="cursor-pointer hover:bg-[#16ad7c]/10 border-b border-[#333]/50 transition-colors duration-200"
                  onClick={() => onFolderClick(folder.id, folder.name)}
                >
                  <TableCell>
                    <div className="w-20 h-12 relative flex items-center justify-center bg-[#262626] rounded-md border border-[#16ad7c]/30">
                      <FolderPlus className="h-8 w-8 text-[#16ad7c]" />
                    </div>
                  </TableCell>
                  <TableCell className="font-medium text-white">{folder.name}</TableCell>
                  <TableCell>
                    <span className="px-2 py-1 rounded-full text-xs bg-[#16ad7c]/20 text-[#83ebc4] border border-[#16ad7c]/30">
                      Folder
                    </span>
                  </TableCell>
                  <TableCell className="text-gray-400">-</TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end space-x-2">
                      <Button
                        size="sm"
                        variant="outline"
                        className="bg-[#262626] border-[#16ad7c]/30 hover:bg-[#16ad7c]/20 text-[#83ebc4] rounded-full p-2 h-8 w-8 transition-colors duration-200"
                        onClick={(e) => {
                          e.stopPropagation();
                          onFolderClick(folder.id, folder.name);
                        }}
                      >
                        <FolderPlus className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
              {images.map((image) => (
                <TableRow
                  key={image.id}
                  className="cursor-pointer hover:bg-[#16ad7c]/10 border-b border-[#333]/50 transition-colors duration-200"
                  onClick={() => onImageClick(image)}
                >
                  <TableCell>
                    <div className="w-20 h-12 relative overflow-hidden rounded-md border border-[#16ad7c]/30">
                      <img
                        src={image.url}
                        alt={image.name}
                        className="w-full h-full object-cover transition-transform duration-300 hover:scale-105"
                      />
                      {/* Approved status indicator */}
                      {image.is_approved && (
                        <div className="absolute top-1 left-1 w-4 h-4 rounded-full bg-green-500 flex items-center justify-center">
                          <CheckCircle className="h-3 w-3 text-white" />
                        </div>
                      )}
                      {/* Comments indicator */}
                      {image.has_comments && (
                        <div className="absolute top-1 right-1 w-2 h-2 rounded-full bg-[#11ffb4] shadow-[0_0_5px_rgba(22,173,124,0.7)] animate-pulse"></div>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="font-medium text-white">{image.name}</TableCell>
                  <TableCell>
                    <span className="px-2 py-1 rounded-full text-xs bg-blue-500/20 text-blue-300 border border-blue-500/30">
                      Image
                    </span>
                  </TableCell>
                  <TableCell>
                    {image.is_approved ? (
                      <span className="px-2 py-1 rounded-full text-xs bg-green-500/20 text-green-300 border border-green-500/30 flex items-center gap-1 w-fit">
                        <CheckCircle className="h-3 w-3" />
                        Approved
                      </span>
                    ) : (
                      <span className="text-gray-400 text-xs">Pending</span>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    {showActions && (
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-muted-foreground hover:text-white"
                          onClick={(e) => {
                            e.stopPropagation();
                            onDownloadImage(image.url, image.name);
                          }}
                        >
                          <Download className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-muted-foreground hover:text-red-500"
                          onClick={(e) => {
                            e.stopPropagation();
                            onDeleteImage(image.id);
                          }}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
        {canAddImages && (
          <ImageUploader
            onAddImage={onAddImage}
            onAddMultipleImages={onAddMultipleImages}
            multiple={true}
          />
        )}
      </div>
    );
  }

  return (
    <>
      <div className="image-grid-container">
        <StaggeredGrid
          alignment={1}
          horizontalGap={5}
          verticalGap={5}
          columns={isMobile ? 1 : isTablet ? 2 : isSmallDesktop ? 3 : 4}
          useElementWidth={true}
        >
          {images.map((image, index) => (
            <StaggeredGridItem key={image.id} index={index} >
              <Card
                key={image.id}
                className={`group bg-[#1E1E1E]/80 backdrop-blur-sm border-[#333] card-hover overflow-hidden cursor-pointer m-2 ${image.is_approved ? 'ring-2 ring-green-500/50 shadow-lg shadow-green-500/20' : ''
                  }`}
                onClick={() => onImageClick(image)}
              >
                <div className="relative aspect-video">
                  <img
                    src={image.url}
                    alt={image.name}
                    className="w-full object-cover transition-transform duration-500 group-hover:scale-105"
                  />
                  <div className="absolute top-2 right-2 flex space-x-2">
                    {/* Approved status indicator */}
                    {image.is_approved && (
                      <div className="bg-green-500/90 text-white px-2 py-1 rounded-full text-xs font-medium flex items-center gap-1 backdrop-blur-md">
                        <CheckCircle className="h-3 w-3" />
                        Approved
                      </div>
                    )}
                    {image.marker && (
                      <div>
                        <ImageMarker
                          currentMarker={{
                            label: image.marker.label,
                            color: image.marker.color as MarkerColor,
                          }}
                          onMarkerChange={(marker) =>
                            onUpdateMarker(image.id, marker as MarkerInfo)
                          }
                          className="bg-black/40 backdrop-blur-md"
                          imageId={image.id}
                          marks={[]} // This will be populated from the parent component
                          onAddMark={() => { }} // This will be handled in ImageDetailView
                          onMarkUpdate={() => { }} // This will be handled in ImageDetailView
                          onMarkDelete={() => { }} // This will be handled in ImageDetailView
                          isMarkingMode={false}
                          onToggleMarkingMode={() => { }} // This will be handled in ImageDetailView
                        />
                      </div>
                    )}
                    {image.has_comments && (
                      <div className="w-4 h-4 rounded-full bg-[#11ffb4] shadow-[0_0_8px_rgba(22,173,124,0.8)] animate-pulse border-2 border-white/20"></div>
                    )}
                    {/* Marks indicator from database */}
                    {isLoadingMarksCounts ? (
                      <div className="w-4 h-4 rounded-full bg-gray-500 animate-pulse border-2 border-white/20"></div>
                    ) : marksCounts[image.id] > 0 && (
                      <div className="w-4 h-4 rounded-full bg-purple-500 shadow-[0_0_8px_rgba(139,92,246,0.8)] animate-pulse border-2 border-white/20"></div>
                    )}
                  </div>
                  <div className="absolute top-2 left-2">
                    {!image.marker && (
                      <ImageMarker
                        currentMarker={
                          image.marker
                            ? {
                              label: image.marker.label,
                              color: image.marker.color as any, // Type assertion to handle the mismatch
                            }
                            : undefined
                        }
                        onMarkerChange={
                          (marker) =>
                            onUpdateMarker(image.id, marker as MarkerInfo) // Type assertion to handle the mismatch
                        }
                        className="opacity-0 group-hover:opacity-100 transition-opacity duration-300 bg-black/40 backdrop-blur-md"
                        imageId={image.id}
                        marks={[]} // This will be populated from the parent component
                        onAddMark={() => { }} // This will be handled in ImageDetailView
                        onMarkUpdate={() => { }} // This will be handled in ImageDetailView
                        onMarkDelete={() => { }} // This will be handled in ImageDetailView
                        isMarkingMode={false}
                        onToggleMarkingMode={() => { }} // This will be handled in ImageDetailView
                      />
                    )}
                  </div>
                  <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-end justify-between p-4">
                    <div className="text-white font-medium truncate">
                      {image.name}
                    </div>
                    <div className="flex space-x-2">
                      {showActions && (
                        <Button
                          size="sm"
                          variant="outline"
                          className="bg-black/50 border-white/20 hover:bg-white/20 text-white rounded-full p-2 h-8 w-8"
                          onClick={(e) => {
                            e.stopPropagation();
                            onDeleteImage(image.id);
                          }}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                      {showActions && onThumbnailChange && (
                        <Button
                          size="sm"
                          variant="outline"
                          className="bg-black/50 border-white/20 hover:bg-white/20 text-white rounded-full p-2 h-8 w-8"
                          onClick={(e) => {
                            e.stopPropagation();
                            onThumbnailChange(image.id);
                          }}
                          title="Set as project thumbnail"
                        >
                          <Image className="h-4 w-4" />
                        </Button>
                      )}
                      {showActions && (
                        <Button
                          size="sm"
                          variant="outline"
                          className="bg-black/50 border-white/20 hover:bg-white/20 text-white rounded-full p-2 h-8 w-8"
                          onClick={(e) => {
                            e.stopPropagation();
                            onDownloadImage(image.url, image.name);
                          }}
                        >
                          <Download className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              </Card>
            </StaggeredGridItem>
          ))}
        </StaggeredGrid>
        {canAddImages && (
          <div className="image-upload-section">
            {/* Visual separator */}
            <div className="flex items-center mb-6">
              <div className="flex-1 h-px bg-gradient-to-r from-transparent via-[#16ad7c]/30 to-transparent"></div>
              <span className="px-4 text-sm text-muted-foreground">Add More Images</span>
              <div className="flex-1 h-px bg-gradient-to-r from-transparent via-[#16ad7c]/30 to-transparent"></div>
            </div>

            <ImageUploader
              onAddImage={onAddImage}
              onAddMultipleImages={onAddMultipleImages}
              multiple={true}
            />
          </div>
        )}
        <input
          id="file-input"
          type="file"
          multiple={true}
          accept="image/*"
          className="hidden"
          onChange={(e) => {
            if (e.target.files && e.target.files.length > 0) {
              if (e.target.files.length === 1) {
                onAddImage(e.target.files[0]);
              } else if (onAddMultipleImages) {
                onAddMultipleImages(Array.from(e.target.files));
              } else {
                Array.from(e.target.files).forEach((file) => onAddImage(file));
              }
              e.target.value = "";
            }
          }}
        />
      </div>
    </>
  );
};

export default ImageGrid;
