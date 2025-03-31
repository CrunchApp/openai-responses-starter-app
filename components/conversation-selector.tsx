'use client';

import React, { useEffect, useState } from 'react';
import useConversationStore from '@/stores/useConversationStore';
import { Plus, MessageCircle, Trash2 } from 'lucide-react';

type Conversation = {
  id: string;
  title: string;
  created_at: string;
  updated_at: string;
};

export default function ConversationSelector() {
  const { 
    isAuthenticated, 
    userId, 
    activeConversationId, 
    setActiveConversation,
    createNewConversation,
    loadConversation
  } = useConversationStore();
  
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load conversations when user is authenticated
  useEffect(() => {
    const fetchConversations = async () => {
      if (!isAuthenticated || !userId) {
        setConversations([]);
        return;
      }
      
      try {
        setIsLoading(true);
        setError(null);
        
        const response = await fetch('/api/conversations');
        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Failed to fetch conversations');
        }
        
        const data = await response.json();
        setConversations(data.conversations || []);
      } catch (error) {
        console.error('Error fetching conversations:', error);
        setError('Failed to load conversations');
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchConversations();
  }, [isAuthenticated, userId]);

  const handleSelectConversation = async (conversationId: string) => {
    if (conversationId === activeConversationId) return;
    
    try {
      await loadConversation(conversationId);
    } catch (error) {
      console.error('Error loading conversation:', error);
    }
  };

  const handleNewConversation = async () => {
    try {
      const newId = await createNewConversation();
      if (newId) {
        // Refresh conversation list
        const response = await fetch('/api/conversations');
        if (response.ok) {
          const data = await response.json();
          setConversations(data.conversations || []);
        }
      }
    } catch (error) {
      console.error('Error creating new conversation:', error);
    }
  };

  const handleDeleteConversation = async (conversationId: string, e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent triggering the select conversation handler
    
    if (!confirm('Are you sure you want to delete this conversation?')) return;
    
    try {
      const response = await fetch(`/api/conversations/${conversationId}`, {
        method: 'DELETE',
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to delete conversation');
      }
      
      // Remove from list
      setConversations(conversations.filter(c => c.id !== conversationId));
      
      // If the active conversation was deleted, create a new one
      if (conversationId === activeConversationId) {
        await createNewConversation();
      }
    } catch (error) {
      console.error('Error deleting conversation:', error);
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
    <div className="conversation-selector">
      <div className="flex justify-between items-center mb-3">
        <h3 className="text-md font-medium text-gray-800">Conversations</h3>
        <button 
          onClick={handleNewConversation}
          className="p-2 text-sm text-blue-600 rounded-full hover:bg-blue-50"
          title="New conversation"
        >
          <Plus size={18} />
        </button>
      </div>
      
      {isLoading ? (
        <div className="text-center py-4">
          <div className="animate-spin h-5 w-5 border-t-2 border-blue-500 rounded-full mx-auto"></div>
        </div>
      ) : error ? (
        <div className="text-sm text-red-500 py-2">{error}</div>
      ) : conversations.length === 0 ? (
        <div className="text-sm text-gray-500 py-2">No conversations yet</div>
      ) : (
        <ul className="space-y-1">
          {conversations.map((conversation) => (
            <li 
              key={conversation.id}
              onClick={() => handleSelectConversation(conversation.id)}
              className={`
                flex items-center justify-between p-2 rounded-lg text-sm cursor-pointer
                ${conversation.id === activeConversationId ? 'bg-blue-100' : 'hover:bg-gray-100'}
              `}
            >
              <div className="flex items-center overflow-hidden">
                <MessageCircle size={16} className="mr-2 shrink-0 text-gray-500" />
                <span className="truncate">
                  {conversation.title || 'New Conversation'}
                </span>
              </div>
              <button 
                onClick={(e) => handleDeleteConversation(conversation.id, e)}
                className="text-gray-400 hover:text-red-500 p-1"
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