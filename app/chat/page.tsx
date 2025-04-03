"use client";
import { useEffect, useState } from "react";
import Assistant from "@/components/assistant";
import ToolsPanel from "@/components/tools-panel";
import ConversationSelector from "@/components/conversation-selector";
import { Menu, X, MessageSquareText } from "lucide-react";
import { motion } from "framer-motion";
import { gsap } from 'gsap';
import { PageWrapper } from "@/components/layouts/PageWrapper";
import { Button } from "@/components/ui/button";

export default function ChatPage() {
  const [isToolsPanelOpen, setIsToolsPanelOpen] = useState(false);
  
  // Add subtle animations to decorative elements
  useEffect(() => {
    const decorElements = document.querySelectorAll('.decor-element');
    
    decorElements.forEach(el => {
      gsap.to(el, {
        y: `${Math.random() * 15 - 8}px`,
        rotation: Math.random() * 8 - 4,
        duration: 3 + Math.random() * 2,
        repeat: -1,
        yoyo: true,
        ease: "sine.inOut",
      });
    });
  }, []);
  
  return (
    <PageWrapper allowGuest>
      {/* Decorative Elements - Similar to landing page */}
      <div className="fixed inset-0 w-full h-screen pointer-events-none overflow-hidden z-0">
        <div 
          className="decor-element absolute w-40 h-40 rounded-full bg-gradient-to-r from-purple-500/10 to-blue-500/10 blur-xl"
          style={{ top: '10%', right: '10%' }}
        ></div>
        <div 
          className="decor-element absolute w-32 h-32 rounded-full bg-gradient-to-r from-primary/10 to-primary/5 blur-lg"
          style={{ bottom: '20%', left: '15%' }}
        ></div>
      </div>

      <div className="h-screen flex flex-col relative z-10">
        {/* Header section with title */}
        <motion.div 
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="bg-gradient-to-r from-background to-background/90 backdrop-blur-sm border-b border-primary/10 p-4 flex justify-between items-center"
        >
          <div className="flex items-center">
            <div className="p-2 rounded-full bg-primary/10 mr-3">
              <MessageSquareText className="h-5 w-5 text-primary" />
            </div>
            <h1 className="text-xl font-semibold text-primary">Vista AI Assistant</h1>
          </div>
          <div className="md:hidden">
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={() => setIsToolsPanelOpen(true)}
              className="text-primary hover:bg-primary/10"
            >
              <Menu size={20} />
            </Button>
          </div>
        </motion.div>

        <div className="flex h-full">
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="w-full md:w-[70%] relative bg-gradient-to-b from-background to-background/95"
          >
            <Assistant />
          </motion.div>
          
          <motion.div 
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5, delay: 0.3 }}
            className="hidden md:flex md:flex-col md:w-[30%] border-l border-primary/10 bg-gradient-to-b from-background/80 to-background/90 backdrop-blur-sm"
          >
            <div className="p-5 border-b border-primary/10">
              <ConversationSelector />
            </div>
            {/* <div className="flex-grow overflow-auto p-4">
              <ToolsPanel />
            </div> */}
          </motion.div>
        </div>
      </div>

      {/* Overlay panel for ToolsPanel on small screens */}
      {isToolsPanelOpen && (
        <div className="fixed inset-0 z-50 flex justify-end">
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.5 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="bg-black absolute inset-0"
            onClick={() => setIsToolsPanelOpen(false)}
          />
          <motion.div 
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ duration: 0.3, ease: "easeOut" }}
            className="w-full max-w-sm bg-gradient-to-b from-background to-background/95 h-full p-5 relative z-10 shadow-xl"
          >
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-lg font-semibold text-primary">Conversations</h2>
              <Button 
                variant="ghost" 
                size="icon" 
                onClick={() => setIsToolsPanelOpen(false)}
                className="text-primary hover:bg-primary/10"
              >
                <X size={20} />
              </Button>
            </div>
            <div className="mb-6">
              <ConversationSelector />
            </div>
            {/* <ToolsPanel /> */}
          </motion.div>
        </div>
      )}
    </PageWrapper>
  );
}
