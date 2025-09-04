
import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ProfileSection } from "@/components/settings/ProfileSection";
import { StorageSection } from "@/components/settings/StorageSection";
import { SubscriptionSection } from "@/components/settings/SubscriptionSection";
import { SupportSection } from "@/components/settings/SupportSection";
import { User, HardDrive, CreditCard, HelpCircle, Lock, Bell, Globe, Settings as SettingsIcon, Shield, Sparkles, Crown, Zap, Star } from "lucide-react";
import { useUser } from "@/contexts/UserContext";
import { Button } from "@/components/ui/button";
import { motion, AnimatePresence } from "framer-motion";
import { SecuritySection } from "@/components/settings/SecuritySection";
import { NotificationsSection } from "@/components/settings/NotificationsSection";
import { PrivacySection } from "@/components/settings/PrivacySection";
import { Badge } from "@/components/ui/badge";

const Settings = () => {
  const { user, isLoggedIn } = useUser();
  const [activeTab, setActiveTab] = useState("profile");

  if (!isLoggedIn) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] bg-gradient-to-b from-black to-[#101014] text-white flex flex-col">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="flex-1 flex flex-col items-center justify-center p-6"
        >
          <div className="text-center max-w-md mx-auto space-y-6">
            <div className="relative">
              <div className="w-20 h-20 bg-gradient-to-br from-[#16ad7c]/20 to-[#5ce1e6]/20 rounded-full flex items-center justify-center mx-auto mb-4">
                <SettingsIcon className="h-10 w-10 text-[#16ad7c]" />
              </div>
              <div className="absolute inset-0 bg-gradient-to-br from-[#16ad7c]/10 to-[#5ce1e6]/10 rounded-full blur-2xl"></div>
            </div>

            <div>
              <h1 className="text-3xl font-bold text-white mb-3">Settings Access Required</h1>
              <p className="text-gray-400 text-lg leading-relaxed">
                Please sign in to access your account settings and preferences.
              </p>
            </div>

            <Button
              className="bg-gradient-to-r from-[#16ad7c] to-[#109d73] hover:from-[#109d73] hover:to-[#0b7d5a] text-black font-semibold px-8 py-3 text-lg transition-all duration-300 shadow-lg hover:shadow-[0_8px_25px_rgba(22,173,124,0.3)] transform hover:-translate-y-0.5"
            >
              <Shield className="h-5 w-5 mr-2" />
              Go to Sign In
            </Button>
          </div>
        </motion.div>
      </div>
    );
  }

  const fadeVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0 }
  };

  const tabVariants = {
    hidden: { opacity: 0, x: 20 },
    visible: { opacity: 1, x: 0 },
    exit: { opacity: 0, x: -20 }
  };

  // Enhanced subscription badge with better visual appeal
  const getSubscriptionBadge = () => {
    const plan = user?.subscriptionPlan || 'Free';
    const isPremium = plan !== 'Free';

    if (isPremium) {
      return (
        <Badge className="bg-gradient-to-r from-[#16ad7c] to-[#5ce1e6] text-black px-4 py-2 text-sm font-bold shadow-lg border-0">
          <Crown className="h-4 w-4 mr-2" />
          {plan}
        </Badge>
      );
    }

    return (
      <Badge className="bg-gradient-to-r from-[#6366f1] to-[#8b5cf6] text-white px-4 py-2 text-sm font-bold shadow-lg border-0 hover:from-[#7c3aed] hover:to-[#a855f7] transition-all duration-300">
        <Star className="h-4 w-4 mr-2" />
        {plan}
      </Badge>
    );
  };

  return (
    <div className="min-h-screen bg-[#0a0a0a] bg-gradient-to-b from-black to-[#101014] text-white flex flex-col">
      {/* Animated background elements */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-20 left-10 w-72 h-72 bg-[#16ad7c]/5 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute bottom-20 right-10 w-96 h-96 bg-[#5ce1e6]/5 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '2s' }}></div>
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-[#6366f1]/3 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }}></div>
      </div>

      <main className="flex-1 container mx-auto px-4 py-8 relative z-10">
        <motion.div
          initial="hidden"
          animate="visible"
          variants={fadeVariants}
          transition={{ duration: 0.5 }}
          className="max-w-7xl mx-auto"
        >
          {/* Enhanced Header Section */}
          <div className="mb-8">
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6 mb-8">
              <div className="flex items-center space-x-4">
                <div className="relative">
                  <h1 className="text-4xl font-bold gradient-text tracking-tight">
                    Account Settings
                  </h1>
                  <div className="absolute inset-0 bg-gradient-to-r from-[#16ad7c]/20 via-transparent to-transparent -z-10 blur-3xl opacity-20 h-24 rounded-full"></div>
                </div>

                {/* Always show subscription badge */}
                {getSubscriptionBadge()}
              </div>

              <div className="flex items-center space-x-3">
                <div className="text-right">
                  <p className="text-sm text-gray-400">Member since</p>
                  <p className="text-white font-medium">
                    {user?.joinDate.toLocaleDateString('en-US', { year: 'numeric', month: 'long' })}
                  </p>
                </div>

                <div className="w-12 h-12 bg-gradient-to-br from-[#16ad7c] to-[#5ce1e6] rounded-xl flex items-center justify-center shadow-lg hover:shadow-[0_8px_25px_rgba(22,173,124,0.3)] transition-all duration-300 transform hover:scale-105">
                  <User className="h-6 w-6 text-black" />
                </div>
              </div>
            </div>
          </div>

          {/* Enhanced Tabs Navigation */}
          <Tabs defaultValue="profile" value={activeTab} onValueChange={setActiveTab} className="space-y-8">
            <div className="bg-gradient-to-r from-[#151515]/80 to-[#1a1a1a]/80 backdrop-blur-sm border border-[#2a2a2a] rounded-xl p-2 shadow-2xl">
              <TabsList className="bg-transparent grid grid-flow-col auto-cols-max gap-2 h-auto">
                <TabsTrigger
                  value="profile"
                  className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-[#16ad7c] data-[state=active]:to-[#109d73] data-[state=active]:text-black data-[state=active]:shadow-lg transition-all duration-300 px-6 py-3 rounded-lg h-auto hover:bg-[#16ad7c]/10 data-[state=inactive]:hover:text-[#16ad7c]"
                >
                  <User className="h-4 w-4 mr-2" />
                  Profile
                </TabsTrigger>
                <TabsTrigger
                  value="storage"
                  className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-[#16ad7c] data-[state=active]:to-[#109d73] data-[state=active]:text-black data-[state=active]:shadow-lg transition-all duration-300 px-6 py-3 rounded-lg h-auto hover:bg-[#5ce1e6]/10 data-[state=inactive]:hover:text-[#5ce1e6]"
                >
                  <HardDrive className="h-4 w-4 mr-2" />
                  Storage
                </TabsTrigger>
                <TabsTrigger
                  value="subscription"
                  className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-[#16ad7c] data-[state=active]:to-[#109d73] data-[state=active]:text-black data-[state=active]:shadow-lg transition-all duration-300 px-6 py-3 rounded-lg h-auto hover:bg-[#16ad7c]/10 data-[state=inactive]:hover:text-[#16ad7c]"
                >
                  <CreditCard className="h-4 w-4 mr-2" />
                  Subscription
                </TabsTrigger>
                <TabsTrigger
                  value="security"
                  className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-[#16ad7c] data-[state=active]:to-[#109d73] data-[state=active]:text-black data-[state=active]:shadow-lg transition-all duration-300 px-6 py-3 rounded-lg h-auto hover:bg-[#6366f1]/10 data-[state=inactive]:hover:text-[#6366f1]"
                >
                  <Lock className="h-4 w-4 mr-2" />
                  Security
                </TabsTrigger>
                <TabsTrigger
                  value="privacy"
                  className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-[#16ad7c] data-[state=active]:to-[#109d73] data-[state=active]:text-black data-[state=active]:shadow-lg transition-all duration-300 px-6 py-3 rounded-lg h-auto hover:bg-[#8b5cf6]/10 data-[state=inactive]:hover:text-[#8b5cf6]"
                >
                  <Globe className="h-4 w-4 mr-2" />
                  Privacy
                </TabsTrigger>
                <TabsTrigger
                  value="support"
                  className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-[#16ad7c] data-[state=active]:to-[#109d73] data-[state=active]:text-black data-[state=active]:shadow-lg transition-all duration-300 px-6 py-3 rounded-lg h-auto hover:bg-[#16ad7c]/10 data-[state=inactive]:hover:text-[#16ad7c]"
                >
                  <HelpCircle className="h-4 w-4 mr-2" />
                  Support
                </TabsTrigger>
              </TabsList>
            </div>

            {/* Enhanced Tab Content */}
            <AnimatePresence mode="wait">
              <motion.div
                key={activeTab}
                variants={tabVariants}
                initial="hidden"
                animate="visible"
                exit="exit"
                transition={{ duration: 0.3, type: "spring", stiffness: 100 }}
                className="min-h-[600px]"
              >
                <TabsContent value="profile" className="space-y-6 mt-0">
                  <ProfileSection />
                </TabsContent>

                <TabsContent value="storage" className="space-y-6 mt-0">
                  <StorageSection />
                </TabsContent>

                <TabsContent value="subscription" className="space-y-6 mt-0">
                  <SubscriptionSection />
                </TabsContent>

                <TabsContent value="security" className="space-y-6 mt-0">
                  <SecuritySection />
                </TabsContent>

                <TabsContent value="privacy" className="space-y-6 mt-0">
                  <PrivacySection />
                </TabsContent>

                <TabsContent value="support" className="space-y-6 mt-0">
                  <SupportSection />
                </TabsContent>
              </motion.div>
            </AnimatePresence>
          </Tabs>

          {/* Enhanced Footer */}
          <div className="mt-12 text-center py-8 border-t border-[#2a2a2a]">
            <div className="space-y-4">
              <div className="flex items-center justify-center gap-2 text-gray-400">
                <div className="w-8 h-8 bg-gradient-to-br from-[#16ad7c]/20 to-[#5ce1e6]/20 rounded-lg flex items-center justify-center">
                  <SettingsIcon className="h-4 w-4 text-[#16ad7c]" />
                </div>
                <span className="text-sm font-medium">StillCollab Settings</span>
              </div>

              <p className="text-xs text-gray-500">© 2024 StillCollab. All rights reserved.</p>

              <div className="flex justify-center gap-6 text-xs">
                <a href="#" className="text-gray-500 hover:text-[#16ad7c] transition-colors duration-200">
                  Privacy Policy
                </a>
                <a href="#" className="text-gray-500 hover:text-[#16ad7c] transition-colors duration-200">
                  Terms of Service
                </a>
                <a href="#" className="text-gray-500 hover:text-[#8b5cf6] transition-colors duration-200">
                  Cookie Policy
                </a>
              </div>
            </div>
          </div>
        </motion.div>
      </main>
    </div>
  );
};

export default Settings;
