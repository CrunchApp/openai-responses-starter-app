'use client';

import { useEffect, useRef, useState } from 'react';
import { useAuth } from '@/app/components/auth/AuthContext';
import useRecommendationsStore from '@/stores/useRecommendationsStore';
import useProfileStore from '@/stores/useProfileStore';
import useToolsStore from '@/stores/useToolsStore';
import useConversationStore from '@/stores/useConversationStore';
import { createBrowserClient } from '@supabase/ssr';

/**
 * Component that synchronizes authentication state between the main AuthContext
 * and the recommendations store. This ensures that when a user logs in or out,
 * both auth systems have the same state.
 */
export default function AuthSynchronizer() {
  console.log('⚡ AuthSynchronizer component loaded');

  const { user, profile, vectorStoreId: authVectorStoreId, loading: authLoading, setSynchronized } = useAuth();
  const { 
    isAuthenticated, 
    userId, 
    setAuthState: setRecAuthState,
    syncWithSupabase,
    clearStore: clearRecommendationsStore,
    hydrated: recStoreHydrated
  } = useRecommendationsStore();
  
  // Get profile store actions
  const {
    clearStore: clearProfileStore,
    hydrated: profileStoreHydrated,
    setCurrentStep,
    completedSteps
  } = useProfileStore();
  
  // Get tools store for vector store synchronization
  const {
    setVectorStore,
    vectorStore
  } = useToolsStore();
  
  // Get conversation store hydration status
  const {
    hydrated: conversationStoreHydrated
  } = useConversationStore();
  
  // Create Supabase client using ssr
  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
  
  // Use a ref to track if we've already synced the state
  const hasSyncedRef = useRef(false);
  // Track if we're in a guest session to prevent clearing profile store
  const isGuestSessionRef = useRef(false);
  // Internal state to track if sync operations are ongoing
  const [isSyncing, setIsSyncing] = useState(true);
  
  // Combine hydration checks - include conversation store
  const storeHydrated = recStoreHydrated && profileStoreHydrated && conversationStoreHydrated;
  
  // Effect to manage the global synchronized flag based on authLoading and internal isSyncing
  useEffect(() => {
    if (authLoading || isSyncing) {
      setSynchronized(false);
    } else {
      console.log('✅ AuthSynchronizer: Setting synchronized to TRUE');
      setSynchronized(true);
    }
  }, [authLoading, isSyncing, setSynchronized]);
  
  // On initial load, determine if we're in a guest session
  useEffect(() => {
    if (storeHydrated) {
      const { currentStep, completedSteps, profileData } = useProfileStore.getState();
      if (!user && (currentStep > 0 || completedSteps.length > 0 || (profileData && Object.keys(profileData).length > 0))) {
        isGuestSessionRef.current = true;
      } else {
        isGuestSessionRef.current = false;
      }
    }
  }, [storeHydrated, user]);

  // Sync vector store ID from auth context to tools store
  useEffect(() => {
    let didCancel = false; // Flag to prevent state updates if component unmounts
    
    async function fetchAndSetVectorStore() {
      if (!authVectorStoreId || !vectorStore || vectorStore.id !== authVectorStoreId) {
        setIsSyncing(true);
        try {
          const response = await fetch(
            `/api/vector_stores/retrieve_store?vector_store_id=${authVectorStoreId}`
          );
          if (!didCancel) {
            if (response.ok) {
              const storeData = await response.json();
              if (storeData.id) {
                console.log('✅ Successfully fetched vector store details:', storeData.id);
                setVectorStore(storeData);
              } else {
                 console.error('Fetched vector store data missing ID');
              }
            } else {
              console.error('Failed to fetch vector store details:', response.statusText);
            }
          }
        } catch (error) {
          if (!didCancel) {
            console.error('Error fetching vector store details:', error);
          }
        } finally {
           if (!didCancel) {
             //setIsSyncing(false); // Completion handled by checkAuthWithSupabase
           }
        }
      } else {
         //setIsSyncing(false); // Vector store already matches
      }
    }

    if (!authLoading && authVectorStoreId) {
      fetchAndSetVectorStore();
    }
    // If no vector store ID and auth isn't loading, we aren't syncing this part.
    // else if (!authLoading) {
    //   setIsSyncing(false);
    // }

    return () => { didCancel = true; }; // Cleanup function
  }, [authVectorStoreId, authLoading, vectorStore, setVectorStore, setIsSyncing]);

  // Directly check Supabase auth status and sync stores
  useEffect(() => {
    let didCancel = false;
    
    async function checkAuthWithSupabase() {
      console.log('🔄 AuthSynchronizer: Starting core auth check and store sync...');
      setIsSyncing(true); // Start syncing process
      
      try {
        const { data, error } = await supabase.auth.getUser();
        
        if (didCancel) return;
        
        if (error) {
          console.error('Error fetching Supabase user:', error);
          if (error.message?.includes('session')) {
             console.log('🔒 Auth session error detected, clearing state');
             clearRecommendationsStore();
             if (!isGuestSessionRef.current) clearProfileStore();
             setRecAuthState(false, null);
          }
          // Don't set isSyncing false here, let finally handle it
          return; // Exit early on error
        }
        
        const supabaseUser = data?.user;
        
        if (supabaseUser) {
          console.log('🔑 Found authenticated user from Supabase:', supabaseUser.id);
          // Always set auth state and trigger sync if Supabase confirms user
          console.log('🔄 Setting auth state and triggering sync with Supabase...');
          setRecAuthState(true, supabaseUser.id);
          try {
            await syncWithSupabase(supabaseUser.id); // *** Pass userId ***
            console.log('✅ Sync with Supabase successful after initial check.');
          } catch (syncError) {
            console.error('Error awaiting syncWithSupabase during initial check:', syncError);
            // Proceed even if sync fails, auth state is set, but log error
          }
        } else {
          console.log('🔒 No authenticated user found in Supabase, clearing stores.');
          clearRecommendationsStore();
          if (!isGuestSessionRef.current) clearProfileStore();
          setRecAuthState(false, null);
        }
      } catch (error) {
         if (!didCancel) {
           console.error('Critical error in checkAuthWithSupabase:', error);
           // Attempt cleanup even on critical error
           clearRecommendationsStore();
           if (!isGuestSessionRef.current) clearProfileStore();
           setRecAuthState(false, null);
         }
      } finally {
        if (!didCancel) {
          console.log('🏁 AuthSynchronizer: Finished core auth check and store sync.');
          setIsSyncing(false); // Finish syncing process *after* checks and potential await
        }
      }
    }
    
    // Check on first render after hydration and when auth is not loading
    if (storeHydrated && !authLoading && !hasSyncedRef.current) {
      checkAuthWithSupabase();
      hasSyncedRef.current = true;
    } else if (!authLoading && hasSyncedRef.current && !isSyncing) {
      // If auth loading finishes and we are NOT syncing, ensure synchronized is true
      // This handles cases where sync finished before auth loading did
      console.log('🏁 AuthSynchronizer: Auth loading finished and not syncing, ensuring synchronized=true.');
      setSynchronized(true); 
    } else if (!authLoading && !storeHydrated) {
       // Edge case: Auth finished loading but stores aren't hydrated yet. Mark as not syncing.
       // This prevents getting stuck if hydration takes longer than auth.
       setIsSyncing(false);
    }
    
    return () => { didCancel = true; };
  }, [storeHydrated, authLoading, supabase, setRecAuthState, syncWithSupabase, clearRecommendationsStore, clearProfileStore, setIsSyncing, setSynchronized]);
  
  // Listen for Supabase auth changes AFTER initial check
  useEffect(() => {
    if (!storeHydrated || !hasSyncedRef.current) return; // Only listen after initial sync attempt
    
    console.log('👂 Setting up Supabase auth listener');
    let isSubscribed = true;
    
    const { data } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (!isSubscribed) return;
        
        console.log(`📣 Supabase auth event: ${event}`);
        setIsSyncing(true); // Mark as syncing during auth change handling
        
        try {
          const currentState = useRecommendationsStore.getState();
          if (event === 'SIGNED_IN' && session?.user) {
            console.log('🔑 User signed in via Supabase listener:', session.user.id);
            if (!currentState.isAuthenticated || currentState.userId !== session.user.id) {
              setRecAuthState(true, session.user.id);
              await syncWithSupabase(session.user.id); // *** Pass userId ***
              console.log('✅ Sync after SIGNED_IN event successful.');
            }
          } else if (event === 'SIGNED_OUT') {
            console.log('🔒 User signed out via Supabase listener. Clearing stores.');
            clearRecommendationsStore();
            clearProfileStore(); // Always clear profile on explicit sign out
            setRecAuthState(false, null);
          } else if (event === 'USER_UPDATED' && session?.user) {
             console.log('👤 User updated via Supabase listener:', session.user.id);
             if (currentState.isAuthenticated && currentState.userId === session.user.id) {
                // Optionally re-sync or update specific user details
                // await syncWithSupabase(session.user.id); // Example if re-sync needed
             } else {
                setRecAuthState(true, session.user.id);
                await syncWithSupabase(session.user.id); // *** Pass userId ***
             }
          }
        } catch (error) {
          console.error('Error handling auth state change event:', error);
        } finally {
           if (isSubscribed) {
             setIsSyncing(false); // Finish syncing after handling event
           }
        }
      }
    );
      
    const subscription = data.subscription;
    
    // Cleanup
    return () => {
      console.log('🧹 Cleaning up Supabase auth listener');
      isSubscribed = false;
      subscription?.unsubscribe();
    };
  }, [storeHydrated, setRecAuthState, supabase, syncWithSupabase, clearRecommendationsStore, clearProfileStore, setIsSyncing]); // Depends on storeHydrated
  
  // This component doesn't render anything visible
  return null;
} 