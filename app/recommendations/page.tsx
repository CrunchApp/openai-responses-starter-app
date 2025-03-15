import React from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function RecommendationsPage() {
  return (
    <div className="container mx-auto py-8 max-w-4xl">
      <h1 className="text-3xl font-bold mb-6">Your Personalized Recommendations</h1>
      
      <div className="bg-white p-6 rounded-lg shadow-md mb-6">
        <p className="text-zinc-600 mb-4">
          Based on your profile, we've generated personalized education and career recommendations.
          You can now use the AI assistant to explore these options in detail and get guidance on your next steps.
        </p>
        
        <div className="flex gap-4 mt-6">
          <Link href="/">
            <Button>
              Go to AI Assistant
            </Button>
          </Link>
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