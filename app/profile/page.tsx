"use client";
import React from "react";
import ProfileDashboard from "@/components/profile/ProfileDashboard";
import { PageWrapper } from "@/components/layouts/PageWrapper";

export default function ProfilePage() {
  return (
    <PageWrapper requireAuth>
      <div className="container mx-auto py-8">
        <ProfileDashboard />
      </div>
    </PageWrapper>
  );
} 