"use client";
import React, { useEffect, useState } from "react";
import Chat from "./chat";
import useConversationStore from "@/stores/useConversationStore";
import { Item, processMessages } from "@/lib/assistant";
import { createClient } from "@/lib/supabase/client";

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
    error
  } = useConversationStore();
  
  const [isInitialized, setIsInitialized] = useState(false);

  // Check authentication status
  useEffect(() => {
    const checkAuth = async () => {
      if (isInitialized) return;
      
      try {
        const supabase = createClient();
        const { data: { user }, error: authError } = await supabase.auth.getUser();
        
        if (authError) {
          console.error('Auth error:', authError);
          setAuthState(false, null);
        } else if (user) {
          console.log('User authenticated:', user.id);
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
      }
    };
    
    checkAuth();
  }, [isInitialized, setAuthState, setActiveConversation]);

  // Listen for auth state changes
  useEffect(() => {
    const supabase = createClient();
    
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('Auth state changed:', event);
        
        if (event === 'SIGNED_IN' && session?.user) {
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
  }, [setAuthState, setActiveConversation]);

  const handleSendMessage = async (message: string) => {
    if (!message.trim()) return;

    let currentConversationId = activeConversationId;

    // If authenticated but no active conversation, create one first
    if (isAuthenticated && userId && !currentConversationId) {
      console.log("No active conversation, creating a new one...");
      const newConversationId = await createNewConversation();
      if (newConversationId) {
        currentConversationId = newConversationId;
        console.log("New conversation created with ID:", newConversationId);
      } else {
        console.error("Failed to create a new conversation.");
        return;
      }
    }

    const userItem: Item = {
      type: "message",
      role: "user",
      content: [{ type: "input_text", text: message.trim() }],
    };
    const userMessage: any = {
      role: "user",
      content: message.trim(),
    };

    try {
      await addConversationItem(userMessage);
      await addChatMessage(userItem);
      await processMessages();
    } catch (error) {
      console.error("Error processing message:", error);
    }
  };

  return (
    <div className="h-full w-full bg-gradient-to-b from-blue-50 to-white">
      <div className="p-4 mb-2 shadow-sm bg-white border-b border-blue-100">
        <div className="max-w-[750px] mx-auto flex items-center gap-3">
          <div className="p-2 rounded-lg bg-blue-600 text-white">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
            </svg>
          </div>
          <div>
            <h1 className="text-xl font-semibold text-gray-800">Vista Education Adviser</h1>
            <p className="text-sm text-gray-600">Your personal guide to educational success</p>
          </div>
        </div>
      </div>
      
      {isLoading ? (
        <div className="flex justify-center items-center h-[calc(100%-4rem)]">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
        </div>
      ) : (
        <Chat items={chatMessages} onSendMessage={handleSendMessage} />
      )}
      
      {error && (
        <div className="fixed bottom-4 left-1/2 transform -translate-x-1/2 bg-red-500 text-white px-4 py-2 rounded shadow-lg">
          {error}
        </div>
      )}
    </div>
  );
}
