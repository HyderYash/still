
import React, { useState } from "react";
import { motion } from "framer-motion";
import { Folder, deleteFolder } from "@/services/folderService";
import { FolderPlus, Trash2 } from "lucide-react";
import { 
  AlertDialog, 
  AlertDialogAction, 
  AlertDialogCancel, 
  AlertDialogContent, 
  AlertDialogDescription, 
  AlertDialogFooter, 
  AlertDialogHeader, 
  AlertDialogTitle 
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

interface FolderGridProps {
  folders: Folder[];
  onFolderClick: (folderId: string, folderName: string) => void;
  projectId?: string;
  currentFolderId: string | null;
  showActions?: boolean;
}

const FolderGrid: React.FC<FolderGridProps> = ({ 
  folders, 
  onFolderClick,
  projectId,
  currentFolderId,
  showActions = true
}) => {
  const [folderToDelete, setFolderToDelete] = useState<Folder | null>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const queryClient = useQueryClient();

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
      },
    },
  };

  const itemVariants = {
    hidden: { y: 20, opacity: 0 },
    visible: {
      y: 0,
      opacity: 1,
      transition: {
        type: "spring",
        stiffness: 100,
        damping: 12,
      },
    },
  };

  const handleDeleteClick = (e: React.MouseEvent, folder: Folder) => {
    e.stopPropagation();
    setFolderToDelete(folder);
    setIsDeleteDialogOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!folderToDelete) return;
    
    setIsDeleting(true);
    
    try {
      const success = await deleteFolder(folderToDelete.id);
      
      if (success && projectId) {
        // Invalidate queries to refresh the data
        queryClient.invalidateQueries({ queryKey: ["folders", projectId, currentFolderId] });
        queryClient.invalidateQueries({ queryKey: ["images", projectId, currentFolderId] });
        toast.success(`Folder "${folderToDelete.name}" and all its contents deleted successfully`);
      } else {
        toast.error("Failed to delete folder. Please try again.");
      }
    } catch (error) {
      console.error("Error deleting folder:", error);
      toast.error("An error occurred while deleting the folder");
    } finally {
      setIsDeleting(false);
      setIsDeleteDialogOpen(false);
      setFolderToDelete(null);
    }
  };

  return (
    <div className="mb-12">
      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6"
      >
        {folders.map((folder) => (
          <motion.div
            key={folder.id}
            variants={itemVariants}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className="group relative"
          >
            <div
              onClick={() => onFolderClick(folder.id, folder.name)}
              className="relative overflow-hidden rounded-2xl bg-[#151515] border border-[#16ad7c]/20 hover:border-[#16ad7c]/40 transition-all duration-500 cursor-pointer"
            >
              <div className="absolute inset-0 bg-gradient-to-br from-[#16ad7c]/10 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
              
              <div className="p-6">
                <div className="flex items-center justify-center mb-4">
                  <div className="relative">
                    <div className="absolute inset-0 bg-[#16ad7c]/20 rounded-full blur-xl group-hover:blur-2xl transition-all duration-500"></div>
                    <div className="relative bg-[#16ad7c]/10 p-4 rounded-full">
                      <FolderPlus className="h-8 w-8 text-[#16ad7c]" />
                    </div>
                  </div>
                </div>
                
                <div className="text-center">
                  <h3 className="text-xl font-semibold text-white mb-2 group-hover:text-[#16ad7c] transition-colors duration-500">
                    {folder.name}
                  </h3>
                  <p className="text-sm text-gray-400">
                    {new Date(folder.date).toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                    })}
                  </p>
                </div>
              </div>

              {showActions && (
                <div className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-8 w-8 bg-black/50 hover:bg-red-500/20 text-white/70 hover:text-red-400 rounded-full"
                    onClick={(e) => handleDeleteClick(e, folder)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              )}

              <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-[#16ad7c] to-[#109d73] transform scale-x-0 group-hover:scale-x-100 transition-transform duration-500 origin-left"></div>
            </div>
          </motion.div>
        ))}
      </motion.div>

      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent className="bg-[#1A1A1A] border-[#333] text-white">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Folder</AlertDialogTitle>
            <AlertDialogDescription className="text-gray-400">
              Are you sure you want to delete the folder "{folderToDelete?.name}"?
              <span className="block mt-2 text-red-400 font-medium">
                All images inside this folder will be permanently deleted.
              </span>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel 
              className="bg-[#333] text-white hover:bg-[#444] border-none"
              disabled={isDeleting}
            >
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              className={`bg-red-500/20 hover:bg-red-500/30 text-red-300 border-red-500/30 ${
                isDeleting ? "opacity-70 cursor-not-allowed" : ""
              }`}
              onClick={handleConfirmDelete}
              disabled={isDeleting}
            >
              {isDeleting ? "Deleting..." : "Delete Folder"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default FolderGrid;
