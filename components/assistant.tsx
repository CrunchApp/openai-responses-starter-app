"use client";
import React, { useEffect, useState, useCallback } from "react";
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
    error,
    setError
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
          // Set authentication state but don't create a conversation automatically
          setAuthState(true, user.id);
          
          // If there's an active conversation in session/local storage, we can load it here
          // This will be handled by the conversation selector component
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
          // Just update auth state, don't create a new conversation automatically
          setAuthState(true, session.user.id);
          
          // Don't load a conversation here - wait for user action
          // or let conversation selector handle this
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
    <div className="h-full w-full bg-gradient-to-b from-blue-50 to-white">
      <div className="p-4 mb-2 shadow-sm bg-white border-b border-blue-100">
        {/* <div className="max-w-[750px] mx-auto flex items-center gap-3">
          <div className="p-2 rounded-lg bg-blue-600 text-white">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
            </svg>
          </div>
          <div>
            <h1 className="text-xl font-semibold text-gray-800">Vista Education Advisers</h1>
            <p className="text-sm text-gray-600">Your personal guide to educational success</p>
          </div>
        </div> */}
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
