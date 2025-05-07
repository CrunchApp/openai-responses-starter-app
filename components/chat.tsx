"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import ToolCall from "./tool-call";
import Message from "./message";
import Annotations from "./annotations";
import { Item } from "@/lib/assistant";
import AnimatedLogo from "./ui/AnimatedLogo";
import useConversationStore from "@/stores/useConversationStore";
import { motion } from "framer-motion";
import Image from "next/image";

// Define user data interface
interface UserData {
  user: any; // Using any for simplicity, ideally would be properly typed
  profile: any;
}

interface ChatProps {
  items: Item[];
  onSendMessage: (message: string) => void;
  userData?: UserData; // Optional to maintain backward compatibility
}

const Chat: React.FC<ChatProps> = ({ items, onSendMessage, userData }) => {
  const itemsEndRef = useRef<HTMLDivElement>(null);
  const [inputMessageText, setinputMessageText] = useState<string>("");
  const [isTyping, setIsTyping] = useState(false); // Local typing indicator state
  // This state is used to provide better user experience for non-English IMEs such as Japanese
  const [isComposing, setIsComposing] = useState(false);
  const { isLoading } = useConversationStore();

  const scrollToBottom = () => {
    itemsEndRef.current?.scrollIntoView({ behavior: "instant" });
  };

  // Enhanced send message handler that manages local typing state
  const handleSendMessageWithTyping = useCallback((message: string) => {
    if (!message.trim() || isTyping) return;
    
    setIsTyping(true); // Show typing indicator
    
    // Send the message
    onSendMessage(message);
    
    // Check if a response has been added to items after a short delay
    const checkForResponse = () => {
      // Find the last user message index
      const lastUserMsgIndex = [...items].reverse().findIndex(
        item => item.type === "message" && item.role === "user"
      );
      
      // If we have a new message or tool call after the user's last message, stop typing
      if (lastUserMsgIndex !== 0) {
        setIsTyping(false);
      } else {
        // Still waiting for response, check again soon
        setTimeout(checkForResponse, 500);
      }
    };
    
    // Start checking after a short delay
    setTimeout(checkForResponse, 1000);
  }, [onSendMessage, items, isTyping]);

  const handleKeyDown = useCallback((event: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === "Enter" && !event.shiftKey && !isComposing) {
      event.preventDefault();
      handleSendMessageWithTyping(inputMessageText);
      setinputMessageText("");
    }
  }, [handleSendMessageWithTyping, inputMessageText, isComposing]);

  // Reset typing indicator when messages change
  useEffect(() => {
    // If we get new messages and the last one is from assistant or a tool call, stop typing
    if (items.length > 0) {
      const lastItem = items[items.length - 1];
      if (lastItem.type === "tool_call" || 
          (lastItem.type === "message" && lastItem.role === "assistant")) {
        setIsTyping(false);
      }
    }
  }, [items]);

  useEffect(() => {
    scrollToBottom();
  }, [items, isTyping]); // Also scroll on typing state change

  // Check if the last message is from the user to show typing indicator after it
  const shouldShowTypingIndicator = () => {
    if (!isTyping || items.length === 0) return false;
    
    const lastItem = items[items.length - 1];
    return lastItem.type === "message" && lastItem.role === "user";
  };

  return (
    <div className="flex justify-center items-center size-full">
      <div className="flex grow flex-col h-full w-full gap-2">
        {items.length === 1 ? (
          <div className="flex flex-col items-center justify-center h-[80vh] px-6 text-center">
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ duration: 0.5 }}
              className="mb-6 p-4 bg-gradient-to-r from-primary/20 to-blue-500/20 rounded-full overflow-hidden"
            >
              <motion.div
                className="relative h-24 w-24"
                initial={{ y: "100%", opacity: 0 }}
                animate={{ y: "0%", opacity: 1 }}
                transition={{ duration: 0.6, delay: 1, ease: "easeOut" }}
                whileHover={{ y: "100%", opacity: 0, transition: { duration: 0.6, ease: "easeOut" } }}
              >
                <Image
                  src="/images/vectors/gradCap.svg"
                  alt="Education Guidance"
                  fill
                  className="text-primary"
                  priority
                />
              </motion.div>
            </motion.div>
            
            <motion.h2 
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ duration: 0.5, delay: 0.1 }}
              className="text-2xl font-semibold bg-clip-text text-transparent bg-gradient-to-r from-primary to-primary/70 mb-2"
            >
              Welcome to Vista Education Adviser
            </motion.h2>
            
            <motion.p 
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ duration: 0.5, delay: 0.2 }}
              className="text-muted-foreground max-w-md mb-8"
            >
              Hi, I'm Vista. Here to help you navigate your educational journey. I can help you explore education paths and career options, provide application tips, guidance on programs that align with your goals, and more. How can I assist you today?
            </motion.p>
            
            <motion.div 
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ duration: 0.5, delay: 0.3 }}
              className="grid grid-cols-1 md:grid-cols-2 gap-3 max-w-md w-full"
            >
              {["What programs would suit my interests?", "How do I apply for scholarships?", "What career paths are available with my degree?", "How can I prepare for university interviews?"].map((suggestion, index) => (
                <motion.button 
                  key={index}
                  whileHover={{ scale: 1.03, backgroundColor: "rgb(243 244 246)" }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => {
                    handleSendMessageWithTyping(suggestion);
                    setinputMessageText("");
                  }}
                  className="p-3 text-sm text-left text-foreground bg-white rounded-lg shadow-sm border border-primary/10 hover:border-primary/30 transition-colors"
                >
                  {suggestion}
                </motion.button>
              ))}
            </motion.div>
          </div>
        ) : (
          <div className="h-[80vh] overflow-y-scroll px-4 md:px-6 flex flex-col">
            <div className="mt-auto space-y-6 pt-4 pb-2">
              {items.map((item, index) => (
                <React.Fragment key={index}>
                  {item.type === "tool_call" ? (
                    <ToolCall toolCall={item} />
                  ) : item.type === "message" ? (
                    <div className="flex flex-col gap-1">
                      <Message 
                        message={item} 
                        userData={userData}
                      />
                      {item.content &&
                        item.content[0].annotations &&
                        item.content[0].annotations.length > 0 && (
                          <Annotations
                            annotations={item.content[0].annotations}
                          />
                        )}
                    </div>
                  ) : null}
                </React.Fragment>
              ))}
              
              {/* Typing indicator - shown after user message when waiting for response */}
              {shouldShowTypingIndicator() && (
                <div className="flex mt-4">
                  <div className="flex-shrink-0 size-8 rounded-full bg-gradient-to-br from-primary to-primary/90 flex items-center justify-center text-white shadow-sm mr-2">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                      <path d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                    </svg>
                  </div>
                  <div className="max-w-[85%] rounded-2xl rounded-tl-sm px-3 py-2 bg-white border border-primary/20 shadow-sm flex items-center h-10">
                    <AnimatedLogo size={24} />
                  </div>
                </div>
              )}
              
              <div ref={itemsEndRef} />
            </div>
          </div>
        )}
        <div className="px-4 md:px-6 py-4 bg-gradient-to-r from-background to-background/95 backdrop-blur-sm border-t border-primary/10">
          <div className="flex items-center">
            <div className="flex w-full items-center">
              <div className="flex w-full flex-col gap-1.5 rounded-xl p-2 transition-colors bg-white border border-primary/10 shadow-sm hover:border-primary/30 focus-within:border-primary/40 focus-within:ring-2 focus-within:ring-primary/10">
                <div className="flex items-end gap-2">
                  <div className="flex min-w-0 flex-1 flex-col">
                    <textarea
                      id="prompt-textarea"
                      tabIndex={0}
                      dir="auto"
                      rows={1}
                      placeholder="Ask about educational programs, career paths, or application tips..."
                      className="resize-none border-0 focus:outline-none text-sm bg-transparent px-2 py-2 text-foreground"
                      value={inputMessageText}
                      onChange={(e) => setinputMessageText(e.target.value)}
                      onKeyDown={handleKeyDown}
                      onCompositionStart={() => setIsComposing(true)}
                      onCompositionEnd={() => setIsComposing(false)}
                      disabled={isTyping}
                    />
                  </div>
                  <button
                    disabled={!inputMessageText.trim() || isTyping}
                    data-testid="send-button"
                    className="flex size-10 items-center justify-center rounded-lg bg-gradient-to-br from-primary to-primary/90 text-white transition-colors hover:from-primary/90 hover:to-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 focus-visible:ring-offset-2 disabled:bg-gray-300 disabled:text-gray-500 disabled:hover:bg-gray-300 mr-1 relative shadow-sm"
                    onClick={() => {
                      if (inputMessageText.trim() && !isTyping) {
                        handleSendMessageWithTyping(inputMessageText);
                        setinputMessageText("");
                      }
                    }}
                  >
                    {isTyping ? (
                      <div className="absolute inset-0 flex items-center justify-center">
                        <div className="animate-spin rounded-full h-4 w-4 border-2 border-white/30 border-t-white"></div>
                      </div>
                    ) : (
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M10.293 3.293a1 1 0 011.414 0l6 6a1 1 0 010 1.414l-6 6a1 1 0 01-1.414-1.414L14.586 11H3a1 1 0 110-2h11.586l-4.293-4.293a1 1 0 010-1.414z" clipRule="evenodd" />
                      </svg>
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>
          <div className="mt-2 text-xs text-center text-muted-foreground">
            Vista Education Adviser helps you navigate your educational journey with personalized recommendations.
          </div>
        </div>
      </div>
    </div>
  );
};

export default Chat;
