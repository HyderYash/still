
import React, { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";

interface CreateFolderDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onCreateFolder: (folderName: string) => void;
}

const CreateFolderDialog: React.FC<CreateFolderDialogProps> = ({
  isOpen,
  onOpenChange,
  onCreateFolder,
}) => {
  const [folderName, setFolderName] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (folderName.trim()) {
      onCreateFolder(folderName);
      setFolderName("");
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="bg-black/90 backdrop-blur-md border-[#16ad7c]/50 text-white sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold gradient-text">
            Create New Folder
          </DialogTitle>
          <DialogDescription className="text-gray-400">
            Create a new folder to organize your project images.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="folderName" className="text-sm text-[#83ebc4]">
              Folder Name
            </Label>
            <Input
              id="folderName"
              className="bg-[#262626] border-[#16ad7c]/50 focus-visible:ring-[#83ebc4] text-white"
              value={folderName}
              onChange={(e) => setFolderName(e.target.value)}
              placeholder="Enter folder name"
            />
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="border-[#16ad7c]/50 hover:bg-[#16ad7c]/20 text-gray-300 hover:text-white transition-colors"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              className="bg-[#16ad7c] hover:bg-[#16ad7c]/80 text-black font-medium transition-colors"
              disabled={!folderName.trim()}
            >
              Create Folder
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default CreateFolderDialog;
