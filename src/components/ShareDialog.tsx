import React, { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  CheckIcon,
  Copy,
  Link,
  Mail,
  Send,
  UserPlus,
  X,
  Lock,
  Eye,
  Users,
  Globe,
  Shield,
  Share2,
  AlertCircle,
  CheckCircle,
  Clock,
  XCircle
} from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { motion, AnimatePresence } from "framer-motion";
import {
  shareProject,
  updateProjectVisibility,
  getProjectShares
} from "@/services/projectShareService";
import { supabase } from "@/integrations/supabase/client";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

// Define ProjectData type
type ProjectData = {
  id: string;
  name: string;
  date: string;
  images: Array<{
    id: string;
    url: string;
    name: string;
    blob?: string;
  }>;
  folders?: Array<{
    id: string;
    name: string;
  }>;
  archived?: boolean;
  visibility?: 'private' | 'public';
  thumbnailUrl?: string;
};

interface ShareDialogProps {
  isOpen: boolean;
  onClose: () => void;
  projectName: string;
  projectId: string;
  onVisibilityChange?: (visibility: 'private' | 'public') => void;
}

const ShareDialog = ({ isOpen, onClose, projectName, projectId, onVisibilityChange }: ShareDialogProps) => {
  const [email, setEmail] = useState("");
  const [emails, setEmails] = useState<string[]>([]);
  const [sharedEmails, setSharedEmails] = useState<{ email: string, status: string }[]>([]);
  const [copied, setCopied] = useState(false);
  const [visibility, setVisibility] = useState<'private' | 'public'>('private');
  const [isLoading, setIsLoading] = useState(false);
  const [project, setProject] = useState<ProjectData | null>(null);

  const shareLink = `${window.location.origin}/project/${projectId}`;

  useEffect(() => {
    if (isOpen && projectId) {
      fetchProjectDetails();
    }
  }, [isOpen, projectId]);

  const fetchProjectDetails = async () => {
    setIsLoading(true);
    console.log("Fetching project details");
    try {
      // Fetch project details
      const { data: projectData, error } = await supabase
        .from("projects")
        .select("*")
        .eq("id", projectId)
        .single();

      if (error) throw error;

      setProject({
        ...projectData,
        date: new Date(projectData.created_at).toLocaleDateString("en-US", {
          month: "short",
          day: "numeric",
          year: "numeric",
        }),
        images: [],
        folders: []
      });
      setVisibility(projectData.visibility || 'private');

      // Get existing shares
      const shares = await getProjectShares(projectId);
      setSharedEmails(shares);
    } catch (error) {
      console.error("Error fetching project details:", error);
      toast.error("Failed to load project details");
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddEmail = () => {
    if (email && !emails.includes(email) && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      // Check if email is already in sharedEmails
      const alreadyShared = sharedEmails.some(item => item.email.toLowerCase() === email.toLowerCase());

      if (alreadyShared) {
        toast.error("This email is already shared with this project");
        return;
      }

      setEmails([...emails, email]);
      setEmail("");
    } else if (email) {
      toast.error("Please enter a valid email address");
    }
  };

  const handleRemoveEmail = (emailToRemove: string) => {
    setEmails(emails.filter(e => e !== emailToRemove));
  };

  const handleCopyLink = () => {
    navigator.clipboard.writeText(shareLink)
      .then(() => {
        setCopied(true);
        toast.success("Link copied to clipboard!");
        setTimeout(() => setCopied(false), 2000);
      })
      .catch(err => {
        toast.error("Failed to copy link");
        console.error('Failed to copy: ', err);
      });
  };

  const handleSendEmails = async () => {
    if (emails.length === 0) {
      toast.error("Please add at least one email address");
      return;
    }

    setIsLoading(true);

    try {
      // Send share requests to all emails
      for (const email of emails) {
        await shareProject(projectId, email);
      }

      setEmails([]);
      fetchProjectDetails(); // Refetch to update shared emails list
      toast.success("Project shared successfully");
    } catch (error) {
      console.error("Error sharing project:", error);
      toast.error("An error occurred while sharing the project");
    } finally {
      setIsLoading(false);
    }
  };

  const handleVisibilityChange = async (value: 'private' | 'public') => {
    setIsLoading(true);

    try {
      const success = await updateProjectVisibility(projectId, value);

      if (success) {
        setVisibility(value);
        fetchProjectDetails(); // Refetch project data after changing visibility
        onVisibilityChange?.(value); // Notify parent component of visibility change
        toast.success(`Project visibility updated to ${value}`);
      }
    } catch (error) {
      console.error("Error updating project visibility:", error);
      toast.error("Failed to update project visibility");
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && email) {
      e.preventDefault();
      handleAddEmail();
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'accepted':
        return <CheckCircle className="h-3 w-3 text-green-400" />;
      case 'rejected':
        return <XCircle className="h-3 w-3 text-red-400" />;
      case 'pending':
        return <Clock className="h-3 w-3 text-yellow-400" />;
      default:
        return <Clock className="h-3 w-3 text-blue-400" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'accepted':
        return 'bg-green-500/20 text-green-400 border-green-500/30';
      case 'rejected':
        return 'bg-red-500/20 text-red-400 border-red-500/30';
      case 'pending':
        return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30';
      default:
        return 'bg-blue-500/20 text-blue-400 border-blue-500/30';
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-2xl bg-[#0a0a0a]/95 backdrop-blur-xl border-[#16ad7c]/30 text-white p-0 overflow-hidden">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 20 }}
          transition={{ duration: 0.3 }}
        >
          {/* Enhanced Header */}
          <DialogHeader className="relative p-6 pb-4">
            {/* Background gradient */}
            <div className="absolute inset-0 bg-gradient-to-br from-[#16ad7c]/10 via-transparent to-[#5ce1e6]/5" />
            <div className="absolute inset-0 bg-gradient-to-b from-transparent to-[#0a0a0a]/50" />

            {/* Title and icon */}
            <div className="relative z-10 flex items-center gap-3">
              <div className="relative">
                <div className="w-12 h-12 bg-gradient-to-br from-[#16ad7c] to-[#5ce1e6] rounded-xl flex items-center justify-center shadow-lg">
                  <Share2 className="h-6 w-6 text-black" />
                </div>
                <div className="absolute inset-0 bg-gradient-to-br from-[#16ad7c] to-[#5ce1e6] rounded-xl blur-xl opacity-50"></div>
              </div>
              <div>
                <DialogTitle className="text-2xl font-bold text-white">
                  Share Project
                </DialogTitle>
                <p className="text-gray-400 text-sm mt-1">
                  "{projectName}" - Choose how to share your work
                </p>
              </div>
            </div>
          </DialogHeader>

          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-16">
              <div className="relative">
                <div className="animate-spin rounded-full h-16 w-16 border-4 border-[#16ad7c]/20 border-t-[#16ad7c]"></div>
                <div className="absolute inset-0 rounded-full border-4 border-transparent border-t-[#5ce1e6] animate-spin" style={{ animationDirection: 'reverse', animationDuration: '1.5s' }}></div>
              </div>
              <p className="text-gray-400 mt-4 text-lg">Loading project details...</p>
            </div>
          ) : (
            <div className="p-6 pt-2 space-y-6">
              {/* Project Visibility Section */}
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <Shield className="h-5 w-5 text-[#16ad7c]" />
                  <Label className="text-lg font-semibold text-white">Project Visibility</Label>
                </div>

                <RadioGroup
                  value={visibility}
                  onValueChange={(value) => handleVisibilityChange(value as 'private' | 'public')}
                  className="grid grid-cols-1 md:grid-cols-2 gap-4"
                >
                  <motion.div
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    className={`relative cursor-pointer rounded-xl p-4 border-2 transition-all duration-300 ${visibility === 'private'
                      ? 'border-[#16ad7c] bg-[#16ad7c]/10'
                      : 'border-[#333] bg-[#1a1a1a] hover:border-[#16ad7c]/30'
                      }`}
                    onClick={() => handleVisibilityChange('private')}
                  >
                    <RadioGroupItem value="private" id="private" className="sr-only" />
                    <div className="flex items-start gap-3">
                      <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${visibility === 'private' ? 'bg-[#16ad7c] text-black' : 'bg-[#333] text-gray-400'
                        }`}>
                        <Lock className="h-5 w-5" />
                      </div>
                      <div className="flex-1">
                        <Label htmlFor="private" className="cursor-pointer">
                          <div className="font-semibold text-white mb-1">Private</div>
                          <div className="text-sm text-gray-400">Only people you invite can access</div>
                        </Label>
                      </div>
                    </div>
                    {visibility === 'private' && (
                      <motion.div
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="absolute top-2 right-2 w-4 h-4 bg-[#16ad7c] rounded-full flex items-center justify-center"
                      >
                        <CheckIcon className="h-2.5 w-2.5 text-black" />
                      </motion.div>
                    )}
                  </motion.div>

                  <motion.div
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    className={`relative cursor-pointer rounded-xl p-4 border-2 transition-all duration-300 ${visibility === 'public'
                      ? 'border-[#16ad7c] bg-[#16ad7c]/10'
                      : 'border-[#333] bg-[#1a1a1a] hover:border-[#16ad7c]/30'
                      }`}
                    onClick={() => handleVisibilityChange('public')}
                  >
                    <RadioGroupItem value="public" id="public" className="sr-only" />
                    <div className="flex items-start gap-3">
                      <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${visibility === 'public' ? 'bg-[#16ad7c] text-black' : 'bg-[#333] text-gray-400'
                        }`}>
                        <Globe className="h-5 w-5" />
                      </div>
                      <div className="flex-1">
                        <Label htmlFor="public" className="cursor-pointer">
                          <div className="font-semibold text-white mb-1">Public</div>
                          <div className="text-sm text-gray-400">Anyone with the link can view</div>
                        </Label>
                      </div>
                    </div>
                    {visibility === 'public' && (
                      <motion.div
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="absolute top-2 right-2 w-4 h-4 bg-[#16ad7c] rounded-full flex items-center justify-center"
                      >
                        <CheckIcon className="h-2.5 w-2.5 text-black" />
                      </motion.div>
                    )}
                  </motion.div>
                </RadioGroup>
              </div>

              {/* Public Link Section */}
              <AnimatePresence>
                {visibility === "public" && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    className="space-y-4 p-4 bg-blue-500/10 border border-blue-500/20 rounded-xl"
                  >
                    <div className="flex items-center gap-2">
                      <Eye className="h-5 w-5 text-blue-400" />
                      <Label className="text-lg font-semibold text-white">Public Link</Label>
                      <Badge className="bg-blue-500/20 text-blue-400 border-blue-500/30 px-2 py-0.5">
                        <Globe className="h-3 w-3 mr-1" /> Public
                      </Badge>
                    </div>

                    <div className="flex items-center gap-2">
                      <div className="relative flex-1">
                        <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
                          <Link className="h-4 w-4" />
                        </div>
                        <Input
                          value={shareLink}
                          className="pl-10 pr-24 h-12 bg-[#1a1a1a] border-[#333] text-white focus:border-blue-400 focus:ring-blue-400/20"
                          readOnly
                        />
                        <Button
                          className="absolute right-1 top-1/2 -translate-y-1/2 h-10 bg-blue-500 hover:bg-blue-600 text-white transition-all duration-200"
                          size="sm"
                          onClick={handleCopyLink}
                        >
                          <AnimatePresence mode="wait">
                            {copied ? (
                              <motion.div
                                key="copied"
                                initial={{ opacity: 0, scale: 0.8 }}
                                animate={{ opacity: 1, scale: 1 }}
                                exit={{ opacity: 0, scale: 0.8 }}
                                className="flex items-center gap-1"
                              >
                                <CheckIcon className="h-4 w-4" />
                                Copied!
                              </motion.div>
                            ) : (
                              <motion.div
                                key="copy"
                                initial={{ opacity: 0, scale: 0.8 }}
                                animate={{ opacity: 1, scale: 1 }}
                                exit={{ opacity: 0, scale: 0.8 }}
                                className="flex items-center gap-1"
                              >
                                <Copy className="h-4 w-4" />
                                Copy
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </Button>
                      </div>
                    </div>

                    <p className="text-sm text-blue-300/80">
                      Share this link with anyone to give them view access to your project
                    </p>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Private Sharing Section */}
              <AnimatePresence>
                {visibility === "private" && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    className="space-y-4"
                  >
                    <div className="flex items-center gap-2">
                      <Users className="h-5 w-5 text-[#16ad7c]" />
                      <Label className="text-lg font-semibold text-white">Invite People</Label>
                    </div>

                    <div className="flex items-center gap-2">
                      <div className="relative flex-1">
                        <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
                          <Mail className="h-4 w-4" />
                        </div>
                        <Input
                          placeholder="Enter email address"
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          onKeyDown={handleKeyDown}
                          className="pl-10 h-12 bg-[#1a1a1a] border-[#333] text-white focus:border-[#16ad7c] focus:ring-[#16ad7c]/20 placeholder:text-gray-500"
                        />
                      </div>
                      <Button
                        className="h-12 px-6 bg-[#16ad7c] hover:bg-[#16ad7c]/80 text-black font-semibold transition-all duration-200"
                        onClick={handleAddEmail}
                        disabled={!email.trim()}
                      >
                        <UserPlus className="h-4 w-4 mr-2" />
                        Add
                      </Button>
                    </div>

                    {/* New Recipients */}
                    <AnimatePresence>
                      {emails.length > 0 && (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: "auto" }}
                          exit={{ opacity: 0, height: 0 }}
                          className="space-y-3"
                        >
                          <Label className="text-sm font-medium text-gray-300">New Recipients ({emails.length})</Label>
                          <div className="flex flex-wrap gap-2">
                            {emails.map((email, index) => (
                              <motion.div
                                key={email}
                                initial={{ opacity: 0, scale: 0.8, y: 10 }}
                                animate={{ opacity: 1, scale: 1, y: 0 }}
                                exit={{ opacity: 0, scale: 0.8, y: -10 }}
                                transition={{ delay: index * 0.1 }}
                                className="inline-flex items-center gap-2 bg-[#16ad7c]/20 border border-[#16ad7c]/30 text-[#16ad7c] text-sm px-3 py-2 rounded-lg"
                              >
                                <Mail className="h-3 w-3" />
                                {email}
                                <button
                                  onClick={() => handleRemoveEmail(email)}
                                  className="text-[#16ad7c] hover:text-[#16ad7c]/80 transition-colors"
                                >
                                  <X className="h-3 w-3" />
                                </button>
                              </motion.div>
                            ))}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>

                    {/* Existing Shares */}
                    {sharedEmails.length > 0 && (
                      <div className="space-y-3">
                        <Label className="text-sm font-medium text-gray-300">Already Shared ({sharedEmails.length})</Label>
                        <div className="grid gap-2">
                          {sharedEmails.map((share) => (
                            <motion.div
                              key={share.email}
                              initial={{ opacity: 0, x: -20 }}
                              animate={{ opacity: 1, x: 0 }}
                              className="flex items-center justify-between p-3 bg-[#1a1a1a] border border-[#333] rounded-lg"
                            >
                              <div className="flex items-center gap-3">
                                <div className="w-8 h-8 bg-[#333] rounded-full flex items-center justify-center">
                                  <Mail className="h-4 w-4 text-gray-400" />
                                </div>
                                <span className="text-white font-medium">{share.email}</span>
                              </div>
                              <Badge className={`text-xs ${getStatusColor(share.status)}`}>
                                {getStatusIcon(share.status)}
                                {share.status}
                              </Badge>
                            </motion.div>
                          ))}
                        </div>
                      </div>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          )}

          {/* Enhanced Footer */}
          <DialogFooter className="border-t border-[#333] p-6 flex flex-col sm:flex-row gap-3">
            <Button
              variant="outline"
              onClick={onClose}
              className="w-full sm:w-auto border-[#333] text-gray-400 hover:text-white hover:bg-[#333] transition-all duration-200"
              disabled={isLoading}
            >
              Close
            </Button>

            {visibility === "private" && emails.length > 0 && (
              <Button
                onClick={handleSendEmails}
                disabled={isLoading}
                className="w-full sm:w-auto bg-gradient-to-r from-[#16ad7c] to-[#109d73] hover:from-[#109d73] hover:to-[#0b7d5a] text-black font-semibold transition-all duration-300 shadow-lg hover:shadow-[0_8px_25px_rgba(22,173,124,0.3)] transform hover:-translate-y-0.5"
              >
                <AnimatePresence mode="wait">
                  {isLoading ? (
                    <motion.div
                      key="loading"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className="flex items-center gap-2"
                    >
                      <div className="w-4 h-4 border-2 border-black border-r-transparent rounded-full animate-spin" />
                      Sending...
                    </motion.div>
                  ) : (
                    <motion.div
                      key="send"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className="flex items-center gap-2"
                    >
                      <Send className="h-4 w-4" />
                      Send Invites ({emails.length})
                    </motion.div>
                  )}
                </AnimatePresence>
              </Button>
            )}
          </DialogFooter>
        </motion.div>
      </DialogContent>
    </Dialog>
  );
};

export default ShareDialog;
