'use client'

import { useEffect } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { useAuth } from './AuthContext'

interface ProtectedRouteProps {
  children: React.ReactNode
}

// Define public routes that don't require authentication
const PUBLIC_ROUTES = [
  '/',
  '/profile', 
  '/recommendations', 
  '/chat',
  '/auth/login', 
  '/auth/signup', 
  '/auth/reset-password', 
  '/auth/reset-password/confirm'
]

export function ProtectedRoute({ children }: ProtectedRouteProps) {
  const { user, loading } = useAuth()
  const router = useRouter()
  const pathname = usePathname()

  useEffect(() => {
    // Only redirect once the auth is initialized (not in loading state)
    if (!loading) {
      // Check if current path is a public route
      const isPublicRoute = PUBLIC_ROUTES.some(route => pathname?.startsWith(route))
      
      // If not a public route and no user, redirect to login
      if (!isPublicRoute && !user) {
        router.push('/auth/login')
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
  // 2. User is authenticated
  const hasAccess = PUBLIC_ROUTES.some(route => pathname?.startsWith(route)) || !!user
  
  return hasAccess ? <>{children}</> : null
} 