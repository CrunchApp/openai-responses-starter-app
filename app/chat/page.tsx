"use client";
import { useEffect, useState } from "react";
import useConversationStore from "@/stores/useConversationStore";
import Assistant from "@/components/assistant";
import ToolsPanel from "@/components/tools-panel";
import ConversationSelector from "@/components/conversation-selector";
import { Menu, X, MessageSquareText, Sparkles, GraduationCap } from "lucide-react";
import { motion } from "framer-motion";
import { gsap } from 'gsap';
import { PageWrapper } from "@/components/layouts/PageWrapper";
import { Button } from "@/components/ui/button";
import AnimatedLogo from "@/components/ui/AnimatedLogo";
import Image from "next/image";

export default function ChatPage() {
  const [isToolsPanelOpen, setIsToolsPanelOpen] = useState(false);
  const { isLoading } = useConversationStore();
  const resetState = useConversationStore(state => state.resetState);
  // Get active conversation ID and loader
  const activeConversationId = useConversationStore(state => state.activeConversationId);
  const loadConversation       = useConversationStore(state => state.loadConversation);

  // On mount or when the activeConversationId changes, re-fetch its messages from the server
  useEffect(() => {
    if (activeConversationId) {
      loadConversation(activeConversationId);
    } else {
      // If there is no active conversation selected (the user navigated to /chat directly
      // after using a quick chat) we don't want to display the ephemeral quick-chat
      // messages that live in the global store. Clearing the transient chat state here
      // ensures the chat page starts clean and the orphaned messages aren't rendered.
      resetState();
    }
  }, [activeConversationId, loadConversation, resetState]);
  
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
      {/* Chalkboard background */}
      <div className="fixed inset-0 w-full h-screen pointer-events-none overflow-hidden z-0">
        <div className="absolute inset-0 w-full h-full opacity-10">
          <Image
            src="/images/vectors/board.jpg"
            alt="Chalkboard Background"
            fill
            className="object-cover"
            priority
          />
        </div>
        
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
        
        <div 
          className="decor-element absolute w-40 h-40 -z-10"
          style={{ top: '10%', right: '15%' }}
        >
          <Image 
            src="/images/vectors/gradCap.svg" 
            alt="Graduation Cap" 
            width={160} 
            height={160} 
            className="opacity-10"
            priority
          />
        </div>
        
        <div 
          className="decor-element absolute w-48 h-48 -z-10"
          style={{ bottom: '15%', left: '10%' }}
        >
          <Image 
            src="/images/vectors/notebook.png" 
            alt="Notebook" 
            width={192} 
            height={192} 
            className="opacity-10"
            priority
          />
        </div>
      </div>

      <div className="h-screen flex flex-col relative z-10">
        {/* Enhanced header section with title */}
        <motion.div 
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="bg-gradient-to-r from-background/20 to-background/10 backdrop-blur-sm border-b border-primary/10 py-4 px-6 flex justify-between items-center"
        >
          <motion.div 
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2, duration: 0.5 }}
            className="flex items-center"
          >
            <div className="w-20 h-20 mr-3 flex-shrink-0 overflow-hidden relative">
              <Image 
                src="/images/vectors/avatars/11062b_b4507c3148e34d20b4e8ae431bacb8a5.svg"
                alt="Vista AI Icon"
                fill
                sizes="40px"
                className="object-contain"
                priority
              />
            </div>
            <div>
              <h1 className="text-xl font-semibold bg-clip-text text-transparent bg-gradient-to-r from-primary to-primary/70">
                Vista Assistant
              </h1>
              <p className="text-xs text-muted-foreground">Your personal education advisor</p>
            </div>
          </motion.div>
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
            className="w-full md:w-[80%] relative bg-gradient-to-b from-background/20 to-background/10 backdrop-blur-sm"
          >
            {/* Loading Overlay */}
            {isLoading && (
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="absolute inset-0 bg-background/70 backdrop-blur-sm flex justify-center items-center z-20"
              >
                <AnimatedLogo size={160} />
              </motion.div>
            )}
            <Assistant />
          </motion.div>
          
          <motion.div 
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5, delay: 0.3 }}
            className="hidden md:flex md:flex-col md:w-[20%] border-l border-primary/10 bg-gradient-to-b from-background/10 to-background/20 backdrop-blur-sm"
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
            className="w-full max-w-sm bg-gradient-to-b from-background/20 to-background/10 h-full p-5 relative z-10 shadow-xl"
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
