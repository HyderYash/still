import React, { createContext, useContext, useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import UsernamePromptModal from "@/components/UsernamePromptModal";

export type UserSubscriptionPlan = "free" | "pro" | "enterprise";

type UserContextType = {
  user: {
    id: string;
    name: string;
    email: string;
    avatar?: string;
    phone?: string;
    joinDate: Date;
    subscriptionPlan: UserSubscriptionPlan;
    storageUsed: number;
    storageLimit: number;
    profile?: any;
  } | null;
  isLoggedIn: boolean;
  loading: boolean;
  isLoading: boolean;
  loadingProjects: boolean;
  authInitialized: boolean;
  userPlan: {
    id: string;
    name: string;
    storageLimit: number;
    storageUsed: number;
  } | null;
  login: (email: string, password: string) => Promise<any>;
  signup: (email: string, password: string, firstName: string, lastName: string, username: string) => Promise<any>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
  updateUserData: (data: any) => void;
  loginWithGoogle: () => Promise<any>;
};

const UserContext = createContext<UserContextType>({
  user: null,
  isLoggedIn: false,
  loading: true,
  isLoading: true,
  loadingProjects: false,
  authInitialized: false,
  userPlan: null,
  login: async () => null,
  signup: async () => null,
  logout: async () => { },
  refreshUser: async () => { },
  updateUserData: () => { },
  loginWithGoogle: async () => { },
});

export const useUser = () => useContext(UserContext);

export const UserProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<UserContextType["user"]>(null);
  const [loading, setLoading] = useState(true);
  const [authInitialized, setAuthInitialized] = useState(false);
  const [loadingProjects, setLoadingProjects] = useState(false);
  const [userPlan, setUserPlan] = useState<UserContextType['userPlan']>(null);
  const [showUsernamePrompt, setShowUsernamePrompt] = useState(false);
  const [isAuthenticating, setIsAuthenticating] = useState(false);

  const updateUserData = (data: any) => {
    if (user) {
      setUser({
        ...user,
        ...data,
      });
    }
  };

  const refreshUser = async () => {
    setLoading(true);
    try {
      const { data: userData } = await supabase.auth.getUser();
      if (userData?.user) {
        const { data: profileData } = await supabase
          .from("profiles")
          .select(`
            *,
            plans (
              id, name, storage_limit_bytes
            )
          `)
          .eq("id", userData.user.id)
          .single();


        console.log("profileData: ", profileData)

        if (profileData) {
          const storageUsedGB = parseFloat(String(profileData.total_size_mb || "0")) / 1000;
          const storageLimitGB = (profileData.plans?.storage_limit_bytes || 1000000000) / 1000000000;

          // Check if we need to prompt for username
          if (!profileData.username) {
            setShowUsernamePrompt(true);
          } else {
            setShowUsernamePrompt(false);
          }

          setUser({
            id: userData.user.id,
            name: `${profileData.first_name || ''} ${profileData.last_name || ''}`.trim(),
            email: userData.user.email || '',
            avatar: profileData.avatar_url,
            joinDate: new Date(userData.user.created_at),
            subscriptionPlan: profileData.plans?.name?.toLowerCase() as UserSubscriptionPlan || 'free',
            storageUsed: parseFloat(storageUsedGB.toFixed(2)),
            storageLimit: parseFloat(storageLimitGB.toFixed(2)),
            profile: profileData,
          });

          setUserPlan({
            id: profileData.plans?.id || "free",
            name: profileData.plans?.name || "Free",
            storageLimit: profileData.plans?.storage_limit_bytes || 1000000000,
            storageUsed: parseFloat(String(profileData.total_size_mb || '0')) * 1000000,
          });
        } else {
          setUser({
            id: userData.user.id,
            name: 'User',
            email: userData.user.email || '',
            joinDate: new Date(userData.user.created_at),
            subscriptionPlan: 'free',
            storageUsed: 0,
            storageLimit: 1,
          });
          setUserPlan(null);
        }
      } else {
        setUser(null);
        setUserPlan(null);
      }
    } catch (error) {
      console.error("Error retrieving user data:", error);
      toast.error("There was an issue retrieving your account data.");
    } finally {
      setLoading(false);
      setAuthInitialized(true);
    }
  };

  // Update Google user profile data
  const updateGoogleUserProfile = async (session: any) => {
    if (!session?.user) return;

    try {
      // First check if the profile already has data
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('first_name, last_name, username')
        .eq('id', session.user.id)
        .single();

      if (profileError && profileError.code !== 'PGRST116') {
        console.error("Error checking profile:", profileError);
        return;
      }

      // Only update if first_name and last_name are null
      if (!profileData?.first_name || !profileData?.last_name) {
        const userData = session.user.user_metadata || {};
        const firstName = userData.full_name?.split(' ')[0] || userData.given_name || '';
        const lastName = userData.full_name?.split(' ').slice(1).join(' ') || userData.family_name || '';

        const { error: updateError } = await supabase
          .from('profiles')
          .update({
            first_name: firstName,
            last_name: lastName,
            avatar_url: userData.avatar_url || userData.picture
          })
          .eq('id', session.user.id);

        if (updateError) {
          console.error("Error updating profile:", updateError);
        }
      }

      // Check if username is null and prompt if needed
      if (!profileData?.username) {
        setShowUsernamePrompt(true);
      }

      // Refresh user data
      await refreshUser();
    } catch (error) {
      console.error("Error updating Google profile:", error);
    }
  };

  const login = async (email: string, password: string) => {
    try {
      setIsAuthenticating(true);
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) throw error;
      await refreshUser();
      return data;
    } catch (error: any) {
      toast.error(error.message || "Failed to sign in");
      throw error;
    } finally {
      setIsAuthenticating(false);
    }
  };

  const signup = async (
    email: string,
    password: string,
    firstName: string,
    lastName: string,
    username: string
  ) => {
    try {
      setIsAuthenticating(true);
      // Get username availability directly from database
      const { data: usernameCheck, error: usernameError } = await supabase
        .from('profiles')
        .select('id')
        .eq('username', username)
        .maybeSingle();

      if (usernameError) {
        console.error("Error checking username:", usernameError);
        toast.error("Error checking username availability");
        return { error: { message: "Error checking username" } };
      }

      if (usernameCheck) {
        toast.error("Username is already taken. Please choose another.");
        return { error: { message: "Username already exists" } };
      }

      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            first_name: firstName,
            last_name: lastName,
            username: username
          }
        }
      });

      if (error) throw error;
      toast.success("Account created successfully! You can now sign in.");
      return data;
    } catch (error: any) {
      toast.error(error.message || "Failed to sign up");
      throw error;
    } finally {
      setIsAuthenticating(false);
    }
  };

  const loginWithGoogle = async () => {
    try {
      setIsAuthenticating(true);

      // Get the current URL path to redirect back to after auth
      const currentPath = window.location.pathname;
      const redirectUrl = new URL(window.location.origin);

      // If we're on a specific page like vote, we want to return there
      if (currentPath && currentPath !== '/') {
        redirectUrl.pathname = currentPath;
        // Add auth_action parameter to indicate this is a login return
        redirectUrl.searchParams.append('auth_action', 'login');
        // Add timestamp to ensure the URL is unique (prevents browser caching)
        redirectUrl.searchParams.append('t', Date.now().toString());
      }

      console.log("Google auth redirect URL:", redirectUrl.toString());

      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: redirectUrl.toString(),
          queryParams: {
            // Access type offline to get refresh token
            access_type: 'offline',
            // Prompt to ensure user always sees the consent screen
            prompt: 'select_account'
          }
        },
      });

      if (error) {
        console.error('Google auth error:', error);
        throw error;
      }

      // The user will be redirected to Google for authentication
      return data;
    } catch (error: any) {
      console.error('Google sign in error:', error);
      toast.error(error.message || "Google sign in failed");
      throw error;
    } finally {
      setIsAuthenticating(false);
    }
  };

  const logout = async () => {
    setIsAuthenticating(true);
    try {
      const { error } = await supabase.auth.signOut();
      if (error) {
        toast.error(error.message || "Failed to sign out");
        return;
      }
      setUser(null);
      setUserPlan(null);
    } finally {
      setIsAuthenticating(false);
    }
  };

  useEffect(() => {
    refreshUser();

    const { data: authListener } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (event === "SIGNED_IN" && session) {
          // Check for Google auth by looking at the provider in user metadata
          const isGoogleAuth = session.user?.app_metadata?.provider === 'google';
          if (isGoogleAuth) {
            await updateGoogleUserProfile(session);

            // Get the current URL parameters
            const params = new URLSearchParams(window.location.search);
            const authAction = params.get('auth_action');

            // If there's an auth_action parameter, this means we're returning from
            // a redirect that had a specific purpose (like voting)
            if (authAction) {
              console.log("Detected auth_action:", authAction);
              // We'll let the page handle the specific action
            } else {
              // If no specific action, we might want to redirect to a default page
              // but we'll leave this commented out for now
              // window.location.href = '/';
            }
          }
          refreshUser();
        } else if (event === "SIGNED_OUT") {
          setUser(null);
          setUserPlan(null);
          setShowUsernamePrompt(false);
          setAuthInitialized(true);
        }
      }
    );

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, []);

  const handleUsernameComplete = () => {
    setShowUsernamePrompt(false);
    refreshUser();
  };

  return (
    <UserContext.Provider
      value={{
        user,
        isLoggedIn: !!user,
        loading,
        isLoading: loading,
        loadingProjects,
        authInitialized,
        userPlan,
        login,
        signup,
        logout,
        refreshUser,
        updateUserData,
        loginWithGoogle,
      }}
    >
      {children}
      {showUsernamePrompt && <UsernamePromptModal open={showUsernamePrompt} onComplete={handleUsernameComplete} />}
    </UserContext.Provider>
  );
};

export default UserContext;
