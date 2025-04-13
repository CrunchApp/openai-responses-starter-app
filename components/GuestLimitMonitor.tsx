'use client';

import React, { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import usePathwayStore from '@/stores/usePathwayStore';

export function GuestLimitMonitor() {
  const router = useRouter();
  const store = usePathwayStore();

  useEffect(() => {
    // Check if the user is a guest and has reached the limit
    if (!store.isAuthenticated && store.hasReachedGuestLimit()) {
      // Simple alert for now, can be replaced with a modal or toast later
      console.warn("Guest limit reached. Redirecting to signup might be desired.");
      // Example: Prompt user to sign up (can be improved with a modal)
      // const wantsToLogin = window.confirm(
      //   'You have reached the limit for pathway generations as a guest. ' +
      //   'Would you like to sign up to save progress and generate more?'
      // );
      // if (wantsToLogin) {
      //   router.push('/signup');
      // }
    }
  }, [store.isAuthenticated, store.hasReachedGuestLimit, router]); 

  return null; // This component does not render anything
} 