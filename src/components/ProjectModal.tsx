
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { FolderPlus, Sparkles, X, CheckCircle, AlertCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface ProjectModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (projectName: string) => void;
}

const ProjectModal = ({ isOpen, onClose, onSubmit }: ProjectModalProps) => {
  const [projectName, setProjectName] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (projectName.trim()) {
      setIsSubmitting(true);
      try {
        await onSubmit(projectName);
        setShowSuccess(true);
        setTimeout(() => {
          setShowSuccess(false);
          setProjectName("");
          onClose();
        }, 1500);
      } catch (error) {
        console.error("Error creating project:", error);
      } finally {
        setIsSubmitting(false);
      }
    }
  };

  const handleClose = () => {
    if (!isSubmitting) {
      setProjectName("");
      onClose();
    }
  };

  const projectNameLength = projectName.length;
  const isValidName = projectName.trim().length >= 3 && projectName.trim().length <= 50;

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="bg-[#0a0a0a]/95 backdrop-blur-xl border-[#16ad7c]/30 text-white sm:max-w-[500px] p-0 overflow-hidden">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 20 }}
          transition={{ duration: 0.3 }}
        >
          {/* Header with enhanced design */}
          <DialogHeader className="relative p-6 pb-4">
            {/* Background gradient */}
            <div className="absolute inset-0 bg-gradient-to-br from-[#16ad7c]/10 via-transparent to-[#5ce1e6]/5" />
            <div className="absolute inset-0 bg-gradient-to-b from-transparent to-[#0a0a0a]/50" />

            {/* Title and icon */}
            <div className="relative z-10 flex items-center gap-3">
              <div className="relative">
                <div className="w-12 h-12 bg-gradient-to-br from-[#16ad7c] to-[#5ce1e6] rounded-xl flex items-center justify-center shadow-lg">
                  <FolderPlus className="h-6 w-6 text-black" />
                </div>
                <div className="absolute inset-0 bg-gradient-to-br from-[#16ad7c] to-[#5ce1e6] rounded-xl blur-xl opacity-50"></div>
              </div>
              <div>
                <DialogTitle className="text-2xl font-bold text-white">
                  Create New Project
                </DialogTitle>
                <p className="text-gray-400 text-sm mt-1">
                  Start organizing your creative work
                </p>
              </div>
            </div>
          </DialogHeader>

          {/* Form content */}
          <form onSubmit={handleSubmit} className="p-6 pt-2 space-y-6">
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
                  className={`h-12 bg-[#1a1a1a] border-2 transition-all duration-200 text-white placeholder:text-gray-500 focus:placeholder:text-gray-400 ${isValidName
                    ? 'border-green-500/50 focus:border-green-400 focus:ring-green-400/20'
                    : projectNameLength > 0
                      ? 'border-red-500/50 focus:border-red-400 focus:ring-red-400/20'
                      : 'border-[#333] focus:border-[#16ad7c] focus:ring-[#16ad7c]/20'
                    }`}
                  value={projectName}
                  onChange={(e) => setProjectName(e.target.value)}
                  placeholder="e.g., Wedding Photography 2024, Film Project Alpha"
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
                        Perfect! Ready to create
                      </div>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Footer actions */}
            <DialogFooter className="flex flex-col sm:flex-row gap-3 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={handleClose}
                disabled={isSubmitting}
                className="w-full sm:w-auto border-[#333] text-gray-400 hover:text-white hover:bg-[#333] transition-all duration-200"
              >
                Cancel
              </Button>

              <Button
                type="submit"
                disabled={!isValidName || isSubmitting}
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
                      Creating...
                    </motion.div>
                  ) : showSuccess ? (
                    <motion.div
                      key="success"
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.8 }}
                      className="flex items-center gap-2"
                    >
                      <CheckCircle className="h-4 w-4" />
                      Project Created!
                    </motion.div>
                  ) : (
                    <motion.div
                      key="default"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className="flex items-center gap-2"
                    >
                      <Sparkles className="h-4 w-4" />
                      Create Project
                    </motion.div>
                  )}
                </AnimatePresence>
              </Button>
            </DialogFooter>
          </form>
        </motion.div>
      </DialogContent>
    </Dialog>
  );
};

export default ProjectModal;
