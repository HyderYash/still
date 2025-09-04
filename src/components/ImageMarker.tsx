import React, { useState, useRef, useEffect } from 'react';
import { ContextMenu, ContextMenuContent, ContextMenuItem, ContextMenuTrigger } from "@/components/ui/context-menu";
import { CheckCircle, XCircle, Circle, HelpCircle, MessageCircle, MapPin, Square, MousePointer } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { ImageMark, MarkerColor } from "@/integrations/supabase/types";

export type MarkerInfo = {
  color: MarkerColor;
  label: string;
};

interface ImageMarkerProps {
  currentMarker: MarkerInfo | undefined;
  onMarkerChange: (marker: MarkerInfo | undefined) => void;
  className?: string;
  hasComments?: boolean;
  imageId?: string;
  onAddMark?: (mark: Omit<ImageMark, 'id' | 'timestamp'>) => void;
  marks?: ImageMark[];
  onMarkUpdate?: (markId: string, updates: Partial<ImageMark>) => void;
  onMarkDelete?: (markId: string) => void;
  isMarkingMode?: boolean;
  onToggleMarkingMode?: () => void;
}

const markers: Record<Exclude<MarkerColor, "none">, MarkerInfo> = {
  green: { color: "green", label: "Approved" },
  red: { color: "red", label: "Needs Revision" },
  yellow: { color: "yellow", label: "Under Review" },
  blue: { color: "blue", label: "Good" },
  purple: { color: "purple", label: "Excellent" },
};

const getMarkerIcon = (color: MarkerColor) => {
  switch (color) {
    case "green":
      return <CheckCircle className="h-4 w-4 text-green-500" />;
    case "red":
      return <XCircle className="h-4 w-4 text-red-500" />;
    case "yellow":
      return <HelpCircle className="h-4 w-4 text-yellow-500" />;
    case "blue":
      return <Circle className="h-4 w-4 text-blue-500" />;
    case "purple":
      return <Circle className="h-4 w-4 text-purple-500" />;
    default:
      return <Circle className="h-4 w-4 text-gray-400" />;
  }
};

