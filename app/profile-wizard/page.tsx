"use client";
import React, { useEffect, Suspense } from "react";
import ProfileWizard from "@/components/profile/profile-wizard";
import useProfileStore from "@/stores/useProfileStore";
import { useRouter, useSearchParams } from "next/navigation";
import useToolsStore from "@/stores/useToolsStore";
import { useAuth } from "@/app/components/auth/AuthContext";
import { Loader2 } from "lucide-react";

// Create a client component that uses useSearchParams
function ProfileContent() {
  const { isProfileComplete, vectorStoreId } = useProfileStore();
  const { setVectorStore } = useToolsStore();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, loading: authLoading } = useAuth();
  
  // Check if we're in edit mode (only relevant for guests now)
  const isEditMode = searchParams.get('edit') === 'true';

  useEffect(() => {
    // Redirect ANY logged-in user away from the wizard immediately
    if (!authLoading && user) {
      console.log("ProfileContent: Logged-in user detected, redirecting to dashboard.");
      router.replace('/dashboard'); // Use replace to avoid adding wizard to history
      return; // Stop further checks if redirecting
    }

    // Optional: Redirect guests who completed the profile (Path B) away if they land here again?
    // This depends on desired behavior. If they should always go to recommendations:
    if (!authLoading && !user && isProfileComplete && vectorStoreId && !isEditMode) {
      console.log("ProfileContent: Guest profile complete, redirecting to recommendations.");
      router.replace('/recommendations');
    }

  }, [authLoading, user, router]); // Removed isEditMode, isProfileComplete, vectorStoreId from dependencies as they are not needed for the primary redirect logic

  // Show loading if auth state is still being determined
  if (authLoading) {
    return (
      <div className="flex justify-center items-center min-h-[300px]">
        <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
      </div>
    );
  }

  // Prevent rendering wizard for logged-in users who shouldn't be here
  // This check becomes slightly redundant due to the useEffect, but acts as a safeguard
  if (user) {
     return (
       <div className="flex justify-center items-center min-h-[300px]">
         <p>Redirecting...</p>
       </div>
     ); // Or null, or loading indicator
  }

  // Render wizard ONLY for guests (isEditMode might be true or false for guests)
  return (
    <div className="container mx-auto py-8 max-w-4xl">
      {/* <h1 className="text-3xl font-bold mb-6">
        {isEditMode ? "Edit Your Profile" : "Education Profile Setup"}
      </h1> */}
      <ProfileWizard isEditMode={isEditMode} />
    </div>
  );
}

// Main page component with Suspense boundary
export default function ProfilePage() {
  return (
    <Suspense fallback={<div className="flex justify-center items-center min-h-screen"><Loader2 className="h-10 w-10 animate-spin"/></div>}>
      <ProfileContent />
    </Suspense>
  );
} 