
import { Eye, Share2, Lock, Users, Clock, CheckCircle, XCircle, Globe, Shield } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

type ProjectVisibilityIndicatorProps = {
  isShared?: boolean;
  sharedBy?: string;
  visibility?: 'private' | 'public';
  shareStatus?: 'pending' | 'accepted' | 'rejected';
}

const ProjectVisibilityIndicator = ({
  isShared,
  sharedBy,
  visibility = 'private',
  shareStatus
}: ProjectVisibilityIndicatorProps) => {

  if (!isShared && visibility === 'private') {
    return null; // Don't show anything for private, unshared projects
  }

  const getVisibilityConfig = () => {
    if (isShared) {
      switch (shareStatus) {
        case 'pending':
          return {
            icon: Clock,
            label: 'Invite Pending',
            bgColor: 'bg-yellow-500/20',
            borderColor: 'border-yellow-500/30',
            textColor: 'text-yellow-400',
            iconColor: 'text-yellow-400',
            tooltip: `Pending invitation from ${sharedBy || 'another user'}`
          };
        case 'accepted':
          return {
            icon: Users,
            label: 'Shared with You',
            bgColor: 'bg-[#16ad7c]/20',
            borderColor: 'border-[#16ad7c]/30',
            textColor: 'text-[#16ad7c]',
            iconColor: 'text-[#16ad7c]',
            tooltip: `Shared by ${sharedBy || 'another user'}`
          };
        case 'rejected':
          return {
            icon: XCircle,
            label: 'Invite Declined',
            bgColor: 'bg-red-500/20',
            borderColor: 'border-red-500/30',
            textColor: 'text-red-400',
            iconColor: 'text-red-400',
            tooltip: `You declined the invitation from ${sharedBy || 'another user'}`
          };
        default:
          return {
            icon: Share2,
            label: 'Shared',
            bgColor: 'bg-[#16ad7c]/20',
            borderColor: 'border-[#16ad7c]/30',
            textColor: 'text-[#16ad7c]',
            iconColor: 'text-[#16ad7c]',
            tooltip: sharedBy ? `Shared by ${sharedBy}` : 'You\'ve shared this project'
          };
      }
    } else if (visibility === 'public') {
      return {
        icon: Globe,
        label: 'Public',
        bgColor: 'bg-blue-500/20',
        borderColor: 'border-blue-500/30',
        textColor: 'text-blue-400',
        iconColor: 'text-blue-400',
        tooltip: 'Anyone with the link can view this project'
      };
    }

    return null;
  };

  const config = getVisibilityConfig();
  if (!config) return null;

  const IconComponent = config.icon;

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <motion.div
            initial={{ opacity: 0, scale: 0.8, y: -10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={{
              type: "spring",
              stiffness: 300,
              damping: 25,
              delay: 0.2
            }}
            className="absolute top-3 left-3 z-20"
          >
            <motion.div
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="relative"
            >
              <Badge
                className={`${config.bgColor} ${config.borderColor} ${config.textColor} border px-2.5 py-1 flex items-center gap-1.5 backdrop-blur-sm shadow-lg`}
              >
                <IconComponent className={`h-3 w-3 ${config.iconColor}`} />
                <span className="text-xs font-medium">{config.label}</span>

                {/* Animated indicator dot for pending status */}
                {shareStatus === 'pending' && (
                  <motion.div
                    className="w-1.5 h-1.5 bg-yellow-400 rounded-full"
                    animate={{
                      scale: [1, 1.2, 1],
                      opacity: [0.7, 1, 0.7]
                    }}
                    transition={{
                      duration: 2,
                      repeat: Infinity,
                      ease: "easeInOut"
                    }}
                  />
                )}
              </Badge>
            </motion.div>
          </motion.div>
        </TooltipTrigger>
        <TooltipContent
          side="bottom"
          className="bg-[#0a0a0a]/95 backdrop-blur-xl border-[#333] text-white px-3 py-2 max-w-xs"
          sideOffset={8}
        >
          <div className="text-center">
            <p className="font-medium text-sm mb-1">{config.label}</p>
            <p className="text-xs text-gray-400">{config.tooltip}</p>

            {/* Additional info for shared projects */}
            {isShared && sharedBy && (
              <div className="mt-2 pt-2 border-t border-[#333]">
                <div className="flex items-center justify-center gap-2 text-xs text-gray-300">
                  <Users className="h-3 w-3" />
                  <span>Shared by: {sharedBy}</span>
                </div>
              </div>
            )}

            {/* Visibility info */}
            {visibility === 'public' && (
              <div className="mt-2 pt-2 border-t border-[#333]">
                <div className="flex items-center justify-center gap-2 text-xs text-blue-400">
                  <Globe className="h-3 w-3" />
                  <span>Public project</span>
                </div>
              </div>
            )}
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};

export default ProjectVisibilityIndicator;
