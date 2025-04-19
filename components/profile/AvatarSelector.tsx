'use client';

import React, { useState, useEffect } from 'react';
import Image from 'next/image';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/app/components/auth/AuthContext';
import { Upload, ImagePlus } from 'lucide-react';

const PREDEFINED_AVATARS = [
  '/images/vectors/avatars/11062b_2d0d70ae3c0e408c837dd0f42d705da5.svg',
  '/images/vectors/avatars/11062b_5667b97ac3e34738993c82dff3d07631.svg',
  '/images/vectors/avatars/11062b_4a6ee6561bf448fa91067b0c42f26b31.svg',
  '/images/vectors/avatars/11062b_abb199bbec7842f89e508b1cec1a5c8b.svg',
  '/images/vectors/avatars/11062b_42063412fde549bf97454aa3920511c2.svg',
  '/images/vectors/avatars/11062b_aa30b406589d47ccb3edbf2c28621882.svg',
  '/images/vectors/avatars/11062b_00d798f5c45241f4b861dad8767c149f.svg',
  '/images/vectors/avatars/11062b_f45ece24f4db4fcb97bab68181a3b81e.svg',
  '/images/vectors/avatars/11062b_2a8dc392d61048e6a80779f22c70de36.svg',
  '/images/vectors/avatars/11062b_cb2ad65565b34872ad29756e8d98df9e.svg',
];

interface AvatarSelectorProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function AvatarSelector({ isOpen, onClose }: AvatarSelectorProps) {
  const { user, refreshSession } = useAuth();
  const { toast } = useToast();
  const [selectedAvatar, setSelectedAvatar] = useState<string | null>(
    user?.user_metadata?.avatar_url || null
  );
  const [isUploading, setIsUploading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [activeTab, setActiveTab] = useState('predefined');
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  // Update selected avatar when user changes
  useEffect(() => {
    if (user?.user_metadata?.avatar_url) {
      setSelectedAvatar(user.user_metadata.avatar_url);
    }
  }, [user]);

  // Clean up object URL when component unmounts
  useEffect(() => {
    return () => {
      if (previewUrl && !previewUrl.startsWith('/')) {
        URL.revokeObjectURL(previewUrl);
      }
    };
  }, [previewUrl]);

  const handleAvatarSelect = (avatarUrl: string) => {
    setSelectedAvatar(avatarUrl);
    setUploadedFile(null);
    
    // If we had a preview URL from a custom upload, clean it up
    if (previewUrl && !previewUrl.startsWith('/')) {
      URL.revokeObjectURL(previewUrl);
      setPreviewUrl(null);
    }
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Only allow image files
    if (!file.type.startsWith('image/')) {
      toast({
        title: "Invalid file type",
        description: "Please upload an image file",
        variant: "destructive"
      });
      return;
    }

    // Check file size (limit to 2MB)
    if (file.size > 2 * 1024 * 1024) {
      toast({
        title: "File too large",
        description: "Please upload an image smaller than 2MB",
        variant: "destructive"
      });
      return;
    }

    setIsUploading(true);

    try {
      // Store the file for later upload
      setUploadedFile(file);
      
      // Create a local preview URL
      const objectUrl = URL.createObjectURL(file);
      setPreviewUrl(objectUrl);
      
      // Set this as the selected avatar
      setSelectedAvatar('custom-upload');
      
      toast({
        title: "Image selected",
        description: "Click save to update your profile",
      });
    } catch (error) {
      console.error('Error handling file:', error);
      toast({
        title: "Error selecting image",
        description: "Please try again with a different image",
        variant: "destructive"
      });
    } finally {
      setIsUploading(false);
    }
  };

  const saveAvatar = async () => {
    if (!selectedAvatar) return;
    
    setIsSaving(true);
    
    try {
      let avatarUrl = selectedAvatar;

      // If it's a custom upload, send the file to the server endpoint
      if (selectedAvatar === 'custom-upload' && uploadedFile) {
        const formData = new FormData();
        formData.append('file', uploadedFile);
        
        // Use fetch to upload the file to our new API endpoint
        const response = await fetch('/api/profile/upload-avatar', {
          method: 'POST',
          body: formData,
        });
        
        const data = await response.json();
        
        if (!response.ok) {
          throw new Error(data.error || 'Failed to upload avatar');
        }
        
        avatarUrl = data.avatarUrl;
      } else {
        // If it's a predefined avatar, just update the metadata
        const response = await fetch('/api/profile/update-avatar', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ avatarUrl }),
        });
        
        const data = await response.json();
        
        if (!response.ok) {
          throw new Error(data.error || 'Failed to update avatar');
        }
      }
      
