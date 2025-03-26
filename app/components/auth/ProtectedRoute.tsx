'use client'

import { useEffect } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { useAuth } from './AuthContext'

interface ProtectedRouteProps {
  children: React.ReactNode
}

// Define public routes that don't require authentication
const PUBLIC_ROUTES = [
  '/',  // Landing page
  '/profile-wizard',  // Allow onboarding flow
  '/recommendations',  // Public recommendations
  '/chat',  // Public chat
  '/auth/login', 
  '/auth/signup', 
  '/auth/reset-password', 
  '/auth/reset-password/confirm'
]

// Routes that require authentication
const PROTECTED_ROUTES = [
  '/profile',
  '/profile/edit',
  '/profile/manage',
  '/dashboard',
  '/account',
  '/settings'
]

export function ProtectedRoute({ children }: ProtectedRouteProps) {
  const { user, loading } = useAuth()
  const router = useRouter()
  const pathname = usePathname()

  useEffect(() => {
    // Only redirect once the auth is initialized (not in loading state)
    if (!loading) {
      // Check if current path is a public route
      const isPublicRoute = PUBLIC_ROUTES.some(route => 
        pathname === route || pathname?.startsWith(`${route}/`)
      )
      
      // Check if current path is a protected route
      const isProtectedRoute = PROTECTED_ROUTES.some(route => 
        pathname === route || pathname?.startsWith(`${route}/`)
      )
      
      // Let the middleware handle protected routes for server-side redirects
      // Only handle client-side redirects for routes that need special handling
      if (isProtectedRoute && !user) {
        router.push(`/auth/login?redirect=${encodeURIComponent(pathname || '/')}`)
      }
      
      // If user is logged in and trying to access login/signup pages, redirect to dashboard
      if (user && (pathname?.startsWith('/auth/login') || pathname?.startsWith('/auth/signup'))) {
        // Check if there's a redirect parameter
        const searchParams = new URLSearchParams(window.location.search)
        const redirectPath = searchParams.get('redirect')
        
        if (redirectPath) {
          router.push(redirectPath)
        } else {
          router.push('/dashboard')
        }
      }
    }
  }, [user, loading, router, pathname])

  // While loading, show loading spinner
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
      </div>
    )
  }

  // Allow access to the route if:
  // 1. It's a public route, or
  // 2. It's a protected route and user is authenticated, or
  // 3. It's any other route (non-public, non-protected)
  const isPublicRoute = PUBLIC_ROUTES.some(route => 
    pathname === route || pathname?.startsWith(`${route}/`)
  )
  
  const isProtectedRoute = PROTECTED_ROUTES.some(route => 
    pathname === route || pathname?.startsWith(`${route}/`)
  )
  
  const hasAccess = isPublicRoute || (isProtectedRoute && !!user) || (!isPublicRoute && !isProtectedRoute)
  
  return hasAccess ? <>{children}</> : null
} 