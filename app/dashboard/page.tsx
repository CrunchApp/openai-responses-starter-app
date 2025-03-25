"use client";
import React from "react";
import { User, MessageSquare, Bookmark } from "lucide-react";
import Link from "next/link";
import { motion } from "framer-motion";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useAuth } from '@/app/components/auth/AuthContext';

export default function DashboardPage() {
  const { user, profile, loading } = useAuth();
  
  const displayName = profile?.first_name 
    ? `${profile.first_name} ${profile.last_name || ''}` 
    : user?.email?.split('@')[0] || 'there';

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: { 
      opacity: 1,
      transition: { 
        staggerChildren: 0.1
      }
    }
  };
  
  const itemVariants = {
    hidden: { y: 20, opacity: 0 },
    visible: { 
      y: 0, 
      opacity: 1,
      transition: { type: "spring", stiffness: 100 }
    }
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="text-center mb-12"
      >
        <h1 className="text-3xl font-bold mb-2">
          {loading ? 'Loading...' : `Welcome, ${displayName}!`}
        </h1>
        <p className="text-gray-600">Manage your profile, get recommendations, and chat with our assistant</p>
      </motion.div>

      <motion.div 
        className="grid grid-cols-1 md:grid-cols-3 gap-6"
        variants={containerVariants}
        initial="hidden"
        animate="visible"
      >
        {/* Profile Card */}
        <motion.div variants={itemVariants}>
          <Card className="h-full hover:shadow-lg transition-shadow">
            <CardHeader className="pb-2">
              <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mb-4">
                <User className="w-6 h-6 text-blue-600" />
              </div>
              <CardTitle>Your Profile</CardTitle>
              <CardDescription>View and manage your education profile information</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-gray-500">
                Update your personal information, education history, and preferences to get better recommendations.
              </p>
            </CardContent>
            <CardFooter>
              <Link href="/profile" className="w-full">
                <Button className="w-full bg-blue-600 hover:bg-blue-700">Manage Profile</Button>
              </Link>
            </CardFooter>
          </Card>
        </motion.div>

        {/* Chat Card */}
        <motion.div variants={itemVariants}>
          <Card className="h-full hover:shadow-lg transition-shadow">
            <CardHeader className="pb-2">
              <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center mb-4">
                <MessageSquare className="w-6 h-6 text-purple-600" />
              </div>
              <CardTitle>AI Assistant</CardTitle>
              <CardDescription>Chat with our education adviser assistant</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-gray-500">
                Get answers to your questions about education programs, application tips, and more through our AI-powered assistant.
              </p>
            </CardContent>
            <CardFooter>
              <Link href="/chat" className="w-full">
                <Button className="w-full bg-purple-600 hover:bg-purple-700">Open Chat</Button>
              </Link>
            </CardFooter>
          </Card>
        </motion.div>

        {/* Recommendations Card */}
        <motion.div variants={itemVariants}>
          <Card className="h-full hover:shadow-lg transition-shadow">
            <CardHeader className="pb-2">
              <div className="w-12 h-12 bg-amber-100 rounded-full flex items-center justify-center mb-4">
                <Bookmark className="w-6 h-6 text-amber-600" />
              </div>
              <CardTitle>Recommendations</CardTitle>
              <CardDescription>View your personalized education recommendations</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-gray-500">
                Explore educational programs and career paths tailored to your profile, preferences, and goals.
              </p>
            </CardContent>
            <CardFooter>
              <Link href="/recommendations" className="w-full">
                <Button className="w-full bg-amber-600 hover:bg-amber-700">View Recommendations</Button>
              </Link>
            </CardFooter>
          </Card>
        </motion.div>
      </motion.div>
    </div>
  );
} 