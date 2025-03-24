import React from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-8 text-center">
      <h1 className="text-4xl font-bold mb-4">Vista Education Adviser</h1>
      <p className="text-lg text-gray-600 max-w-2xl mb-8">
        Your personal guide to finding the perfect educational path. Get personalized recommendations,
        expert advice, and guidance on your academic journey.
      </p>
      <div className="flex gap-4">
        <Button asChild>
          <Link href="/profile">Start Your Journey</Link>
        </Button>
        <Button variant="outline" asChild>
          <Link href="/auth/login">Log In</Link>
        </Button>
      </div>
    </main>
  );
}
