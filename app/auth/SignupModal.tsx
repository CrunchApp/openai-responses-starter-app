// components/auth/SignupModal.tsx
"use client";
import React, { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2 } from "lucide-react";
import { useAuth } from "@/app/components/auth/AuthContext";
import { UserProfile } from "@/app/types/profile-schema";

interface SignupModalProps {
  isOpen: boolean;
  onClose: () => void;
  onComplete: (userId?: string) => Promise<void>;
  isLoading: boolean;
  profileData: UserProfile;
}

export default function SignupModal({ isOpen, onClose, onComplete, isLoading, profileData }: SignupModalProps) {
  const { signUp, error: authError } = useAuth();
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [signupError, setSignupError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Pre-populate form with profile data when the modal opens
  useEffect(() => {
    if (isOpen && profileData) {
      setFirstName(profileData.firstName || "");
      setLastName(profileData.lastName || "");
      setEmail(profileData.email || "");
    }
  }, [isOpen, profileData]);

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setSignupError("");
    setIsSubmitting(true);

    if (password !== confirmPassword) {
      setSignupError("Passwords do not match");
      setIsSubmitting(false);
      return;
    }

    try {
      const result = await signUp(email, password, firstName, lastName);

      if (!result) {
        throw new Error("Registration failed");
      }

      // Call onComplete with the new user ID
      await onComplete(result.id);
    } catch (error) {
      console.error("Error signing up:", error);
      setSignupError(authError || "Failed to sign up. Please try again.");
      setIsSubmitting(false);
    }
  };

  const handleSkip = async () => {
    try {
      await onComplete();
    } catch (error) {
      console.error("Error skipping signup:", error);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={isSubmitting ? undefined : onClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Create an Account</DialogTitle>
        </DialogHeader>
        
        <div className="py-4">
          <p className="text-sm text-zinc-500 mb-4">
            We've pre-filled your information. Just choose a password to create your account and save your profile.
          </p>
          
          {signupError && (
            <Alert variant="destructive" className="mb-4">
              <AlertDescription>{signupError}</AlertDescription>
            </Alert>
          )}
          
          <form onSubmit={handleSignup} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="firstName">First Name</Label>
              <Input
                id="firstName"
                type="text"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                required
                readOnly
                className="bg-gray-50"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="lastName">Last Name</Label>
              <Input
                id="lastName"
                type="text"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                readOnly
                className="bg-gray-50"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                readOnly
                className="bg-gray-50"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoFocus
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Confirm Password</Label>
              <Input
                id="confirmPassword"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
              />
            </div>
            
            <div className="flex justify-between pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={handleSkip}
                disabled={isSubmitting || isLoading}
              >
                Skip for Now
              </Button>
              
              <Button type="submit" disabled={isSubmitting || isLoading}>
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Signing Up...
                  </>
                ) : (
                  "Sign Up"
                )}
              </Button>
            </div>
          </form>
        </div>
      </DialogContent>
    </Dialog>
  );
}