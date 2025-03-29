'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import useRecommendationsStore from '@/stores/useRecommendationsStore';

export default function GuestLimitMonitor() {
  const router = useRouter();
  const store = useRecommendationsStore();
  // Use type assertions for these properties
  const isAuthenticated = store.isAuthenticated as boolean;
  const hasReachedGuestLimit = store.hasReachedGuestLimit as boolean;
  
  useEffect(() => {
    // If the user is not authenticated and has reached the limit
    if (!isAuthenticated && hasReachedGuestLimit) {
      // Show a prompt to sign up/in
      const wantsToLogin = window.confirm(
        'You have reached the limit of 1 recommendation generation as a guest. ' +
        'Would you like to sign up for unlimited recommendations?'
      );
      
      if (wantsToLogin) {
        router.push('/signup');
      }
    }
  }, [isAuthenticated, hasReachedGuestLimit, router]);
  
  return null;
} 