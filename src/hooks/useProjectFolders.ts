
import { useState, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Folder, getFolders } from "@/services/folderService";
import { toast } from "sonner";

export const useProjectFolders = (projectId: string | undefined) => {
  const queryClient = useQueryClient();
  const [currentFolderId, setCurrentFolderId] = useState<string | null>(null);
  const [folderPath, setFolderPath] = useState<Array<{ id: string; name: string }>>(
    []
  );

  // Use react-query to fetch folders
  const { data: fetchedFolders = [], isLoading: foldersLoading } = useQuery({
    queryKey: ["folders", projectId, currentFolderId],
    queryFn: () => getFolders(projectId || "", currentFolderId),
    enabled: !!projectId,
  });

  // Use fetched folders directly
  const folders = fetchedFolders;

  const handleFolderClick = (folderId: string, folderName: string) => {
    // Add the current folder to the path
    const newPath = [...folderPath, { id: folderId, name: folderName }];
    setFolderPath(newPath);
    setCurrentFolderId(folderId);

    // Invalidate queries to fetch new data for this folder
    if (projectId) {
      queryClient.invalidateQueries({ queryKey: ["images", projectId, folderId] });
      queryClient.invalidateQueries({ queryKey: ["folders", projectId, folderId] });
    }
  };

  const handleBackToParent = () => {
    if (!currentFolderId) return;

    // Remove the last folder from the path
    const newPath = [...folderPath];
    newPath.pop();
    setFolderPath(newPath);

    // Get the parent folder ID (or null if going back to root)
    const parentId = newPath.length > 0 ? newPath[newPath.length - 1].id : null;
    setCurrentFolderId(parentId);

    // Refresh the data for the parent folder
    if (projectId) {
      queryClient.invalidateQueries({ queryKey: ["images", projectId, parentId] });
      queryClient.invalidateQueries({ queryKey: ["folders", projectId, parentId] });
    }
  };

  const navigateToPathLevel = (index: number) => {
    if (!projectId) return;

    if (index === -1) {
      // Navigate to project root
      setFolderPath([]);
      setCurrentFolderId(null);
      queryClient.invalidateQueries({ queryKey: ["images", projectId, null] });
      queryClient.invalidateQueries({ queryKey: ["folders", projectId, null] });
    } else {
      // Navigate to the specified folder level
      const newPath = folderPath.slice(0, index + 1);
      setFolderPath(newPath);
      const targetFolderId = newPath[newPath.length - 1].id;
      setCurrentFolderId(targetFolderId);
      queryClient.invalidateQueries({ queryKey: ["images", projectId, targetFolderId] });
      queryClient.invalidateQueries({ queryKey: ["folders", projectId, targetFolderId] });
    }
  };

  return {
    folders,
    foldersLoading,
    currentFolderId,
    folderPath,
    handleFolderClick,
    handleBackToParent,
    navigateToPathLevel,
  };
};
