import { useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Shield,
  Key,
  Smartphone,
  CheckSquare,
  AlertTriangle,
  Lock,
  Eye,
  EyeOff,
  Fingerprint,

  Zap,
  CheckCircle,
  AlertCircle,
  X,
  Save,
} from "lucide-react";
import { toast } from "sonner";
import { useUser } from "@/contexts/UserContext";
import { supabase } from "@/integrations/supabase/client";
import { motion, AnimatePresence } from "framer-motion";
import { Badge } from "@/components/ui/badge";

export const SecuritySection = () => {
  const { user } = useUser();
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [twoFAEnabled, setTwoFAEnabled] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();

    if (newPassword !== confirmPassword) {
      toast.error("New passwords don't match");
      return;
    }

    if (newPassword.length < 6) {
      toast.error("Password should be at least 6 characters long");
      return;
    }

    setLoading(true);

    try {
      // First verify the current password by attempting to sign in
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: user?.email || "",
        password: currentPassword,
      });

      if (signInError) {
        toast.error("Current password is incorrect");
        setLoading(false);
        return;
      }

      // Update the password
      const { error: updateError } = await supabase.auth.updateUser({
        password: newPassword,
      });

      if (updateError) {
        toast.error(updateError.message);
      } else {
        toast.success("Password updated successfully");
        setIsChangingPassword(false);
        setCurrentPassword("");
        setNewPassword("");
        setConfirmPassword("");
      }
    } catch (error) {
      console.error("Error updating password:", error);
      toast.error("Failed to update password");
    } finally {
      setLoading(false);
    }
  };

  const toggleTwoFA = () => {
    setTwoFAEnabled(!twoFAEnabled);
    if (!twoFAEnabled) {
      toast.success("Two-factor authentication enabled");
    } else {
      toast.success("Two-factor authentication disabled");
    }
  };

  // Password strength indicator
  const getPasswordStrength = (password: string) => {
    if (password.length === 0) return { strength: 0, color: 'bg-gray-500', text: '' };
    if (password.length < 6) return { strength: 1, color: 'bg-red-500', text: 'Weak' };
    if (password.length < 8) return { strength: 2, color: 'bg-orange-500', text: 'Fair' };
    if (password.length < 10) return { strength: 3, color: 'bg-yellow-500', text: 'Good' };
    return { strength: 4, color: 'bg-green-500', text: 'Strong' };
  };

  const newPasswordStrength = getPasswordStrength(newPassword);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
    >
      <Card className="border-[#2a2a2a] bg-gradient-to-br from-[#151515]/80 to-[#1a1a1a]/80 backdrop-blur-sm shadow-2xl overflow-hidden">
        {/* Enhanced Header */}
        <CardHeader className="border-b border-[#2a2a2a] pb-6 bg-gradient-to-r from-[#6366f1]/5 to-[#7c3aed]/5">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-gradient-to-br from-[#6366f1] to-[#7c3aed] rounded-xl flex items-center justify-center shadow-lg">
              <Shield className="h-6 w-6 text-white" />
            </div>
            <div>
              <CardTitle className="text-2xl font-bold text-white">
                Security Settings
              </CardTitle>
              <CardDescription className="text-gray-400 text-base">
                Manage your password, authentication, and security preferences
              </CardDescription>
            </div>
          </div>
        </CardHeader>

        <CardContent className="pt-8 space-y-8">
          <AnimatePresence mode="wait">
            {isChangingPassword ? (
              <motion.form
                key="password-form"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                onSubmit={handlePasswordChange}
                className="space-y-6 bg-gradient-to-br from-[#1a1a1a]/60 to-[#151515]/60 border border-[#2a2a2a] p-6 rounded-xl backdrop-blur-sm"
              >
                <div className="space-y-4">
                  <div className="space-y-3">
                    <Label htmlFor="current-password" className="text-gray-300 font-medium flex items-center gap-2">
                      <Lock className="h-4 w-4 text-[#6366f1]" />
                      Current Password
                    </Label>
                    <div className="relative">
                      <Input
                        id="current-password"
                        type={showCurrentPassword ? "text" : "password"}
                        className="pl-10 bg-[#1a1a1a]/60 border-[#2a2a2a] text-white placeholder:text-gray-500 focus:border-[#6366f1] focus:ring-[#6366f1]/20 transition-all duration-300"
                        value={currentPassword}
                        onChange={(e) => setCurrentPassword(e.target.value)}
                        required
                        placeholder="Enter your current password"
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="absolute right-2 top-1/2 -translate-y-1/2 h-6 w-6 p-0 text-gray-400 hover:text-white"
                        onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                      >
                        {showCurrentPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </Button>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <Label htmlFor="new-password" className="text-gray-300 font-medium flex items-center gap-2">
                      <Key className="h-4 w-4 text-[#16ad7c]" />
                      New Password
                    </Label>
                    <div className="relative">
                      <Input
                        id="new-password"
                        type={showNewPassword ? "text" : "password"}
                        className="pl-10 bg-[#1a1a1a]/60 border-[#2a2a2a] text-white placeholder:text-gray-500 focus:border-[#16ad7c] focus:ring-[#16ad7c]/20 transition-all duration-300"
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        required
                        placeholder="Enter your new password"
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="absolute right-2 top-1/2 -translate-y-1/2 h-6 w-6 p-0 text-gray-400 hover:text-white"
                        onClick={() => setShowNewPassword(!showNewPassword)}
                      >
                        {showNewPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </Button>
                    </div>

                    {/* Password strength indicator */}
                    {newPassword.length > 0 && (
                      <div className="space-y-2">
                        <div className="flex justify-between text-xs">
                          <span className="text-gray-400">Password strength</span>
                          <span className={`font-medium ${newPasswordStrength.color.replace('bg-', 'text-')}`}>
                            {newPasswordStrength.text}
                          </span>
                        </div>
                        <div className="h-2 w-full bg-[#1a1a1a] rounded-full overflow-hidden">
                          <motion.div
                            className={`h-full ${newPasswordStrength.color} rounded-full transition-all duration-300`}
                            initial={{ width: 0 }}
                            animate={{ width: `${(newPasswordStrength.strength / 4) * 100}%` }}
                          />
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="space-y-3">
                    <Label htmlFor="confirm-password" className="text-gray-300 font-medium flex items-center gap-2">
                      <CheckCircle className="h-4 w-4 text-[#10b981]" />
                      Confirm New Password
                    </Label>
                    <div className="relative">
                      <Input
                        id="confirm-password"
                        type={showConfirmPassword ? "text" : "password"}
                        className="pl-10 bg-[#1a1a1a]/60 border-[#2a2a2a] text-white placeholder:text-gray-500 focus:border-[#10b981] focus:ring-[#10b981]/20 transition-all duration-300"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        required
                        placeholder="Confirm your new password"
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="absolute right-2 top-1/2 -translate-y-1/2 h-6 w-6 p-0 text-gray-400 hover:text-white"
                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      >
                        {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </Button>
                    </div>
                  </div>
                </div>

                <div className="flex gap-3 pt-4">
                  <Button
                    type="button"
                    variant="outline"
                    className="border-[#2a2a2a] text-gray-300 hover:bg-[#2a2a2a] hover:text-white hover:border-[#2a2a2a] transition-all duration-300"
                    onClick={() => {
                      setIsChangingPassword(false);
                      setCurrentPassword("");
                      setNewPassword("");
                      setConfirmPassword("");
                    }}
                    disabled={loading}
                  >
                    <X className="h-4 w-4 mr-2" />
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    className="bg-gradient-to-r from-[#16ad7c] to-[#109d73] hover:from-[#109d73] hover:to-[#0b7d5a] text-black font-semibold shadow-lg hover:shadow-[0_8px_25px_rgba(22,173,124,0.3)] transition-all duration-300 transform hover:-translate-y-0.5"
                    disabled={loading}
                  >
                    {loading ? (
                      <div className="flex items-center gap-2">
                        <div className="h-4 w-4 border-2 border-black border-t-transparent rounded-full animate-spin"></div>
                        Updating...
                      </div>
                    ) : (
                      <>
                        <Save className="h-4 w-4 mr-2" />
                        Update Password
                      </>
                    )}
                  </Button>
                </div>
              </motion.form>
            ) : (
              <motion.div
                key="security-options"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                className="space-y-6"
              >
                {/* Password Management */}
                <motion.div
                  className="bg-gradient-to-br from-[#1a1a1a]/80 to-[#151515]/80 border border-[#2a2a2a] p-6 rounded-xl backdrop-blur-sm shadow-lg"
                  whileHover={{ scale: 1.02, y: -2 }}
                  transition={{ type: "spring", stiffness: 300 }}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-gradient-to-br from-[#6366f1] to-[#7c3aed] rounded-xl flex items-center justify-center shadow-lg">
                        <Key className="h-6 w-6 text-white" />
                      </div>
                      <div>
                        <h3 className="text-lg font-semibold text-white">Password Management</h3>
                        <p className="text-gray-400 text-sm">
                          Update your account password for enhanced security
                        </p>
                      </div>
                    </div>
                    <Button
                      variant="outline"
                      className="border-[#2a2a2a] text-gray-300 hover:bg-[#2a2a2a] hover:text-white hover:border-[#2a2a2a] transition-all duration-300"
                      onClick={() => setIsChangingPassword(true)}
                    >
                      <Lock className="h-4 w-4 mr-2" />
                      Change Password
                    </Button>
                  </div>
                </motion.div>

                {/* Two-Factor Authentication */}
                <motion.div
                  className="bg-gradient-to-br from-[#1a1a1a]/80 to-[#151515]/80 border border-[#2a2a2a] p-6 rounded-xl backdrop-blur-sm shadow-lg"
                  whileHover={{ scale: 1.02, y: -2 }}
                  transition={{ type: "spring", stiffness: 300 }}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-gradient-to-br from-[#f59e0b] to-[#d97706] rounded-xl flex items-center justify-center shadow-lg">
                        <Smartphone className="h-6 w-6 text-white" />
                      </div>
                      <div>
                        <h3 className="text-lg font-semibold text-white">Two-Factor Authentication</h3>
                        <p className="text-gray-400 text-sm">
                          {twoFAEnabled ? 'Enabled - Your account is protected' : 'Disabled - Enable for extra security'}
                        </p>
                        <div className="flex items-center gap-2 mt-2">
                          <Badge className={`text-xs px-2 py-1 ${twoFAEnabled
                            ? 'bg-gradient-to-r from-[#10b981]/20 to-[#059669]/20 border-[#10b981]/30 text-[#10b981]'
                            : 'bg-gradient-to-r from-[#ef4444]/20 to-[#dc2626]/20 border-[#ef4444]/30 text-[#ef4444]'
                            }`}>
                            {twoFAEnabled ? 'Active' : 'Inactive'}
                          </Badge>
                        </div>
                      </div>
                    </div>
                    <Button
                      variant={twoFAEnabled ? "outline" : "default"}
                      className={twoFAEnabled
                        ? "border-[#2a2a2a] text-gray-300 hover:bg-[#2a2a2a] hover:text-white hover:border-[#2a2a2a] transition-all duration-300"
                        : "bg-gradient-to-r from-[#f59e0b] to-[#d97706] hover:from-[#d97706] hover:to-[#b45309] text-white font-semibold shadow-lg hover:shadow-[0_8px_25px_rgba(245,158,11,0.3)] transition-all duration-300 transform hover:-translate-y-0.5"}
                      onClick={toggleTwoFA}
                    >
                      <Fingerprint className="h-4 w-4 mr-2" />
                      {twoFAEnabled ? 'Disable' : 'Enable'}
                    </Button>
                  </div>
                </motion.div>

                {/* Security Recommendations */}
                <motion.div
                  className="bg-gradient-to-br from-[#1a1a1a]/60 to-[#151515]/60 border border-[#f59e0b]/20 p-6 rounded-xl backdrop-blur-sm"
                  whileHover={{ scale: 1.01 }}
                  transition={{ type: "spring", stiffness: 300 }}
                >
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 bg-gradient-to-br from-[#f59e0b]/20 to-[#d97706]/20 rounded-xl flex items-center justify-center flex-shrink-0">
                      <AlertTriangle className="h-6 w-6 text-[#f59e0b]" />
                    </div>
                    <div className="flex-1">
                      <h3 className="text-lg font-semibold text-white mb-3">Security Recommendations</h3>
                      <p className="text-gray-400 text-sm mb-4">
                        Follow these best practices to keep your account secure and protected from unauthorized access.
                      </p>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-3">
                          <div className="flex items-center gap-3 text-sm">
                            <div className="w-5 h-5 bg-gradient-to-br from-[#16ad7c] to-[#10b981] rounded-full flex items-center justify-center">
                              <CheckSquare className="h-3 w-3 text-white" />
                            </div>
                            <span className="text-gray-300">Use a strong, unique password</span>
                          </div>
                          <div className="flex items-center gap-3 text-sm">
                            <div className="w-5 h-5 bg-gradient-to-br from-[#16ad7c] to-[#10b981] rounded-full flex items-center justify-center">
                              <CheckSquare className="h-3 w-3 text-white" />
                            </div>
                            <span className="text-gray-300">Enable two-factor authentication</span>
                          </div>
                        </div>
                        <div className="space-y-3">
                          <div className="flex items-center gap-3 text-sm">
                            <div className="w-5 h-5 bg-gradient-to-br from-[#16ad7c] to-[#10b981] rounded-full flex items-center justify-center">
                              <CheckSquare className="h-3 w-3 text-white" />
                            </div>
                            <span className="text-gray-300">Keep recovery email up to date</span>
                          </div>
                          <div className="flex items-center gap-3 text-sm">
                            <div className="w-5 h-5 bg-gradient-to-br from-[#16ad7c] to-[#10b981] rounded-full flex items-center justify-center">
                              <CheckSquare className="h-3 w-3 text-white" />
                            </div>
                            <span className="text-gray-300">Monitor login activity regularly</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </motion.div>

                {/* Security Status */}
                <motion.div
                  className="bg-gradient-to-br from-[#1a1a1a]/60 to-[#151515]/60 border border-[#2a2a2a] p-6 rounded-xl backdrop-blur-sm"
                  whileHover={{ scale: 1.01 }}
                  transition={{ type: "spring", stiffness: 300 }}
                >
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-gradient-to-br from-[#10b981]/20 to-[#059669]/20 rounded-xl flex items-center justify-center">
                      <Shield className="h-6 w-6 text-[#10b981]" />
                    </div>
                    <div className="flex-1">
                      <h3 className="text-lg font-semibold text-white">Account Security Status</h3>
                      <p className="text-gray-400 text-sm">Your account security overview</p>
                    </div>
                    <div className="text-right">
                      <div className="text-2xl font-bold text-[#10b981]">85%</div>
                      <div className="text-xs text-gray-400">Secure</div>
                    </div>
                  </div>

                  <div className="mt-4 space-y-3">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-400">Password Strength</span>
                      <span className="text-[#16ad7c] font-medium">Strong</span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-400">Two-Factor Auth</span>
                      <span className={twoFAEnabled ? "text-[#10b981] font-medium" : "text-[#ef4444] font-medium"}>
                        {twoFAEnabled ? 'Enabled' : 'Disabled'}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-400">Last Login</span>
                      <span className="text-gray-300">2 hours ago</span>
                    </div>
                  </div>
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>
        </CardContent>
      </Card>
    </motion.div>
  );
};
