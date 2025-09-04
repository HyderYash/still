
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Edit3, Calendar, X, CheckCircle, AlertCircle, Save, RotateCcw } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface EditProjectDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (projectName: string, projectDate: string) => void;
  initialName: string;
  initialDate: string;
}

const EditProjectDialog = ({
  isOpen,
  onClose,
  onSubmit,
  initialName,
  initialDate
}: EditProjectDialogProps) => {
  const [projectName, setProjectName] = useState(initialName);
  const [projectDate, setProjectDate] = useState(initialDate);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);

  // Reset form when modal opens/closes
  useEffect(() => {
    if (isOpen) {
      setProjectName(initialName);
      setProjectDate(initialDate);
      setHasChanges(false);
    }
  }, [isOpen, initialName, initialDate]);

  // Check for changes
  useEffect(() => {
    const nameChanged = projectName !== initialName;
    const dateChanged = projectDate !== initialDate;
    setHasChanges(nameChanged || dateChanged);
  }, [projectName, projectDate, initialName, initialDate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    console.log("Form submitted:", { projectName, projectDate, hasChanges, isValidName, isValidDate });

    if (projectName.trim() && hasChanges) {
      setIsSubmitting(true);
      try {
        console.log("Calling onSubmit with:", projectName, projectDate);
        await onSubmit(projectName, projectDate);
        console.log("onSubmit completed successfully");
        onClose();
      } catch (error) {
        console.error("Error updating project:", error);
      } finally {
        setIsSubmitting(false);
      }
    } else {
      console.log("Form validation failed:", {
        projectNameTrimmed: projectName.trim(),
        hasChanges,
        isValidName,
        isValidDate
      });
    }
  };

  const handleClose = () => {
    if (!isSubmitting) {
      onClose();
    }
  };

  const handleReset = () => {
    setProjectName(initialName);
    setProjectDate(initialDate);
    setHasChanges(false);
  };

  const projectNameLength = projectName.length;
  const isValidName = projectName.trim().length >= 3 && projectName.trim().length <= 50;
  const isValidDate = projectDate.trim().length > 0;

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="bg-[#0a0a0a]/95 backdrop-blur-xl border-[#16ad7c]/30 text-white sm:max-w-[500px] p-0 overflow-hidden">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 20 }}
          transition={{ duration: 0.3 }}
        >
          <form onSubmit={handleSubmit}>
            {/* Header with enhanced design */}
            <DialogHeader className="relative p-6 pb-4">
              {/* Background gradient */}
              <div className="absolute inset-0 bg-gradient-to-br from-[#16ad7c]/10 via-transparent to-[#5ce1e6]/5" />
              <div className="absolute inset-0 bg-gradient-to-b from-transparent to-[#0a0a0a]/50" />

              {/* Title and icon */}
              <div className="relative z-10 flex items-center gap-3">
                <div className="relative">
                  <div className="w-12 h-12 bg-gradient-to-br from-[#16ad7c] to-[#5ce1e6] rounded-xl flex items-center justify-center shadow-lg">
                    <Edit3 className="h-6 w-6 text-black" />
                  </div>
                  <div className="absolute inset-0 bg-gradient-to-br from-[#16ad7c] to-[#5ce1e6] rounded-xl blur-xl opacity-50"></div>
                </div>
                <div>
                  <DialogTitle className="text-xl font-bold text-white">
                    Edit Project
                  </DialogTitle>
                  <p className="text-gray-400 text-sm">
                    Update your project details
                  </p>
                </div>

              </div>
            </DialogHeader>

            {/* Form content */}
            <div className="p-6 pt-2 space-y-6">
              {/* Project name input */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label htmlFor="projectName" className="text-sm font-medium text-gray-300">
                    Project Name
                  </Label>
                  <div className="flex items-center gap-2">
                    <Badge
                      variant="outline"
                      className={`text-xs ${isValidName ? 'border-green-500/30 text-green-400' : 'border-gray-500/30 text-gray-400'}`}
                    >
                      {projectNameLength}/50
                    </Badge>
                    {isValidName && (
                      <CheckCircle className="h-4 w-4 text-green-400" />
                    )}
                  </div>
                </div>

                <div className="relative">
                  <Input
                    id="projectName"
                    name="projectName"
                    className={`h-12 bg-[#1a1a1a] border-2 transition-all duration-200 text-white placeholder:text-gray-500 focus:placeholder:text-gray-400 ${isValidName
                      ? 'border-green-500/50 focus:border-green-400 focus:ring-green-400/20'
                      : projectNameLength > 0
                        ? 'border-red-500/50 focus:border-red-400 focus:ring-red-400/20'
                        : 'border-[#333] focus:border-[#16ad7c] focus:ring-[#16ad7c]/20'
                      }`}
                    value={projectName}
                    onChange={(e) => setProjectName(e.target.value)}
                    placeholder="Enter project name"
                    disabled={isSubmitting}
                    autoFocus
                  />

                  {/* Input focus indicator */}
                  <div className={`absolute inset-0 rounded-md transition-all duration-200 pointer-events-none ${isValidName
                    ? 'ring-2 ring-green-400/20'
                    : projectNameLength > 0
                      ? 'ring-2 ring-red-400/20'
                      : 'ring-0'
                    }`} />
                </div>

                {/* Validation messages */}
                <AnimatePresence>
                  {projectNameLength > 0 && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      exit={{ opacity: 0, height: 0 }}
                      className="space-y-2"
                    >
                      {projectNameLength < 3 && (
                        <div className="flex items-center gap-2 text-red-400 text-sm">
                          <AlertCircle className="h-4 w-4" />
                          Project name must be at least 3 characters
                        </div>
                      )}
                      {projectNameLength > 50 && (
                        <div className="flex items-center gap-2 text-red-400 text-sm">
                          <AlertCircle className="h-4 w-4" />
                          Project name must be less than 50 characters
                        </div>
                      )}
                      {isValidName && (
                        <div className="flex items-center gap-2 text-green-400 text-sm">
                          <CheckCircle className="h-4 w-4" />
                          Name looks good!
                        </div>
                      )}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* Project date input */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label htmlFor="projectDate" className="text-sm font-medium text-gray-300">
                    Project Date
                  </Label>
                  {isValidDate && (
                    <CheckCircle className="h-4 w-4 text-green-400" />
                  )}
                </div>

                <div className="relative">
                  <div className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400">
                    <Calendar className="h-4 w-4" />
                  </div>
                  <Input
                    id="projectDate"
                    name="projectDate"
                    className={`h-12 bg-[#1d1d1d] border-2 pl-10 transition-all duration-200 text-white placeholder:text-gray-500 focus:placeholder:text-gray-400 ${isValidDate
                      ? 'border-green-500/50 focus:border-green-400 focus:ring-green-400/20'
                      : 'border-[#333] focus:border-[#16ad7c] focus:ring-[#16ad7c]/20'
                      }`}
                    value={projectDate}
                    onChange={(e) => setProjectDate(e.target.value)}
                    placeholder="e.g., Jan 15, 2024 or 2024-01-15"
                    disabled={isSubmitting}
                  />

                  {/* Input focus indicator */}
                  <div className={`absolute inset-0 rounded-md transition-all duration-200 pointer-events-none ${isValidDate
                    ? 'ring-2 ring-green-400/20'
                    : 'ring-0'
                    }`} />
                </div>

                {/* Date format suggestions */}
                <div className="text-xs text-gray-500">
                  Common formats: "Jan 15, 2024", "15/01/2024", "2024-01-15"
                </div>
              </div>

              {/* Changes indicator */}
              <AnimatePresence>
                {hasChanges && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    className="bg-[#16ad7c]/10 border border-[#16ad7c]/30 rounded-lg p-3"
                  >
                    <div className="flex items-center gap-2 text-[#16ad7c] text-sm">
                      <CheckCircle className="h-4 w-4" />
                      You have unsaved changes
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Footer actions */}
              <DialogFooter className="flex flex-col sm:flex-row gap-3 pt-4">
                <div className="flex gap-2 w-full sm:w-auto">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleReset}
                    disabled={!hasChanges || isSubmitting}
                    className="flex-1 sm:flex-none border-[#333] text-gray-400 hover:text-white hover:bg-[#333] transition-all duration-200"
                  >
                    <RotateCcw className="h-4 w-4 mr-2" />
                    Reset
                  </Button>

                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleClose}
                    disabled={isSubmitting}
                    className="flex-1 sm:flex-none border-[#333] text-gray-400 hover:text-white hover:bg-[#333] transition-all duration-200"
                  >
                    Cancel
                  </Button>
                </div>

                <Button
                  type="submit"
                  disabled={!isValidName || !isValidDate || !hasChanges || isSubmitting}
                  className="w-full sm:w-auto bg-gradient-to-r from-[#16ad7c] to-[#109d73] hover:from-[#109d73] hover:to-[#0b7d5a] text-black font-semibold transition-all duration-300 shadow-lg hover:shadow-[0_8px_25px_rgba(22,173,124,0.3)] transform hover:-translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
                >
                  <AnimatePresence mode="wait">
                    {isSubmitting ? (
                      <motion.div
                        key="loading"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="flex items-center gap-2"
                      >
                        <div className="w-4 h-4 border-2 border-black border-r-transparent rounded-full animate-spin" />
                        Saving...
                      </motion.div>
                    ) : (
                      <motion.div
                        key="default"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="flex items-center gap-2"
                      >
                        <Save className="h-4 w-4" />
                        Save Changes
                      </motion.div>
                    )}
                  </AnimatePresence>
                </Button>
              </DialogFooter>
            </div>
          </form>
        </motion.div>
      </DialogContent>
    </Dialog>
  );
};

export default EditProjectDialog;