      // Clean up local state first
      if (uploadedFile) {
        setUploadedFile(null);
        if (previewUrl) {
          URL.revokeObjectURL(previewUrl);
          setPreviewUrl(null);
        }
      }
      
      // Show success toast
      toast({
        title: "Avatar updated",
        description: "Your profile avatar has been updated successfully",
      });
      
      // First close the dialog
      onClose();
      
      // Set loading state to false before refreshing session
      setIsSaving(false);
      
      // Then refresh the session after dialog is closed
      // Use setTimeout to ensure the dialog closing animation completes
      setTimeout(() => {
        refreshSession().catch(error => {
          console.error('Error during session refresh:', error);
        });
      }, 100);
      
      return; // Early return to prevent the finally block from running
    } catch (error) {
      console.error('Error saving avatar:', error);
      toast({
        title: "Error updating avatar",
        description: error instanceof Error ? error.message : "An unexpected error occurred",
        variant: "destructive"
      });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Choose Avatar</DialogTitle>
          <DialogDescription>
            Select from our avatar collection or upload your own
          </DialogDescription>
        </DialogHeader>
        
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="predefined">Library</TabsTrigger>
            <TabsTrigger value="upload">Upload</TabsTrigger>
          </TabsList>
          
          <TabsContent value="predefined" className="mt-4">
            <div className="grid grid-cols-3 sm:grid-cols-4 gap-4 max-h-[300px] overflow-y-auto p-2">
              {PREDEFINED_AVATARS.map((avatar, index) => (
                <div 
                  key={index}
                  className={`
                    relative aspect-square rounded-lg border-2 overflow-hidden cursor-pointer
                    hover:border-primary hover:shadow-md transition-all
                    ${selectedAvatar === avatar ? 'border-primary ring-2 ring-primary/50' : 'border-muted'}
                  `}
                  onClick={() => handleAvatarSelect(avatar)}
                >
                  <div className="relative w-full h-full">
                    <Image
                      src={avatar}
                      alt={`Avatar option ${index + 1}`}
                      fill
                      sizes="100px"
                      className="object-cover p-1"
                    />
                  </div>
                </div>
              ))}
            </div>
          </TabsContent>
          
          <TabsContent value="upload" className="mt-4">
            <div className="flex flex-col items-center justify-center gap-4">
              <div className="border-2 border-dashed border-muted p-6 rounded-lg w-full text-center">
                {previewUrl ? (
                  <div className="relative w-24 h-24 mx-auto mb-4">
                    <Image
                      src={previewUrl}
                      alt="Custom avatar preview"
                      fill
                      sizes="100px"
                      className="object-cover rounded-full"
                    />
                  </div>
                ) : (
                  <ImagePlus className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                )}
                
                <p className="text-sm text-muted-foreground mb-2">
                  {isUploading 
                    ? "Uploading..."
                    : "Upload a custom image for your avatar"
                  }
                </p>
                
                <Button
                  variant="outline"
                  disabled={isUploading}
                  className="relative"
                  onClick={() => document.getElementById('avatar-upload')?.click()}
                >
                  <Upload className="h-4 w-4 mr-2" /> 
                  Choose Image
                  <input
                    id="avatar-upload"
                    type="file"
                    accept="image/*"
                    className="sr-only"
                    onChange={handleFileUpload}
                    disabled={isUploading}
                  />
                </Button>
                <p className="text-xs text-muted-foreground mt-2">
                  Max size: 2MB. Recommended: square image
                </p>
              </div>
            </div>
          </TabsContent>
        </Tabs>
        
        <DialogFooter className="flex justify-between sm:justify-end gap-2 mt-6">
          <Button variant="outline" onClick={onClose} disabled={isSaving}>
            Cancel
          </Button>
          <Button 
            onClick={saveAvatar} 
            disabled={!selectedAvatar || isSaving || isUploading}
            className="relative"
          >
            {isSaving ? (
              <>
                <div className="animate-spin mr-2 h-4 w-4 rounded-full border-2 border-current border-t-transparent" />
                Saving...
              </>
            ) : "Save"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
} 