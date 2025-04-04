'use client';

import { useEffect, useRef, useState } from 'react';
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
  
  // Add state to track syncing status to prevent redundant operations
  const [isSyncing, setIsSyncing] = useState(false);
  // Track if we've already marked stores as hydrated
  const [hydratedStores, setHydratedStores] = useState(false);

  // Get actions and states from Zustand stores
  const {
    setAuthState: setRecAuthState,
    syncWithSupabase: syncRecsWithSupabase,
    clearStore: clearRecommendationsStore,
    hydrated: recStoreHydrated,
    setHydrated: setRecHydrated
  } = useRecommendationsStore();

  const {
    clearStore: clearProfileStore,
    hydrated: profileStoreHydrated,
    setVectorStoreId: setProfileVectorStoreId,
    setProfileData: setProfileStoreData,
    setHydrated: setProfileHydrated
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
    resetState: resetConversationState,
    isLoading: conversationLoading
  } = useConversationStore();

  // Ensure stores are properly marked as hydrated
  useEffect(() => {
    if (hydratedStores) return;
    
    // Mark all stores as hydrated to avoid unnecessary loading screens
    if (!profileStoreHydrated) {
      setProfileHydrated(true);
    }
    
    if (!recStoreHydrated) {
      setRecHydrated(true);
    }
    
    // Note: Conversation store doesn't have setHydrated, it initializes as hydrated=true
    
    setHydratedStores(true);
    console.log('[AuthSynchronizer] Marked all stores as hydrated');
  }, [
    profileStoreHydrated, 
    recStoreHydrated, 
    conversationStoreHydrated, 
    setProfileHydrated, 
    setRecHydrated,
    hydratedStores
  ]);

  // Track previous user state to detect login/logout transitions
  const prevUserRef = useRef(user);
  const prevAuthVectorStoreIdRef = useRef(authVectorStoreId);

  // Effect to handle User Login/Logout Transitions
  useEffect(() => {
    // Only proceed if auth is no longer loading and we're not already syncing
    if (authLoading || isSyncing) return;

    const currentUser = user;
    const previousUser = prevUserRef.current;
    
    // Only take action if there's an actual change
    if (
      (currentUser?.id === previousUser?.id) && 
      ((!currentUser && !previousUser) || (currentUser && previousUser))
    ) {
      return;
    }

    // Mark that we're starting a sync operation
    setIsSyncing(true);

    const syncStores = async () => {
      try {
        // User Logged In
        if (currentUser && !previousUser) {
          console.log(`[AuthSynchronizer] User logged in: ${currentUser.id}`);
          
          // Set auth state in stores
          setRecAuthState(true, currentUser.id);
          setConvAuthState(true, currentUser.id);

          // Trigger data fetching/syncing for the logged-in user
          try {
            await syncRecsWithSupabase(currentUser.id);
          } catch (e) {
            console.error("Rec sync error on login:", e);
          }
          
          try {
            await fetchConversations();
          } catch (e) {
            console.error("Conversation fetch error on login:", e);
          }
        }
        // User Logged Out
        else if (!currentUser && previousUser) {
          console.log(`[AuthSynchronizer] User logged out`);
          
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
      } catch (error) {
        console.error("[AuthSynchronizer] Error synchronizing stores:", error);
      } finally {
        // Update previous user reference and end syncing
        prevUserRef.current = currentUser;
        setIsSyncing(false);
      }
    };

    syncStores();
  }, [
    user, 
    authLoading, 
    isSyncing,
    setRecAuthState, 
    setConvAuthState, 
    syncRecsWithSupabase, 
    fetchConversations, 
    clearRecommendationsStore, 
    clearProfileStore, 
    clearConversationState, 
    resetConversationState
  ]);

  // Effect to Sync Vector Store ID
  useEffect(() => {
    // Only proceed if auth is no longer loading
    if (authLoading || isSyncing) return;

    const currentVectorStoreId = authVectorStoreId;
    const previousVectorStoreId = prevAuthVectorStoreIdRef.current;

    // Skip if no change
    if (currentVectorStoreId === previousVectorStoreId) return;

    try {
      // Only sync if the ID exists and has changed or wasn't set before
      if (currentVectorStoreId && currentVectorStoreId !== previousVectorStoreId) {
        console.log(`[AuthSynchronizer] Updating vector store ID: ${currentVectorStoreId}`);
        
        // Update Profile Store
        setProfileVectorStoreId(currentVectorStoreId);
        
        // Update Tools Store if user is present
        if (user) {
          setVectorStore({
            id: currentVectorStoreId,
            name: `${profile?.first_name || 'User'}'s Vector Store`
          });
        }
      } else if (!currentVectorStoreId && previousVectorStoreId) {
        console.log(`[AuthSynchronizer] Clearing vector store ID`);
        
        // Clear vector store ID in relevant stores
        setProfileVectorStoreId(null);
        setVectorStore({
          id: '',
          name: 'No Vector Store'
        });
      }
    } catch (error) {
      console.error("[AuthSynchronizer] Error updating vector store:", error);
    } finally {
      // Update previous vector store ID reference
      prevAuthVectorStoreIdRef.current = currentVectorStoreId;
    }
  }, [
    authVectorStoreId, 
    authLoading,
    isSyncing,
    user,
    profile,
    setProfileVectorStoreId,
    setVectorStore
  ]);

  // This component doesn't render anything visible
  return null;
} 