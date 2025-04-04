'use client';

import React from 'react';
import { useAuth } from '@/app/components/auth/AuthContext';
import { AuthenticatedLayout } from './AuthenticatedLayout';
import { GuestLayout } from './GuestLayout';
import { useRouter, usePathname } from 'next/navigation';
import useRecommendationsStore from '@/stores/useRecommendationsStore';
import useProfileStore from '@/stores/useProfileStore';
import useConversationStore from '@/stores/useConversationStore';
import { ProtectedRoute } from '@/app/components/auth/ProtectedRoute';

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
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  
  // Get store loading states - only check the relevant stores for the current page
  const isRecommendationsPage = pathname === '/recommendations';
  const isChatPage = pathname === '/chat';
  const isProfilePage = pathname?.startsWith('/profile');
  
  // Only check store loading states if their corresponding pages are being visited
  const { isLoading: recommendationsLoading, hydrated: recommendationsHydrated } = useRecommendationsStore();
  const { hydrated: profileStoreHydrated } = useProfileStore();
  const { hydrated: conversationStoreHydrated, isLoading: conversationLoading } = useConversationStore();
  
  console.log(`[PageWrapper] Path: ${pathname}, Auth Loading: ${authLoading}, User: ${user?.id || 'null'}`);

  // Determine which stores should be hydrated based on current page
  let requiredStoresHydrated = true;
  
  // Always require profile store hydration
  if (!profileStoreHydrated) {
    requiredStoresHydrated = false;
    console.log('[PageWrapper] Profile store not hydrated yet.');
  }
  
  // Only require recommendations store hydration on recommendations page
  if (isRecommendationsPage && !recommendationsHydrated) {
    requiredStoresHydrated = false;
    console.log('[PageWrapper] Recommendations store not hydrated yet.');
  }
  
  // Only require conversation store hydration on chat page
  if (isChatPage && !conversationStoreHydrated) {
    requiredStoresHydrated = false;
    console.log('[PageWrapper] Conversation store not hydrated yet.');
  }
  
  // Calculate if any relevant store is loading
  let isStoreLoading = false;
  
  if (isRecommendationsPage && recommendationsLoading) {
    isStoreLoading = true;
    console.log('[PageWrapper] Recommendations store is loading.');
  }
  
  if (isChatPage && conversationLoading) {
    isStoreLoading = true;
    console.log('[PageWrapper] Conversation store is loading.');
  }
  
  // Show loading spinner if auth is loading or required stores are loading/not hydrated
  // But only show the loading spinner initially, not when user is already authenticated and stores are hydrated
  const isHomePage = pathname === '/';
  const showLoadingSpinner = !isHomePage && (
    // For auth loading, we now have two conditions:
    // 1. Never show loading spinner on homepage, even during auth loading
    // 2. Don't show spinner if auth is loading but user state is already determined (either user or null)
    (authLoading && user === undefined) || 
    (isStoreLoading && requiredStoresHydrated) || 
    (!requiredStoresHydrated && !user) // Only show spinner for not hydrated stores if user is not yet authenticated
  );

  // Wrap the content with ProtectedRoute for auth handling
  const wrappedContent = <ProtectedRoute>{children}</ProtectedRoute>;

  if (showLoadingSpinner) {
    console.log(`[PageWrapper] Showing Loading Spinner for ${pathname} (AuthLoading: ${authLoading}, StoreLoading: ${isStoreLoading}, RequiredStoresHydrated: ${requiredStoresHydrated})`);
    return (
      <div className="flex items-center justify-center min-h-screen absolute inset-0 bg-background z-50">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
      </div>
    );
  }
  
  console.log(`[PageWrapper] Rendering content for ${pathname}`);

  // Handle auth-required routes
  if (requireAuth && !user) {
    console.log(`[PageWrapper] Redirecting to login from ${pathname}`);
    if (typeof window !== 'undefined') {
       router.push(`/auth/login?redirect=${encodeURIComponent(pathname || '/')}`);
    }
    return null; // Don't render anything while redirecting
  }
  
  // Render the appropriate layout based on authentication status
  if (user) {
    console.log(`[PageWrapper] Rendering AuthenticatedLayout for ${pathname}`);
    return <AuthenticatedLayout>{wrappedContent}</AuthenticatedLayout>;
  } else if (allowGuest) {
    console.log(`[PageWrapper] Rendering GuestLayout for ${pathname}`);
    return <GuestLayout>{wrappedContent}</GuestLayout>;
  } else {
    console.log(`[PageWrapper] Rendering fallback layout (Guest) for ${pathname}`);
    return <GuestLayout>{wrappedContent}</GuestLayout>;
  }
} 