import { create } from "zustand";
import { Item, MessageItem } from "@/lib/assistant";
import { ChatCompletionMessageParam } from "openai/resources/chat/completions";
import { INITIAL_MESSAGE } from "@/config/constants";

interface ConversationState {
  // Authentication and conversation state
  isAuthenticated: boolean;
  userId: string | null;
  activeConversationId: string | null;
  isLoading: boolean;
  error: string | null;
  
  // Items displayed in the chat
  chatMessages: Item[];
  // Items sent to the Responses API
  conversationItems: any[];

  // Auth management
  setAuthState: (isAuthenticated: boolean, userId: string | null) => void;
  
  // Conversation management
  setActiveConversation: (conversationId: string | null) => void;
  createNewConversation: () => Promise<string | null>;
  loadConversation: (conversationId: string) => Promise<boolean>;
  
  // Messages management
  setChatMessages: (items: Item[]) => void;
  setConversationItems: (messages: any[]) => void;
  addChatMessage: (item: Item) => Promise<void>;
  addConversationItem: (message: ChatCompletionMessageParam) => Promise<void>;
  
  // State management
  setLoading: (isLoading: boolean) => void;
  setError: (error: string | null) => void;
  resetState: () => void;
  rawSet: (state: any) => void;
}

const useConversationStore = create<ConversationState>((set, get) => ({
  // Initial state
  isAuthenticated: false,
  userId: null,
  activeConversationId: null,
  isLoading: false,
  error: null,
  
  chatMessages: [
    {
      type: "message",
      role: "assistant",
      content: [{ type: "output_text", text: INITIAL_MESSAGE }],
    },
  ],
  conversationItems: [],
  
  // Auth management
  setAuthState: (isAuthenticated, userId) => 
    set({ isAuthenticated, userId }),
  
  // Conversation management
  setActiveConversation: (conversationId) => 
    set({ activeConversationId: conversationId }),
  
  createNewConversation: async () => {
    const { isAuthenticated, userId } = get();
    
    if (!isAuthenticated || !userId) {
      console.log('Creating local conversation only (not authenticated)');
      // For unauthenticated users, just reset the state without creating a DB record
      get().resetState();
      return null;
    }
    
    try {
      set({ isLoading: true, error: null });
      
      const response = await fetch('/api/conversations', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          title: 'New Conversation',
        }),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to create conversation');
      }
      
      const { conversation } = await response.json();
      console.log('Created new conversation:', conversation.id);
      
      // Reset chat state and set the new conversation as active
      set({
        activeConversationId: conversation.id,
        chatMessages: [
          {
            type: "message",
            role: "assistant",
            content: [{ type: "output_text", text: INITIAL_MESSAGE }],
          },
        ],
        conversationItems: [],
      });
      
      return conversation.id;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to create conversation';
      console.error('Error creating conversation:', errorMessage);
      set({ error: errorMessage });
      return null;
    } finally {
      set({ isLoading: false });
    }
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
  
  addChatMessage: async (item) => {
    const { activeConversationId, isAuthenticated, userId, chatMessages } = get();
    
    // Update local state immediately
    set((state) => ({ chatMessages: [...state.chatMessages, item] }));
    
    // If authenticated and has active conversation, save to database
    if (isAuthenticated && userId && activeConversationId) {
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
            } 
            // For assistant messages, get the text from output_text
            else if (messageItem.role === 'assistant' && messageItem.content[0].type === 'output_text') {
              // Store the entire content object for assistant messages to preserve formatting and annotations
              messageContent = JSON.stringify(messageItem.content);
            }
          }
        }
        
        if (!messageContent || !role) return;
        
        // Save message to the database
        const response = await fetch(`/api/conversations/${activeConversationId}/messages`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            message_content: messageContent,
            role: role,
          }),
        });
        
        if (!response.ok) {
          const errorData = await response.json();
          console.error('Error saving message:', errorData.error);
        }
      } catch (error) {
        console.error('Error saving message to database:', error);
      }
    } else {
      console.log('Message not saved to database (not authenticated or no active conversation)');
    }
  },
  
  addConversationItem: async (message) => {
    // Just update local state, no database interactions for conversation items
    set((state) => ({
      conversationItems: [...state.conversationItems, message],
    }));
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
  }),
  
  rawSet: set,
}));

export default useConversationStore;
