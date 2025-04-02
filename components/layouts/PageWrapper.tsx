'use client';

import React from 'react';
import { useAuth } from '@/app/components/auth/AuthContext';
import { AuthenticatedLayout } from './AuthenticatedLayout';
import { GuestLayout } from './GuestLayout';
import { useRouter, usePathname } from 'next/navigation';
import useRecommendationsStore from '@/stores/useRecommendationsStore';

interface PageWrapperProps {
  children: React.ReactNode;
  requireAuth?: boolean;  // If true, redirects guests to login
  allowGuest?: boolean;   // If true, shows guest layout for non-auth users
}

export function PageWrapper({ 
  children, 
  requireAuth = false,
  allowGuest = false 
}: PageWrapperProps) {
  const { user, loading: authLoading, synchronized } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  
  const { isLoading: recommendationsLoading, hydrated: recommendationsHydrated } = useRecommendationsStore();

  console.log(`[PageWrapper] Path: ${pathname}, Auth Loading: ${authLoading}, Synchronized: ${synchronized}, Recs Loading: ${recommendationsLoading}, Recs Hydrated: ${recommendationsHydrated}, User: ${user?.id || 'null'}`);

  const isRecommendationsPage = pathname === '/recommendations';

  const showLoadingSpinner = authLoading || !synchronized || (isRecommendationsPage && (!recommendationsHydrated || recommendationsLoading));

  if (showLoadingSpinner) {
    console.log(`[PageWrapper] Showing Loading Spinner for ${pathname} (AuthLoading: ${authLoading}, Synchronized: ${!synchronized}, RecsPage: ${isRecommendationsPage}, RecsHydrated: ${recommendationsHydrated}, RecsLoading: ${recommendationsLoading})`);
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
      </div>
    );
  }
  console.log(`[PageWrapper] Rendering content for ${pathname}`);

  if (requireAuth && !user) {
    console.log(`[PageWrapper] Redirecting to login from ${pathname}`);
    router.push(`/auth/login?redirect=${encodeURIComponent(pathname)}`);
    return null;
  }
  
  if (user) {
    console.log(`[PageWrapper] Rendering AuthenticatedLayout for ${pathname}`);
    return <AuthenticatedLayout>{children}</AuthenticatedLayout>;
  } else if (allowGuest) {
    console.log(`[PageWrapper] Rendering GuestLayout for ${pathname}`);
    return <GuestLayout>{children}</GuestLayout>;
  } else {
    console.log(`[PageWrapper] Rendering fallback layout (Guest) for ${pathname}`);
    return <GuestLayout>{children}</GuestLayout>;
  }
} 