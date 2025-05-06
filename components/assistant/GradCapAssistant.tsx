"use client";
import React, { useState, useRef, useEffect, useCallback } from 'react';
import Image from 'next/image';
import { motion, AnimatePresence, useDragControls } from 'framer-motion';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { SendHorizontal, Loader2, Lightbulb, CheckCircle2, Search, FunctionSquare } from 'lucide-react';
import useConversationStore from '@/stores/useConversationStore';
import { cn } from '@/lib/utils';
import { useRouter } from 'next/navigation';
import { Item, MessageItem, ToolCallItem } from '@/lib/assistant'; // Import Item types
import Message from '../message'; // Import Message component
import { processMessages } from '@/lib/assistant';

interface GradCapAssistantProps {
  className?: string;
  contextMessage?: string; // Additional system context sent before user message
  placeholder?: string;    // Custom placeholder for the input
  size?: 'default' | 'small'; // Size variant
  onOpen?: () => void;
  onClose?: () => void;
  previousResponseId?: string;
}

// Local storage keys for the hint popup
const POPUP_SEEN_KEY = 'hasSeenGradCapHintPopup';
const POPUP_DONT_SHOW_KEY = 'dontShowGradCapHintPopup';

// Simplified display for tool calls within the popup
const ToolCallDisplay: React.FC<{ toolCall: ToolCallItem, size: 'default' | 'small' }> = ({ toolCall, size }) => {
  let icon = <FunctionSquare className={cn("mr-1.5", size === 'small' ? 'h-3 w-3' : 'h-3.5 w-3.5')} />;
  let text = `Calling tool: ${toolCall.name || toolCall.tool_type}`;

  if (toolCall.tool_type === 'web_search_call') {
    icon = <Search className={cn("mr-1.5", size === 'small' ? 'h-3 w-3' : 'h-3.5 w-3.5')} />;
    text = "Searching the web...";
  } else if (toolCall.tool_type === 'file_search_call') {
    icon = <Search className={cn("mr-1.5", size === 'small' ? 'h-3 w-3' : 'h-3.5 w-3.5')} />;
    text = "Searching files...";
  }

  if (toolCall.status === 'completed' || toolCall.status === 'failed') {
     text = toolCall.tool_type === 'function_call'
        ? `Tool ${toolCall.name} ${toolCall.status}`
        : `${toolCall.tool_type.replace('_call', '')} ${toolCall.status}`;
  }

  return (
    <div className={cn("mt-2 flex items-center p-2 bg-muted/50 border border-border rounded text-muted-foreground", size === 'small' ? 'text-[10px]' : 'text-xs')}>
      {toolCall.status === 'in_progress' || toolCall.status === 'searching' ? (
        <Loader2 className={cn("mr-1.5 animate-spin", size === 'small' ? 'h-3 w-3' : 'h-3.5 w-3.5')} />
      ) : (
        icon
      )}
      <span>{text}</span>
    </div>
  );
};

