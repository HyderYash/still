
import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Upload, X } from "lucide-react";
import { toast } from "sonner";

interface ImageUploaderProps {
  onAddImage: (file: File) => void;
  onAddMultipleImages?: (files: File[]) => void;
  multiple?: boolean;
}

const ImageUploader = ({
  onAddImage,
  onAddMultipleImages,
  multiple = true
}: ImageUploaderProps) => {
  const [isDragging, setIsDragging] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const files = Array.from(e.dataTransfer.files).filter(file =>
        file.type.startsWith('image/')
      );

      if (files.length === 0) {
        toast.error("Please drop image files only");
        return;
      }

      setSelectedFiles(files);

      if (files.length === 1) {
        onAddImage(files[0]);
      } else if (multiple && onAddMultipleImages) {
        onAddMultipleImages(files);
      } else if (multiple) {
        // Handle multiple files one by one if onAddMultipleImages is not provided
        files.forEach(file => onAddImage(file));
      } else {
        // If multiple is false, just use the first file
        onAddImage(files[0]);
      }
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const files = Array.from(e.target.files).filter(file =>
        file.type.startsWith('image/')
      );

      if (files.length === 0) {
        toast.error("Please select image files only");
        return;
      }

      setSelectedFiles(files);

      if (files.length === 1) {
        onAddImage(files[0]);
      } else if (multiple && onAddMultipleImages) {
        onAddMultipleImages(files);
      } else if (multiple) {
        // Handle multiple files one by one if onAddMultipleImages is not provided
        files.forEach(file => onAddImage(file));
      } else {
        // If multiple is false, just use the first file
        onAddImage(files[0]);
      }

      // Reset the input value so the same file can be selected again
      e.target.value = '';
    }
  };

  const handleButtonClick = () => {
    fileInputRef.current?.click();
  };

  return (
    <div
      className={`drag-drop-zone ${isDragging
          ? "drag-drop-active"
          : "border-[#16ad7c]/30 bg-[#1E1E1E]/80"
        } border-2 border-dashed rounded-lg p-8 transition-all duration-300 flex flex-col items-center justify-center w-full h-48 backdrop-blur-sm`}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {/* Drag overlay indicator */}
      {isDragging && (
        <div className="absolute inset-0 bg-[#83ebc4]/20 rounded-lg flex items-center justify-center z-20">
          <div className="text-center">
            <Upload className="h-12 w-12 text-[#83ebc4] mx-auto mb-2 animate-bounce" />
            <p className="text-[#83ebc4] font-semibold text-lg">Drop images here!</p>
          </div>
        </div>
      )}

      <input
        type="file"
        ref={fileInputRef}
        className="hidden"
        accept="image/*"
        multiple={multiple}
        onChange={handleFileSelect}
      />
      <p className="text-muted-foreground mb-4 text-center text-lg">
        Drag and drop {multiple ? 'images' : 'an image'} here, or
      </p>
      <Button
        onClick={handleButtonClick}
        className="bg-[#16ad7c] hover:bg-[#16ad7c]/80 text-black font-medium transition-all duration-300 btn-hover px-6 py-2 relative z-20"
      >
        <Upload className="mr-2 h-5 w-5" />
        {multiple ? 'Add Images' : 'Add Image'}
      </Button>
    </div>
  );
};

export default ImageUploader;
