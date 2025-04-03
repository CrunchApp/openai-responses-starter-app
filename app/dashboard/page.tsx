"use client";
import React, { useEffect } from "react";
import { User, MessageSquare, Bookmark, Sparkles } from "lucide-react";
import Link from "next/link";
import { motion } from "framer-motion";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useAuth } from '@/app/components/auth/AuthContext';
import { PageWrapper } from "@/components/layouts/PageWrapper";
import { gsap } from 'gsap';

export default function DashboardPage() {
  const { user, profile, loading } = useAuth();
  
  const displayName = profile?.first_name 
  || user?.email?.split('@')[0] 
  || 'there';

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: { 
      opacity: 1,
      transition: { 
        staggerChildren: 0.15
      }
    }
  };
  
  const itemVariants = {
    hidden: { y: 30, opacity: 0 },
    visible: { 
      y: 0, 
      opacity: 1,
      transition: { type: "spring", stiffness: 80, damping: 12 }
    }
  };

  // Add subtle animations to decorative elements
  useEffect(() => {
    const decorElements = document.querySelectorAll('.decor-element');
    
    decorElements.forEach(el => {
      gsap.to(el, {
        y: `${Math.random() * 20 - 10}px`,
        rotation: Math.random() * 10 - 5,
        duration: 3 + Math.random() * 2,
        repeat: -1,
        yoyo: true,
        ease: "sine.inOut",
      });
    });
  }, []);

  return (
    <PageWrapper requireAuth>
      {/* Decorative Elements - Similar to landing page */}
      <div className="fixed inset-0 w-full h-screen pointer-events-none overflow-hidden z-0">
        <div 
          className="decor-element absolute w-32 h-32 rounded-full bg-gradient-to-r from-blue-500/10 to-purple-500/10 blur-xl"
          style={{ top: '20%', left: '5%' }}
        ></div>
        <div 
          className="decor-element absolute w-24 h-24 rounded-full bg-gradient-to-r from-primary/10 to-primary/5 blur-lg"
          style={{ top: '60%', right: '10%' }}
        ></div>
        <div 
          className="decor-element absolute w-40 h-40 rounded-full bg-gradient-to-r from-purple-500/5 to-blue-500/10 blur-xl"
          style={{ bottom: '15%', left: '15%' }}
        ></div>
      </div>
      
      <div className="container mx-auto px-4 py-12 relative z-10">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: "easeOut" }}
          className="text-center mb-14"
        >
          <Sparkles className="h-8 w-8 text-primary mx-auto mb-3 opacity-80" />
          <h1 className="text-4xl font-bold mb-3 bg-clip-text text-transparent bg-gradient-to-r from-primary to-primary/70">
            {loading ? 'Loading...' : `Hey ${displayName}!`}
          </h1>
          <p className="text-foreground/70 max-w-lg mx-auto text-lg">
            Manage your profile, get personalized recommendations, and chat with our education adviser assistant
          </p>
        </motion.div>

        <motion.div 
          className="grid grid-cols-1 md:grid-cols-3 gap-8"
          variants={containerVariants}
          initial="hidden"
          animate="visible"
        >
          {/* Profile Card */}
          <motion.div variants={itemVariants}>
            <Card className="h-full overflow-hidden hover:shadow-xl transition-all duration-300 border-blue-100 bg-gradient-to-br from-white to-blue-50/50">
              <CardHeader className="pb-2 pt-6">
                <div className="w-14 h-14 bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl flex items-center justify-center mb-4 shadow-md transform -rotate-3">
                  <User className="w-7 h-7 text-white" />
                </div>
                <CardTitle className="text-xl text-blue-800">Your Profile</CardTitle>
                <CardDescription className="text-blue-600/80">View and manage your education profile</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-foreground/70">
                  Update your personal information, educational background, and preferences to receive better recommendations.
                </p>
              </CardContent>
              <CardFooter className="pb-6">
                <Link href="/profile" className="w-full">
                  <Button className="w-full bg-gradient-to-r from-blue-600 to-blue-700 hover:shadow-md hover:shadow-blue-200 transition-all">
                    Manage Profile
                  </Button>
                </Link>
              </CardFooter>
            </Card>
          </motion.div>

          {/* Chat Card */}
          <motion.div variants={itemVariants}>
            <Card className="h-full overflow-hidden hover:shadow-xl transition-all duration-300 border-purple-100 bg-gradient-to-br from-white to-purple-50/50">
              <CardHeader className="pb-2 pt-6">
                <div className="w-14 h-14 bg-gradient-to-br from-purple-500 to-purple-600 rounded-2xl flex items-center justify-center mb-4 shadow-md transform rotate-3">
                  <MessageSquare className="w-7 h-7 text-white" />
                </div>
                <CardTitle className="text-xl text-purple-800">AI Assistant</CardTitle>
                <CardDescription className="text-purple-600/80">Chat with our education adviser</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-foreground/70">
                  Get answers to your questions about education programs, application tips, and personalized guidance from our AI-powered assistant.
                </p>
              </CardContent>
              <CardFooter className="pb-6">
                <Link href="/chat" className="w-full">
                  <Button className="w-full bg-gradient-to-r from-purple-600 to-purple-700 hover:shadow-md hover:shadow-purple-200 transition-all">
                    Open Chat
                  </Button>
                </Link>
              </CardFooter>
            </Card>
          </motion.div>

          {/* Recommendations Card */}
          <motion.div variants={itemVariants}>
            <Card className="h-full overflow-hidden hover:shadow-xl transition-all duration-300 border-amber-100 bg-gradient-to-br from-white to-amber-50/50">
              <CardHeader className="pb-2 pt-6">
                <div className="w-14 h-14 bg-gradient-to-br from-amber-500 to-amber-600 rounded-2xl flex items-center justify-center mb-4 shadow-md transform -rotate-3">
                  <Bookmark className="w-7 h-7 text-white" />
                </div>
                <CardTitle className="text-xl text-amber-800">Recommendations</CardTitle>
                <CardDescription className="text-amber-600/80">Discover personalized programs</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-foreground/70">
                  Explore educational programs and career paths tailored to your profile, preferences, and goals from institutions worldwide.
                </p>
              </CardContent>
              <CardFooter className="pb-6">
                <Link href="/recommendations" className="w-full">
                  <Button className="w-full bg-gradient-to-r from-amber-600 to-amber-700 hover:shadow-md hover:shadow-amber-200 transition-all">
                    View Recommendations
                  </Button>
                </Link>
              </CardFooter>
            </Card>
          </motion.div>
        </motion.div>
      </div>
    </PageWrapper>
  );
} 