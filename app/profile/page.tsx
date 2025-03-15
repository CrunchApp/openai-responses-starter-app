import React from "react";
import ProfileWizard from "@/components/profile/profile-wizard";

export default function ProfilePage() {
  return (
    <div className="container mx-auto py-8 max-w-4xl">
      <h1 className="text-3xl font-bold mb-6">Education Profile Setup</h1>
      <ProfileWizard />
    </div>
  );
} 