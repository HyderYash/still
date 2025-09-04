import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Circle, Square, MapPin, X, Check, MousePointer } from "lucide-react";
import { ImageMark, MarkerColor } from "./ImageMarker";

interface ImageMarkingCanvasProps {
  imageUrl: string;
  imageName: string;
  marks: ImageMark[];
  onAddMark: (mark: Omit<ImageMark, 'id' | 'timestamp'>) => void;
  onUpdateMark: (markId: string, updates: Partial<ImageMark>) => void;
  onDeleteMark: (markId: string) => void;
  isMarkingMode: boolean;
  onToggleMarkingMode: () => void;
  isLoadingMarks?: boolean; // Add loading state prop
}

const ImageMarkingCanvas: React.FC<ImageMarkingCanvasProps> = ({
  imageUrl,
  imageName,
  marks,
  onAddMark,
  onUpdateMark,
  onDeleteMark,
  isMarkingMode,
  onToggleMarkingMode,
  isLoadingMarks = false
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imageRef = useRef<HTMLImageElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [drawingType, setDrawingType] = useState<'circle' | 'rectangle' | 'point'>('circle');
  const [startPoint, setStartPoint] = useState<{ x: number; y: number } | null>(null);
  const [currentMark, setCurrentMark] = useState<Partial<ImageMark> | null>(null);
  const [isCommentDialogOpen, setIsCommentDialogOpen] = useState(false);
  const [comment, setComment] = useState('');
  const [selectedColor, setSelectedColor] = useState<MarkerColor>('blue');
  const [imageLoaded, setImageLoaded] = useState(false);

  const colors: { color: MarkerColor; name: string; bg: string }[] = [
    { color: 'blue', name: 'Blue', bg: 'bg-blue-500' },
    { color: 'green', name: 'Green', bg: 'bg-green-500' },
    { color: 'red', name: 'Red', bg: 'bg-red-500' },
    { color: 'yellow', name: 'Yellow', bg: 'bg-yellow-500' },
    { color: 'purple', name: 'Purple', bg: 'bg-purple-500' },
  ];

  const getColorValue = (color: MarkerColor): string => {
    switch (color) {
      case 'blue': return '#3b82f6';
      case 'green': return '#10b981';
      case 'red': return '#ef4444';
      case 'yellow': return '#f59e0b';
      case 'purple': return '#8b5cf6';
      default: return '#6b7280';
    }
  };

  // Draw image and all marks on canvas
  const drawCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas || !imageLoaded) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Draw the image first
    const image = imageRef.current;
    if (image) {
      ctx.drawImage(image, 0, 0, canvas.width, canvas.height);
    }

    // Draw marks on top of the image
    marks.forEach(mark => {
      ctx.strokeStyle = getColorValue(mark.color);
      ctx.fillStyle = getColorValue(mark.color);
      ctx.lineWidth = 4; // Increased from 2 to 4 for thicker lines

      switch (mark.type) {
        case 'circle':
          if (mark.radius) {
            ctx.beginPath();
            ctx.arc(mark.x, mark.y, mark.radius, 0, 2 * Math.PI);
            ctx.stroke();
            // Draw comment indicator
            if (mark.comment) {
              ctx.fillStyle = '#11ffb4';
              ctx.beginPath();
              ctx.arc(mark.x + mark.radius + 5, mark.y - mark.radius - 5, 6, 0, 2 * Math.PI); // Increased size
              ctx.fill();
            }
          }
          break;
        case 'rectangle':
          if (mark.width && mark.height) {
            ctx.strokeRect(mark.x, mark.y, mark.width, mark.height);
            // Draw comment indicator
            if (mark.comment) {
              ctx.fillStyle = '#11ffb4';
              ctx.beginPath();
              ctx.arc(mark.x + mark.width + 5, mark.y - 5, 6, 0, 2 * Math.PI); // Increased size
              ctx.fill();
            }
          }
          break;
        case 'point':
          ctx.beginPath();
          ctx.arc(mark.x, mark.y, 5, 0, 2 * Math.PI); // Increased from 3 to 5
          ctx.fill();
          // Draw comment indicator
          if (mark.comment) {
            ctx.fillStyle = '#11ffb4';
            ctx.beginPath();
            ctx.arc(mark.x + 8, mark.y - 8, 6, 0, 2 * Math.PI); // Increased size
            ctx.fill();
          }
          break;
      }
    });
  }, [marks, imageLoaded]);

  // Load image and set up canvas
  useEffect(() => {
    const image = imageRef.current;
    const canvas = canvasRef.current;

    if (image && canvas) {
      image.onload = () => {
        // Set canvas size to match image dimensions
        canvas.width = image.naturalWidth;
        canvas.height = image.naturalHeight;

        // Set display size to match container
        const container = canvas.parentElement;
        if (container) {
          const containerWidth = container.offsetWidth;
          const scale = containerWidth / image.naturalWidth;
          canvas.style.width = `${containerWidth}px`;
          canvas.style.height = `${image.naturalHeight * scale}px`;
        }

        setImageLoaded(true);
        // Small delay to ensure image is fully rendered
        setTimeout(() => {
          drawCanvas();
        }, 100);
      };
      image.src = imageUrl;
    }
  }, [imageUrl, drawCanvas]);

  // Initial canvas setup when component mounts
  useEffect(() => {
    const canvas = canvasRef.current;
    if (canvas) {
      // Set initial canvas size
      canvas.style.width = '100%';
      canvas.style.height = 'auto';
    }
  }, []);

  // Redraw canvas when marks change or image loads
  useEffect(() => {
    drawCanvas();
  }, [drawCanvas]);

  // Handle window resize to maintain canvas scaling
  useEffect(() => {
    const handleResize = () => {
      if (imageLoaded && canvasRef.current && imageRef.current) {
        const canvas = canvasRef.current;
        const image = imageRef.current;
        const container = canvas.parentElement;

        if (container) {
          const containerWidth = container.offsetWidth;
          const scale = containerWidth / image.naturalWidth;
          canvas.style.width = `${containerWidth}px`;
          canvas.style.height = `${image.naturalHeight * scale}px`;
        }
      }
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [imageLoaded]);

  const getCanvasCoordinates = (event: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };

    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;

    return {
      x: (event.clientX - rect.left) * scaleX,
      y: (event.clientY - rect.top) * scaleY
    };
  };

  const handleMouseDown = (event: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isMarkingMode) return;

    const coords = getCanvasCoordinates(event);
    setStartPoint(coords);
    setIsDrawing(true);
  };

  const handleMouseMove = (event: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isMarkingMode || !isDrawing || !startPoint) return;

    const coords = getCanvasCoordinates(event);

    // Clear and redraw to show preview
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    drawCanvas(); // Redraw existing marks and image

    // Draw preview
    ctx.strokeStyle = getColorValue(selectedColor);
    ctx.lineWidth = 4; // Increased from 2 to 4 for thicker preview lines

    switch (drawingType) {
      case 'circle':
        const radius = Math.sqrt(
          Math.pow(coords.x - startPoint.x, 2) + Math.pow(coords.y - startPoint.y, 2)
        );
        ctx.beginPath();
        ctx.arc(startPoint.x, startPoint.y, radius, 0, 2 * Math.PI);
        ctx.stroke();
        break;
      case 'rectangle':
        const width = coords.x - startPoint.x;
        const height = coords.y - startPoint.y;
        ctx.strokeRect(startPoint.x, startPoint.y, width, height);
        break;
    }
  };

  const handleMouseUp = (event: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isMarkingMode || !isDrawing || !startPoint) return;

    const coords = getCanvasCoordinates(event);
    setIsDrawing(false);

    let newMark: Partial<ImageMark> = {
      type: drawingType,
      x: 0,
      y: 0,
      color: selectedColor,
    };

    switch (drawingType) {
      case 'circle':
        const radius = Math.sqrt(
          Math.pow(coords.x - startPoint.x, 2) + Math.pow(coords.y - startPoint.y, 2)
        );
        if (radius > 5) { // Minimum size
          newMark = {
            ...newMark,
            x: startPoint.x,
            y: startPoint.y,
            radius: radius,
          };
        }
        break;
      case 'rectangle':
        const width = coords.x - startPoint.x;
        const height = coords.y - startPoint.y;
        if (Math.abs(width) > 5 && Math.abs(height) > 5) { // Minimum size
          newMark = {
            ...newMark,
            x: Math.min(startPoint.x, coords.x),
            y: Math.min(startPoint.y, coords.y),
            width: Math.abs(width),
            height: Math.abs(height),
          };
        }
        break;
      case 'point':
        newMark = {
          ...newMark,
          x: coords.x,
          y: coords.y,
        };
        break;
    }

    if (newMark.x !== undefined && newMark.y !== undefined) {
      setCurrentMark(newMark);
      setIsCommentDialogOpen(true);
    }

    setStartPoint(null);
  };

  const handleAddMark = () => {
    if (currentMark && comment.trim()) {
      onAddMark({
        ...currentMark,
        comment: comment.trim(),
        author: 'Current User', // This should come from user context
      } as Omit<ImageMark, 'id' | 'timestamp'>);

      setComment('');
      setCurrentMark(null);
      setIsCommentDialogOpen(false);
    }
  };

  const handleMarkClick = (event: React.MouseEvent<HTMLCanvasElement>) => {
    if (isMarkingMode) return;

    const coords = getCanvasCoordinates(event);

    // Check if clicked on a mark
    const clickedMark = marks.find(mark => {
      switch (mark.type) {
        case 'circle':
          return mark.radius && Math.sqrt(
            Math.pow(coords.x - mark.x, 2) + Math.pow(coords.y - mark.y, 2)
          ) <= mark.radius;
        case 'rectangle':
          return mark.width && mark.height &&
            coords.x >= mark.x && coords.x <= mark.x + mark.width &&
            coords.y >= mark.y && coords.y <= mark.y + mark.height;
        case 'point':
          return Math.sqrt(
            Math.pow(coords.x - mark.x, 2) + Math.pow(coords.y - mark.y, 2)
          ) <= 10;
        default:
          return false;
      }
    });

    if (clickedMark) {
      setCurrentMark(clickedMark);
      setComment(clickedMark.comment || '');
      setIsCommentDialogOpen(true);
    }
  };

  return (
    <div className="relative">
      {/* Marking Controls */}
      {isMarkingMode && (
        <div className="absolute top-4 left-4 z-20 bg-[#1A1A1A]/90 backdrop-blur-md rounded-lg p-3 border border-[#16ad7c]/30">
          <div className="flex items-center gap-2 mb-3">
            <span className="text-white text-sm font-medium">Drawing Tool:</span>
            <div className="flex gap-1">
              <Button
                size="sm"
                variant={drawingType === 'circle' ? 'default' : 'outline'}
                onClick={() => setDrawingType('circle')}
                className="h-8 w-8 p-0"
              >
                <Circle className="h-4 w-4" />
              </Button>
              <Button
                size="sm"
                variant={drawingType === 'rectangle' ? 'default' : 'outline'}
                onClick={() => setDrawingType('rectangle')}
                className="h-8 w-8 p-0"
              >
                <Square className="h-4 w-4" />
              </Button>
              <Button
                size="sm"
                variant={drawingType === 'point' ? 'default' : 'outline'}
                onClick={() => setDrawingType('point')}
                className="h-8 w-8 p-0"
              >
                <MapPin className="h-4 w-4" />
              </Button>
            </div>
          </div>

          <div className="flex items-center gap-2 mb-3">
            <span className="text-white text-sm font-medium">Color:</span>
            <div className="flex gap-1">
              {colors.map(({ color, bg }) => (
                <button
                  key={color}
                  onClick={() => setSelectedColor(color)}
                  className={`w-6 h-6 rounded-full ${bg} border-2 ${selectedColor === color ? 'border-white' : 'border-transparent'
                    }`}
                />
              ))}
            </div>
          </div>

          <Button
            size="sm"
            variant="outline"
            onClick={onToggleMarkingMode}
            className="w-full text-white border-[#16ad7c]/30 hover:bg-[#16ad7c]/20"
          >
            <X className="h-4 w-4 mr-2" />
            Exit Marking
          </Button>
        </div>
      )}

      {/* Canvas Container */}
      <div className="relative inline-block w-full">
        <img
          ref={imageRef}
          src={imageUrl}
          alt={imageName}
          className="max-w-full h-auto"
          style={{ display: 'none' }}
        />
        <canvas
          ref={canvasRef}
          className="w-full h-auto cursor-crosshair border border-[#16ad7c]/30 rounded-lg"
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onClick={handleMarkClick}
        />

        {/* Loading Overlay for Marks */}
        {isLoadingMarks && (
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm rounded-lg flex items-center justify-center z-10">
            <div className="text-center">
              <div className="w-8 h-8 border-2 border-[#16ad7c] border-r-transparent rounded-full animate-spin mx-auto mb-2"></div>
              <p className="text-white text-sm font-medium">Loading annotations...</p>
            </div>
          </div>
        )}
      </div>

      {/* Comment Dialog */}
      <Dialog open={isCommentDialogOpen} onOpenChange={setIsCommentDialogOpen}>
        <DialogContent className="bg-[#1A1A1A]/95 backdrop-blur-md border-[#16ad7c]/30 text-white max-w-md">
          <DialogHeader>
            <DialogTitle className="text-white flex items-center gap-2">
              <MapPin className="h-5 w-5" />
              {currentMark?.id ? 'Edit Mark' : 'Add Comment to Mark'}
            </DialogTitle>
            <DialogDescription className="text-gray-400">
              Add or edit a comment for this mark on the image.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="p-3 bg-[#2A2A2A]/50 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <div className={`w-3 h-3 rounded-full bg-${currentMark?.color}-500`}></div>
                <span className="text-sm text-gray-300">
                  {currentMark?.type} at ({currentMark?.x}, {currentMark?.y})
                </span>
              </div>
              <Textarea
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                placeholder="Add a comment about this mark..."
                className="bg-[#2A2A2A] border-[#16ad7c]/30 text-white"
                rows={3}
              />
            </div>

            <div className="flex gap-2">
              <Button
                onClick={handleAddMark}
                className="flex-1 bg-[#16ad7c] hover:bg-[#16ad7c]/80"
                disabled={!comment.trim()}
              >
                <Check className="h-4 w-4 mr-2" />
                {currentMark?.id ? 'Update' : 'Add'} Mark
              </Button>
              {currentMark?.id && (
                <Button
                  onClick={() => onDeleteMark(currentMark.id!)}
                  variant="destructive"
                  className="flex-1"
                >
                  <X className="h-4 w-4 mr-2" />
                  Delete
                </Button>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ImageMarkingCanvas;
