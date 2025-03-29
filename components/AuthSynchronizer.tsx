'use client';

import { useEffect, useRef } from 'react';
import { useAuth } from '@/app/components/auth/AuthContext';
import useRecommendationsStore from '@/stores/useRecommendationsStore';
import useProfileStore from '@/stores/useProfileStore';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';

/**
 * Component that synchronizes authentication state between the main AuthContext
 * and the recommendations store. This ensures that when a user logs in or out,
 * both auth systems have the same state.
 */
export default function AuthSynchronizer() {
  console.log('⚡ AuthSynchronizer component loaded');

  const { user, profile, loading: authLoading } = useAuth();
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
    hydrated: profileStoreHydrated
  } = useProfileStore();
  
  // Create Supabase client
  const supabase = createClientComponentClient();
  
  // Use a ref to track if we've already synced the state
  const hasSyncedRef = useRef(false);
  
  // Combine hydration checks
  const storeHydrated = recStoreHydrated && profileStoreHydrated;
  
  // Directly check Supabase auth status on component mount
  useEffect(() => {
    async function checkAuthWithSupabase() {
      try {
        console.log('🔍 Checking auth with Supabase directly');
        const { data, error } = await supabase.auth.getUser();
        
        if (error) {
          // Instead of just logging the error, handle it gracefully
          console.error('Error fetching Supabase user:', error);
          
          // If the error is related to a missing session, clear auth state to be safe
          if (error.message?.includes('session')) {
            console.log('🔒 Auth session error detected, clearing state');
            clearRecommendationsStore();
            clearProfileStore();
            setRecAuthState(false, null);
          }
          return;
        }
        
        const supabaseUser = data?.user;
        
        if (supabaseUser) {
          console.log('🔑 Found authenticated user from Supabase:', supabaseUser.id);
          setRecAuthState(true, supabaseUser.id);
          
          // If we have a user in Supabase but not in our store, sync immediately
          if (!isAuthenticated || userId !== supabaseUser.id) {
            console.log('🔄 Immediate sync with Supabase needed');
            try {
              await syncWithSupabase();
            } catch (syncError) {
              console.error('Error syncing with Supabase:', syncError);
              // Continue with auth state update even if sync fails
            }
          }
        } else {
          console.log('🔒 No authenticated user found in Supabase, clearing stores.');
          clearRecommendationsStore();
          clearProfileStore();
          setRecAuthState(false, null); // Ensure auth state is false after clearing
        }
      } catch (error) {
        console.error('Error in checkAuthWithSupabase:', error);
        // If there's an unexpected error, reset auth state to be safe
        clearRecommendationsStore();
        clearProfileStore();
        setRecAuthState(false, null);
      }
    }
    
    // Check on first render after hydration
    if (storeHydrated && !hasSyncedRef.current) {
      checkAuthWithSupabase();
      hasSyncedRef.current = true;
    }
  }, [storeHydrated, isAuthenticated, userId, setRecAuthState, supabase, syncWithSupabase, clearRecommendationsStore, clearProfileStore]);
  
  // Handle authentication state changes from AuthContext
  useEffect(() => {
    console.log('🔄 AuthSynchronizer effect running (AuthContext)');
    
    // Wait for store to hydrate and auth to finish loading
    if (!storeHydrated || authLoading) {
      console.log('⏳ AuthSynchronizer: Waiting for hydration or auth to load...');
      return;
    }
    
    try {
      const authContextHasUser = Boolean(user);
      const storeIsAuthenticated = Boolean(isAuthenticated);
      
      // Log current state for debugging
      console.log('🔍 AuthSynchronizer: Auth states', {
        authContextHasUser,
        storeIsAuthenticated,
        userId,
        user: user ? user.id : null,
        hydrated: storeHydrated,
        authLoading
      });
      
      // If states don't match, update the recommendations store
      if (authContextHasUser !== storeIsAuthenticated || (user && userId !== user.id)) {
        console.log('📝 AuthSynchronizer: Auth state mismatch detected.');
        
        if (authContextHasUser && user) {
          // User is signing IN or state is correcting to signed in
          console.log('🔑 User signed in via AuthContext. Setting state and syncing.', user.id);
          setRecAuthState(authContextHasUser, user.id);
          syncWithSupabase().catch(err => {
            console.error('Error syncing with Supabase:', err);
            // Continue even if sync fails
          });
        } else if (!authContextHasUser) {
          // User is signing OUT via AuthContext
          console.log('🔒 User signed out via AuthContext. Clearing stores.');
          clearRecommendationsStore();
          clearProfileStore();
          setRecAuthState(false, null); // Ensure auth state is set to false *after* clearing
        }
      } else {
        console.log('✅ AuthSynchronizer: Auth states already in sync');
      }
    } catch (error) {
      console.error('Error in AuthContext sync effect:', error);
      // If there's an unexpected error, don't change auth state to avoid disruption
    }
  }, [user, authLoading, storeHydrated, isAuthenticated, userId, setRecAuthState, syncWithSupabase, clearRecommendationsStore, clearProfileStore]);
  
  // Listen for Supabase auth changes
  useEffect(() => {
    if (!storeHydrated) return;
    
    console.log('👂 Setting up Supabase auth listener');
    
    let subscription: { unsubscribe: () => void } | undefined;
    
    try {
      const { data } = supabase.auth.onAuthStateChange(
        async (event, session) => {
          console.log(`📣 Supabase auth event: ${event}`);
          
          try {
            if (event === 'SIGNED_IN' && session?.user) {
              console.log('🔑 User signed in via Supabase listener:', session.user.id);
              // Check if state already matches to prevent redundant syncs
              const currentState = useRecommendationsStore.getState();
              if (!currentState.isAuthenticated || currentState.userId !== session.user.id) {
                setRecAuthState(true, session.user.id);
                await syncWithSupabase();
              }
            } else if (event === 'SIGNED_OUT') {
              console.log('🔒 User signed out via Supabase listener. Clearing stores.');
              clearRecommendationsStore();
              clearProfileStore();
              setRecAuthState(false, null); // Ensure auth state is set to false *after* clearing
            } else if (event === 'USER_UPDATED' && session?.user) {
              // Handle potential user updates if necessary, e.g., email change
              console.log('👤 User updated via Supabase listener:', session.user.id);
              // Optionally re-sync or update specific user details
              const currentState = useRecommendationsStore.getState();
              if (currentState.isAuthenticated && currentState.userId === session.user.id) {
                // Re-sync if needed, or update parts of the profile if applicable
                // await syncWithSupabase();
              } else {
                // If user updated but state thinks they are logged out, treat as sign in
                setRecAuthState(true, session.user.id);
                await syncWithSupabase();
              }
            }
          } catch (error) {
            console.error('Error handling auth state change:', error);
            // Don't throw, just log the error to prevent UI disruptions
          }
        }
      );
      
      subscription = data.subscription;
    } catch (error) {
      console.error('Error setting up Supabase auth listener:', error);
    }
    
    // Cleanup
    return () => {
      console.log('🧹 Cleaning up Supabase auth listener');
      if (subscription) {
        try {
          subscription.unsubscribe();
        } catch (error) {
          console.error('Error unsubscribing from auth listener:', error);
        }
      }
    };
  }, [storeHydrated, setRecAuthState, supabase, syncWithSupabase, clearRecommendationsStore, clearProfileStore]);
  
  // This component doesn't render anything visible
  return null;
} 