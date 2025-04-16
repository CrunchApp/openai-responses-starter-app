'use client';

import React, { useEffect, useState } from 'react';
import useConversationStore from '@/stores/useConversationStore';
import { Plus, MessageCircle, Trash2, Search, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

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

  // Add search functionality
  const [searchTerm, setSearchTerm] = useState('');
  const [isSearching, setIsSearching] = useState(false);

  // Filter conversations based on search term
  const filteredConversations = conversations.filter(conversation => 
    conversation.title.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleClearSearch = () => {
    setSearchTerm('');
    setIsSearching(false);
  };

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setSearchTerm(value);
    setIsSearching(value.length > 0);
  };

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
      // Reset search if active
      if (isSearching) {
        handleClearSearch();
      }
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
      <motion.div 
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="rounded-lg bg-gradient-to-r from-primary/5 to-blue-500/5 p-5 border border-primary/10 shadow-sm"
      >
        <h3 className="text-md font-medium text-foreground mb-2">Conversations</h3>
        <p className="text-sm text-muted-foreground">
          Sign in to save your conversations and access them later.
        </p>
        <Button 
          variant="outline"
          size="sm" 
          className="mt-3 w-full bg-white/50 hover:bg-white/80 border-primary/10 text-primary hover:text-primary/80 shadow-sm"
          onClick={() => window.location.href = '/auth/login'}
        >
          Sign in
        </Button>
      </motion.div>
    );
  }

  return (
    <motion.div 
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="conversation-selector p-5 bg-white/70 backdrop-blur-sm rounded-lg shadow-sm border border-primary/10"
    >
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-md font-semibold text-foreground">Your Conversations</h3>
        <Button
          variant="ghost"
          size="icon"
          onClick={handleNewConversation}
          className="p-1.5 rounded-full text-primary hover:text-primary hover:bg-primary/10 transition-colors"
          title="New conversation"
        >
          <Plus size={18} />
        </Button>
      </div>

      <div className="relative mb-3">
        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground/70" />
        <Input 
          placeholder="Search conversations..." 
          className="pl-9 bg-white/50 border-primary/10 text-sm focus-visible:ring-primary/20"
          value={searchTerm}
          onChange={handleSearchChange}
        />
        {isSearching && (
          <Button
            variant="ghost"
            size="icon"
            onClick={handleClearSearch}
            className="absolute right-2 top-2 h-5 w-5 p-0 text-muted-foreground hover:text-foreground"
          >
            <X size={14} />
          </Button>
        )}
      </div>

      {isLoading && conversations.length === 0 ? (
        <div className="text-center py-8 flex flex-col items-center">
          <div className="animate-spin h-5 w-5 border-2 border-t-transparent border-primary/40 rounded-full mb-2"></div>
          <p className="text-sm text-muted-foreground">Loading conversations...</p>
        </div>
      ) : error ? (
        <div className="text-sm text-red-500 py-3 px-3 bg-red-50 rounded-lg border border-red-200 mt-2">
          <p className="font-medium">Error loading conversations</p>
          <p className="text-xs mt-1">{error}</p>
        </div>
      ) : conversations.length === 0 ? (
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-center py-8 px-3 border border-dashed border-primary/10 rounded-lg bg-primary/5"
        >
          <MessageCircle className="h-8 w-8 text-primary/30 mx-auto mb-2" />
          <p className="text-sm font-medium text-foreground mb-1">No conversations yet</p>
          <p className="text-xs text-muted-foreground mb-3">Start a new conversation to get help with your education journey</p>
          <Button
            variant="outline"
            size="sm"
            onClick={handleNewConversation}
            className="bg-white border-primary/20 text-primary hover:bg-primary/5"
          >
            <Plus size={14} className="mr-1" /> New conversation
          </Button>
        </motion.div>
      ) : filteredConversations.length === 0 ? (
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-center py-6 px-3 border border-dashed border-primary/10 rounded-lg bg-primary/5"
        >
          <Search className="h-6 w-6 text-primary/30 mx-auto mb-2" />
          <p className="text-sm font-medium text-foreground mb-1">No matching conversations</p>
          <p className="text-xs text-muted-foreground mb-3">Try a different search term or clear your search</p>
          <Button
            variant="outline"
            size="sm"
            onClick={handleClearSearch}
            className="bg-white border-primary/20 text-primary hover:bg-primary/5"
          >
            Clear search
          </Button>
        </motion.div>
      ) : (
        <div className="space-y-1.5 max-h-60 overflow-y-auto pr-1 border-t border-primary/5 pt-3">
          <AnimatePresence>
            {filteredConversations.map((conversation) => (
              <motion.div
                key={conversation.id}
                initial={{ opacity: 0, y: 5 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -5 }}
                transition={{ duration: 0.3 }}
                onClick={() => handleSelectConversation(conversation.id)}
                className={`
                  flex items-center justify-between p-2.5 rounded-lg text-sm cursor-pointer transition-all duration-200 
                  group
                  ${conversation.id === activeConversationId
                    ? 'bg-gradient-to-r from-primary/10 to-primary/5 text-primary font-medium'
                    : 'text-foreground hover:bg-primary/5'
                  }
                `}
              >
                <div className="flex items-center overflow-hidden space-x-2.5">
                  <div className={`
                    p-1.5 rounded-full ${conversation.id === activeConversationId 
                      ? 'bg-primary/20' 
                      : 'bg-primary/10 group-hover:bg-primary/15'
                    } transition-colors
                  `}>
                    <MessageCircle
                      size={14}
                      className={`shrink-0 ${conversation.id === activeConversationId ? 'text-primary' : 'text-primary/50 group-hover:text-primary/70'}`}
                    />
                  </div>
                  <span className="truncate" title={conversation.title}>
                    {/* Add a subtle effect for placeholder title */}
                    {conversation.title === "Generating title..."
                      ? <span className="italic text-muted-foreground">{conversation.title}</span>
                      : conversation.title || 'Untitled Conversation'}
                  </span>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={(e) => handleDeleteConversation(conversation.id, e)}
                  className={`
                    opacity-0 group-hover:opacity-100 p-1 rounded-full text-muted-foreground hover:text-red-500 hover:bg-red-50 transition-all duration-200
                    ${conversation.id === activeConversationId ? 'opacity-100' : ''}
                  `}
                  title="Delete conversation"
                >
                  <Trash2 size={14} />
                </Button>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}
    </motion.div>
  );
} 