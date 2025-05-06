'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/app/components/auth/AuthContext';
import { AuthenticatedLayout } from './AuthenticatedLayout';
import { GuestLayout } from './GuestLayout';
import { useRouter, usePathname } from 'next/navigation';
import { ProtectedRoute } from '@/app/components/auth/ProtectedRoute';
import AnimatedLogo from '@/components/ui/AnimatedLogo';

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
  
  // Simplify loader: show spinner only while authLoading
  
  // Wrap the content with ProtectedRoute for auth handling
  const wrappedContent = <ProtectedRoute>{children}</ProtectedRoute>;

  // Show loading spinner only when auth is loading
  // Skip loading spinner for homepage to show content immediately
  const isHomePage = pathname === '/';
  if (authLoading && !isHomePage) {
    return (
      <div className="flex items-center justify-center min-h-screen absolute inset-0 bg-background z-50">
        <div style={{ position: 'relative', left: '-55px' }}>
          <AnimatedLogo size={300} />
        </div>
      </div>
    );
  }
  
  // Handle auth-required routes - redirect to login if no user
  if (requireAuth && !user && !authLoading) {
    if (typeof window !== 'undefined') {
      router.push(`/auth/login?redirect=${encodeURIComponent(pathname || '/')}`);
    }
    return null; // Don't render anything while redirecting
  }
  
  // Render the appropriate layout based on authentication status
  if (user) {
    return <AuthenticatedLayout>{wrappedContent}</AuthenticatedLayout>;
  } else if (allowGuest) {
    return <GuestLayout>{wrappedContent}</GuestLayout>;
  } else {
    return <GuestLayout>{wrappedContent}</GuestLayout>;
  }
} 