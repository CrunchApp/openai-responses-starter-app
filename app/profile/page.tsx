"use client";
import React, { useEffect, useState } from "react";
import ProfileWizard from "@/components/profile/profile-wizard";
import { useRouter } from "next/navigation";

export default function ProfilePage() {
  const router = useRouter();
  
  // Check if profile is completed in localStorage
  useEffect(() => {
    // Only run in browser environment
    if (typeof window !== 'undefined') {
      try {
        const storedData = localStorage.getItem('user-data-store');
        if (storedData) {
          const parsedData = JSON.parse(storedData);
          const profileData = parsedData.state?.profileData;
          const step = parsedData.state?.profileCompletionStep;
          
          // If profile is fully completed, redirect to recommendations
          if (profileData && step === 6) {
            router.push("/recommendations");
          }
        }
      } catch (e) {
        console.error('Error checking profile completion status:', e);
      }
    }
  }, [router]);
  
  return (
    <div className="container mx-auto py-8 max-w-4xl">
      <h1 className="text-3xl font-bold mb-6">Education Profile Setup</h1>
      <ProfileWizard />
    </div>
  );
} 