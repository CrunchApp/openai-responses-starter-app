'use client';

import { useEffect, useRef, useState } from 'react';
import { useAuth } from '@/app/components/auth/AuthContext';
import usePathwayStore from '@/stores/usePathwayStore';
import useProfileStore from '@/stores/useProfileStore';
import useToolsStore from '@/stores/useToolsStore';
import useConversationStore from '@/stores/useConversationStore';

/**
 * Component that synchronizes Zustand stores with the central AuthContext state.
 * It reacts to changes in user authentication, profile, and vector store ID from AuthContext.
 */
export default function AuthSynchronizer() {
  // Get state from AuthContext
  const { user, profile, vectorStoreId: authVectorStoreId, loading: authLoading, error: authError } = useAuth();
  
  // Add state to track syncing status to prevent redundant operations
  const [isSyncing, setIsSyncing] = useState(false);

  // Get actions and states from Zustand stores
  const {
    setAuthState: setPathwayAuthState,
    clearStore: clearPathwayStore,
    syncWithSupabase: syncPathwaysWithSupabase
  } = usePathwayStore();

  const {
    clearStore: clearProfileStore,
    setVectorStoreId: setProfileVectorStoreId,
  } = useProfileStore();

  // Get Tools Store state
  const {
    setVectorStore
  } = useToolsStore();

  const {
    setAuthState: setConvAuthState,
    resetState: clearConversationState,
  } = useConversationStore();

  // Track previous user state to detect login/logout transitions
  const prevUserRef = useRef(user);
  const prevAuthVectorStoreIdRef = useRef(authVectorStoreId);

  // Effect to handle User Login/Logout Transitions
  useEffect(() => {
    if (authLoading || isSyncing) return;

    const currentUser = user;
    const previousUser = prevUserRef.current;
    
    const userIdChanged = currentUser?.id !== previousUser?.id;
    const loginStatusChanged = !!currentUser !== !!previousUser;

    if (!userIdChanged && !loginStatusChanged) {
      return; // No relevant change
    }

    setIsSyncing(true);

    const syncStores = async () => {
      try {
        // User Logged In or Changed
        if (currentUser && (userIdChanged || loginStatusChanged)) {
          console.log(`[AuthSynchronizer] User logged in or changed: ${currentUser.id}`);
          setPathwayAuthState(true, currentUser.id);
          setConvAuthState(true, currentUser.id);
          
          try {
            // Sync pathways only if the user ID actually changed or they logged in
            if (userIdChanged || loginStatusChanged) {
                await syncPathwaysWithSupabase(currentUser.id);
            }
          } catch (e) {
            console.error("Pathway sync error on login/change:", e);
          }
        }
        // User Logged Out
        else if (!currentUser && previousUser) {
          console.log(`[AuthSynchronizer] User logged out`);
          setPathwayAuthState(false, null);
          setConvAuthState(false, null);

          clearPathwayStore();
          clearProfileStore();
          clearConversationState(); 
        }
        // Initial Load or No Change (after loading finishes)
        else if (!authLoading) {
           // Ensure auth state reflects reality even if no major transition occurred
           setPathwayAuthState(!!currentUser, currentUser?.id || null);
           setConvAuthState(!!currentUser, currentUser?.id || null);
        }

        if (authError) {
           console.error("[AuthSynchronizer] Auth Error:", authError);
        }
      } catch (error) {
        console.error("[AuthSynchronizer] Error synchronizing stores on auth change:", error);
      } finally {
        prevUserRef.current = currentUser;
        setIsSyncing(false);
      }
    };

    syncStores();
  }, [
    user, 
    authLoading, 
    isSyncing,
    setPathwayAuthState,
    setConvAuthState,
    syncPathwaysWithSupabase,
    clearPathwayStore,
    clearProfileStore, 
    clearConversationState, 
    authError
  ]);

  // Effect to Sync Vector Store ID
  useEffect(() => {
    if (authLoading || isSyncing) return;

    const currentVectorStoreId = authVectorStoreId;
    const previousVectorStoreId = prevAuthVectorStoreIdRef.current;

    if (currentVectorStoreId === previousVectorStoreId) return;

    setIsSyncing(true); 
    try {
      if (currentVectorStoreId && currentVectorStoreId !== previousVectorStoreId) {
        console.log(`[AuthSynchronizer] Updating vector store ID: ${currentVectorStoreId}`);
        setProfileVectorStoreId(currentVectorStoreId);
        if (user) {
          setVectorStore({
            id: currentVectorStoreId,
            name: `${profile?.first_name || 'User'}'s Vector Store`
          });
        }
      } else if (!currentVectorStoreId && previousVectorStoreId) {
        console.log(`[AuthSynchronizer] Clearing vector store ID`);
        setProfileVectorStoreId(null);
        setVectorStore({
          id: '',
          name: 'No Vector Store'
        });
      }
    } catch (error) {
      console.error("[AuthSynchronizer] Error updating vector store:", error);
    } finally {
      prevAuthVectorStoreIdRef.current = currentVectorStoreId;
      setIsSyncing(false);
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