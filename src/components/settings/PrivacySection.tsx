import { useState } from 'react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Globe, Eye, EyeOff, Lock, CheckCircle, Info, Shield, User, Database, Download, FileText, Settings, Save, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { motion, AnimatePresence } from "framer-motion";
import { Badge } from "@/components/ui/badge";

interface PrivacySetting {
  id: string;
  title: string;
  description: string;
  enabled: boolean;
  tooltip?: string;
  icon: any;
  category: 'profile' | 'data' | 'sharing' | 'security';
}

export const PrivacySection = () => {
  const [settings, setSettings] = useState<PrivacySetting[]>([
    {
      id: "profile_visibility",
      title: "Public Profile",
      description: "Allow other users to view your profile information",
      enabled: true,
      tooltip: "Your name, profile picture, and basic information will be visible to other users",
      icon: User,
      category: 'profile'
    },
    {
      id: "project_visibility",
      title: "Public Projects",
      description: "Make your projects visible to others by default",
      enabled: false,
      tooltip: "New projects will be set to public by default. You can change this for individual projects",
      icon: Globe,
      category: 'profile'
    },
    {
      id: "activity_tracking",
      title: "Activity Tracking",
      description: "Allow us to collect anonymous usage data to improve the platform",
      enabled: true,
      tooltip: "We collect anonymous usage data to improve our service and user experience",
      icon: Database,
      category: 'data'
    },
    {
      id: "third_party_sharing",
      title: "Third-Party Sharing",
      description: "Allow sharing of non-personal data with trusted partners",
      enabled: false,
      tooltip: "We may share non-personal data with trusted partners to improve our services",
      icon: Settings,
      category: 'sharing'
    },
    {
      id: "data_analytics",
      title: "Data Analytics",
      description: "Help improve our services with usage analytics",
      enabled: true,
      tooltip: "We use analytics to understand how our services are used and improve them",
      icon: Database,
      category: 'data'
    },
    {
      id: "marketing_emails",
      title: "Marketing Communications",
      description: "Receive updates about new features and promotions",
      enabled: false,
      tooltip: "Get notified about new features, updates, and special offers",
      icon: Eye,
      category: 'sharing'
    }
  ]);

  const toggleSetting = (id: string) => {
    setSettings(prev =>
      prev.map(setting => {
        if (setting.id === id) {
          return { ...setting, enabled: !setting.enabled };
        }
        return setting;
      })
    );
  };

  const saveSettings = () => {
    toast.success("Privacy settings saved successfully");
  };

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'profile': return 'from-[#8b5cf6] to-[#a855f7]';
      case 'data': return 'from-[#3b82f6] to-[#1d4ed8]';
      case 'sharing': return 'from-[#f59e0b] to-[#d97706]';
      case 'security': return 'from-[#10b981] to-[#059669]';
      default: return 'from-[#6366f1] to-[#7c3aed]';
    }
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'profile': return User;
      case 'data': return Database;
      case 'sharing': return Settings;
      case 'security': return Shield;
      default: return Globe;
    }
  };

  const groupedSettings = settings.reduce((acc, setting) => {
    if (!acc[setting.category]) {
      acc[setting.category] = [];
    }
    acc[setting.category].push(setting);
    return acc;
  }, {} as Record<string, PrivacySetting[]>);

  const categoryLabels = {
    profile: 'Profile & Visibility',
    data: 'Data & Analytics',
    sharing: 'Sharing & Communications',
    security: 'Security & Privacy'
  };

  return (
    <TooltipProvider>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <Card className="border-[#2a2a2a] bg-gradient-to-br from-[#151515]/80 to-[#1a1a1a]/80 backdrop-blur-sm shadow-2xl overflow-hidden">
          {/* Enhanced Header */}
          <CardHeader className="border-b border-[#2a2a2a] pb-6 bg-gradient-to-r from-[#8b5cf6]/5 to-[#a855f7]/5">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-gradient-to-br from-[#8b5cf6] to-[#a855f7] rounded-xl flex items-center justify-center shadow-lg">
                <Globe className="h-6 w-6 text-white" />
              </div>
              <div>
                <CardTitle className="text-2xl font-bold text-white">
                  Privacy Settings
                </CardTitle>
                <CardDescription className="text-gray-400 text-base">
                  Control how your information is displayed, used, and protected
                </CardDescription>
              </div>
            </div>
          </CardHeader>

          <CardContent className="pt-8 space-y-8">
            {/* Privacy Overview */}
            <motion.div
              className="bg-gradient-to-br from-[#1a1a1a]/80 to-[#151515]/80 border border-[#2a2a2a] p-6 rounded-xl backdrop-blur-sm shadow-lg"
              whileHover={{ scale: 1.01 }}
              transition={{ type: "spring", stiffness: 300 }}
            >
              <div className="flex items-center gap-4 mb-4">
                <div className="w-10 h-10 bg-gradient-to-br from-[#8b5cf6]/20 to-[#a855f7]/20 rounded-lg flex items-center justify-center">
                  <Shield className="h-5 w-5 text-[#8b5cf6]" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-white">Privacy Overview</h3>
                  <p className="text-gray-400 text-sm">Your current privacy configuration</p>
                </div>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="text-center p-3 bg-[#1a1a1a]/40 rounded-lg">
                  <div className="text-2xl font-bold text-[#8b5cf6]">
                    {settings.filter(s => s.category === 'profile').length}
                  </div>
                  <div className="text-xs text-gray-400">Profile Settings</div>
                </div>
                <div className="text-center p-3 bg-[#1a1a1a]/40 rounded-lg">
                  <div className="text-2xl font-bold text-[#3b82f6]">
                    {settings.filter(s => s.category === 'data').length}
                  </div>
                  <div className="text-xs text-gray-400">Data Controls</div>
                </div>
                <div className="text-center p-3 bg-[#1a1a1a]/40 rounded-lg">
                  <div className="text-2xl font-bold text-[#f59e0b]">
                    {settings.filter(s => s.category === 'sharing').length}
                  </div>
                  <div className="text-xs text-gray-400">Sharing Options</div>
                </div>
                <div className="text-center p-3 bg-[#1a1a1a]/40 rounded-lg">
                  <div className="text-2xl font-bold text-[#10b981]">
                    {settings.filter(s => s.category === 'security').length}
                  </div>
                  <div className="text-xs text-gray-400">Security</div>
                </div>
              </div>
            </motion.div>

            {/* Privacy Settings by Category */}
            {Object.entries(groupedSettings).map(([category, categorySettings], categoryIndex) => (
              <motion.div
                key={category}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: categoryIndex * 0.1 }}
                className="space-y-4"
              >
                <div className="flex items-center gap-3">
                  <div className={`w-8 h-8 bg-gradient-to-br ${getCategoryColor(category)} rounded-lg flex items-center justify-center`}>
                    {(() => {
                      const IconComponent = getCategoryIcon(category);
                      return <IconComponent className="h-4 w-4 text-white" />;
                    })()}
                  </div>
                  <h3 className="text-lg font-semibold text-white">{categoryLabels[category as keyof typeof categoryLabels]}</h3>
                </div>

                <div className="space-y-3">
                  {categorySettings.map((setting, index) => (
                    <motion.div
                      key={setting.id}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ duration: 0.3, delay: index * 0.05 }}
                      className="flex items-center justify-between bg-gradient-to-br from-[#1a1a1a]/60 to-[#151515]/60 border border-[#2a2a2a] p-4 rounded-xl backdrop-blur-sm hover:border-[#3a3a3a] transition-all duration-300"
                    >
                      <div className="flex items-center gap-4">
                        <div className={`w-10 h-10 bg-gradient-to-br ${getCategoryColor(setting.category)}/20 rounded-lg flex items-center justify-center`}>
                          <setting.icon className={`h-5 w-5 bg-gradient-to-br ${getCategoryColor(setting.category)} bg-clip-text text-transparent`} />
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <h4 className="font-medium text-white">{setting.title}</h4>
                            {setting.tooltip && (
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <div className="opacity-50 hover:opacity-100 transition-opacity cursor-help">
                                    <Info className="h-4 w-4 text-gray-400" />
                                  </div>
                                </TooltipTrigger>
                                <TooltipContent className="bg-[#0a0a0a]/95 backdrop-blur-xl border-[#2a2a2a] text-white px-3 py-2 max-w-xs">
                                  <p className="text-sm">{setting.tooltip}</p>
                                </TooltipContent>
                              </Tooltip>
                            )}
                            <Badge className={`text-xs px-2 py-1 ${setting.enabled
                              ? 'bg-gradient-to-r from-[#10b981]/20 to-[#059669]/20 border-[#10b981]/30 text-[#10b981]'
                              : 'bg-gradient-to-r from-[#ef4444]/20 to-[#dc2626]/20 border-[#ef4444]/30 text-[#ef4444]'
                              }`}>
                              {setting.enabled ? 'Active' : 'Inactive'}
                            </Badge>
                          </div>
                          <p className="text-sm text-gray-400">{setting.description}</p>
                        </div>
                      </div>
                      <Switch
                        checked={setting.enabled}
                        onCheckedChange={() => toggleSetting(setting.id)}
                        className="data-[state=checked]:bg-gradient-to-r data-[state=checked]:from-[#16ad7c] data-[state=checked]:to-[#10b981]"
                      />
                    </motion.div>
                  ))}
                </div>
              </motion.div>
            ))}

            {/* Data Protection Section */}
            <motion.div
              className="bg-gradient-to-br from-[#1a1a1a]/60 to-[#151515]/60 border border-[#16ad7c]/20 p-6 rounded-xl backdrop-blur-sm"
              whileHover={{ scale: 1.01 }}
              transition={{ type: "spring", stiffness: 300 }}
            >
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 bg-gradient-to-br from-[#16ad7c]/20 to-[#10b981]/20 rounded-xl flex items-center justify-center flex-shrink-0">
                  <Lock className="h-6 w-6 text-[#16ad7c]" />
                </div>
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-white mb-3">Data Protection & Rights</h3>
                  <p className="text-gray-400 text-sm mb-4">
                    We are committed to protecting your personal data in accordance with applicable privacy laws and regulations.
                  </p>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <Button
                      variant="outline"
                      size="sm"
                      className="border-[#2a2a2a] text-gray-300 hover:bg-[#2a2a2a] hover:text-white hover:border-[#2a2a2a] transition-all duration-300"
                      onClick={() => window.open('/privacy-policy', '_blank')}
                    >
                      <FileText className="h-4 w-4 mr-2" />
                      Privacy Policy
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="border-[#2a2a2a] text-gray-300 hover:bg-[#2a2a2a] hover:text-white hover:border-[#2a2a2a] transition-all duration-300"
                      onClick={() => window.open('/data-request', '_blank')}
                    >
                      <Download className="h-4 w-4 mr-2" />
                      Request Your Data
                    </Button>
                  </div>
                </div>
              </div>
            </motion.div>

            {/* End-to-End Encryption Section */}
            <motion.div
              className="bg-gradient-to-br from-[#16ad7c]/10 to-[#10b981]/5 border border-[#16ad7c]/20 p-6 rounded-xl backdrop-blur-sm"
              whileHover={{ scale: 1.01 }}
              transition={{ type: "spring", stiffness: 300 }}
            >
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 bg-gradient-to-br from-[#16ad7c]/20 to-[#10b981]/20 rounded-xl flex items-center justify-center flex-shrink-0">
                  <Shield className="h-6 w-6 text-[#16ad7c]" />
                </div>
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-[#16ad7c] mb-3">End-to-End Encryption</h3>
                  <p className="text-gray-400 text-sm mb-4">
                    Your data is protected with industry-leading encryption standards to ensure maximum security and privacy.
                  </p>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                    <div className="flex items-start gap-3">
                      <div className="w-5 h-5 bg-gradient-to-br from-[#16ad7c] to-[#10b981] rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                        <CheckCircle className="h-3 w-3 text-white" />
                      </div>
                      <p className="text-sm text-gray-300">
                        All data is encrypted end-to-end, ensuring only you can access your information
                      </p>
                    </div>
                    <div className="flex items-start gap-3">
                      <div className="w-5 h-5 bg-gradient-to-br from-[#16ad7c] to-[#10b981] rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                        <CheckCircle className="h-3 w-3 text-white" />
                      </div>
                      <p className="text-sm text-gray-300">
                        We never share or sell your data to third parties
                      </p>
                    </div>
                    <div className="flex items-start gap-3">
                      <div className="w-5 h-5 bg-gradient-to-br from-[#16ad7c] to-[#10b981] rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                        <CheckCircle className="h-3 w-3 text-white" />
                      </div>
                      <p className="text-sm text-gray-300">
                        Industry-standard encryption protocols protect your data at rest and in transit
                      </p>
                    </div>
                    <div className="flex items-start gap-3">
                      <div className="w-5 h-5 bg-gradient-to-br from-[#16ad7c] to-[#10b981] rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                        <CheckCircle className="h-3 w-3 text-white" />
                      </div>
                      <p className="text-sm text-gray-300">
                        Regular security audits and compliance with global privacy standards
                      </p>
                    </div>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    className="bg-[#16ad7c]/10 border-[#16ad7c]/30 text-[#16ad7c] hover:bg-[#16ad7c]/20 hover:border-[#16ad7c]/40 transition-all duration-300"
                    onClick={() => window.open('/security', '_blank')}
                  >
                    <Shield className="h-4 w-4 mr-2" />
                    Learn More About Security
                  </Button>
                </div>
              </div>
            </motion.div>
          </CardContent>

          {/* Enhanced Footer */}
          <CardFooter className="flex justify-between border-t border-[#2a2a2a] pt-6 bg-gradient-to-r from-[#8b5cf6]/5 to-[#a855f7]/5">
            <div className="flex items-center gap-2 text-sm text-gray-400">
              <AlertCircle className="h-4 w-4" />
              <span>Your privacy settings are automatically saved</span>
            </div>
            <Button
              onClick={saveSettings}
              className="bg-gradient-to-r from-[#8b5cf6] to-[#a855f7] hover:from-[#a855f7] hover:to-[#7c3aed] text-white font-semibold shadow-lg hover:shadow-[0_8px_25px_rgba(139,92,246,0.3)] transition-all duration-300 transform hover:-translate-y-0.5"
            >
              <Save className="h-4 w-4 mr-2" />
              Save Privacy Settings
            </Button>
          </CardFooter>
        </Card>
      </motion.div>
    </TooltipProvider>
  );
};
