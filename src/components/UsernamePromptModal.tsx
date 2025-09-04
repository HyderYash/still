import React, { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useUser } from "@/contexts/UserContext";

type UsernamePromptModalProps = {
  open: boolean;
  onComplete: () => void;
};

export default function UsernamePromptModal({ open, onComplete }: UsernamePromptModalProps) {
  const { user, refreshUser } = useUser();
  const [username, setUsername] = useState("");
  const [isChecking, setIsChecking] = useState(false);
  const [isAvailable, setIsAvailable] = useState<boolean | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const checkUsernameAvailability = async (value: string) => {
    if (!value || value.length < 3) {
      setIsAvailable(null);
      return;
    }

    setIsChecking(true);
    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("id")
        .eq("username", value)
        .maybeSingle();

      if (error) throw error;
      setIsAvailable(!data);
    } catch (error) {
      console.error("Error checking username:", error);
      setIsAvailable(null);
    } finally {
      setIsChecking(false);
    }
  };

  const handleUsernameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.toLowerCase().trim();
    setUsername(value);
    checkUsernameAvailability(value);
  };

  const saveUsername = async () => {
    if (!username || username.length < 3 || !isAvailable || !user) return;

    setIsSubmitting(true);
    try {
      const { error } = await supabase
        .from("profiles")
        .update({ username })
        .eq("id", user.id);

      if (error) throw error;

      await refreshUser();
      toast.success("Username set successfully!");
      onComplete();
    } catch (error: any) {
      console.error("Error setting username:", error);
      toast.error(error.message || "Failed to set username");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open}>
      <DialogContent className="sm:max-w-md" onInteractOutside={(e) => e.preventDefault()}>
        <DialogHeader>
          <DialogTitle>Set Your Username</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="username">Username</Label>
            <Input
              id="username"
              placeholder="Choose a unique username"
              value={username}
              onChange={handleUsernameChange}
              className={`${isAvailable === true
                  ? "border-green-500"
                  : isAvailable === false
                    ? "border-red-500"
                    : ""
                }`}
              disabled={isSubmitting}
            />
            {isChecking && <p className="text-sm text-muted-foreground">Checking availability...</p>}
            {isAvailable === false && <p className="text-sm text-red-500">Username is already taken</p>}
            {isAvailable === true && <p className="text-sm text-green-500">Username is available</p>}
            {username && username.length < 3 && (
              <p className="text-sm text-amber-500">Username must be at least 3 characters</p>
            )}
          </div>
          <Button
            onClick={saveUsername}
            disabled={!isAvailable || isSubmitting || username.length < 3}
            className="w-full"
          >
            {isSubmitting ? "Saving..." : "Set Username"}
          </Button>
          <p className="text-xs text-center text-muted-foreground">
            You need to set a username to continue using the application
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
} 