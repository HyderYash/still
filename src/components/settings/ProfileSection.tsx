
import { useState, useRef } from 'react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { User, Mail, Phone, Upload, Check, Camera, Calendar, Edit3, Save, X } from "lucide-react";
import { useUser } from "@/contexts/UserContext";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { motion, AnimatePresence } from "framer-motion";

export const ProfileSection = () => {
  const { user, updateUserData, refreshUser } = useUser();
  const [formData, setFormData] = useState({
    name: user?.name || '',
    email: user?.email || '',
    phone: user?.phone || '',
  });
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      // Parse name into first_name and last_name
      const nameParts = formData.name.split(' ');
      const firstName = nameParts[0] || '';
      const lastName = nameParts.slice(1).join(' ') || '';

      // Update profile in Supabase
      const { error } = await supabase
        .from('profiles')
        .update({
          first_name: firstName,
          last_name: lastName,
          // Only update phone if it's provided
          ...(formData.phone ? { phone: formData.phone } : {})
        })
        .eq('id', user?.id);

      if (error) {
        toast.error("Failed to update profile: " + error.message);
        return;
      }

      // Update local state
      if (updateUserData) {
        updateUserData(formData);
      }

      setIsEditing(false);
      toast.success("Profile updated successfully");

      // Refresh user data from database
      if (refreshUser) {
        await refreshUser();
      }
    } catch (err) {
      console.error("Error updating profile:", err);
      toast.error("An unexpected error occurred");
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    // Reset form data to original values
    setFormData({
      name: user?.name || '',
      email: user?.email || '',
      phone: user?.phone || '',
    });
    setIsEditing(false);
  };

  const handleAvatarClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user?.id) return;

    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      toast.error("Please upload an image file (JPEG, PNG, GIF, WEBP)");
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast.error("Image size should be less than 5MB");
      return;
    }

    setIsUploading(true);

    try {
      // Generate a unique filename
      const fileExt = file.name.split('.').pop();
      const fileName = `9c743627-a36d-46fc-9bb3-683e1d88abea.${fileExt}`;
      console.log("fileName: ", fileName)
      // Upload to Supabase Storage
      const { error: uploadError } = await supabase
        .storage
        .from('avatars')
        .upload('avatar1.png', file, {
          cacheControl: '3600',
          upsert: false
        })

      console.log("uploadError: ", uploadError)
      if (uploadError) {
        throw uploadError;
      }

      // Get public URL
      const { data: publicUrlData } = supabase.storage
        .from('avatars')
        .getPublicUrl(fileName);

      console.log("publicUrlData: ", publicUrlData)

      // Update profile with new avatar URL
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ avatar_url: publicUrlData.publicUrl })
        .eq('id', user.id);
      console.log("updateError: ", updateError)


      if (updateError) {
        throw updateError;
      }

      // Update local state
      if (updateUserData) {
        updateUserData({ avatar: publicUrlData.publicUrl });
      }

      // Refresh user data
      if (refreshUser) {
        await refreshUser();
      }

      toast.success("Profile picture updated successfully");
    } catch (error: any) {
      console.error("Error uploading avatar:", error);
      toast.error(`Failed to upload image: ${error.message}`);
    } finally {
      setIsUploading(false);
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  // Safe initials for avatar
  const userInitials = user?.name ? user.name.substring(0, 2).toUpperCase() : "U";

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
    >
      <Card className="border-[#2a2a2a] bg-gradient-to-br from-[#151515]/80 to-[#1a1a1a]/80 backdrop-blur-sm shadow-2xl overflow-hidden">
        {/* Enhanced Header */}
        <CardHeader className="border-b border-[#2a2a2a] pb-6 bg-gradient-to-r from-[#16ad7c]/5 to-[#5ce1e6]/5">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-gradient-to-br from-[#16ad7c] to-[#109d73] rounded-xl flex items-center justify-center shadow-lg">
              <User className="h-6 w-6 text-black" />
            </div>
            <div>
              <CardTitle className="text-2xl font-bold text-white">
                Profile Information
              </CardTitle>
              <CardDescription className="text-gray-400 text-base">
                Manage your personal information and account details
              </CardDescription>
            </div>
          </div>
        </CardHeader>

        <CardContent className="pt-8 space-y-8">
          {/* Avatar Section */}
          <div className="flex flex-col md:flex-row gap-8 items-start">
            <div className="relative group">
              <motion.div
                whileHover={{ scale: 1.05 }}
                transition={{ type: "spring", stiffness: 300 }}
              >
                <Avatar className={`h-28 w-28 border-4 border-gradient-to-r from-[#16ad7c] to-[#5ce1e6] shadow-2xl ${isUploading ? 'opacity-50' : ''}`}>
                  <AvatarImage src={user?.avatar} alt={user?.name || "User"} />
                  <AvatarFallback className="text-3xl font-bold bg-gradient-to-br from-[#16ad7c] to-[#5ce1e6] text-black">
                    {userInitials}
                  </AvatarFallback>
                </Avatar>
              </motion.div>

              {/* Upload Overlay */}
              <motion.div
                onClick={handleAvatarClick}
                className="absolute inset-0 flex items-center justify-center bg-black/70 rounded-full opacity-0 group-hover:opacity-100 transition-all duration-300 cursor-pointer backdrop-blur-sm"
                whileHover={{ scale: 1.05 }}
              >
                {isUploading ? (
                  <div className="h-8 w-8 border-3 border-white border-t-transparent rounded-full animate-spin"></div>
                ) : (
                  <div className="text-center">
                    <Camera className="h-8 w-8 text-white mx-auto mb-1" />
                    <span className="text-xs text-white font-medium">Change Photo</span>
                  </div>
                )}
              </motion.div>

              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleFileChange}
                disabled={isUploading}
              />
            </div>

            {/* Profile Stats */}
            <div className="flex-1 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Full Name */}
                <div className="space-y-3">
                  <Label htmlFor="name" className="text-gray-300 font-medium flex items-center gap-2">
                    <User className="h-4 w-4 text-[#16ad7c]" />
                    Full Name
                  </Label>
                  <div className="relative">
                    <Input
                      id="name"
                      name="name"
                      placeholder="Your full name"
                      value={formData.name}
                      onChange={handleChange}
                      disabled={!isEditing}
                      className={`pl-10 bg-[#1a1a1a]/60 border-[#2a2a2a] text-white placeholder:text-gray-500 focus:border-[#16ad7c] focus:ring-[#16ad7c]/20 transition-all duration-300 ${!isEditing ? 'opacity-80' : ''}`}
                    />
                  </div>
                </div>

                {/* Email Address */}
                <div className="space-y-3">
                  <Label htmlFor="email" className="text-gray-300 font-medium flex items-center gap-2">
                    <Mail className="h-4 w-4 text-[#5ce1e6]" />
                    Email Address
                  </Label>
                  <div className="relative">
                    <Input
                      id="email"
                      name="email"
                      type="email"
                      placeholder="Your email"
                      value={formData.email}
                      onChange={handleChange}
                      disabled={true}
                      className="pl-10 bg-[#1a1a1a]/60 border-[#2a2a2a] text-gray-400 cursor-not-allowed"
                    />
                  </div>
                </div>

                {/* Phone Number */}
                <div className="space-y-3">
                  <Label htmlFor="phone" className="text-gray-300 font-medium flex items-center gap-2">
                    <Phone className="h-4 w-4 text-[#6366f1]" />
                    Phone Number
                  </Label>
                  <div className="relative">
                    <Input
                      id="phone"
                      name="phone"
                      placeholder="Your phone number"
                      value={formData.phone}
                      onChange={handleChange}
                      disabled={!isEditing}
                      className={`pl-10 bg-[#1a1a1a]/60 border-[#2a2a2a] text-white placeholder:text-gray-500 focus:border-[#6366f1] focus:ring-[#6366f1]/20 transition-all duration-300 ${!isEditing ? 'opacity-80' : ''}`}
                    />
                  </div>
                </div>

                {/* Join Date */}
                <div className="space-y-3">
                  <Label className="text-gray-300 font-medium flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-[#8b5cf6]" />
                    Join Date
                  </Label>
                  <div className="h-10 px-4 py-2 rounded-md bg-[#1a1a1a]/60 border border-[#2a2a2a] flex items-center text-gray-300 opacity-80">
                    {user?.joinDate?.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }) || "N/A"}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </CardContent>

        {/* Enhanced Footer */}
        <CardFooter className="flex justify-between border-t border-[#2a2a2a] pt-6 bg-gradient-to-r from-[#16ad7c]/5 to-[#5ce1e6]/5">
          <AnimatePresence mode="wait">
            {isEditing ? (
              <motion.div
                key="editing"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                className="flex gap-3 w-full"
              >
                <Button
                  variant="outline"
                  className="border-[#2a2a2a] text-gray-300 hover:bg-[#2a2a2a] hover:text-white hover:border-[#2a2a2a] transition-all duration-300"
                  onClick={handleCancel}
                  disabled={isSaving}
                >
                  <X className="h-4 w-4 mr-2" />
                  Cancel
                </Button>
                <Button
                  onClick={handleSave}
                  disabled={isSaving}
                  className="bg-gradient-to-r from-[#16ad7c] to-[#109d73] hover:from-[#109d73] hover:to-[#0b7d5a] text-black font-semibold shadow-lg hover:shadow-[0_8px_25px_rgba(22,173,124,0.3)] transition-all duration-300 transform hover:-translate-y-0.5 ml-auto"
                >
                  {isSaving ? (
                    <div className="flex items-center gap-2">
                      <div className="h-4 w-4 border-2 border-black border-t-transparent rounded-full animate-spin"></div>
                      Saving...
                    </div>
                  ) : (
                    <>
                      <Save className="h-4 w-4 mr-2" />
                      Save Changes
                    </>
                  )}
                </Button>
              </motion.div>
            ) : (
              <motion.div
                key="viewing"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="w-full"
              >
                <Button
                  className="ml-auto bg-gradient-to-r from-[#2a2a2a] to-[#1a1a1a] hover:from-[#1a1a1a] hover:to-[#2a2a2a] text-white hover:text-[#16ad7c] border border-[#2a2a2a] transition-all duration-300 hover:shadow-lg"
                  onClick={() => setIsEditing(true)}
                >
                  <Edit3 className="h-4 w-4 mr-2" />
                  Edit Profile
                </Button>
              </motion.div>
            )}
          </AnimatePresence>
        </CardFooter>
      </Card>
    </motion.div>
  );
};
