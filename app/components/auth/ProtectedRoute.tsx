'use client'

import { useEffect } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { useAuth } from './AuthContext'

interface ProtectedRouteProps {
  children: React.ReactNode
}

// Auth routes that logged-in users should be redirected away from
const AUTH_ROUTES = [
  '/auth/login',
  '/auth/signup'
]

export function ProtectedRoute({ children }: ProtectedRouteProps) {
  const { user, loading } = useAuth()
  const router = useRouter()
  const pathname = usePathname()

  useEffect(() => {
    // Only redirect once the auth is initialized and user is logged in
    if (!loading && user) {
      // If user is logged in and trying to access login/signup pages, redirect to dashboard
      const isAuthPage = AUTH_ROUTES.some(route => 
        pathname === route || pathname?.startsWith(`${route}/`)
      )
      
      if (isAuthPage) {
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

  // Simply render children - middleware.ts handles protection of routes server-side
  return <>{children}</>
} 