export const GradCapAssistant: React.FC<GradCapAssistantProps> = ({
  className,
  contextMessage,
  previousResponseId,
  placeholder,
  size = 'default', // Default size
  onOpen,
  onClose,
}) => {
  const [isHovered, setIsHovered] = useState(false);
  const [message, setMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [lastUserMessage, setLastUserMessage] = useState<string | null>(null);
  const [assistantResponse, setAssistantResponse] = useState<string | null>(null);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [showSavePrompt, setShowSavePrompt] = useState(false);
  const [userMessageIndex, setUserMessageIndex] = useState<number | null>(null); // Track user message index
  const sendUserMessage = useConversationStore((state) => state.sendUserMessage);
  const addConversationItem = useConversationStore((state) => state.addConversationItem);
  const createNewConversation = useConversationStore((state) => state.createNewConversation);
  const chatMessages = useConversationStore((state) => state.chatMessages);
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const dragControls = useDragControls();

  // Only animate the cap image
  const [isCapHovered, setIsCapHovered] = useState(false);
  const widgetRef = useRef<HTMLDivElement>(null);

  const constraintsRef = useRef(null);

  // New Effect to detect completion based on chatMessages updates
  useEffect(() => {
    // Only run logic if we are in a loading state initiated by this component
    if (!isLoading || userMessageIndex === null) {
        return;
    }
    console.log(`GradCapAssistant Effect [chatMessages]: isLoading=${isLoading}, userMessageIndex=${userMessageIndex}`);

    const relevantItems = chatMessages.slice(userMessageIndex + 1);
    console.log(`GradCapAssistant Effect [chatMessages]: relevantItems count: ${relevantItems.length}`);

    if (relevantItems.length > 0) {
      const lastRelevantItem = relevantItems[relevantItems.length - 1];
      console.log(`GradCapAssistant Effect [chatMessages]: Last relevant item:`, lastRelevantItem);

      // Check if the last item indicates the end of a turn
      const turnSeemsComplete = (
        (lastRelevantItem.type === 'message' && lastRelevantItem.role === 'assistant') ||
        (lastRelevantItem.type === 'tool_call' && (lastRelevantItem.status === 'completed' || lastRelevantItem.status === 'failed'))
      );

      console.log(`GradCapAssistant Effect [chatMessages]: Turn seems complete? ${turnSeemsComplete}`);

      if (turnSeemsComplete) {
        // Extract final assistant text response for simplified saving
        const finalAssistantMsg = [...relevantItems].reverse().find(
          item => item.type === 'message' && item.role === 'assistant'
        ) as MessageItem | undefined;

        if (finalAssistantMsg && finalAssistantMsg.content[0]?.text) {
          console.log('GradCapAssistant Effect [chatMessages]: Found final assistant text for saving.');
          setAssistantResponse(finalAssistantMsg.content[0].text);
        } else {
          console.log('GradCapAssistant Effect [chatMessages]: No final assistant text message found for saving.');
          setAssistantResponse(null); // Ensure it's null if no text found
        }

        // Mark loading as finished and show the prompt
        console.log('GradCapAssistant Effect [chatMessages]: Setting isLoading false, showSavePrompt true.');
        setIsLoading(false);
        setShowSavePrompt(true);
      }
       // If not complete, do nothing and wait for the next chatMessages update
       else {
           console.log('GradCapAssistant Effect [chatMessages]: Turn not yet complete.');
       }
    }
     // If no relevant items yet, do nothing and wait for updates
     else {
         console.log('GradCapAssistant Effect [chatMessages]: No relevant items yet.');
     }

  }, [chatMessages, isLoading, userMessageIndex]); // Rerun whenever chatMessages changes while loading

  // Focus input when box opens (adjusted dependencies)
  useEffect(() => {
    if (isHovered && inputRef.current) {
      inputRef.current.focus();
      if (onOpen) onOpen();
    }
    // Close condition: not hovered, not loading, AND no message index (i.e., no active quick chat)
    if (!isHovered && !isLoading && userMessageIndex === null && onClose) {
      onClose();
    }
  }, [isHovered, isLoading, userMessageIndex, onOpen, onClose]);

  // On new question, clear save prompt, user message index and localStorage
  useEffect(() => {
    if (isLoading) {
      setShowSavePrompt(false);
      setConversationId(null); // Clear any previous saved conversation ID
      localStorage.removeItem('vista_quick_response');
    }
  }, [isLoading]);

  // State for the hint popup
  const [showHintPopup, setShowHintPopup] = useState(false);
  const [dontShowHintAgain, setDontShowHintAgain] = useState(false);

  // Effect for hint popup visibility based on localStorage
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const dontShow = localStorage.getItem(POPUP_DONT_SHOW_KEY) === 'true';
      setDontShowHintAgain(dontShow);
      if (!dontShow && localStorage.getItem(POPUP_SEEN_KEY) !== 'true') {
        // Show initially, but maybe delay slightly?
        const timer = setTimeout(() => setShowHintPopup(true), 1000); // e.g., 1 second delay
        return () => clearTimeout(timer);
      }
    }
  }, []);

  // Handlers for hint popup
  const handleCloseHintPopup = () => {
    localStorage.setItem(POPUP_SEEN_KEY, 'true');
    setShowHintPopup(false);
    if (dontShowHintAgain) {
      localStorage.setItem(POPUP_DONT_SHOW_KEY, 'true');
    }
  };

  const handleOpenHintPopup = () => {
    if (!dontShowHintAgain) { // Only open if not permanently dismissed
        setShowHintPopup(true);
    }
  };

  const handleDontShowHintAgain = (checked: boolean) => {
    setDontShowHintAgain(checked);
    if (checked) {
      localStorage.setItem(POPUP_DONT_SHOW_KEY, 'true');
      setShowHintPopup(false); // Close it immediately if checked
    } else {
      localStorage.removeItem(POPUP_DONT_SHOW_KEY);
    }
  };

  // On mount, if a previousResponseId prop is provided, inject a sentinel system message and ensure store has it
  useEffect(() => {
    // Only inject once if not already present in persisted conversationItems
    if (previousResponseId) {
      const { conversationItems, previousResponseId: storedPrev } = useConversationStore.getState();
      if (storedPrev !== previousResponseId) {
        useConversationStore.getState().setPreviousResponseId(previousResponseId);
      }
      const sentinel = `__CHAIN__:${previousResponseId}`;
      const alreadyInjected = conversationItems.some(
        (msg) => msg.role === 'system' && msg.content === sentinel
      );
      if (!alreadyInjected) {
        // Inject sentinel system message linking to previous conversation state
        addConversationItem({ role: 'system', content: sentinel });
        /*
         * Do NOT immediately resume streaming here. Triggering processMessages() on every
         * mount caused an unnecessary /api/turn_response call whenever the user simply
         * navigated to the application details page (e.g. via "View Details").
         * Streaming will automatically resume if there are any pending tool calls
         * (they are persisted in chatMessages) or after a connectivity drop via the
         * dedicated network-reconnect listener further below.
         */
      }
    }
  }, []);

  // Resume streaming after network reconnect
  useEffect(() => {
    const handleOnline = () => {
      console.log('Connection restored, resuming assistant stream...');
      processMessages();
    };
    window.addEventListener('online', handleOnline);
    return () => window.removeEventListener('online', handleOnline);
  }, []);

  const handleSendMessage = async () => {
    if (!message.trim() || isLoading) return; // Prevent sending while loading

    const userMessageContent = message; // Store message content before clearing
    setMessage(''); // Clear input immediately

    // Reset state for a new quick chat interaction
    setIsLoading(true);
    setShowSavePrompt(false);
    setAssistantResponse(null);
    setLastUserMessage(userMessageContent); // Store the text of the message being sent
    setConversationId(null);
    setUserMessageIndex(null); // Reset user message index

    // Reset context in store for isolated quick chat
    const {
      setActiveConversation,
      setConversationItems,
      setChatMessages, // Get access to setChatMessages
      chatMessages: currentChatMessages // Get current messages to find index later
    } = useConversationStore.getState();

    setActiveConversation(null);
    setConversationItems([]); // Clear API context items

    // Find the index *before* adding the new message
    const initialMessagesLength = currentChatMessages.length;

    // If we have additional context, inject it as a system message
    if (contextMessage) {
      await addConversationItem({ role: "system", content: contextMessage });
    }

    // If there is a previousResponseId in store, inject a sentinel to signal chaining
    const currentPrevId = useConversationStore.getState().previousResponseId;
    if (currentPrevId) {
      await addConversationItem({ role: 'system', content: `__USE_PREV__:${currentPrevId}` });
    }

    // Send the user message (this will trigger processing)
    await sendUserMessage(userMessageContent);

    // After sendUserMessage potentially updates chatMessages, find the index
    // Use a slight delay or check store state directly if needed
    // For simplicity, assume sendUserMessage updates the store synchronously enough or rely on useEffect
    // Set the user message index based on the state *after* the message was likely added
    // This might be slightly racy, ideally sendUserMessage would return the added item or index
    setUserMessageIndex(initialMessagesLength); // Set index based on length before adding
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      handleSendMessage();
    }
  };

  // Continue in chat
  const handleContinueInChat = () => {
    if (conversationId) {
      router.push('/chat');
    }
  };

  // Save as conversation prompt logic
  const [isSaving, setIsSaving] = useState(false); // NEW: track saving state
  const handleSaveAsConversation = async (save: boolean) => {
    if (save) {
      setIsSaving(true); // start spinner
    }
    setShowSavePrompt(false); // Hide prompt immediately

    // Find the relevant items (messages/tool calls after user's message)
    const relevantItems = userMessageIndex !== null ? chatMessages.slice(userMessageIndex + 1) : [];

    if (save) {
      // --- Saving the conversation --- 
      console.log('Attempting to save quick chat as new conversation...');

      // Find the *last* assistant message in the relevant items
      const finalAssistantMsg = [...relevantItems].reverse().find(
          item => item.type === 'message' && item.role === 'assistant'
      ) as MessageItem | undefined;
      
      const finalAssistantText = finalAssistantMsg?.content[0]?.text;

      // Ensure we have the user message and the final assistant text
      if (lastUserMessage && finalAssistantText) {
          console.log(`Saving with User: "${lastUserMessage.substring(0, 50)}..." | Assistant: "${finalAssistantText.substring(0, 50)}..."`);
          
          // Call createNewConversation with the initial user message and the *full final* assistant text
          const convId = await createNewConversation(lastUserMessage, finalAssistantText);
          
          if (convId) {
              console.log('Saved conversation with ID:', convId);
              setConversationId(convId); // Store the new ID locally to show "Continue in chat"
              setIsSaving(false); // finished

              // Recompute userMessageIndex based on new store state (chatMessages were reset within createNewConversation)
              const updatedMessages = useConversationStore.getState().chatMessages;
              const newUserIdx = updatedMessages.findIndex(
                (m) => m.type === 'message' && m.role === 'user'
              );
              setUserMessageIndex(newUserIdx !== -1 ? newUserIdx : 0);

              // Ensure local copies of lastUserMessage and assistantResponse remain intact (already set)
              // No need to reset state here
          } else {
              console.error("Failed to create conversation from quick chat.");
              setIsSaving(false);
              // Handle error (e.g., show a toast notification)
              // Reset state if saving fails to allow user to try again or dismiss
              setLastUserMessage(null);
              setAssistantResponse(null);
              setUserMessageIndex(null);
          }
      } else {
          console.warn("Cannot save conversation: missing user message or final assistant text.");
          setIsSaving(false);
          // Reset state if critical info is missing
          setLastUserMessage(null);
          setAssistantResponse(null);
          setUserMessageIndex(null);
      }
    } else {
      // --- Not saving the conversation --- 
      console.log('Storing quick chat response locally (Not Saving Conversation)...');
       // Store the potentially incomplete response in localStorage is fine here
      if (lastUserMessage && assistantResponse) {
          localStorage.setItem('vista_quick_response', JSON.stringify({
            question: lastUserMessage,
            response: assistantResponse, // Use state variable for local storage
            timestamp: Date.now(),
          }));
      } else {
          console.warn("Cannot store locally: missing user message or assistant response state.");
      }
      // **RESET STATE** when choosing not to save, clearing the display
      setLastUserMessage(null);
      setAssistantResponse(null);
      setUserMessageIndex(null);
    }
    // **REMOVE**: This reset was happening for both Yes and No
    // setLastUserMessage(null);
    // setAssistantResponse(null);
    // setUserMessageIndex(null);
  };

  const [isDragging, setIsDragging] = useState(false);

  return (
    <motion.div
      ref={constraintsRef}
      {...(size === 'small'
        ? {
            className: cn('w-full', className),
            style: { position: 'static', width: '100%' },
          }
        : {
            drag: true,
            dragControls: dragControls,
            dragListener: false,
            className: cn('absolute z-50 cursor-grab active:cursor-grabbing', className),
            style: { touchAction: 'none' },
            onPointerDown: (event: any) => {
              // Allow dragging from anywhere *except* interactive elements within the popup
              const popupElement = widgetRef.current;
              const target = event.target as HTMLElement;
              // Check if the target is inside the popup AND is an interactive element
              const isInteractiveElementInPopup = popupElement?.contains(target) && (
                target.tagName === 'INPUT' ||
                target.tagName === 'BUTTON' ||
                target.closest('button')
              );
              if (!isInteractiveElementInPopup) {
                dragControls.start(event, { snapToCursor: false });
                setIsDragging(true);
              }
            },
            onPointerUp: () => setIsDragging(false),
          })}
    >
      <motion.div
        onHoverStart={() => { setIsHovered(true); setIsCapHovered(true); }}
        onHoverEnd={() => { setIsCapHovered(false); }}
        className="inline-block"
      >
        <motion.div
          animate={isCapHovered ? { scale: 1.1, rotate: -5 } : { scale: 1, rotate: 0 }}
          transition={{ type: 'spring', stiffness: 300, damping: 15 }}
        >
          <Image
            src="/images/vectors/cap.png"
            alt="Vista Assistant"
            width={size === 'small' ? 50 : 86} // Smaller image
            height={size === 'small' ? 50 : 86}
            priority
            className="cursor-grab active:cursor-grabbing"
            onClick={() => {
              // Prevent closing when the user was dragging the cap
              if (!isDragging) {
                setIsHovered(false);
              }
            }}
          />
        </motion.div>
        {/* Info icon for hint popup - show if not permanently dismissed and popup isn't already open */}
        {!dontShowHintAgain && !showHintPopup && (
          <button
            className="absolute top-0 right-0 translate-x-1/2 -translate-y-1/2 bg-background border border-border rounded-full p-1 shadow z-30 hover:bg-muted"
            onClick={(e) => { e.stopPropagation(); handleOpenHintPopup(); }}
            aria-label="Show assistant info"
            type="button"
          >
            <Lightbulb className={cn("text-amber-400", size === 'small' ? 'h-4 w-4' : 'h-5 w-5')} />
          </button>
        )}
      </motion.div>

      {/* Hint Popup Logic - Render within the main component */}
      <AnimatePresence>
         {showHintPopup && (
          <motion.div
            initial={{ opacity: 0, y: -10, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.9 }}
            transition={{ duration: 0.3, ease: "backOut" }}
            // Position relative to the main draggable container
            className={cn(
              "absolute bottom-full left-1/2 -translate-x-1/2 mb-2 p-3 bg-background border border-border rounded-lg shadow-xl z-40 text-left",
              size === 'small' ? 'w-60' : 'w-72' // Smaller hint popup
            )}
            // Prevent this popup from triggering the drag
            onPointerDown={(e) => e.stopPropagation()}
          >
            <button
              onClick={handleCloseHintPopup}
              className="absolute top-2 right-2 p-1 text-muted-foreground hover:text-foreground transition-colors"
              aria-label="Dismiss hint"
            >
              ×
            </button>
            <div className="flex items-start space-x-2 mb-2">
              <Lightbulb className={cn("text-amber-400 mt-0.5 flex-shrink-0", size === 'small' ? 'h-4 w-4' : 'h-5 w-5')} />
              <div>
                <p className={cn("font-medium text-foreground mb-1", size === 'small' ? 'text-[11px]' : 'text-[0.625rem]')}>Quick Chat!</p>
                <p className={cn("text-muted-foreground", size === 'small' ? 'text-[11px]' : 'text-[0.625rem]')}>
                  Wherever you see me on the app, you can hover over the cap to ask Vista a quick question. You can also drag me around the screen. Just double click and hold to drop me on a new location.
                </p>
              </div>
            </div>
            <label className={cn("flex items-center gap-2 cursor-pointer select-none mt-2", size === 'small' ? 'text-[10px]' : 'text-[0.625rem]')}>
              <input
                type="checkbox"
                checked={dontShowHintAgain}
                onChange={e => handleDontShowHintAgain(e.target.checked)}
                className="accent-primary"
              />
              Don't show this again
            </label>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {isHovered && (
          <motion.div
            ref={widgetRef}
            initial={{ opacity: 0, y: 10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.95 }}
            transition={{ duration: 0.2, ease: 'easeInOut' }}
            className={cn(
              size === 'small'
                ? 'relative w-full flex flex-col gap-2 p-3 bg-card border border-border rounded-lg shadow-xl'
                : 'absolute top-full left-0 mt-2 -ml-4 z-20 flex flex-col gap-2 p-4 bg-card border border-border rounded-lg shadow-xl',
              size === 'small' ? '' : (size === 'default' ? 'w-[18rem] sm:w-80' : '')
            )}
            style={size === 'small' ? { minWidth: 0, maxWidth: '100%' } : {}}
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
          >
            <div className="flex items-center gap-2 w-full">
              <Input
                ref={inputRef}
                type="text"
                placeholder={placeholder || "Ask Vista..."}
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                onKeyDown={handleKeyDown}
                className={cn("flex-grow w-full", size === 'small' ? 'text-[10px]' : 'h-9 text-sm')} // Full width input
                autoFocus
              />
              <Button
                variant="ghost"
                size="icon"
                className={cn("flex-shrink-0", size === 'small' ? 'h-8 w-8' : 'h-9 w-9')}
                onClick={handleSendMessage}
                disabled={!message.trim() || isLoading}
              >
                {isLoading ? <Loader2 className={cn("animate-spin", size === 'small' ? 'h-3.5 w-3.5' : 'h-4 w-4')} /> : <SendHorizontal className={cn(size === 'small' ? 'h-3.5 w-3.5' : 'h-4 w-4')} />}
              </Button>
            </div>
            {/* Render the sequence of messages/tool calls after the user's message */}
            {userMessageIndex !== null && (
                 <div className={cn(
                     "mt-2 space-y-2 overflow-y-auto w-full flex flex-col",
                     size === 'small' ? 'text-[11px] max-h-32' : 'text-xs max-h-64'
                 )}>
                    {chatMessages.slice(userMessageIndex + 1).map((item, index) => (
                        <React.Fragment key={item.id || index}>
                            {item.type === 'message' && item.role === 'assistant' ? (
                                // Use a simplified Message display for assistant
                                <div className="p-2 bg-muted rounded text-foreground/90 border border-border whitespace-pre-line">
                                    {item.content[0]?.text}
                                </div>
                            ) : item.type === 'tool_call' ? (
                                <ToolCallDisplay toolCall={item} size={size} />
                            ) : null}
                        </React.Fragment>
                    ))}
                 </div>
            )}
            {showSavePrompt && !isLoading && (
              <div className="mt-2 flex flex-col gap-1 w-full">
                <span className={cn(size === 'small' ? 'text-[11px]' : 'text-xs')}>Would you like to save this as a conversation?</span>
                <div className="flex gap-2 mt-1">
                  <Button
                    size="sm"
                    variant="outline"
                    className={cn(size === 'small' ? 'text-[11px] h-7 px-2' : '')}
                    onClick={() => handleSaveAsConversation(true)}
                    disabled={isLoading} // Disable while potentially saving
                  >
                    Yes
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    className={cn(size === 'small' ? 'text-[11px] h-7 px-2' : '')}
                    onClick={() => handleSaveAsConversation(false)}
                    disabled={isLoading} // Disable while potentially saving
                  >
                    No
                  </Button>
                </div>
              </div>
            )}
            {conversationId && !showSavePrompt && !isLoading && (
              <Button
                variant="link"
                size="sm"
                className={cn("ml-auto px-1 w-full text-left", size === 'small' ? 'text-[11px]' : 'text-xs')}
                onClick={handleContinueInChat}
              >
                <CheckCircle2 className={cn("mr-1 text-green-500", size === 'small' ? 'h-3.5 w-3.5' : 'h-4 w-4')} /> Continue in chat
              </Button>
            )}
            {isSaving && (
              <div className="flex items-center justify-center gap-2 text-muted-foreground mt-2">
                <Loader2 className="h-4 w-4 animate-spin" /> Saving conversation...
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}; 