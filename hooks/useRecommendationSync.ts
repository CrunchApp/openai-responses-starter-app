'use client';

import { useEffect } from 'react';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import useRecommendationsStore from '@/stores/useRecommendationsStore';

export default function useRecommendationSync() {
  const store = useRecommendationsStore();
  // Access properties using type assertion since we know they exist
  const setAuthState = store.setAuthState as (isAuthenticated: boolean, userId: string | null) => void;
  const syncWithSupabase = store.syncWithSupabase as () => Promise<void>;
  
  // Create Supabase client
  const supabase = createClientComponentClient();
  
  useEffect(() => {
    // Check initial auth state
    async function checkInitialAuth() {
      try {
        const { data: { user }, error } = await supabase.auth.getUser();
        
        if (error || !user) {
          setAuthState(false, null);
          return;
        }
        
        setAuthState(true, user.id);
      } catch (error) {
        console.error('Error checking initial auth state:', error);
        setAuthState(false, null);
      }
    }
    
    checkInitialAuth();
    
    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (event === 'SIGNED_IN' && session?.user) {
          // User signed in
          setAuthState(true, session.user.id);
          await syncWithSupabase();
        } else if (event === 'SIGNED_OUT') {
          // User signed out
          setAuthState(false, null);
        }
      }
    );
    
    // Cleanup
    return () => {
      subscription.unsubscribe();
    };
  }, [setAuthState, supabase, syncWithSupabase]);
  
  return null;
} 