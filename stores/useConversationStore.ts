import { create } from "zustand";
import { Item, MessageItem, processMessages } from "@/lib/assistant";
import { ChatCompletionMessageParam } from "openai/resources/chat/completions";
import { INITIAL_MESSAGE } from "@/config/constants";
import { vectorStoreClient } from "@/lib/vector-store/client";
import { persist } from 'zustand/middleware';

// Define Conversation type matching ConversationSelector
type Conversation = {
  id: string;
  title: string;
  created_at: string;
  updated_at: string;
};

interface ConversationState {
  // Authentication and conversation state
  isAuthenticated: boolean;
  userId: string | null;
  activeConversationId: string | null;
  isLoading: boolean;
  error: string | null;
  fetchingConversations: boolean; // Add a separate flag for conversation fetching
  
  // Items displayed in the chat
  chatMessages: Item[];
  // Items sent to the Responses API
  conversationItems: any[];
  conversations: Conversation[]; // Add state to hold conversation list for UI updates

  // Auth management
  setAuthState: (isAuthenticated: boolean, userId: string | null) => void;
  
  // Conversation management
  setActiveConversation: (conversationId: string | null) => void;
  createNewConversation: (firstMessageContent?: string, firstAssistantContent?: string) => Promise<string | null>;
  loadConversation: (conversationId: string) => Promise<boolean>;
  
  // Messages management
  setChatMessages: (items: Item[]) => void;
  setConversationItems: (messages: any[]) => void;
  addChatMessage: (item: Item, skipAddToChat?: boolean, conversationIdOverride?: string) => Promise<void>;
  addConversationItem: (message: ChatCompletionMessageParam) => Promise<void>;
  sendUserMessage: (message: string) => Promise<void>;
  
  // State management
  setLoading: (isLoading: boolean) => void;
  setError: (error: string | null) => void;
  resetState: () => void;
  rawSet: (state: any) => void;

  // New methods
  updateConversationTitleInState: (conversationId: string, title: string) => void;
  fetchConversations: () => Promise<void>; // Add method to fetch conversations

  previousResponseId: string | null;
  setPreviousResponseId: (id: string | null) => void;
}

