'use client';

import React from 'react';
import { useAuth } from '@/app/components/auth/AuthContext';
import { AuthenticatedLayout } from './AuthenticatedLayout';
import { GuestLayout } from './GuestLayout';
import { useRouter } from 'next/navigation';

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
  const { user, loading } = useAuth();
  const router = useRouter();
  
  // Show loading state if auth is still initializing
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
      </div>
    );
  }
  
  // If page requires auth and user isn't authenticated, redirect to login
  if (requireAuth && !user) {
    router.push('/auth/login');
    return null;
  }
  
  // Choose layout based on authentication state
  if (user) {
    return <AuthenticatedLayout>{children}</AuthenticatedLayout>;
  } else if (allowGuest) {
    return <GuestLayout>{children}</GuestLayout>;
  } else {
    // Fallback for pages that don't fit either category
    return <>{children}</>;
  }
} 