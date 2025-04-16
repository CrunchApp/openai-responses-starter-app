"use client";
import React, { useEffect } from "react";
import { User, MessageSquare, Bookmark, MoveUpRight } from "lucide-react";
import Link from "next/link";
import { motion } from "framer-motion";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useAuth } from '@/app/components/auth/AuthContext';
import { PageWrapper } from "@/components/layouts/PageWrapper";
import { cn } from "@/lib/utils";
import Image from "next/image";

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
        staggerChildren: 0.1,
        delayChildren: 0.2,
      }
    }
  };
  
  const itemVariants = {
    hidden: { y: 20, opacity: 0 },
    visible: { 
      y: 0, 
      opacity: 1,
      transition: { type: "spring", stiffness: 100, damping: 15 }
    }
  };

  // Placeholder for potential illustration components within cards
  const CardIllustrationPlaceholder = ({ className }: { className?: string }) => (
    <div className={cn("absolute bottom-0 right-0 w-24 h-24 bg-gradient-to-tl from-muted/30 to-transparent rounded-tl-full opacity-50", className)}>
      {/* Future: Replace with actual SVG or Image component */}
    </div>
  );

  return (
    <PageWrapper requireAuth>
      {/* Enhanced Decorative Elements using Tailwind and pseudo-elements */}
      <div className="fixed inset-0 w-full h-full pointer-events-none overflow-hidden z-0">
        <motion.div 
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 1.5, ease: [0.22, 1, 0.36, 1] }}
          className="absolute -top-1/4 -left-1/4 w-1/2 h-1/2 rounded-full bg-gradient-radial from-primary/5 via-primary/10 to-transparent blur-3xl"
        />
        <motion.div 
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 1.5, ease: [0.22, 1, 0.36, 1], delay: 0.3 }}
          className="absolute -bottom-1/4 -right-1/4 w-1/2 h-1/2 rounded-full bg-gradient-radial from-blue-500/5 via-blue-500/10 to-transparent blur-3xl"
        />
         <motion.div 
          initial={{ y: -50, opacity: 0 }}
          animate={{ y: 0, opacity: 0.07 }}
          transition={{ duration: 1, ease: "easeOut", delay: 0.8 }}
          className="absolute top-1/4 right-[5%] w-20 h-20 border border-dashed border-primary rounded-full animate-spin-slow" 
        />
        <motion.div 
          initial={{ x: 50, opacity: 0 }}
          animate={{ x: 0, opacity: 0.07 }}
          transition={{ duration: 1, ease: "easeOut", delay: 1 }}
          className="absolute bottom-[15%] left-[10%] w-16 h-16 border-2 border-dotted border-purple-500 rounded-xl transform rotate-12 animate-pulse" 
        />
      </div>
      
      <div className="container mx-auto px-4 py-16 relative z-10">
        <motion.div
          initial={{ opacity: 0, y: -30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, ease: "easeOut", delay: 0.1 }}
          className="text-center mb-16"
        >
          {/* Position container for the cap image */}
          <div className="text-center relative z-10 mb-[-3rem]"> 
            {/* Motion div wrapping only the image, with tight bounds */}
            <motion.div
              className="inline-block" // Shrink wrap the image
              whileHover={{ scale: 1.2, rotate: -5 }}
              transition={{ type: "spring", stiffness: 300, damping: 10 }}
            >
              <Image
                src="/images/vectors/cap.png"
                alt="Graduation Cap"
                width={86}
                height={86}
                // Removed mx-auto as centering is handled by the outer div
                priority
              />
            </motion.div>
          </div>
          <h1 className="text-5xl font-bold mb-4 bg-clip-text text-transparent bg-gradient-to-r from-primary to-primary/70">
            {loading ? 'Loading...' : `Hey ${displayName}!`}
          </h1>
          <p className="text-foreground/80 max-w-xl mx-auto text-xl leading-relaxed">
            Explore your profile, get personalized recommendations, and chat with your AI education adviser.
          </p>
        </motion.div>

        <motion.div 
          className="grid grid-cols-1 md:grid-cols-3 gap-8"
          variants={containerVariants}
          initial="hidden"
          animate="visible"
        >
          {/* Profile Card Refined */}
          <motion.div variants={itemVariants} className="h-full">
            <Card className="group relative h-full overflow-hidden transition-all duration-300 border border-border/20 hover:border-blue-300 hover:shadow-lg bg-card/80 backdrop-blur-sm flex flex-col">
             <CardIllustrationPlaceholder className="from-blue-500/10" />
              <CardHeader className="relative z-10 pb-3 pt-6">
                <motion.div 
                  whileHover={{ scale: 1.1, rotate: -5 }}
                  className="w-14 h-14 bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl flex items-center justify-center mb-4 shadow-md"
                >
                  <User className="w-7 h-7 text-white" />
                </motion.div>
                <CardTitle className="text-xl font-semibold text-foreground">Your Profile</CardTitle>
                <CardDescription className="text-muted-foreground">View and manage your details</CardDescription>
              </CardHeader>
              <CardContent className="relative z-10 flex-grow">
                <p className="text-foreground/80">
                  Keep your information, background, and preferences up-to-date for tailored guidance.
                </p>
              </CardContent>
              <CardFooter className="relative z-10 pb-6 pt-4">
                <Link href="/profile" className="w-full">
                  <Button variant="outline" className="w-full border-blue-500/50 text-blue-600 hover:bg-blue-50 hover:text-blue-700 group-hover:bg-blue-500 group-hover:text-white transition-all duration-300">
                    Manage Profile <MoveUpRight className="ml-2 h-4 w-4 opacity-0 group-hover:opacity-100 transition-opacity" />
                  </Button>
                </Link>
              </CardFooter>
            </Card>
          </motion.div>

          {/* Chat Card Refined */}
          <motion.div variants={itemVariants} className="h-full">
            <Card className="group relative h-full overflow-hidden transition-all duration-300 border border-border/20 hover:border-purple-300 hover:shadow-lg bg-card/80 backdrop-blur-sm flex flex-col">
             <CardIllustrationPlaceholder className="from-purple-500/10" />
              <CardHeader className="relative z-10 pb-3 pt-6">
                <motion.div 
                  whileHover={{ scale: 1.1, rotate: 5 }}
                  className="w-14 h-14 bg-gradient-to-br from-purple-500 to-purple-600 rounded-2xl flex items-center justify-center mb-4 shadow-md"
                >
                  <MessageSquare className="w-7 h-7 text-white" />
                </motion.div>
                <CardTitle className="text-xl font-semibold text-foreground">AI Assistant</CardTitle>
                <CardDescription className="text-muted-foreground">Chat with your education adviser</CardDescription>
              </CardHeader>
              <CardContent className="relative z-10 flex-grow">
                <p className="text-foreground/80">
                  Ask about programs, applications, or career paths and get instant, personalized support.
                </p>
              </CardContent>
              <CardFooter className="relative z-10 pb-6 pt-4">
                <Link href="/chat" className="w-full">
                   <Button variant="outline" className="w-full border-purple-500/50 text-purple-600 hover:bg-purple-50 hover:text-purple-700 group-hover:bg-purple-500 group-hover:text-white transition-all duration-300">
                    Open Chat <MoveUpRight className="ml-2 h-4 w-4 opacity-0 group-hover:opacity-100 transition-opacity" />
                  </Button>
                </Link>
              </CardFooter>
            </Card>
          </motion.div>

          {/* Recommendations Card Refined */}
          <motion.div variants={itemVariants} className="h-full">
            <Card className="group relative h-full overflow-hidden transition-all duration-300 border border-border/20 hover:border-amber-300 hover:shadow-lg bg-card/80 backdrop-blur-sm flex flex-col">
              <CardIllustrationPlaceholder className="from-amber-500/10" />
              <CardHeader className="relative z-10 pb-3 pt-6">
                 <motion.div 
                  whileHover={{ scale: 1.1, rotate: -5 }}
                  className="w-14 h-14 bg-gradient-to-br from-amber-500 to-amber-600 rounded-2xl flex items-center justify-center mb-4 shadow-md"
                >
                  <Bookmark className="w-7 h-7 text-white" />
                 </motion.div>
                <CardTitle className="text-xl font-semibold text-foreground">Recommendations</CardTitle>
                <CardDescription className="text-muted-foreground">Discover tailored programs</CardDescription>
              </CardHeader>
              <CardContent className="relative z-10 flex-grow">
                <p className="text-foreground/80">
                  Explore education and career paths matched to your profile, goals, and interests.
                </p>
              </CardContent>
              <CardFooter className="relative z-10 pb-6 pt-4">
                <Link href="/recommendations" className="w-full">
                   <Button variant="outline" className="w-full border-amber-500/50 text-amber-700 hover:bg-amber-50 hover:text-amber-800 group-hover:bg-amber-500 group-hover:text-white transition-all duration-300">
                    View Recommendations <MoveUpRight className="ml-2 h-4 w-4 opacity-0 group-hover:opacity-100 transition-opacity" />
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