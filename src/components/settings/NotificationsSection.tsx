
import { useState } from 'react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Bell, Mail, MessageSquare, Upload, Download, Clock, CheckCircle, Save, Settings, Smartphone, Zap, AlertCircle, Volume2, VolumeX, Eye, EyeOff } from "lucide-react";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import { Badge } from "@/components/ui/badge";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";

interface NotificationSetting {
  id: string;
  title: string;
  description: string;
  icon: React.ReactNode;
  email: boolean;
  push: boolean;
  category: 'social' | 'activity' | 'system' | 'marketing';
  priority: 'high' | 'medium' | 'low';
}

export const NotificationsSection = () => {
  const [settings, setSettings] = useState<NotificationSetting[]>([
    {
      id: "comments",
      title: "Comments and Replies",
      description: "Receive notifications when someone comments on your content or replies to your comments",
      icon: <MessageSquare className="h-5 w-5 text-[#16ad7c]" />,
      email: true,
      push: true,
      category: 'social',
      priority: 'high'
    },
    {
      id: "uploads",
      title: "New Uploads",
      description: "Get notified when new files are uploaded to your shared projects",
      icon: <Upload className="h-5 w-5 text-[#5ce1e6]" />,
      email: true,
      push: true,
      category: 'activity',
      priority: 'medium'
    },
    {
      id: "downloads",
      title: "File Downloads",
      description: "Know when your files are downloaded by other users",
      icon: <Download className="h-5 w-5 text-[#3b82f6]" />,
      email: false,
      push: true,
      category: 'activity',
      priority: 'low'
    },
    {
      id: "reminders",
      title: "Reminders & Deadlines",
      description: "Stay on top of upcoming deadlines, events, and important dates",
      icon: <Clock className="h-5 w-5 text-[#f59e0b]" />,
      email: true,
      push: false,
      category: 'system',
      priority: 'high'
    },
    {
      id: "shares",
      title: "Project Shares",
      description: "Notifications when someone shares a project with you",
      icon: <MessageSquare className="h-5 w-5 text-[#8b5cf6]" />,
      email: true,
      push: true,
      category: 'social',
      priority: 'medium'
    },
    {
      id: "updates",
      title: "System Updates",
      description: "Important updates about new features and maintenance",
      icon: <Settings className="h-5 w-5 text-[#10b981]" />,
      email: true,
      push: false,
      category: 'system',
      priority: 'medium'
    }
  ]);

  const [digestFrequency, setDigestFrequency] = useState('weekly');
  const [globalMute, setGlobalMute] = useState(false);

  const toggleSetting = (id: string, type: 'email' | 'push') => {
    setSettings(prev =>
      prev.map(setting => {
        if (setting.id === id) {
          return {
            ...setting,
            [type]: !setting[type]
          };
        }
        return setting;
      })
    );
  };

  const saveSettings = () => {
    toast.success("Notification preferences saved successfully");
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'from-[#ef4444] to-[#dc2626]';
      case 'medium': return 'from-[#f59e0b] to-[#d97706]';
      case 'low': return 'from-[#10b981] to-[#059669]';
      default: return 'from-[#6b7280] to-[#4b5563]';
    }
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'social': return MessageSquare;
      case 'activity': return Upload;
      case 'system': return Settings;
      case 'marketing': return Bell;
      default: return Bell;
    }
  };

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'social': return 'from-[#16ad7c] to-[#10b981]';
      case 'activity': return 'from-[#3b82f6] to-[#1d4ed8]';
      case 'system': return 'from-[#f59e0b] to-[#d97706]';
      case 'marketing': return 'from-[#8b5cf6] to-[#7c3aed]';
      default: return 'from-[#6b7280] to-[#4b5563]';
    }
  };

  const groupedSettings = settings.reduce((acc, setting) => {
    if (!acc[setting.category]) {
      acc[setting.category] = [];
    }
    acc[setting.category].push(setting);
    return acc;
  }, {} as Record<string, NotificationSetting[]>);

  const categoryLabels = {
    social: 'Social & Collaboration',
    activity: 'Activity & Updates',
    system: 'System & Maintenance',
    marketing: 'Marketing & Promotions'
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
    >
      <Card className="border-[#2a2a2a] bg-gradient-to-br from-[#151515]/80 to-[#1a1a1a]/80 backdrop-blur-sm shadow-2xl overflow-hidden">
        {/* Enhanced Header */}
        <CardHeader className="border-b border-[#2a2a2a] pb-6 bg-gradient-to-r from-[#f59e0b]/5 to-[#d97706]/5">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-gradient-to-br from-[#f59e0b] to-[#d97706] rounded-xl flex items-center justify-center shadow-lg">
              <Bell className="h-6 w-6 text-black" />
            </div>
            <div>
              <CardTitle className="text-2xl font-bold text-white">
                Notification Preferences
              </CardTitle>
              <CardDescription className="text-gray-400 text-base">
                Control how and when we contact you with updates and alerts
              </CardDescription>
            </div>
          </div>
        </CardHeader>

        <CardContent className="pt-8 space-y-8">
          {/* Global Notification Control */}
          <motion.div
            className="bg-gradient-to-br from-[#1a1a1a]/80 to-[#151515]/80 border border-[#2a2a2a] p-6 rounded-xl backdrop-blur-sm shadow-lg"
            whileHover={{ scale: 1.01 }}
            transition={{ type: "spring", stiffness: 300 }}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-gradient-to-br from-[#f59e0b]/20 to-[#d97706]/20 rounded-xl flex items-center justify-center">
                  {globalMute ? <VolumeX className="h-6 w-6 text-[#ef4444]" /> : <Volume2 className="h-6 w-6 text-[#f59e0b]" />}
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-white">Global Notification Control</h3>
                  <p className="text-gray-400 text-sm">
                    {globalMute ? 'All notifications are currently muted' : 'Notifications are active and working normally'}
                  </p>
                </div>
              </div>
              <Switch
                checked={!globalMute}
                onCheckedChange={(checked) => setGlobalMute(!checked)}
                className="data-[state=checked]:bg-gradient-to-r data-[state=checked]:from-[#16ad7c] data-[state=checked]:to-[#10b981]"
              />
            </div>
          </motion.div>

          {/* Notification Settings by Category */}
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
                    className="bg-gradient-to-br from-[#1a1a1a]/60 to-[#151515]/60 border border-[#2a2a2a] p-4 rounded-xl backdrop-blur-sm hover:border-[#3a3a3a] transition-all duration-300"
                  >
                    <div className="grid grid-cols-1 lg:grid-cols-6 gap-4 items-center">
                      <div className="lg:col-span-3 flex items-center gap-3">
                        <div className={`w-10 h-10 bg-gradient-to-br ${getCategoryColor(category)}/20 rounded-lg flex items-center justify-center`}>
                          {setting.icon}
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <h4 className="font-medium text-white">{setting.title}</h4>
                            <Badge className={`text-xs px-2 py-1 bg-gradient-to-r ${getPriorityColor(setting.priority)} text-white border-0`}>
                              {setting.priority}
                            </Badge>
                          </div>
                          <p className="text-sm text-gray-400">{setting.description}</p>
                        </div>
                      </div>

                      <div className="flex justify-center">
                        <div className="flex flex-col items-center gap-2">
                          <div className="flex items-center gap-2">
                            <Mail className="h-4 w-4 text-gray-400" />
                            <Switch
                              checked={setting.email && !globalMute}
                              onCheckedChange={() => toggleSetting(setting.id, 'email')}
                              disabled={globalMute}
                              className="data-[state=checked]:bg-gradient-to-r data-[state=checked]:from-[#16ad7c] data-[state=checked]:to-[#10b981]"
                            />
                          </div>
                          <span className="text-xs text-gray-500">Email</span>
                        </div>
                      </div>

                      <div className="flex justify-center">
                        <div className="flex flex-col items-center gap-2">
                          <div className="flex items-center gap-2">
                            <Smartphone className="h-4 w-4 text-gray-400" />
                            <Switch
                              checked={setting.push && !globalMute}
                              onCheckedChange={() => toggleSetting(setting.id, 'push')}
                              disabled={globalMute}
                              className="data-[state=checked]:bg-gradient-to-r data-[state=checked]:from-[#16ad7c] data-[state=checked]:to-[#10b981]"
                            />
                          </div>
                          <span className="text-xs text-gray-500">Push</span>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            </motion.div>
          ))}

          {/* Email Digest Options */}
          <motion.div
            className="bg-gradient-to-br from-[#1a1a1a]/60 to-[#151515]/60 border border-[#16ad7c]/20 p-6 rounded-xl backdrop-blur-sm"
            whileHover={{ scale: 1.01 }}
            transition={{ type: "spring", stiffness: 300 }}
          >
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 bg-gradient-to-br from-[#16ad7c]/20 to-[#10b981]/20 rounded-xl flex items-center justify-center flex-shrink-0">
                <Mail className="h-6 w-6 text-[#16ad7c]" />
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-white mb-3">Email Digest Options</h3>
                <p className="text-gray-400 text-sm mb-4">
                  Instead of receiving individual emails for each notification, you can opt for a consolidated digest that summarizes all your notifications.
                </p>

                <RadioGroup value={digestFrequency} onValueChange={setDigestFrequency} className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="daily" id="daily" className="text-[#16ad7c] border-[#2a2a2a]" />
                    <Label htmlFor="daily" className="text-sm text-gray-300 cursor-pointer">Daily Digest</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="weekly" id="weekly" className="text-[#16ad7c] border-[#2a2a2a]" />
                    <Label htmlFor="weekly" className="text-sm text-gray-300 cursor-pointer">Weekly Digest</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="none" id="none" className="text-[#16ad7c] border-[#2a2a2a]" />
                    <Label htmlFor="none" className="text-sm text-gray-300 cursor-pointer">No Digest</Label>
                  </div>
                </RadioGroup>
              </div>
            </div>
          </motion.div>

          {/* Notification Preview */}
          <motion.div
            className="bg-gradient-to-br from-[#1a1a1a]/60 to-[#151515]/60 border border-[#2a2a2a] p-6 rounded-xl backdrop-blur-sm"
            whileHover={{ scale: 1.01 }}
            transition={{ type: "spring", stiffness: 300 }}
          >
            <div className="flex items-center gap-4 mb-4">
              <div className="w-10 h-10 bg-gradient-to-br from-[#8b5cf6]/20 to-[#a855f7]/20 rounded-lg flex items-center justify-center">
                <Eye className="h-5 w-5 text-[#8b5cf6]" />
              </div>
              <h3 className="text-lg font-semibold text-white">Notification Preview</h3>
            </div>

            <div className="space-y-3">
              <div className="bg-[#151515]/40 border border-[#2a2a2a] p-3 rounded-lg">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-gradient-to-br from-[#16ad7c]/20 to-[#10b981]/20 rounded-lg flex items-center justify-center">
                    <MessageSquare className="h-4 w-4 text-[#16ad7c]" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm text-white">New comment on "Project Alpha"</p>
                    <p className="text-xs text-gray-400">John Doe commented: "Great work on this design!"</p>
                  </div>
                  <span className="text-xs text-gray-500">2 min ago</span>
                </div>
              </div>

              <div className="bg-[#151515]/40 border border-[#2a2a2a] p-3 rounded-lg">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-gradient-to-br from-[#5ce1e6]/20 to-[#3b82f6]/20 rounded-lg flex items-center justify-center">
                    <Upload className="h-4 w-4 text-[#5ce1e6]" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm text-white">New file uploaded to "Team Project"</p>
                    <p className="text-xs text-gray-400">design-final.png was added by Sarah</p>
                  </div>
                  <span className="text-xs text-gray-500">15 min ago</span>
                </div>
              </div>
            </div>
          </motion.div>
        </CardContent>

        {/* Enhanced Footer */}
        <CardFooter className="flex justify-between border-t border-[#2a2a2a] pt-6 bg-gradient-to-r from-[#f59e0b]/5 to-[#d97706]/5">
          <div className="flex items-center gap-2 text-sm text-gray-400">
            <AlertCircle className="h-4 w-4" />
            <span>Changes are saved automatically</span>
          </div>
          <Button
            onClick={saveSettings}
            className="bg-gradient-to-r from-[#f59e0b] to-[#d97706] hover:from-[#d97706] hover:to-[#b45309] text-black font-semibold shadow-lg hover:shadow-[0_8px_25px_rgba(245,158,11,0.3)] transition-all duration-300 transform hover:-translate-y-0.5"
          >
            <Save className="h-4 w-4 mr-2" />
            Save Preferences
          </Button>
        </CardFooter>
      </Card>
    </motion.div>
  );
};
