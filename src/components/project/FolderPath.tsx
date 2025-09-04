
import React from "react";
import { Button } from "@/components/ui/button";
import { ChevronRight } from "lucide-react";

interface FolderPathProps {
  projectName: string;
  folderPath: Array<{ id: string; name: string }>;
  navigateToLevel: (index: number) => void;
}

const FolderPath: React.FC<FolderPathProps> = ({ 
  projectName, 
  folderPath, 
  navigateToLevel 
}) => {
  return (
    <div className="flex items-center space-x-2 mb-4 overflow-x-auto whitespace-nowrap py-2">
      <Button
        variant="ghost"
        size="sm"
        className="hover:bg-[#16ad7c]/20 text-white font-medium"
        onClick={() => navigateToLevel(-1)}
      >
        {projectName}
      </Button>

      {folderPath.map((folder, index) => (
        <div key={folder.id} className="flex items-center">
          <ChevronRight className="mx-1 text-gray-400 h-4 w-4" />
          <Button
            variant="ghost"
            size="sm"
            className="hover:bg-[#16ad7c]/20 text-white font-medium"
            onClick={() => navigateToLevel(index)}
          >
            {folder.name}
          </Button>
        </div>
      ))}
    </div>
  );
};

export default FolderPath;
