"use client";
import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import AnimatedLogo from "../ui/AnimatedLogo";

interface HydrationLoadingProps {
  isHydrated?: boolean;
  onReadyToUnmount?: () => void;
}

export default function HydrationLoading({ 
  isHydrated = false, 
  onReadyToUnmount 
}: HydrationLoadingProps) {
  const [canUnmount, setCanUnmount] = useState(false);
  const MIN_DISPLAY_TIME = 3000; // 3 seconds in milliseconds
  
  useEffect(() => {
    if (isHydrated) {
      // Even if hydration is complete, wait for minimum display time
      const timer = setTimeout(() => {
        setCanUnmount(true);
        // Notify parent component that we're ready to unmount
        if (onReadyToUnmount) {
          onReadyToUnmount();
        }
      }, MIN_DISPLAY_TIME);
      
      return () => clearTimeout(timer);
    }
  }, [isHydrated, onReadyToUnmount]);

  return (
    <div className="flex flex-col items-center justify-center min-h-[40vh] p-8">
      <motion.div 
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5 }}
        className="flex flex-col items-center bg-white/50 backdrop-blur-sm p-8 rounded-lg shadow-sm"
      >
        <div className="flex justify-center w-full">
        <div style={{ position: 'relative', left: '-20px' }}>
          <AnimatedLogo size={120} className="mb-4" />
        </div>
        </div>
        <p className="text-base font-medium text-primary mb-1">Loading your data</p>
        <p className="text-sm text-muted-foreground">Please wait while we restore your session...</p>
      </motion.div>
    </div>
  );
} 