const ImageMarker: React.FC<ImageMarkerProps> = ({
  currentMarker,
  onMarkerChange,
  className,
  hasComments,
  imageId,
  onAddMark,
  marks = [],
  onMarkUpdate,
  onMarkDelete,
  isMarkingMode = false,
  onToggleMarkingMode
}) => {
  const [isMarkingDialogOpen, setIsMarkingDialogOpen] = useState(false);
  const [selectedMark, setSelectedMark] = useState<ImageMark | null>(null);
  const [newComment, setNewComment] = useState("");

  const handleMarkClick = (mark: ImageMark) => {
    setSelectedMark(mark);
    setNewComment(mark.comment || "");
    setIsMarkingDialogOpen(true);
  };

  const handleSaveComment = () => {
    if (selectedMark && onMarkUpdate) {
      onMarkUpdate(selectedMark.id, { comment: newComment });
      setIsMarkingDialogOpen(false);
      setSelectedMark(null);
      setNewComment("");
    }
  };

  const handleDeleteMark = () => {
    if (selectedMark && onMarkDelete) {
      onMarkDelete(selectedMark.id);
      setIsMarkingDialogOpen(false);
      setSelectedMark(null);
      setNewComment("");
    }
  };

  return (
    <>
      <ContextMenu>
        <ContextMenuTrigger>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <div className={`cursor-pointer rounded-full p-1 hover:bg-black/20 relative ${className}`}>
                  {currentMarker
                    ? getMarkerIcon(currentMarker.color)
                    : <Circle className="h-4 w-4 text-gray-400/50" />
                  }
                  {hasComments && (
                    <div className="absolute -top-1 -right-1 w-3 h-3 rounded-full bg-[#11ffb4] shadow-[0_0_8px_rgba(22,173,124,0.8)] animate-pulse border border-white/20"></div>
                  )}
                </div>
              </TooltipTrigger>
              <TooltipContent side="right">
                <p>{currentMarker ? currentMarker.label : "Add Marker"}{hasComments && " (has comments)"}</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </ContextMenuTrigger>
        <ContextMenuContent className="w-48 bg-[#1A1A1A]/95 backdrop-blur-md border-[#16ad7c]/30 text-white rounded-xl shadow-lg">
          <ContextMenuItem
            className="flex cursor-pointer hover:bg-[#16ad7c]/20 focus:bg-[#16ad7c]/20 rounded-lg py-2 transition-all duration-150"
            onClick={() => onMarkerChange(markers.green)}
          >
            <CheckCircle className="mr-2 h-4 w-4 text-green-500" />
            <span>Approved</span>
          </ContextMenuItem>
          <ContextMenuItem
            className="flex cursor-pointer hover:bg-[#16ad7c]/20 focus:bg-[#16ad7c]/20 rounded-lg py-2 transition-all duration-150"
            onClick={() => onMarkerChange(markers.yellow)}
          >
            <HelpCircle className="mr-2 h-4 w-4 text-yellow-500" />
            <span>Under Review</span>
          </ContextMenuItem>
          <ContextMenuItem
            className="flex cursor-pointer hover:bg-[#16ad7c]/20 focus:bg-[#16ad7c]/20 rounded-lg py-2 transition-all duration-150"
            onClick={() => onMarkerChange(markers.red)}
          >
            <XCircle className="mr-2 h-4 w-4 text-red-500" />
            <span>Needs Revision</span>
          </ContextMenuItem>
          <ContextMenuItem
            className="flex cursor-pointer hover:bg-[#16ad7c]/20 focus:bg-[#16ad7c]/20 rounded-lg py-2 transition-all duration-150"
            onClick={() => onMarkerChange(markers.blue)}
          >
            <Circle className="mr-2 h-4 w-4 text-blue-500" />
            <span>Good</span>
          </ContextMenuItem>
          <ContextMenuItem
            className="flex cursor-pointer hover:bg-[#16ad7c]/20 focus:bg-[#16ad7c]/20 rounded-lg py-2 transition-all duration-150"
            onClick={() => onMarkerChange(markers.purple)}
          >
            <Circle className="mr-2 h-4 w-4 text-purple-500" />
            <span>Excellent</span>
          </ContextMenuItem>
          {currentMarker && (
            <ContextMenuItem
              className="flex cursor-pointer hover:bg-red-500/10 focus:bg-red-500/10 rounded-lg py-2 transition-all duration-150 text-red-400"
              onClick={() => onMarkerChange(undefined)}
            >
              <Circle className="mr-2 h-4 w-4" />
              <span>Remove Marker</span>
            </ContextMenuItem>
          )}
          {onToggleMarkingMode && (
            <ContextMenuItem
              className="flex cursor-pointer hover:bg-[#16ad7c]/20 focus:bg-[#16ad7c]/20 rounded-lg py-2 transition-all duration-150 border-t border-[#16ad7c]/20 mt-2 pt-2"
              onClick={onToggleMarkingMode}
            >
              <MousePointer className="mr-2 h-4 w-4" />
              <span>{isMarkingMode ? "Exit Marking" : "Start Marking"}</span>
            </ContextMenuItem>
          )}
          {marks.length > 0 && (
            <ContextMenuItem
              className="flex cursor-pointer hover:bg-[#16ad7c]/20 focus:bg-[#16ad7c]/20 rounded-lg py-2 transition-all duration-150 border-t border-[#16ad7c]/20 mt-2 pt-2"
              onClick={() => setIsMarkingDialogOpen(true)}
            >
              <MessageCircle className="mr-2 h-4 w-4" />
              <span>View Marks ({marks.length})</span>
            </ContextMenuItem>
          )}
        </ContextMenuContent>
      </ContextMenu>

      {/* Mark Details Dialog */}
      <Dialog open={isMarkingDialogOpen} onOpenChange={setIsMarkingDialogOpen}>
        <DialogContent className="bg-[#1A1A1A]/95 backdrop-blur-md border-[#16ad7c]/30 text-white max-w-md">
          <DialogHeader>
            <DialogTitle className="text-white flex items-center gap-2">
              <MapPin className="h-5 w-5" />
              {selectedMark ? "Edit Mark" : "Image Marks"}
            </DialogTitle>
            <DialogDescription className="text-gray-400">
              {selectedMark ? "Edit the comment for this mark" : "View and manage all marks on this image"}
            </DialogDescription>
          </DialogHeader>

          {selectedMark ? (
            <div className="space-y-4">
              <div className="p-3 bg-[#2A2A2A]/50 rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <div className={`w-3 h-3 rounded-full bg-${selectedMark.color}-500`}></div>
                  <span className="text-sm text-gray-300">
                    {selectedMark.type} at ({selectedMark.x}, {selectedMark.y})
                  </span>
                </div>
                <Textarea
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  placeholder="Add a comment about this mark..."
                  className="bg-[#2A2A2A] border-[#16ad7c]/30 text-white"
                  rows={3}
                />
              </div>
              <div className="flex gap-2">
                <Button onClick={handleSaveComment} className="flex-1 bg-[#16ad7c] hover:bg-[#16ad7c]/80">
                  Save Comment
                </Button>
                <Button onClick={handleDeleteMark} variant="destructive" className="flex-1">
                  Delete Mark
                </Button>
              </div>
            </div>
          ) : (
            <div className="space-y-3 max-h-60 overflow-y-auto">
              {marks.length === 0 ? (
                <p className="text-gray-400 text-center py-4">No marks on this image</p>
              ) : (
                marks.map((mark) => (
                  <div
                    key={mark.id}
                    className="p-3 bg-[#2A2A2A]/50 rounded-lg cursor-pointer hover:bg-[#2A2A2A]/70 transition-colors"
                    onClick={() => handleMarkClick(mark)}
                  >
                    <div className="flex items-center gap-2 mb-2">
                      <div className={`w-3 h-3 rounded-full bg-${mark.color}-500`}></div>
                      <span className="text-sm text-gray-300">
                        {mark.type} at ({mark.x}, {mark.y})
                      </span>
                    </div>
                    {mark.comment && (
                      <p className="text-sm text-gray-200">{mark.comment}</p>
                    )}
                  </div>
                ))
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
};

export default ImageMarker;
