
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { HardDrive, Database, AlertTriangle, BarChart3, Download, Trash2, Plus, Zap } from "lucide-react";
import { useUser } from "@/contexts/UserContext";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";
import { Progress } from "@/components/ui/progress";

export const StorageSection = () => {
  const { user } = useUser();

  if (!user) return null;

  const storagePercentage = Math.round((user.storageUsed / user.storageLimit) * 100);
  const isLowStorage = storagePercentage > 80;
  const isCriticalStorage = storagePercentage > 95;

  // Mock data for storage breakdown
  const storageBreakdown = [
    { type: 'Images', used: 1.5, total: 5.0, color: 'from-[#3b82f6] to-[#1d4ed8]', icon: Database, bgColor: 'from-[#3b82f6]/20 to-[#1d4ed8]/20' },
    { type: 'Videos', used: 1.0, total: 3.0, color: 'from-[#8b5cf6] to-[#7c3aed]', icon: Database, bgColor: 'from-[#8b5cf6]/20 to-[#7c3aed]/20' },
    { type: 'Documents', used: 0.2, total: 1.0, color: 'from-[#10b981] to-[#059669]', icon: Database, bgColor: 'from-[#10b981]/20 to-[#059669]/20' },
    { type: 'Other', used: 0.1, total: 0.5, color: 'from-[#f59e0b] to-[#d97706]', icon: Database, bgColor: 'from-[#f59e0b]/20 to-[#d97706]/20' }
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
    >
      <Card className="border-[#2a2a2a] bg-gradient-to-br from-[#151515]/80 to-[#1a1a1a]/80 backdrop-blur-sm shadow-2xl overflow-hidden">
        {/* Enhanced Header */}
        <CardHeader className="border-b border-[#2a2a2a] pb-6 bg-gradient-to-r from-[#5ce1e6]/5 to-[#3b82f6]/5">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-gradient-to-br from-[#5ce1e6] to-[#3b82f6] rounded-xl flex items-center justify-center shadow-lg">
              <HardDrive className="h-6 w-6 text-black" />
            </div>
            <div>
              <CardTitle className="text-2xl font-bold text-white">
                Storage Usage
              </CardTitle>
              <CardDescription className="text-gray-400 text-base">
                Monitor and manage your cloud storage allocation
              </CardDescription>
            </div>
          </div>
        </CardHeader>

        <CardContent className="pt-8 space-y-8">
          {/* Storage Overview */}
          <div className="space-y-6">
            <div className="flex flex-col md:flex-row gap-6 md:items-center md:justify-between">
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <h3 className="text-2xl font-bold text-white">
                    {user.storageUsed} GB <span className="text-gray-400 font-normal">of {user.storageLimit} GB used</span>
                  </h3>
                  {isCriticalStorage && (
                    <motion.div
                      className="text-red-500 bg-red-500/10 px-3 py-1.5 rounded-full text-sm flex items-center border border-red-500/20"
                      animate={{ scale: [1, 1.05, 1] }}
                      transition={{ duration: 2, repeat: Infinity }}
                    >
                      <AlertTriangle className="h-4 w-4 mr-2" />
                      Critical
                    </motion.div>
                  )}
                  {isLowStorage && !isCriticalStorage && (
                    <div className="text-amber-500 bg-amber-500/10 px-3 py-1.5 rounded-full text-sm flex items-center border border-amber-500/20">
                      <AlertTriangle className="h-4 w-4 mr-2" />
                      Low Storage
                    </div>
                  )}
                </div>
                <p className="text-gray-400 text-base">
                  Your storage is {isCriticalStorage ? 'critically low' : isLowStorage ? 'running low' : 'in good standing'}
                </p>
              </div>

              <div className="flex gap-3">
                <Button
                  className="bg-gradient-to-r from-[#3b82f6] to-[#1d4ed8] hover:from-[#1d4ed8] hover:to-[#1e40af] text-white font-semibold shadow-lg hover:shadow-[0_8px_25px_rgba(59,130,246,0.3)] transition-all duration-300 transform hover:-translate-y-0.5"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Upgrade Plan
                </Button>
                <Button
                  variant="outline"
                  className="border-[#2a2a2a] text-gray-300 hover:bg-[#2a2a2a] hover:text-white hover:border-[#2a2a2a] transition-all duration-300"
                >
                  <BarChart3 className="h-4 w-4 mr-2" />
                  Analytics
                </Button>
              </div>
            </div>

            {/* Enhanced Progress Bar */}
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium text-gray-300">Storage Usage</span>
                <span className={`text-lg font-bold ${isCriticalStorage ? 'text-red-500' : isLowStorage ? 'text-amber-500' : 'text-[#5ce1e6]'}`}>
                  {storagePercentage}%
                </span>
              </div>

              <div className="relative">
                <div className="h-3 w-full bg-[#1a1a1a] rounded-full overflow-hidden border border-[#2a2a2a]">
                  <motion.div
                    className={`h-full rounded-full transition-all duration-1000 ease-out ${isCriticalStorage
                        ? 'bg-gradient-to-r from-red-500 to-red-600'
                        : isLowStorage
                          ? 'bg-gradient-to-r from-amber-500 to-amber-600'
                          : 'bg-gradient-to-r from-[#5ce1e6] to-[#3b82f6]'
                      }`}
                    initial={{ width: 0 }}
                    animate={{ width: `${storagePercentage}%` }}
                    transition={{ duration: 1, delay: 0.3 }}
                  />
                </div>

                {/* Storage markers */}
                <div className="flex justify-between mt-2 text-xs text-gray-500">
                  <span>0 GB</span>
                  <span>{Math.round(user.storageLimit * 0.25)} GB</span>
                  <span>{Math.round(user.storageLimit * 0.5)} GB</span>
                  <span>{Math.round(user.storageLimit * 0.75)} GB</span>
                  <span>{user.storageLimit} GB</span>
                </div>
              </div>
            </div>
          </div>

          {/* Storage Breakdown */}
          <div className="space-y-4">
            <h4 className="text-lg font-semibold text-white flex items-center gap-2">
              <BarChart3 className="h-5 w-5 text-[#5ce1e6]" />
              Storage Breakdown
            </h4>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {storageBreakdown.map((item, index) => {
                const IconComponent = item.icon;
                const itemPercentage = Math.round((item.used / item.total) * 100);

                return (
                  <motion.div
                    key={item.type}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5, delay: index * 0.1 }}
                    whileHover={{ scale: 1.02, y: -2 }}
                    className="bg-gradient-to-br from-[#1a1a1a]/60 to-[#151515]/60 border border-[#2a2a2a] p-4 rounded-xl backdrop-blur-sm hover:border-[#3a3a3a] transition-all duration-300"
                  >
                    <div className="flex items-center gap-3 mb-3">
                      <div className={`w-10 h-10 bg-gradient-to-br ${item.bgColor} rounded-lg flex items-center justify-center`}>
                        <IconComponent className={`h-5 w-5 bg-gradient-to-br ${item.color} bg-clip-text text-transparent`} />
                      </div>
                      <div>
                        <p className="text-white font-semibold">{item.type}</p>
                        <p className="text-gray-400 text-sm">{item.used} GB</p>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <div className="flex justify-between text-xs">
                        <span className="text-gray-400">Usage</span>
                        <span className="text-gray-300">{itemPercentage}%</span>
                      </div>
                      <div className="h-2 w-full bg-[#1a1a1a] rounded-full overflow-hidden">
                        <motion.div
                          className={`h-full bg-gradient-to-r ${item.color} rounded-full`}
                          initial={{ width: 0 }}
                          animate={{ width: `${itemPercentage}%` }}
                          transition={{ duration: 1, delay: 0.5 + index * 0.1 }}
                        />
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </div>

          {/* Quick Actions */}
          <div className="space-y-4">
            <h4 className="text-lg font-semibold text-white flex items-center gap-2">
              <Zap className="h-5 w-5 text-[#f59e0b]" />
              Quick Actions
            </h4>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Button
                variant="outline"
                className="border-[#2a2a2a] text-gray-300 hover:bg-[#2a2a2a] hover:text-white hover:border-[#2a2a2a] transition-all duration-300 h-auto p-4 flex flex-col items-center gap-2"
              >
                <Download className="h-6 w-6 text-[#3b82f6]" />
                <span>Download All</span>
                <span className="text-xs text-gray-500">Backup your data</span>
              </Button>

              <Button
                variant="outline"
                className="border-[#2a2a2a] text-gray-300 hover:bg-[#2a2a2a] hover:text-white hover:border-[#2a2a2a] transition-all duration-300 h-auto p-4 flex flex-col items-center gap-2"
              >
                <Trash2 className="h-6 w-6 text-[#ef4444]" />
                <span>Clean Up</span>
                <span className="text-xs text-gray-500">Remove unused files</span>
              </Button>

              <Button
                variant="outline"
                className="border-[#2a2a2a] text-gray-300 hover:bg-[#2a2a2a] hover:text-white hover:border-[#2a2a2a] transition-all duration-300 h-auto p-4 flex flex-col items-center gap-2"
              >
                <BarChart3 className="h-6 w-6 text-[#10b981]" />
                <span>View Reports</span>
                <span className="text-xs text-gray-500">Detailed analytics</span>
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
};
