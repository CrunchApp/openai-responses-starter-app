"use client";
import React, { useState, useRef, useEffect } from 'react';
import Image from 'next/image';
import { motion, AnimatePresence, useDragControls } from 'framer-motion';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { SendHorizontal, Loader2, Lightbulb, CheckCircle2 } from 'lucide-react';
import useConversationStore from '@/stores/useConversationStore';
import { cn } from '@/lib/utils';
import { useRouter } from 'next/navigation';

interface GradCapAssistantProps {
  className?: string;
  contextMessage?: string; // Additional system context sent before user message
  placeholder?: string;    // Custom placeholder for the input
}

// Local storage keys for the hint popup
const POPUP_SEEN_KEY = 'hasSeenGradCapHintPopup';
const POPUP_DONT_SHOW_KEY = 'dontShowGradCapHintPopup';

export const GradCapAssistant: React.FC<GradCapAssistantProps> = ({
  className,
  contextMessage,
  placeholder,
}) => {
  const [isHovered, setIsHovered] = useState(false);
  const [message, setMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [lastUserMessage, setLastUserMessage] = useState<string | null>(null);
  const [assistantResponse, setAssistantResponse] = useState<string | null>(null);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [showSavePrompt, setShowSavePrompt] = useState(false);
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

  // Track the last user message sent from this component
  useEffect(() => {
    if (!lastUserMessage) return;
    // Find the user message index
    const userIdx = chatMessages.findIndex(
      (msg) => msg.type === 'message' && msg.role === 'user' && msg.content[0]?.text === lastUserMessage
    );
    if (userIdx === -1) return;
    // Find the next assistant message after the user message
    const assistantMsg = chatMessages
      .slice(userIdx + 1)
      .find((msg) => msg.type === 'message' && msg.role === 'assistant') as any;
    if (!assistantMsg) return;
    const text = assistantMsg.content[0]?.text ?? '';
    setAssistantResponse(text); // This will update as the stream progresses

    // Set loading false and show save prompt *after* response is received
    if (text.length > 0 && isLoading) { // Check isLoading to ensure this runs only once after loading finishes
      setIsLoading(false);
      setShowSavePrompt(true); // Show the prompt to save
    }
  }, [chatMessages, lastUserMessage, isLoading]); // Added isLoading dependency

  // Focus input when box opens
  useEffect(() => {
    if (isHovered && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isHovered]);

  // On new question, clear save prompt and localStorage
  useEffect(() => {
    if (isLoading) {
      setShowSavePrompt(false);
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

  const handleSendMessage = async () => {
    if (!message.trim()) return;
    // Reset context to ensure quick chat is isolated
    const {
      setActiveConversation,
      setConversationItems,
    } = useConversationStore.getState();
    // Detach from any existing conversation so the quick chat starts fresh
    setActiveConversation(null);
    // Clear any leftover conversation items to avoid leaking prior context
    setConversationItems([]);

    setIsLoading(true);
    setAssistantResponse(null);
    setLastUserMessage(message);
    setConversationId(null);

    // If we have additional context, inject it as a system message before the user's question
    if (contextMessage) {
      await addConversationItem({ role: "system", content: contextMessage });
    }

    await sendUserMessage(message);
    setMessage('');
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
  const handleSaveAsConversation = async (save: boolean) => {
    setShowSavePrompt(false);
    if (save && lastUserMessage && assistantResponse) {
      // Save as conversation: create new conversation and send both messages
      const convId = await createNewConversation(lastUserMessage, assistantResponse);
      setConversationId(convId || null);
    } else if (!save && assistantResponse) {
      // Store the response in localStorage for later retrieval
      localStorage.setItem('vista_quick_response', JSON.stringify({
        question: lastUserMessage,
        response: assistantResponse,
        timestamp: Date.now(),
      }));
    }
  };

  const [isDragging, setIsDragging] = useState(false);

  return (
    <motion.div
      ref={constraintsRef}
      drag
      dragControls={dragControls}
      dragListener={false}
      className={cn('absolute z-50 cursor-grab active:cursor-grabbing', className)}
      style={{ touchAction: 'none' }}
      onPointerDown={(event) => {
        // Allow dragging from anywhere *except* interactive elements within the popup
        const popupElement = widgetRef.current;
        const target = event.target as HTMLElement;

        // Check if the target is inside the popup AND is an interactive element
        const isInteractiveElementInPopup = popupElement?.contains(target) && (
          target.tagName === 'INPUT' ||
          target.tagName === 'BUTTON' ||
          target.closest('button') // Also check if it's inside a button
        );

        if (!isInteractiveElementInPopup) {
          // Start dragging if the target is not an interactive element inside the popup
          dragControls.start(event, { snapToCursor: false });
          setIsDragging(true);
        }
      }}
      onPointerUp={() => setIsDragging(false)}
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
            width={86}
            height={86}
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
            <Lightbulb className="h-5 w-5 text-amber-400" />
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
            className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-72 p-4 bg-background border border-border rounded-lg shadow-xl z-40 text-left"
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
              <Lightbulb className="h-5 w-5 text-amber-400 mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-sm font-medium text-foreground mb-1">Quick Chat!</p>
                <p className="text-xs text-muted-foreground">
                  Hover over the cap anytime to ask the Vista Assistant a quick question.
                </p>
              </div>
            </div>
            <label className="flex items-center gap-2 text-xs cursor-pointer select-none mt-2">
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
              'absolute top-full left-0 mt-2 -ml-4 z-20 flex flex-col gap-2 p-4 bg-card border border-border rounded-lg shadow-xl',
              'w-[18rem] sm:w-80',
            )}
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
          >
            <div className="flex items-center gap-2">
              <Input
                ref={inputRef}
                type="text"
                placeholder={placeholder || "Ask Vista..."}
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                onKeyDown={handleKeyDown}
                className="flex-grow h-9 text-sm"
                autoFocus
              />
              <Button
                variant="ghost"
                size="icon"
                onClick={handleSendMessage}
                disabled={!message.trim() || isLoading}
                className="h-9 w-9 flex-shrink-0"
              >
                {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <SendHorizontal className="h-4 w-4" />}
              </Button>
            </div>
            {assistantResponse && (
              <div className="mt-2 p-2 bg-muted rounded text-xs text-foreground/90 border border-border max-h-64 overflow-y-auto whitespace-pre-line">
                {assistantResponse}
              </div>
            )}
            {showSavePrompt && (
              <div className="mt-2 flex flex-col gap-1">
                <span className="text-xs">Would you like to save this as a conversation?</span>
                <div className="flex gap-2 mt-1">
                  <Button size="sm" variant="outline" onClick={() => handleSaveAsConversation(true)}>
                    Yes
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => handleSaveAsConversation(false)}>
                    No
                  </Button>
                </div>
              </div>
            )}
            {/* Always show Continue in chat if a conversation was created */}
            {conversationId && !showSavePrompt && (
              <Button
                variant="link"
                size="sm"
                className="text-xs ml-auto px-1"
                onClick={handleContinueInChat}
              >
                <CheckCircle2 className="h-4 w-4 mr-1 text-green-500" /> Continue in chat
              </Button>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}; 