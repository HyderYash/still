import React from "react";
import { Button } from "@/components/ui/button";
import { Toggle } from "@/components/ui/toggle";
import {
  ArrowLeft,
  Pen,
  Grid2X2,
  Rows,
  FolderPlus,
  MoreHorizontal,
  Image,
} from "lucide-react";
import ProjectActions from "@/components/ProjectActions";
import { useNavigate } from "react-router-dom";
import { useMediaQuery } from "@/hooks/useMediaQuery";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface ProjectHeaderProps {
  projectName: string;
  projectDate: string;
  projectId: string;
  isInFolder: boolean;
  onBack: () => void;
  onRename: () => void;
  onDelete: (projectId: string) => void;
  onArchive: (projectId: string) => void;
  onLayoutChange: (layout: "grid" | "rows") => void;
  currentLayout: "grid" | "rows";
  onCreateFolder: () => void;
  onAddImage?: () => void;
  hasImages: boolean;
  canAddImages?: boolean;
  canEditProject?: boolean;
  onThumbnailChange?: () => void;
}

const ProjectHeader: React.FC<ProjectHeaderProps> = ({
  projectName,
  projectDate,
  projectId,
  isInFolder,
  onBack,
  onRename,
  onDelete,
  onArchive,
  onLayoutChange,
  currentLayout,
  onCreateFolder,
  onAddImage,
  hasImages,
  canAddImages,
  canEditProject = true,
  onThumbnailChange,
}) => {
  const navigate = useNavigate();
  const isMobile = useMediaQuery("(max-width: 768px)");

  const handleBackNavigation = () => {
    window.history.back();
  };

  return (
    <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 md:gap-0 mb-8">
      <div className="flex items-center space-x-4 w-full md:w-auto">
        {isInFolder ? (
          <Button
            onClick={onBack}
            variant="outline"
            className="border-[#16ad7c]/50 hover:bg-[#16ad7c]/20 text-white font-medium btn-hover"
            size={isMobile ? "sm" : "default"}
          >
            <ArrowLeft className={`${isMobile ? "h-3 w-3" : "h-4 w-4"} mr-2`} />{" "}
            Back
          </Button>
        ) : (
          <Button
            onClick={handleBackNavigation}
            variant="outline"
            className="border-[#16ad7c]/50 hover:bg-[#16ad7c]/20 text-white font-medium btn-hover"
            size={isMobile ? "sm" : "default"}
          >
            <ArrowLeft className={`${isMobile ? "h-3 w-3" : "h-4 w-4"} mr-2`} />{" "}
            Back
          </Button>
        )}
        <div className="flex items-center space-x-2">
          <h1 className="text-xl md:text-3xl font-bold gradient-text truncate max-w-[150px] md:max-w-[300px] lg:max-w-none">
            {projectName}
          </h1>
          <Button
            variant="ghost"
            size="sm"
            className="hover:bg-[#16ad7c]/20 p-0 w-8 h-8"
            onClick={onRename}
          >
            <Pen className="h-4 w-4 text-[#83ebc4]" />
          </Button>
        </div>
        <span className="text-muted-foreground text-xs md:text-sm hidden sm:inline-block">
          {projectDate}
        </span>
      </div>

      {isMobile ? (
        <div className="flex justify-between items-center w-full">
          <div className="border border-[#16ad7c]/50 rounded-md flex">
            <Toggle
              pressed={currentLayout === "grid"}
              onPressedChange={() => onLayoutChange("grid")}
              className="hover:bg-[#16ad7c]/20 hover:text-white data-[state=on]:bg-[#16ad7c]/30 data-[state=on]:text-white"
              size="sm"
            >
              <Grid2X2 className="h-3 w-3" />
            </Toggle>
            <Toggle
              pressed={currentLayout === "rows"}
              onPressedChange={() => onLayoutChange("rows")}
              className="hover:bg-[#16ad7c]/20 hover:text-white data-[state=on]:bg-[#16ad7c]/30 data-[state=on]:text-white"
              size="sm"
            >
              <Rows className="h-3 w-3" />
            </Toggle>
          </div>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="ml-auto">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent
              align="end"
              className="bg-[#1E1E1E] border-[#333] text-white"
            >
              {!isInFolder && canEditProject && (
                <DropdownMenuItem
                  onClick={() => onDelete(projectId)}
                  className="text-red-400 cursor-pointer"
                >
                  Delete Project
                </DropdownMenuItem>
              )}
              {!isInFolder && canEditProject && (
                <DropdownMenuItem
                  onClick={() => onArchive(projectId)}
                  className="cursor-pointer"
                >
                  Archive Project
                </DropdownMenuItem>
              )}
              {canAddImages && (
                <DropdownMenuItem
                  onClick={onCreateFolder}
                  className="cursor-pointer"
                >
                  <FolderPlus className="mr-2 h-4 w-4" />
                  New Folder
                </DropdownMenuItem>
              )}
              {hasImages && onThumbnailChange && (
                <DropdownMenuItem
                  onClick={onThumbnailChange}
                  className="cursor-pointer"
                >
                  <Image className="mr-2 h-4 w-4" />
                  Change Thumbnail
                </DropdownMenuItem>
              )}

            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      ) : (
        <div className="flex items-center space-x-3">
          {!isInFolder && (
            <ProjectActions
              projectId={projectId}
              projectName={projectName}
              onRename={onRename}
              onDelete={onDelete}
              onArchive={onArchive}
              stopPropagation={false}
              canEditProject={canEditProject}
            />
          )}

          <div className="border border-[#16ad7c]/50 rounded-md flex">
            <Toggle
              pressed={currentLayout === "grid"}
              onPressedChange={() => onLayoutChange("grid")}
              className="hover:bg-[#16ad7c]/20 hover:text-white data-[state=on]:bg-[#16ad7c]/30 data-[state=on]:text-white"
            >
              <Grid2X2 className="h-4 w-4" />
            </Toggle>
            <Toggle
              pressed={currentLayout === "rows"}
              onPressedChange={() => onLayoutChange("rows")}
              className="hover:bg-[#16ad7c]/20 hover:text-white data-[state=on]:bg-[#16ad7c]/30 data-[state=on]:text-white"
            >
              <Rows className="h-4 w-4" />
            </Toggle>
          </div>

          {canAddImages && (
            <Button
              onClick={onCreateFolder}
              className="bg-[#16ad7c] hover:bg-[#16ad7c]/80 text-black font-medium transition-all duration-300 btn-hover"
            >
              <FolderPlus className="mr-2 h-4 w-4" />
              New Folder
            </Button>
          )}

          {hasImages && onThumbnailChange && (
            <Button
              onClick={onThumbnailChange}
              variant="outline"
              className="border-[#16ad7c]/50 hover:bg-[#16ad7c]/20 text-white font-medium btn-hover"
            >
              <Image className="mr-2 h-4 w-4" />
              Change Thumbnail
            </Button>
          )}


        </div>
      )}
    </div>
  );
};

export default ProjectHeader;
