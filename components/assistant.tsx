"use client";
import React, { useEffect, useState, useCallback } from "react";
import Chat from "./chat";
import useConversationStore from "@/stores/useConversationStore";
import { Item, processMessages } from "@/lib/assistant";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/app/components/auth/AuthContext";
import { motion } from "framer-motion";

export default function Assistant() {
  const { 
    chatMessages, 
    addConversationItem, 
    addChatMessage,
    isAuthenticated,
    userId,
    setAuthState,
    activeConversationId,
    createNewConversation,
    setActiveConversation,
    isLoading,
    error,
    setError
  } = useConversationStore();
  
  // Access user data from AuthContext to pass to chat component
  const { user, profile } = useAuth();
  
  const [isInitialized, setIsInitialized] = useState(false);
  const [authChecked, setAuthChecked] = useState(false);

  // Check authentication status - only run this once
  useEffect(() => {
    if (authChecked) return;
    
    const checkAuth = async () => {
      try {
        const supabase = createClient();
        const { data: { user }, error: authError } = await supabase.auth.getUser();
        
        if (authError) {
          console.error('Auth error:', authError);
          setAuthState(false, null);
        } else if (user) {
          console.log('User authenticated:', user.id);
          // Set authentication state but don't create a conversation automatically
          setAuthState(true, user.id);
        } else {
          console.log('No authenticated user');
          setAuthState(false, null);
          setActiveConversation(null);
        }
      } catch (error) {
        console.error('Error checking authentication:', error);
      } finally {
        setIsInitialized(true);
        setAuthChecked(true);
      }
    };
    
    checkAuth();
  }, [setAuthState, setActiveConversation, authChecked]);

  // Listen for auth state changes - but only set up the listener once
  useEffect(() => {
    if (!isInitialized) return;
    
    const supabase = createClient();
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('Auth state changed:', event);
        
        if (event === 'SIGNED_IN' && session?.user) {
          // Just update auth state, don't create a new conversation automatically
          setAuthState(true, session.user.id);
        } else if (event === 'SIGNED_OUT') {
          setAuthState(false, null);
          setActiveConversation(null);
        }
      }
    );
    
    return () => {
      subscription.unsubscribe();
    };
  }, [isInitialized, setAuthState, setActiveConversation]);

  // Simplified version of handleSendMessage that doesn't create automatic conversation
  const handleSendMessage = useCallback(async (message: string) => {
    setError(null);
    
    // Skip empty messages
    if (!message.trim()) return;

    let currentActiveConversationId = activeConversationId;
    
    // If not authenticated or signed in, handle locally (no changes needed here)
    if (!isAuthenticated || !userId) {
      addChatMessage({
        type: "message",
        role: "user",
        content: [{ type: "input_text", text: message }],
      });
      
      // Process messages without saving to DB
      processMessages();
      return;
    }

    // If authenticated but no active conversation, create one first, passing the message
    if (!currentActiveConversationId) {
      console.log('Creating new conversation with first message for title generation');
      // Pass the message content to createNewConversation
      const newConversationId = await createNewConversation(message);
      
      if (!newConversationId) {
        setError("Failed to create a new conversation. Please try again.");
        return;
      }
      // Update the local variable for the rest of the function
      currentActiveConversationId = newConversationId;
    }

    // Ensure we have an active ID before proceeding
    if (!currentActiveConversationId) {
      setError("Cannot send message without an active conversation.");
      return;
    }

    try {
      // Add user message to chat (will be saved to DB via the store)
      await addChatMessage({
        type: "message",
        role: "user",
        content: [{ type: "input_text", text: message }],
      });

      // Add user message to conversation items (for API context)
      await addConversationItem({
        role: "user",
        content: message,
      });

      // Process messages (triggers API call)
      await processMessages();
    } catch (error) {
      console.error("Error sending message:", error);
      setError("Failed to send message. Please try again.");
    }
  }, [
    isAuthenticated,
    userId,
    activeConversationId, // Keep dependency for reactivity
    createNewConversation,
    addChatMessage,
    addConversationItem,
    setError,
  ]);

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
      className="h-full w-full relative"
    >
      {/* Pass user data to chat component */}
      <Chat 
        items={chatMessages} 
        onSendMessage={handleSendMessage}
        userData={{ user, profile }}
      />
            
      {error && (
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="fixed bottom-4 left-1/2 transform -translate-x-1/2 bg-red-500 text-white px-5 py-2.5 rounded-lg shadow-lg z-50 flex items-center"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
          </svg>
          {error}
        </motion.div>
      )}
    </motion.div>
  );
}
