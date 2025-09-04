import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from "@/components/ui/dropdown-menu";
import { MoreVertical, Pen, Trash2, Archive, Settings, Copy, Eye, EyeOff, Share2, Download, Info } from "lucide-react";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

interface ProjectActionsProps {
  projectId: string;
  projectName: string;
  onRename: (projectId: string) => void;
  onDelete: (projectId: string) => void;
  onArchive: (projectId: string) => void;
  stopPropagation?: boolean;
  canEditProject?: boolean;
  projectVisibility?: string;
  isShared?: boolean;
}

const menuItemVariants = {
  hidden: { y: -5, opacity: 0, scale: 0.95 },
  visible: (i: number) => ({
    y: 0,
    opacity: 1,
    scale: 1,
    transition: {
      delay: i * 0.05,
      duration: 0.2,
      type: "spring",
      stiffness: 300,
      damping: 25
    }
  })
};

const ProjectActions = ({
  projectId,
  projectName,
  onRename,
  onDelete,
  onArchive,
  stopPropagation = true,
  canEditProject = true,
  projectVisibility = "private",
  isShared = false
}: ProjectActionsProps) => {
  const handleAction = (e: React.MouseEvent, action: () => void) => {
    if (stopPropagation) {
      e.stopPropagation();
    }
    action();
  };

  const handleCopyProjectId = () => {
    navigator.clipboard.writeText(projectId);
    toast.success("Project ID copied to clipboard");
  };

  const handleCopyProjectName = () => {
    navigator.clipboard.writeText(projectName);
    toast.success("Project name copied to clipboard");
  };

  // If user can't edit the project, don't show any actions 
  if (!canEditProject) {
    return null;
  }

  return (
    <DropdownMenu>
      <Tooltip>
        <TooltipTrigger asChild>
          <DropdownMenuTrigger
            className="focus:outline-none group relative"
            onClick={stopPropagation ? (e) => e.stopPropagation() : undefined}
          >
            <motion.div
              className="p-2 rounded-full bg-black/60 backdrop-blur-md hover:bg-[#16ad7c]/20 border border-transparent hover:border-[#16ad7c]/40 transition-all duration-300 cursor-pointer"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              <MoreVertical className="h-5 w-5 text-gray-300 group-hover:text-white transition-colors" />

              {/* Hover indicator */}
              <div className="absolute inset-0 rounded-full bg-[#16ad7c]/20 opacity-0 group-hover:opacity-100 transition-opacity duration-300 blur-sm" />
            </motion.div>
          </DropdownMenuTrigger>
        </TooltipTrigger>
        <TooltipContent side="left" className="bg-[#1a1a1a] border-[#333] text-white">
          Project actions
        </TooltipContent>
      </Tooltip>

      <DropdownMenuContent
        className="w-64 bg-[#0a0a0a]/95 backdrop-blur-xl border-[#16ad7c]/30 text-white rounded-xl shadow-[0_25px_60px_-15px_rgba(0,0,0,0.8)] p-2 animate-in zoom-in-90 duration-200"
        sideOffset={8}
      >
        {/* Header with project info */}
        <div className="px-3 py-2 mb-2">
          <div className="flex items-center justify-between mb-1">
            <span className="text-sm font-medium text-gray-300">Actions for</span>
            <Badge
              variant="outline"
              className={`text-xs ${projectVisibility === "public"
                ? "border-green-500/30 text-green-400"
                : "border-blue-500/30 text-blue-400"
                }`}
            >
              {projectVisibility === "public" ? "Public" : "Private"}
            </Badge>
          </div>
          <p className="text-white font-medium text-sm truncate" title={projectName}>
            {projectName}
          </p>
          {isShared && (
            <div className="flex items-center gap-1 mt-1">
              <Share2 className="h-3 w-3 text-blue-400" />
              <span className="text-xs text-blue-400">Shared project</span>
            </div>
          )}
        </div>

        <DropdownMenuSeparator className="bg-[#333] my-2" />

        <motion.div
          initial="hidden"
          animate="visible"
          variants={{
            visible: {
              transition: {
                staggerChildren: 0.05
              }
            }
          }}
        >
          {/* Edit Actions */}
          <motion.div variants={menuItemVariants} custom={0}>
            <DropdownMenuItem
              className="cursor-pointer hover:bg-[#16ad7c]/20 focus:bg-[#16ad7c]/20 rounded-lg px-3 py-3 transition-all duration-200 group"
              onClick={(e) => handleAction(e, () => onRename(projectId))}
            >
              <div className="flex items-center justify-between w-full">
                <div className="flex items-center">
                  <div className="w-8 h-8 bg-[#16ad7c]/20 rounded-lg flex items-center justify-center mr-3 group-hover:bg-[#16ad7c]/30 transition-colors">
                    <Pen className="h-4 w-4 text-[#16ad7c] group-hover:text-[#1de9a8] transition-colors" />
                  </div>
                  <span className="group-hover:translate-x-0.5 transition-transform duration-200">Rename Project</span>
                </div>
                <Badge variant="outline" className="text-xs border-[#16ad7c]/30 text-[#16ad7c] opacity-0 group-hover:opacity-100 transition-opacity">
                  Edit
                </Badge>
              </div>
            </DropdownMenuItem>
          </motion.div>

          {/* Archive Action */}
          <motion.div variants={menuItemVariants} custom={1}>
            <DropdownMenuItem
              className="cursor-pointer hover:bg-orange-500/10 focus:bg-orange-500/10 rounded-lg px-3 py-3 transition-all duration-200 group"
              onClick={(e) => handleAction(e, () => onArchive(projectId))}
            >
              <div className="flex items-center justify-between w-full">
                <div className="flex items-center">
                  <div className="w-8 h-8 bg-orange-500/20 rounded-lg flex items-center justify-center mr-3 group-hover:bg-orange-500/30 transition-colors">
                    <Archive className="h-4 w-4 text-orange-400 group-hover:text-orange-300 transition-colors" />
                  </div>
                  <span className="group-hover:translate-x-0.5 transition-transform duration-200">Archive Project</span>
                </div>
                <Badge variant="outline" className="text-xs border-orange-500/30 text-orange-400 opacity-0 group-hover:opacity-100 transition-opacity">
                  Store
                </Badge>
              </div>
            </DropdownMenuItem>
          </motion.div>

          {/* Copy Actions */}
          <motion.div variants={menuItemVariants} custom={2}>
            <DropdownMenuItem
              className="cursor-pointer hover:bg-blue-500/10 focus:bg-blue-500/10 rounded-lg px-3 py-3 transition-all duration-200 group"
              onClick={handleCopyProjectName}
            >
              <div className="flex items-center justify-between w-full">
                <div className="flex items-center">
                  <div className="w-8 h-8 bg-blue-500/20 rounded-lg flex items-center justify-center mr-3 group-hover:bg-blue-500/30 transition-colors">
                    <Copy className="h-4 w-4 text-blue-400 group-hover:text-blue-300 transition-colors" />
                  </div>
                  <span className="group-hover:translate-x-0.5 transition-transform duration-200">Copy Name</span>
                </div>
                <Badge variant="outline" className="text-xs border-blue-500/30 text-blue-400 opacity-0 group-hover:opacity-100 transition-opacity">
                  Copy
                </Badge>
              </div>
            </DropdownMenuItem>
          </motion.div>

          <motion.div variants={menuItemVariants} custom={3}>
            <DropdownMenuItem
              className="cursor-pointer hover:bg-purple-500/10 focus:bg-purple-500/10 rounded-lg px-3 py-3 transition-all duration-200 group"
              onClick={handleCopyProjectId}
            >
              <div className="flex items-center justify-between w-full">
                <div className="flex items-center">
                  <div className="w-8 h-8 bg-purple-500/20 rounded-lg flex items-center justify-center mr-3 group-hover:bg-purple-500/30 transition-colors">
                    <Info className="h-4 w-4 text-purple-400 group-hover:text-purple-300 transition-colors" />
                  </div>
                  <span className="group-hover:translate-x-0.5 transition-transform duration-200">Copy Project ID</span>
                </div>
                <Badge variant="outline" className="text-xs border-purple-500/30 text-purple-400 opacity-0 group-hover:opacity-100 transition-opacity">
                  ID
                </Badge>
              </div>
            </DropdownMenuItem>
          </motion.div>

          <DropdownMenuSeparator className="bg-[#333] my-2" />

          {/* Destructive Actions */}
          <motion.div variants={menuItemVariants} custom={4}>
            <DropdownMenuItem
              className="cursor-pointer text-red-400 hover:bg-red-500/10 focus:bg-red-500/10 rounded-lg px-3 py-3 transition-all duration-200 group"
              onClick={(e) => handleAction(e, () => onDelete(projectId))}
            >
              <div className="flex items-center justify-between w-full">
                <div className="flex items-center">
                  <div className="w-8 h-8 bg-red-500/20 rounded-lg flex items-center justify-center mr-3 group-hover:bg-red-500/30 transition-colors">
                    <Trash2 className="h-4 w-4 group-hover:text-red-300 transition-colors" />
                  </div>
                  <span className="group-hover:translate-x-0.5 transition-transform duration-200">Delete Project</span>
                </div>
                <Badge variant="outline" className="text-xs border-red-500/30 text-red-400 opacity-0 group-hover:opacity-100 transition-opacity">
                  Delete
                </Badge>
              </div>
            </DropdownMenuItem>
          </motion.div>
        </motion.div>

        {/* Footer */}
        <div className="px-3 py-2 mt-2 border-t border-[#333]">
          <p className="text-xs text-gray-500 text-center">
            Project ID: {projectId.slice(0, 8)}...
          </p>
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

export default ProjectActions;
