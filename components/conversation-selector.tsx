'use client';

import React, { useEffect } from 'react';
import useConversationStore from '@/stores/useConversationStore';
import { Plus, MessageCircle, Trash2 } from 'lucide-react';

// Conversation type already defined in store
// type Conversation = {
//   id: string;
//   title: string;
//   created_at: string;
//   updated_at: string;
// };

export default function ConversationSelector() {
  const {
    isAuthenticated,
    userId,
    activeConversationId,
    setActiveConversation,
    createNewConversation,
    loadConversation,
    conversations, // Get conversations from the store
    fetchConversations, // Get fetch function from the store
    updateConversationTitleInState, // Get update function
    isLoading, // Use isLoading from the store
    error, // Use error from the store
  } = useConversationStore();

  // Removed local state: const [conversations, setConversations] = useState<Conversation[]>([]);
  // Removed local state: const [isLoading, setIsLoading] = useState(false);
  // Removed local state: const [error, setError] = useState<string | null>(null);

  // Load conversations via store hook when component mounts or auth changes
  // The store now handles fetching on auth change
  // useEffect(() => {
  //   if (isAuthenticated && userId) {
  //     fetchConversations();
  //   }
  // }, [isAuthenticated, userId, fetchConversations]);

  const handleSelectConversation = async (conversationId: string) => {
    if (conversationId === activeConversationId) return;

    try {
      await loadConversation(conversationId);
    } catch (error) {
      console.error('Error loading conversation:', error);
      // Error handling is now managed by the store
    }
  };

  const handleNewConversation = async () => {
    try {
      // Call createNewConversation without arguments
      // Title generation is handled when the first message is sent
      const newId = await createNewConversation();
      // The store automatically fetches/updates the list now
      // No need to manually refresh here
      // if (newId) {
      //   fetchConversations(); 
      // }
    } catch (error) {
      console.error('Error creating new conversation:', error);
      // Error handling is now managed by the store
    }
  };

  const handleDeleteConversation = async (conversationId: string, e: React.MouseEvent) => {
    e.stopPropagation();

    if (!confirm('Are you sure you want to delete this conversation?')) return;

    try {
      const response = await fetch(`/api/conversations/${conversationId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to delete conversation');
      }

      // Refresh conversation list from the server after deletion
      await fetchConversations();

      // If the active conversation was deleted, clear it
      if (conversationId === activeConversationId) {
        setActiveConversation(null);
      }
    } catch (error) {
      console.error('Error deleting conversation:', error);
      // Error handling is managed by the store, but we could set a specific error here if needed
    }
  };

  // For non-authenticated users or when loading
  if (!isAuthenticated || !userId) {
    return (
      <div className="rounded-lg bg-blue-50 p-4">
        <h3 className="text-md font-medium text-gray-800 mb-2">Conversations</h3>
        <p className="text-sm text-gray-600">
          Sign in to save your conversations and access them later.
        </p>
      </div>
    );
  }

  return (
    <div className="conversation-selector p-4 bg-white rounded-lg shadow border border-gray-100">
      <div className="flex justify-between items-center mb-3">
        <h3 className="text-md font-semibold text-gray-800">Conversations History</h3>
        <button
          onClick={handleNewConversation}
          className="p-1.5 text-gray-500 rounded-md hover:bg-gray-100 hover:text-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          title="New conversation"
        >
          <Plus size={18} />
        </button>
      </div>

      {isLoading && conversations.length === 0 ? (
        <div className="text-center py-4">
          <div className="animate-spin h-5 w-5 border-t-2 border-blue-500 rounded-full mx-auto"></div>
        </div>
      ) : error ? (
        <div className="text-sm text-red-500 py-2 px-1 bg-red-50 rounded border border-red-200">Error: {error}</div>
      ) : conversations.length === 0 ? (
        <div className="text-sm text-center text-gray-500 py-4 px-2 border-t border-gray-100">No conversations yet. Start a new one!</div>
      ) : (
        <ul className="space-y-1 max-h-60 overflow-y-auto pr-1 border-t border-gray-100 pt-2">
          {conversations.map((conversation) => (
            <li
              key={conversation.id}
              onClick={() => handleSelectConversation(conversation.id)}
              className={`
                flex items-center justify-between p-2 rounded-md text-sm cursor-pointer transition-colors duration-150 ease-in-out
                group
                ${conversation.id === activeConversationId
                  ? 'bg-blue-100 text-blue-800 font-medium'
                  : 'text-gray-700 hover:bg-gray-50'
                }
              `}
            >
              <div className="flex items-center overflow-hidden space-x-2">
                <MessageCircle
                  size={16}
                  className={`shrink-0 ${conversation.id === activeConversationId ? 'text-blue-600' : 'text-gray-400 group-hover:text-gray-500'}`}
                />
                <span className="truncate" title={conversation.title}>
                  {/* Add a subtle effect for placeholder title */}
                  {conversation.title === "Generating title..."
                    ? <span className="italic text-gray-500">{conversation.title}</span>
                    : conversation.title || 'Untitled Conversation'}
                </span>
              </div>
              <button
                onClick={(e) => handleDeleteConversation(conversation.id, e)}
                className={`
                  text-gray-400 opacity-0 group-hover:opacity-100 hover:text-red-500 p-1 rounded-md transition-opacity duration-150 ease-in-out
                  focus:outline-none focus:ring-1 focus:ring-red-400
                  ${conversation.id === activeConversationId ? 'opacity-100' : ''}
                `}
                title="Delete conversation"
              >
                <Trash2 size={14} />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
} 