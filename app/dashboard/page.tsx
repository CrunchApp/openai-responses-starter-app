"use client";
import React from "react";
import Link from "next/link";
import { MessageSquare, User, BookOpen } from "lucide-react";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export default function DashboardPage() {
  return (
    <div className="container mx-auto py-8 px-4">
      <h1 className="text-2xl font-bold mb-6">Vista Education Adviser Dashboard</h1>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Chat section */}
        <Card className="hover:shadow-lg transition-shadow">
          <CardHeader className="bg-blue-50 border-b">
            <div className="flex items-center space-x-2">
              <div className="p-2 bg-blue-100 rounded-full">
                <MessageSquare className="h-5 w-5 text-blue-700" />
              </div>
              <CardTitle>AI Assistant</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="pt-6">
            <CardDescription className="min-h-[80px]">
              Chat with our AI education adviser to get answers about programs, applications, and personalized guidance.
            </CardDescription>
          </CardContent>
          <CardFooter>
            <Link href="/chat" className="w-full">
              <Button className="w-full bg-blue-600 hover:bg-blue-700">Open Chat</Button>
            </Link>
          </CardFooter>
        </Card>

        {/* Profile section */}
        <Card className="hover:shadow-lg transition-shadow">
          <CardHeader className="bg-green-50 border-b">
            <div className="flex items-center space-x-2">
              <div className="p-2 bg-green-100 rounded-full">
                <User className="h-5 w-5 text-green-700" />
              </div>
              <CardTitle>Your Profile</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="pt-6">
            <CardDescription className="min-h-[80px]">
              View and update your personal information, education history, and preferences to receive tailored recommendations.
            </CardDescription>
          </CardContent>
          <CardFooter>
            <Link href="/profile" className="w-full">
              <Button className="w-full bg-green-600 hover:bg-green-700">Manage Profile</Button>
            </Link>
          </CardFooter>
        </Card>

        {/* Recommendations section */}
        <Card className="hover:shadow-lg transition-shadow">
          <CardHeader className="bg-purple-50 border-b">
            <div className="flex items-center space-x-2">
              <div className="p-2 bg-purple-100 rounded-full">
                <BookOpen className="h-5 w-5 text-purple-700" />
              </div>
              <CardTitle>Recommendations</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="pt-6">
            <CardDescription className="min-h-[80px]">
              Explore personalized education and career path recommendations based on your profile and preferences.
            </CardDescription>
          </CardContent>
          <CardFooter>
            <Link href="/recommendations" className="w-full">
              <Button className="w-full bg-purple-600 hover:bg-purple-700">View Recommendations</Button>
            </Link>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
} 