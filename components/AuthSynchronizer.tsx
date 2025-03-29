'use client';

import { useEffect, useRef } from 'react';
import { useAuth } from '@/app/components/auth/AuthContext';
import useRecommendationsStore from '@/stores/useRecommendationsStore';
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
    setAuthState,
    syncWithSupabase,
    hydrated
  } = useRecommendationsStore();
  
  // Create Supabase client
  const supabase = createClientComponentClient();
  
  // Use a ref to track if we've already synced the state
  const hasSyncedRef = useRef(false);
  
  // Directly check Supabase auth status on component mount
  useEffect(() => {
    async function checkAuthWithSupabase() {
      try {
        console.log('🔍 Checking auth with Supabase directly');
        const { data: { user: supabaseUser }, error } = await supabase.auth.getUser();
        
        if (error) {
          console.error('Error fetching Supabase user:', error);
          return;
        }
        
        if (supabaseUser) {
          console.log('🔑 Found authenticated user from Supabase:', supabaseUser.id);
          setAuthState(true, supabaseUser.id);
          
          // If we have a user in Supabase but not in our store, sync immediately
          if (!isAuthenticated || userId !== supabaseUser.id) {
            console.log('🔄 Immediate sync with Supabase needed');
            await syncWithSupabase();
          }
        } else {
          console.log('🔒 No authenticated user found in Supabase');
          setAuthState(false, null);
        }
      } catch (error) {
        console.error('Error in checkAuthWithSupabase:', error);
      }
    }
    
    // Check on first render after hydration
    if (hydrated && !hasSyncedRef.current) {
      checkAuthWithSupabase();
      hasSyncedRef.current = true;
    }
  }, [hydrated, isAuthenticated, userId, setAuthState, supabase, syncWithSupabase]);
  
  // Handle authentication state changes from AuthContext
  useEffect(() => {
    console.log('🔄 AuthSynchronizer effect running');
    
    // Wait for store to hydrate and auth to finish loading
    if (!hydrated || authLoading) {
      console.log('⏳ AuthSynchronizer: Waiting for hydration or auth to load...');
      return;
    }
    
    // Check if authentication states are already in sync
    const authContextHasUser = Boolean(user);
    const storeIsAuthenticated = Boolean(isAuthenticated);
    
    // Log current state for debugging
    console.log('🔍 AuthSynchronizer: Auth states', {
      authContextHasUser,
      storeIsAuthenticated,
      userId,
      user: user ? user.id : null,
      hydrated,
      authLoading
    });
    
    // If states don't match, update the recommendations store
    if (authContextHasUser !== storeIsAuthenticated || (user && userId !== user.id)) {
      console.log('📝 AuthSynchronizer: Updating recommendations store auth state', {
        isAuthenticated: authContextHasUser,
        userId: user ? user.id : null
      });
      
      setAuthState(authContextHasUser, user ? user.id : null);
      
      // If user is authenticated, sync with Supabase
      if (authContextHasUser && user) {
        console.log('🔄 Syncing with Supabase after auth state update');
        syncWithSupabase().catch(err => 
          console.error('Error syncing with Supabase:', err)
        );
      }
    } else {
      console.log('✅ AuthSynchronizer: Auth states already in sync');
    }
  }, [user, authLoading, hydrated, isAuthenticated, userId, setAuthState, syncWithSupabase]);
  
  // Listen for Supabase auth changes
  useEffect(() => {
    if (!hydrated) return;
    
    console.log('👂 Setting up Supabase auth listener');
    
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log(`📣 Supabase auth event: ${event}`);
        
        if (event === 'SIGNED_IN' && session?.user) {
          console.log('🔑 User signed in via Supabase:', session.user.id);
          setAuthState(true, session.user.id);
          await syncWithSupabase();
        } else if (event === 'SIGNED_OUT') {
          console.log('🔒 User signed out via Supabase');
          setAuthState(false, null);
        }
      }
    );
    
    // Cleanup
    return () => {
      console.log('🧹 Cleaning up Supabase auth listener');
      subscription.unsubscribe();
    };
  }, [hydrated, setAuthState, supabase, syncWithSupabase]);
  
  // This component doesn't render anything visible
  return null;
} 