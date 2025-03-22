"use client";
import React from "react";
import { Loader2 } from "lucide-react";
import { motion } from "framer-motion";

export default function HydrationLoading() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[40vh] p-8">
      <motion.div 
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5 }}
        className="flex flex-col items-center bg-white/50 backdrop-blur-sm p-8 rounded-lg shadow-sm"
      >
        <Loader2 className="h-10 w-10 text-primary animate-spin mb-4" />
        <p className="text-base font-medium text-primary mb-1">Loading your data</p>
        <p className="text-sm text-muted-foreground">Please wait while we restore your session...</p>
      </motion.div>
    </div>
  );
} 