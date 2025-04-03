'use client';

import { useEffect, useRef } from 'react';
import { useAuth } from '@/app/components/auth/AuthContext';
import useRecommendationsStore from '@/stores/useRecommendationsStore';
import useProfileStore from '@/stores/useProfileStore';
import useToolsStore from '@/stores/useToolsStore';
import useConversationStore from '@/stores/useConversationStore';

/**
 * Component that synchronizes Zustand stores with the central AuthContext state.
 * It reacts to changes in user authentication, profile, and vector store ID from AuthContext.
 */
export default function AuthSynchronizer() {
  // Get state from AuthContext
  const { user, profile, vectorStoreId: authVectorStoreId, loading: authLoading } = useAuth();

  // Get actions and states from Zustand stores
  const {
    setAuthState: setRecAuthState,
    syncWithSupabase: syncRecsWithSupabase,
    clearStore: clearRecommendationsStore,
    hydrated: recStoreHydrated
  } = useRecommendationsStore();

  const {
    clearStore: clearProfileStore,
    hydrated: profileStoreHydrated,
    setVectorStoreId: setProfileVectorStoreId,
    setProfileData: setProfileStoreData
  } = useProfileStore();

  // Get Tools Store state
  const {
    setVectorStore,
    vectorStore
  } = useToolsStore();

  const {
    setAuthState: setConvAuthState,
    resetState: clearConversationState,
    hydrated: conversationStoreHydrated,
    fetchConversations,
    resetState: resetConversationState
  } = useConversationStore();

  // Track previous user state to detect login/logout transitions
  const prevUserRef = useRef(user);
  const prevAuthVectorStoreIdRef = useRef(authVectorStoreId);

  // Effect to handle User Login/Logout Transitions
  useEffect(() => {
    // Only proceed if auth is no longer loading
    if (authLoading) return;

    const currentUser = user;
    const previousUser = prevUserRef.current;

    // User Logged In
    if (currentUser && !previousUser) {
      // Set auth state in stores
      setRecAuthState(true, currentUser.id);
      setConvAuthState(true, currentUser.id);

      // Trigger data fetching/syncing for the logged-in user
      syncRecsWithSupabase(currentUser.id).catch(e => console.error("Rec sync error on login:", e));
      fetchConversations().catch(e => console.error("Conversation fetch error on login:", e));
    }
    // User Logged Out
    else if (!currentUser && previousUser) {
      // Set auth state to false in stores
      setRecAuthState(false, null);
      setConvAuthState(false, null);

      // Clear user-specific data from stores
      clearRecommendationsStore();
      clearProfileStore();
      clearConversationState();

      // Reset conversation state to initial message for guest view
      resetConversationState();
    }
    // No user session - ensure stores are in logged-out state
    else if (!currentUser && !previousUser && !authLoading) {
      setRecAuthState(false, null);
      setConvAuthState(false, null);
    }

    // Update previous user reference
    prevUserRef.current = currentUser;
  }, [user, authLoading, setRecAuthState, setConvAuthState, syncRecsWithSupabase, fetchConversations, clearRecommendationsStore, clearProfileStore, clearConversationState, resetConversationState]);

  // Effect to Sync Vector Store ID
  useEffect(() => {
    // Only proceed if auth is no longer loading
    if (authLoading) return;

    const currentVectorStoreId = authVectorStoreId;
    const previousVectorStoreId = prevAuthVectorStoreIdRef.current;

    // Only sync if the ID exists and has changed or wasn't set before
    if (currentVectorStoreId && currentVectorStoreId !== previousVectorStoreId) {
      // Update Profile Store
      setProfileVectorStoreId(currentVectorStoreId);
    } else if (!currentVectorStoreId && previousVectorStoreId) {
      // Clear vector store ID in relevant stores
      setProfileVectorStoreId(null);
    }

    // Update previous vector store ID reference
    prevAuthVectorStoreIdRef.current = currentVectorStoreId;
  }, [authVectorStoreId, authLoading, setProfileVectorStoreId]);

  // This component doesn't render anything visible
  return null;
} 