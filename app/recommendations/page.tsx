"use client";
import React, { useEffect } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import useToolsStore from "@/stores/useToolsStore";
import { useRouter } from "next/navigation";

export default function RecommendationsPage() {
  const { vectorStore, fileSearchEnabled, setFileSearchEnabled } = useToolsStore();
  const router = useRouter();

  // Ensure file search is enabled if we have a vector store
  useEffect(() => {
    if (vectorStore && vectorStore.id && !fileSearchEnabled) {
      setFileSearchEnabled(true);
    }
  }, [vectorStore, fileSearchEnabled, setFileSearchEnabled]);

  const handleGoToAssistant = () => {
    // Enable file search if it's not already enabled and we have a vector store
    if (vectorStore && vectorStore.id && !fileSearchEnabled) {
      setFileSearchEnabled(true);
    }
    router.push("/");
  };

  return (
    <div className="container mx-auto py-8 max-w-4xl">
      <h1 className="text-3xl font-bold mb-6">Your Personalized Recommendations</h1>
      
      <div className="bg-white p-6 rounded-lg shadow-md mb-6">
        <p className="text-zinc-600 mb-4">
          Based on your profile, we've generated personalized education and career recommendations.
          You can now use the AI assistant to explore these options in detail and get guidance on your next steps.
        </p>
        
        {vectorStore && vectorStore.id ? (
          <div className="bg-green-50 p-4 rounded-md mb-4 border border-green-200">
            <p className="text-green-800 text-sm">
              <strong>Your profile data is ready!</strong> When you go to the AI Assistant, it will have access to your profile information and documents,
              allowing for personalized recommendations and insights.
            </p>
          </div>
        ) : (
          <div className="bg-amber-50 p-4 rounded-md mb-4 border border-amber-200">
            <p className="text-amber-800 text-sm">
              <strong>Note:</strong> Your profile data hasn't been fully processed yet. For the best experience,
              please complete your profile setup before using the AI Assistant.
            </p>
          </div>
        )}
        
        <div className="flex gap-4 mt-6">
          <Button onClick={handleGoToAssistant}>
            Go to AI Assistant
          </Button>
          <Link href="/profile">
            <Button variant="outline">
              Edit Profile
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
} 