const useConversationStore = create<ConversationState>()(
  persist(
    (set, get) => ({
      // Initial state
      isAuthenticated: false,
      userId: null,
      activeConversationId: null,
      isLoading: false,
      error: null,
      fetchingConversations: false, // Initialize the fetching flag
      
      chatMessages: [
        {
          type: "message",
          role: "assistant",
          content: [{ type: "output_text", text: INITIAL_MESSAGE }],
        },
      ],
      conversationItems: [],
      conversations: [], // Initialize conversations state
      
      previousResponseId: null,
      
      // Auth management
      setAuthState: (isAuthenticated, userId) => {
        set({ isAuthenticated, userId });
        if (isAuthenticated && userId) {
          // Don't immediately fetch - use a debounced fetch to prevent cascading effects
          setTimeout(() => {
            // Only fetch if we're still authenticated (could have changed)
            if (get().isAuthenticated && get().userId === userId) {
              get().fetchConversations();
            }
          }, 100);
        } else {
          set({ conversations: [], activeConversationId: null }); // Clear on sign out
        }
      },
      
      // Conversation management
      setActiveConversation: (conversationId) => {
        set({ activeConversationId: conversationId });
      },
      
      // Method to fetch conversations
      fetchConversations: async () => {
        const { isAuthenticated, userId, fetchingConversations } = get();
        if (!isAuthenticated || !userId || fetchingConversations) return;

        try {
          // Set fetchingConversations to true, but don't change isLoading 
          // to avoid triggering unnecessary re-renders in PageWrapper
          set({ fetchingConversations: true, error: null });
          
          const response = await fetch('/api/conversations');
          if (!response.ok) {
            throw new Error('Failed to fetch conversations');
          }
          const data = await response.json();
          
          // First, check if we're still in the same auth state before updating
          const currentUserId = get().userId;
          if (currentUserId !== userId) {
            console.log('User changed during fetch, discarding results');
            return;
          }
          
          set({ conversations: data.conversations || [] });
        } catch (error) {
          console.error('Error fetching conversations:', error);
          set({ error: 'Failed to load conversations' });
        } finally {
          set({ fetchingConversations: false });
        }
      },
      
      createNewConversation: async (firstMessageContent?: string, firstAssistantContent?: string) => {
        const { isAuthenticated, userId, resetState, fetchConversations, updateConversationTitleInState, addChatMessage, addConversationItem, setPreviousResponseId } = get();
        // Reset previousResponseId for a new conversation
        setPreviousResponseId(null);

        if (!isAuthenticated || !userId) {
          console.log('Creating local conversation only (not authenticated)');
          resetState(); // Reset chat state for local session
          return null;
        }

        try {
          set({ isLoading: true, error: null });

          // 1. Create conversation with a placeholder title
          const placeholderTitle = "Generating title...";
          const createResponse = await fetch('/api/conversations', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              title: placeholderTitle, // Use placeholder
            }),
          });

          if (!createResponse.ok) {
            const errorData = await createResponse.json();
            throw new Error(errorData.error || 'Failed to create conversation');
          }

          const { conversation } = await createResponse.json();
          const newConversationId = conversation.id;
          console.log('Created new conversation with placeholder title:', newConversationId);

          // 2. Reset chat state and set the new conversation as active
          set({
            activeConversationId: newConversationId,
            chatMessages: [
              {
                type: "message",
                role: "assistant",
                content: [{ type: "output_text", text: INITIAL_MESSAGE }],
              },
            ],
            conversationItems: [],
            isLoading: false, // Set loading false after initial creation
          });

          // 2b. Add the first user and assistant messages if provided
          if (firstMessageContent) {
            // Pass newConversationId as override
            await addChatMessage({
              type: 'message',
              role: 'user',
              content: [{ type: 'input_text', text: firstMessageContent }],
            }, false, newConversationId);
            // Also add to conversationItems for API context
            await addConversationItem({ role: 'user', content: firstMessageContent });
          }
          if (firstAssistantContent) {
            // Pass newConversationId as override
            await addChatMessage({
              type: 'message',
              role: 'assistant',
              content: [{ type: 'output_text', text: firstAssistantContent }],
            }, false, newConversationId);
            // Also add to conversationItems for API context
            await addConversationItem({ role: 'assistant', content: firstAssistantContent });
          }

          // 3. Fetch updated conversation list to include the new one with placeholder
          // Use setTimeout to avoid re-render cascade
          setTimeout(() => {
            fetchConversations();
          }, 0);

          // 4. Asynchronously generate and update the title if first message exists
          if (firstMessageContent) {
            // Don't block the UI, run this in the background
            (async () => {
              try {
                console.log(`Generating title for ${newConversationId}...`);
                const titleResponse = await fetch('/api/generate-title', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ messageContent: firstMessageContent }),
                });

                if (!titleResponse.ok) {
                  console.error('Failed to generate title:', await titleResponse.text());
                  // Keep placeholder title if generation fails
                  return;
                }

                const { title: generatedTitle } = await titleResponse.json();
                console.log(`Generated title for ${newConversationId}: "${generatedTitle}"`);

                // 5. Update the conversation title in the database
                const updateResponse = await fetch(`/api/conversations/${newConversationId}`, {
                  method: 'PATCH',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ title: generatedTitle }),
                });

                if (!updateResponse.ok) {
                  console.error('Failed to update conversation title in DB:', await updateResponse.text());
                  return; // Title generated but failed to save, keep placeholder
                }

                console.log(`Successfully updated title for ${newConversationId} in DB.`);

                // 6. Update the title in the local state for immediate UI reflection
                updateConversationTitleInState(newConversationId, generatedTitle);

              } catch (err) {
                console.error(`Error during background title generation/update for ${newConversationId}:`, err);
                // Handle errors silently in the background, keeping the placeholder
              }
            })();
          }

          return newConversationId;
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Failed to create conversation';
          console.error('Error creating conversation:', errorMessage);
          set({ error: errorMessage, isLoading: false });
          return null;
        } 
      },
      
      // Helper function to update title in local state
      updateConversationTitleInState: (conversationId, title) => {
        set((state) => ({
          conversations: state.conversations.map((conv) =>
            conv.id === conversationId ? { ...conv, title: title, updated_at: new Date().toISOString() } : conv
          ),
        }));
      },
      
      loadConversation: async (conversationId) => {
        try {
          set({ isLoading: true, error: null });
          
          const response = await fetch(`/api/conversations/${conversationId}`);
          
          if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || 'Failed to load conversation');
          }
          
          const { conversation, messages } = await response.json();
          
          // Process messages to convert them into the format expected by the chat component
          const processedChatMessages: Item[] = [];
          const processedConversationItems: any[] = [];
          
          // Add initial assistant message
          processedChatMessages.push({
            type: "message",
            role: "assistant",
            content: [{ type: "output_text", text: INITIAL_MESSAGE }],
          });
          
          messages.forEach((message: any) => {
            try {
              if (message.role === 'user') {
                let userContent;
                // Try to parse JSON content if it's a string that looks like JSON
                try {
                  if (typeof message.message_content === 'string' && 
                      (message.message_content.startsWith('{') || message.message_content.startsWith('['))) {
                    userContent = JSON.parse(message.message_content);
                  } else {
                    userContent = message.message_content;
                  }
                } catch {
                  userContent = message.message_content;
                }
                
                // Add user message
                processedChatMessages.push({
                  type: "message",
                  role: "user",
                  content: [{ type: "input_text", text: userContent }],
                });
                
                processedConversationItems.push({
                  role: "user",
                  content: userContent,
                });
              } else if (message.role === 'assistant') {
                // For assistant messages, try to parse the content as JSON first
                try {
                  let assistantContent;
                  
                  // If message_content is a string that looks like JSON, parse it
                  if (typeof message.message_content === 'string' && 
                      (message.message_content.startsWith('{') || message.message_content.startsWith('['))) {
                    assistantContent = JSON.parse(message.message_content);
                    
                    // If it's a properly formatted content array, use it directly
                    if (Array.isArray(assistantContent) && 
                        assistantContent.length > 0 && 
                        assistantContent[0].type === 'output_text') {
                      processedChatMessages.push({
                        type: "message",
                        role: "assistant",
                        content: assistantContent,
                      });
                      
                      processedConversationItems.push({
                        role: "assistant",
                        content: assistantContent,
                      });
                      return; // Skip the rest of this iteration
                    }
                  } else {
                    assistantContent = message.message_content;
                  }
                  
                  // Fallback if JSON parsing failed or content isn't in expected format
                  processedChatMessages.push({
                    type: "message",
                    role: "assistant",
                    content: [{ type: "output_text", text: message.message_content }],
                  });
                  
                  processedConversationItems.push({
                    role: "assistant",
                    content: [
                      {
                        type: "output_text",
                        text: message.message_content,
                      },
                    ],
                  });
                } catch (error) {
                  // If JSON parsing fails, use the raw content as a string
                  processedChatMessages.push({
                    type: "message",
                    role: "assistant",
                    content: [{ type: "output_text", text: message.message_content }],
                  });
                  
                  processedConversationItems.push({
                    role: "assistant",
                    content: [
                      {
                        type: "output_text",
                        text: message.message_content,
                      },
                    ],
                  });
                }
              }
            } catch (parseError) {
              console.error('Error processing message:', parseError);
              // If parsing fails completely, create a basic message with the raw content
              if (message.role === 'user') {
                processedChatMessages.push({
                  type: "message",
                  role: "user",
                  content: [{ type: "input_text", text: String(message.message_content) }],
                });
                
                processedConversationItems.push({
                  role: "user",
                  content: String(message.message_content),
                });
              } else if (message.role === 'assistant') {
                processedChatMessages.push({
                  type: "message",
                  role: "assistant",
                  content: [{ type: "output_text", text: String(message.message_content) }],
                });
                
                processedConversationItems.push({
                  role: "assistant",
                  content: [
                    {
                      type: "output_text",
                      text: String(message.message_content),
                    },
                  ],
                });
              }
            }
          });
          
          set({
            activeConversationId: conversation.id,
            chatMessages: processedChatMessages,
            conversationItems: processedConversationItems,
            previousResponseId: null,
          });
          
          return true;
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Failed to load conversation';
          console.error('Error loading conversation:', errorMessage);
          set({ error: errorMessage });
          return false;
        } finally {
          set({ isLoading: false });
        }
      },
      
      // Messages management
      setChatMessages: (items) => set({ chatMessages: items }),
      
      setConversationItems: (messages) => set({ conversationItems: messages }),
      
      addChatMessage: async (item, skipAddToChat = false, conversationIdOverride?: string) => {
        const { activeConversationId, isAuthenticated, userId, chatMessages, conversations, updateConversationTitleInState } = get();
        
        // Update local state immediately if not skipped
        if (!skipAddToChat) {
          set((state) => ({ chatMessages: [...state.chatMessages, item] }));
        }

        // Determine which conversation ID to use for saving
        const conversationIdToUse = conversationIdOverride ?? activeConversationId;
        
        // If authenticated and has a valid conversation ID, save to database
        if (isAuthenticated && userId && conversationIdToUse) {
          try {
            // Extract the text content from the message
            let messageContent = '';
            let role = '';
            
            // Check if it's a MessageItem since only MessageItems have role property
            if (item.type === 'message') {
              const messageItem = item as MessageItem;
              role = messageItem.role;
              
              if (Array.isArray(messageItem.content) && messageItem.content.length > 0) {
                // For user messages, get the text from input_text
                if (messageItem.role === 'user' && messageItem.content[0].type === 'input_text') {
                  messageContent = messageItem.content[0].text || '';
                  
                  // Check if this is the first user message in a conversation with a placeholder title
                  // Use conversationIdToUse here for consistency
                  const currentConversation = conversations.find((conv) => conv.id === conversationIdToUse);
                  if (currentConversation && currentConversation.title === "Generating title..." && chatMessages.filter(m => m.type === 'message').length <= 2) { 
                    // This is the first message in a conversation created with the Plus button or quick chat
                    // Trigger title generation
                    console.log(`Generating title for conversation ${conversationIdToUse} after first message...`);
                    
                    // Generate title asynchronously in the background
                    (async () => {
                      try {
                        const titleResponse = await fetch('/api/generate-title', {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({ messageContent: messageContent }),
                        });

                        if (!titleResponse.ok) {
                          console.error('Failed to generate title:', await titleResponse.text());
                          return;
                        }

                        const { title: generatedTitle } = await titleResponse.json();
                        console.log(`Generated title for ${conversationIdToUse}: "${generatedTitle}"`);

                        // Update the conversation title in the database
                        const updateResponse = await fetch(`/api/conversations/${conversationIdToUse}`, {
                          method: 'PATCH',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({ title: generatedTitle }),
                        });

                        if (!updateResponse.ok) {
                          console.error('Failed to update conversation title in DB:', await updateResponse.text());
                          return;
                        }

                        console.log(`Successfully updated title for ${conversationIdToUse} in DB.`);

                        // Update the title in the local state for immediate UI reflection
                        updateConversationTitleInState(conversationIdToUse, generatedTitle);
                      } catch (err) {
                        console.error(`Error during title generation/update for ${conversationIdToUse}:`, err);
                      }
                    })();
                  }
                } 
                // For assistant messages, get the text from output_text
                else if (messageItem.role === 'assistant' && messageItem.content[0].type === 'output_text') {
                  // Store the entire content object for assistant messages to preserve formatting and annotations
                  // If the content is already a string (from GradCapAssistant), use it directly
                  if (typeof messageItem.content[0].text === 'string') {
                      messageContent = messageItem.content[0].text;
                  } else {
                      messageContent = JSON.stringify(messageItem.content); 
                  }           
                }
              }
            }
            
            if (!messageContent || !role) return;
            
            // Save message to the database using conversationIdToUse
            const response = await fetch(`/api/conversations/${conversationIdToUse}/messages`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                message_content: messageContent,
                role: role,
              }),
            });
            
            if (response.ok) {
              console.log(`Message saved to DB for conversation ${conversationIdToUse}`);
              // Only upsert vector store file when assistant message is finalized
              if (role === 'assistant') {
                try {
                  await vectorStoreClient.upsertConversationFile(conversationIdToUse);
                } catch (err) {
                  console.error("Error upserting conversation file in vector store:", err);
                }
              }
            } else {
              const errorData = await response.json();
              console.error('Error saving message:', errorData.error);
            }
          } catch (error) {
            console.error('Error saving message to database:', error);
          }
        } else {
          // Updated log message for clarity
          console.log(`Message not saved to database (isAuthenticated: ${isAuthenticated}, userId: ${userId}, conversationIdToUse: ${conversationIdToUse})`);
        }
      },
      
      addConversationItem: async (message) => {
        // Append conversation item only if it's not a duplicate of the last one
        set((state) => {
          const items = state.conversationItems;
          const last = items[items.length - 1];
          try {
            if (last && JSON.stringify(last) === JSON.stringify(message)) {
              // Duplicate detected, skip adding
              return {};
            }
          } catch {
            // If comparison fails, proceed to add
          }
          return { conversationItems: [...items, message] };
        });
      },
      
      // New function to send user message and trigger processing
      sendUserMessage: async (message: string) => {
        const { addChatMessage, addConversationItem } = get();
        
        if (!message.trim()) return; // Don't send empty messages
        
        // Create the user message item for the UI
        const userMessageItem: MessageItem = {
          type: "message",
          role: "user",
          content: [{ type: "input_text", text: message }],
        };
        
        // Add to UI and DB
        await addChatMessage(userMessageItem); 
        
        // Add to conversation context for API call
        const conversationItem: ChatCompletionMessageParam = {
          role: "user",
          content: message, // API expects just the string content here
        };
        await addConversationItem(conversationItem);
        
        // Trigger the API call and processing
        processMessages();
      },
      
      // State management
      setLoading: (isLoading) => set({ isLoading }),
      
      setError: (error) => set({ error }),
      
      resetState: () => set({
        activeConversationId: null,
        chatMessages: [
          {
            type: "message",
            role: "assistant",
            content: [{ type: "output_text", text: INITIAL_MESSAGE }],
          },
        ],
        conversationItems: [],
        error: null,
        previousResponseId: null,
        // Don't reset conversations list on resetState, only on sign out
      }),
      
      rawSet: set,

      setPreviousResponseId: (id: string | null) => set({ previousResponseId: id }),
    }),
    {
      name: 'conversation-store',
      partialize: (state) => ({
        // Persist auth flags and essential conversation state
        isAuthenticated: state.isAuthenticated,
        userId: state.userId,
        // Persist the active conversation ID so it stays selected
        activeConversationId: state.activeConversationId,
        // Persist the fetched conversations list
        conversations: state.conversations,
        chatMessages: state.chatMessages,
        conversationItems: state.conversationItems,
        previousResponseId: state.previousResponseId,
      }),
    }
  )
);

// Remove the automatic subscribe handler that was causing cascading renders
// useConversationStore.subscribe((state, prevState) => {
//   if (state.isAuthenticated && !prevState.isAuthenticated && state.userId) {
//     console.log("User authenticated, fetching initial conversations...");
//     state.fetchConversations();
//   }
// });

export default useConversationStore;
