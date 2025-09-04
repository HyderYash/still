import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Mail, Lock, ArrowRight, Github, User, Check, AlertCircle, Shield, Sparkles, Eye, EyeOff, Key, Zap } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useUser } from "@/contexts/UserContext";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultTab?: "signin" | "signup";
  redirectAction?: () => void;
}

const AuthModal = ({
  isOpen,
  onClose,
  defaultTab = "signin",
  redirectAction,
}: AuthModalProps) => {
  const [activeTab, setActiveTab] = useState<"signin" | "signup">(defaultTab);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const [username, setUsername] = useState("");
  const [usernameAvailable, setUsernameAvailable] = useState<boolean | null>(null);
  const [usernameChecking, setUsernameChecking] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [passwordStrength, setPasswordStrength] = useState<number>(0);

  const { login, loginWithGoogle, signup, isLoggedIn } = useUser();

  useEffect(() => {
    if (isOpen) {
      setActiveTab(defaultTab);
    }
  }, [isOpen, defaultTab]);

  useEffect(() => {
    if (isLoggedIn) {
      onClose();

      if (redirectAction) {
        setTimeout(() => {
          redirectAction();
        }, 100);
      }
    }
  }, [isLoggedIn, onClose, redirectAction]);

  useEffect(() => {
    const checkUsernameAvailability = async () => {
      if (!username) {
        setUsernameAvailable(null);
        return;
      }

      try {
        setUsernameChecking(true);
        const { data, error } = await supabase
          .from('profiles')
          .select('id')
          .eq('username', username)
          .maybeSingle();

        if (error) {
          console.error("Username availability check error:", error);
          setUsernameAvailable(null);
          return;
        }

        // If no data is returned, username is available
        setUsernameAvailable(data === null);
      } catch (error) {
        console.error("Error checking username:", error);
        setUsernameAvailable(null);
      } finally {
        setUsernameChecking(false);
      }
    };

    const timeoutId = setTimeout(checkUsernameAvailability, 500);
    return () => clearTimeout(timeoutId);
  }, [username]);

  useEffect(() => {
    // Calculate password strength
    let strength = 0;
    if (password.length >= 8) strength += 1;
    if (/[a-z]/.test(password)) strength += 1;
    if (/[A-Z]/.test(password)) strength += 1;
    if (/[0-9]/.test(password)) strength += 1;
    if (/[^A-Za-z0-9]/.test(password)) strength += 1;
    setPasswordStrength(strength);
  }, [password]);

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { error } = await login(email, password);

      if (!error) {
        toast.success("Successfully signed in!");
      }
    } catch (error) {
      console.error("Error signing in:", error);
      toast.error("Failed to sign in. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!name.trim()) {
      toast.error("Please enter your full name");
      return;
    }

    if (!username.trim()) {
      toast.error("Please enter a username");
      return;
    }

    if (usernameAvailable === false) {
      toast.error("Username is already taken. Please choose another.");
      return;
    }

    setLoading(true);

    try {
      const [firstName, lastName] = name.trim().split(' ');
      const { error } = await signup(email, password, firstName, lastName, username);

      if (!error) {
        setTimeout(() => {
          onClose();
        }, 1500);
      }
    } catch (error) {
      console.error("Error signing up:", error);
      toast.error("Failed to create account. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setLoading(true);

    try {
      if (redirectAction) {
        redirectAction();
      }

      await loginWithGoogle();

      // Note: The code below won't execute immediately as the user will be redirected
      // to Google's auth page. When they return, the auth state change handler in
      // UserContext will handle the completion of the login process.
    } catch (error) {
      console.error("Error with Google sign in:", error);
      toast.error("Google sign in failed. Please try again.");
      setLoading(false);
    }
  };

  const getPasswordStrengthColor = () => {
    if (passwordStrength <= 2) return "text-red-400";
    if (passwordStrength <= 3) return "text-yellow-400";
    if (passwordStrength <= 4) return "text-blue-400";
    return "text-green-400";
  };

  const getPasswordStrengthText = () => {
    if (passwordStrength <= 2) return "Weak";
    if (passwordStrength <= 3) return "Fair";
    if (passwordStrength <= 4) return "Good";
    return "Strong";
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[500px] p-0 overflow-hidden bg-[#0a0a0a]/95 backdrop-blur-xl border-[#16ad7c]/30 text-white">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 20 }}
          transition={{ duration: 0.3 }}
          className="relative"
        >
          {/* Enhanced Header */}
          <DialogHeader className="relative px-6 pt-6 pb-2">
            {/* Background gradient */}
            <div className="absolute inset-0 bg-gradient-to-br from-[#16ad7c]/10 via-transparent to-[#5ce1e6]/5" />
            <div className="absolute inset-0 bg-gradient-to-b from-transparent to-[#0a0a0a]/50" />

            {/* Title and icon */}
            <div className="relative z-10 flex items-center gap-3 mb-2">
              <div className="relative">
                <div className="w-12 h-12 bg-gradient-to-br from-[#16ad7c] to-[#5ce1e6] rounded-xl flex items-center justify-center shadow-lg">
                  <Shield className="h-6 w-6 text-black" />
                </div>
                <div className="absolute inset-0 bg-gradient-to-br from-[#16ad7c] to-[#5ce1e6] rounded-xl blur-xl opacity-50"></div>
              </div>
              <div>
                <DialogTitle className="text-2xl font-bold text-white">
                  {activeTab === "signin" ? "Welcome Back" : "Create Account"}
                </DialogTitle>
                <DialogDescription className="text-gray-400 text-sm">
                  {activeTab === "signin"
                    ? "Sign in to continue to StillCollab"
                    : "Join StillCollab to start collaborating"}
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          <Tabs
            defaultValue={activeTab}
            value={activeTab}
            onValueChange={(value) => setActiveTab(value as "signin" | "signup")}
            className="w-full"
          >
            {/* Enhanced Tabs */}
            <div className="px-6">
              <TabsList className="grid grid-cols-2 bg-[#1a1a1a] border border-[#333] p-1 rounded-xl">
                <TabsTrigger
                  value="signin"
                  className={`data-[state=active]:bg-gradient-to-r data-[state=active]:from-[#16ad7c] data-[state=active]:to-[#109d73] data-[state=active]:text-black rounded-lg transition-all duration-300 ${activeTab === "signin" ? "shadow-lg" : "text-gray-400 hover:text-white"
                    }`}
                >
                  <motion.div
                    initial={false}
                    animate={{ scale: activeTab === "signin" ? 1.05 : 1 }}
                    className="flex items-center gap-2"
                  >
                    <Key className="h-4 w-4" />
                    Sign In
                  </motion.div>
                </TabsTrigger>
                <TabsTrigger
                  value="signup"
                  className={`data-[state=active]:bg-gradient-to-r data-[state=active]:from-[#16ad7c] data-[state=active]:to-[#109d73] data-[state=active]:text-black rounded-lg transition-all duration-300 ${activeTab === "signup" ? "shadow-lg" : "text-gray-400 hover:text-white"
                    }`}
                >
                  <motion.div
                    initial={false}
                    animate={{ scale: activeTab === "signup" ? 1.05 : 1 }}
                    className="flex items-center gap-2"
                  >
                    <Sparkles className="h-4 w-4" />
                    Sign Up
                  </motion.div>
                </TabsTrigger>
              </TabsList>
            </div>

            <div className="p-6 pt-4">
              {/* Google Sign In */}
              <div className="mb-6">
                <Button
                  onClick={handleGoogleSignIn}
                  disabled={loading}
                  variant="outline"
                  className="w-full h-12 flex items-center justify-center border-[#333] bg-[#1a1a1a] hover:bg-[#2a2a2a] text-white transition-all duration-200 hover:border-[#16ad7c]/30"
                >
                  <svg
                    className="w-5 h-5 mr-3"
                    viewBox="0 0 24 24"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <path
                      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                      fill="#4285F4"
                    />
                    <path
                      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                      fill="#34A853"
                    />
                    <path
                      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                      fill="#FBBC05"
                    />
                    <path
                      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                      fill="#EA4335"
                    />
                  </svg>
                  Continue with Google
                </Button>
              </div>

              {/* Divider */}
              <div className="relative my-6">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t border-[#333]"></span>
                </div>
                <div className="relative flex justify-center text-xs">
                  <span className="px-3 text-gray-400 bg-[#0a0a0a]">
                    or continue with email
                  </span>
                </div>
              </div>

              {/* Sign In Form */}
              <TabsContent value="signin" className="mt-0">
                <form onSubmit={handleSignIn} className="space-y-4">
                  <div className="space-y-4">
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                      <Input
                        type="email"
                        placeholder="Email address"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        required
                        className="pl-10 h-12 bg-[#1a1a1a] border-[#333] text-white focus:border-[#16ad7c] focus:ring-[#16ad7c]/20 transition-all duration-200"
                      />
                    </div>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                      <Input
                        type={showPassword ? "text" : "password"}
                        placeholder="Password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                        className="pl-10 pr-10 h-12 bg-[#1a1a1a] border-[#333] text-white focus:border-[#16ad7c] focus:ring-[#16ad7c]/20 transition-all duration-200"
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-1 top-1/2 transform -translate-y-1/2 h-10 w-10 text-gray-400 hover:text-white"
                      >
                        {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </Button>
                    </div>
                    <div className="text-right">
                      <a
                        href="#"
                        className="text-sm text-[#16ad7c] hover:underline transition-colors"
                        onClick={(e) => {
                          e.preventDefault();
                          toast.info("Password reset feature coming soon!");
                        }}
                      >
                        Forgot password?
                      </a>
                    </div>
                  </div>

                  <Button
                    type="submit"
                    disabled={loading}
                    className="w-full h-12 bg-gradient-to-r from-[#16ad7c] to-[#109d73] hover:from-[#109d73] hover:to-[#0b7d5a] text-black font-semibold transition-all duration-300 shadow-lg hover:shadow-[0_8px_25px_rgba(22,173,124,0.3)] transform hover:-translate-y-0.5"
                  >
                    <AnimatePresence mode="wait">
                      {loading ? (
                        <motion.div
                          key="loading"
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          exit={{ opacity: 0 }}
                          className="flex items-center gap-2"
                        >
                          <div className="w-4 h-4 border-2 border-black border-r-transparent rounded-full animate-spin"></div>
                          Signing in...
                        </motion.div>
                      ) : (
                        <motion.div
                          key="signin"
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          exit={{ opacity: 0 }}
                          className="flex items-center gap-2"
                        >
                          <Zap className="h-4 w-4" />
                          Sign In
                          <ArrowRight className="h-4 w-4" />
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </Button>
                </form>
              </TabsContent>

              {/* Sign Up Form */}
              <TabsContent value="signup" className="mt-0">
                <form onSubmit={handleSignUp} className="space-y-4">
                  <div className="space-y-4">
                    <div className="relative">
                      <User className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                      <Input
                        type="text"
                        placeholder="Full name"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        required
                        className="pl-10 h-12 bg-[#1a1a1a] border-[#333] text-white focus:border-[#16ad7c] focus:ring-[#16ad7c]/20 transition-all duration-200"
                      />
                    </div>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                      <Input
                        type="email"
                        placeholder="Email address"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        required
                        className="pl-10 h-12 bg-[#1a1a1a] border-[#333] text-white focus:border-[#16ad7c] focus:ring-[#16ad7c]/20 transition-all duration-200"
                      />
                    </div>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                      <Input
                        type={showPassword ? "text" : "password"}
                        placeholder="Password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                        className="pl-10 pr-10 h-12 bg-[#1a1a1a] border-[#333] text-white focus:border-[#16ad7c] focus:ring-[#16ad7c]/20 transition-all duration-200"
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-1 top-1/2 transform -translate-y-1/2 h-10 w-10 text-gray-400 hover:text-white"
                      >
                        {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </Button>
                    </div>

                    {/* Password Strength Indicator */}
                    {password && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        className="space-y-2"
                      >
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-gray-400">Password strength:</span>
                          <span className={getPasswordStrengthColor()}>{getPasswordStrengthText()}</span>
                        </div>
                        <div className="flex gap-1">
                          {[1, 2, 3, 4, 5].map((level) => (
                            <div
                              key={level}
                              className={`h-2 flex-1 rounded-full transition-all duration-300 ${level <= passwordStrength
                                ? passwordStrength <= 2
                                  ? "bg-red-500"
                                  : passwordStrength <= 3
                                    ? "bg-yellow-500"
                                    : passwordStrength <= 4
                                      ? "bg-blue-500"
                                      : "bg-green-500"
                                : "bg-[#333]"
                                }`}
                            />
                          ))}
                        </div>
                      </motion.div>
                    )}

                    <div className="relative">
                      <User className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                      <Input
                        type="text"
                        placeholder="Username"
                        value={username}
                        onChange={(e) => setUsername(e.target.value)}
                        required
                        className={`pl-10 pr-10 h-12 bg-[#1a1a1a] border-2 text-white transition-all duration-200 ${usernameAvailable === false
                          ? 'border-red-500/50 focus:border-red-400 focus:ring-red-400/20'
                          : usernameAvailable === true
                            ? 'border-green-500/50 focus:border-green-400 focus:ring-green-400/20'
                            : 'border-[#333] focus:border-[#16ad7c] focus:ring-[#16ad7c]/20'
                          }`}
                      />
                      {username && (
                        <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                          <AnimatePresence mode="wait">
                            {usernameChecking ? (
                              <motion.div
                                key="checking"
                                initial={{ opacity: 0, scale: 0.8 }}
                                animate={{ opacity: 1, scale: 1 }}
                                exit={{ opacity: 0, scale: 0.8 }}
                                className="w-4 h-4 border-2 border-gray-300 border-r-transparent rounded-full animate-spin"
                              />
                            ) : usernameAvailable === true ? (
                              <motion.div
                                key="available"
                                initial={{ opacity: 0, scale: 0.8 }}
                                animate={{ opacity: 1, scale: 1 }}
                                exit={{ opacity: 0, scale: 0.8 }}
                                className="w-4 h-4 bg-green-500 rounded-full flex items-center justify-center"
                              >
                                <Check className="h-2.5 w-2.5 text-white" />
                              </motion.div>
                            ) : usernameAvailable === false ? (
                              <motion.div
                                key="taken"
                                initial={{ opacity: 0, scale: 0.8 }}
                                animate={{ opacity: 1, scale: 1 }}
                                exit={{ opacity: 0, scale: 0.8 }}
                                className="w-4 h-4 bg-red-500 rounded-full flex items-center justify-center"
                              >
                                <AlertCircle className="h-2.5 w-2.5 text-white" />
                              </motion.div>
                            ) : null}
                          </AnimatePresence>
                        </div>
                      )}
                      {username && usernameAvailable === false && (
                        <motion.span
                          initial={{ opacity: 0, y: -10 }}
                          animate={{ opacity: 1, y: 0 }}
                          className="text-xs text-red-400 mt-1 block"
                        >
                          Username is already taken
                        </motion.span>
                      )}
                    </div>

                    <div className="text-xs text-gray-400 leading-relaxed">
                      By signing up, you agree to our{" "}
                      <a href="#" className="text-[#16ad7c] hover:underline transition-colors">
                        Terms of Service
                      </a>{" "}
                      and{" "}
                      <a href="#" className="text-[#16ad7c] hover:underline transition-colors">
                        Privacy Policy
                      </a>
                      .
                    </div>
                  </div>

                  <Button
                    type="submit"
                    disabled={loading}
                    className="w-full h-12 bg-gradient-to-r from-[#16ad7c] to-[#109d73] hover:from-[#109d73] hover:to-[#0b7d5a] text-black font-semibold transition-all duration-300 shadow-lg hover:shadow-[0_8px_25px_rgba(22,173,124,0.3)] transform hover:-translate-y-0.5"
                  >
                    <AnimatePresence mode="wait">
                      {loading ? (
                        <motion.div
                          key="loading"
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          exit={{ opacity: 0 }}
                          className="flex items-center gap-2"
                        >
                          <div className="w-4 h-4 border-2 border-black border-r-transparent rounded-full animate-spin"></div>
                          Creating account...
                        </motion.div>
                      ) : (
                        <motion.div
                          key="signup"
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          exit={{ opacity: 0 }}
                          className="flex items-center gap-2"
                        >
                          <Sparkles className="h-4 w-4" />
                          Create Account
                          <ArrowRight className="h-4 w-4" />
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </Button>
                </form>
              </TabsContent>
            </div>
          </Tabs>
        </motion.div>
      </DialogContent>
    </Dialog>
  );
};

export default AuthModal;
