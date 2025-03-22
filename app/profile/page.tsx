"use client";
import React, { useEffect } from "react";
import ProfileWizard from "@/components/profile/profile-wizard";
import useProfileStore from "@/stores/useProfileStore";
import { useRouter, useSearchParams } from "next/navigation";
import useToolsStore from "@/stores/useToolsStore";

export default function ProfilePage() {
  const { isProfileComplete, vectorStoreId } = useProfileStore();
  const { setVectorStore } = useToolsStore();
  const router = useRouter();
  const searchParams = useSearchParams();
  
  // Check if we're in edit mode
  const isEditMode = searchParams.get('edit') === 'true';

  // Only redirect if profile is complete AND we're not in edit mode
  useEffect(() => {
    if (isProfileComplete && vectorStoreId && !isEditMode) {
      // Update the tools store with vector store info
      setVectorStore({
        id: vectorStoreId,
        name: "User Profile Vector Store",
      });
      
      // Redirect to recommendations page
      router.push("/recommendations");
    }
  }, [isProfileComplete, vectorStoreId, setVectorStore, router, isEditMode]);

  return (
    <div className="container mx-auto py-8 max-w-4xl">
      <h1 className="text-3xl font-bold mb-6">
        {isEditMode ? "Edit Your Education Profile" : "Education Profile Setup"}
      </h1>
      <ProfileWizard isEditMode={isEditMode} />
    </div>
  );
} 