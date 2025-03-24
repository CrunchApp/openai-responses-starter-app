'use client'

import React, { createContext, useContext, useEffect, useState } from 'react'
import { User, Session } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase'
import { Database } from '@/lib/database.types'

type Profile = Database['public']['Tables']['profiles']['Row']

interface AuthContextType {
  user: User | null
  profile: Profile | null
  loading: boolean
  error: string | null
  signUp: (email: string, password: string, firstName: string, lastName: string) => Promise<{ user: User | null; session: Session | null } | null>
  signIn: (email: string, password: string) => Promise<{ user: User | null; session: Session | null } | null>
  signOut: () => Promise<void>
  resetPassword: (email: string) => Promise<void>
  updatePassword: (password: string) => Promise<void>
  refreshSession: () => Promise<{ user: User | null; profile: Profile | null } | null>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  async function fetchProfile(userId: string) {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single()

      if (error) {
        console.error('Error fetching profile:', error)
        return null
      }

      return data
    } catch (error) {
      console.error('Unexpected error fetching profile:', error)
      return null
    }
  }

  // Check for user session on mount
  useEffect(() => {
    async function getInitialSession() {
      try {
        setLoading(true)
        
        // Get current session
        const { data: { session }, error } = await supabase.auth.getSession()
        
        if (error) {
          throw error
        }
        
        if (session?.user) {
          setUser(session.user)
          
          // Fetch user profile
          const profileData = await fetchProfile(session.user.id)
          setProfile(profileData)
        }
      } catch (error) {
        console.error('Error getting initial session:', error)
        setError('Failed to load user session')
      } finally {
        setLoading(false)
      }
    }

    getInitialSession()

    // Listen for auth changes
    const { data: authListener } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log(`Auth state changed: ${event}`)
      
      if (session?.user) {
        setUser(session.user)
        const profileData = await fetchProfile(session.user.id)
        setProfile(profileData)
      } else {
        setUser(null)
        setProfile(null)
      }
      
      setLoading(false)
    })

    return () => {
      // Clean up subscription
      authListener.subscription.unsubscribe()
    }
  }, [])

  // Sign up with email and password
  async function signUp(email: string, password: string, firstName: string, lastName: string) {
    try {
      setLoading(true)
      setError(null)
      
      // Use Supabase client directly instead of API route for signup
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            first_name: firstName,
            last_name: lastName
          }
        }
      })
      
      if (error) {
        throw error
      }
      
      return data
    } catch (error) {
      console.error('Error signing up:', error)
      if (error instanceof Error) {
        setError(error.message)
      } else {
        setError('An unexpected error occurred during signup')
      }
      throw error
    } finally {
      setLoading(false)
    }
  }

  // Sign in with email and password
  async function signIn(email: string, password: string) {
    try {
      setLoading(true)
      setError(null)
      
      // Use Supabase client directly instead of API route for login
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password
      })
      
      if (error) {
        throw error
      }
      
      return data
    } catch (error) {
      console.error('Error signing in:', error)
      if (error instanceof Error) {
        setError(error.message)
      } else {
        setError('An unexpected error occurred during login')
      }
      throw error
    } finally {
      setLoading(false)
    }
  }

  // Sign out
  async function signOut() {
    try {
      setLoading(true)
      setError(null)
      
      // Use Supabase client directly instead of API route for logout
      const { error } = await supabase.auth.signOut()
      
      if (error) {
        throw error
      }
      
      setUser(null)
      setProfile(null)
    } catch (error) {
      console.error('Error signing out:', error)
      if (error instanceof Error) {
        setError(error.message)
      } else {
        setError('An unexpected error occurred during logout')
      }
      throw error
    } finally {
      setLoading(false)
    }
  }

  // Reset password
  async function resetPassword(email: string) {
    try {
      setLoading(true)
      setError(null)
      
      // Use Supabase client directly instead of API route for password reset
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/auth/reset-password/confirm`
      })
      
      if (error) {
        throw error
      }
    } catch (error) {
      console.error('Error resetting password:', error)
      if (error instanceof Error) {
        setError(error.message)
      } else {
        setError('An unexpected error occurred')
      }
      throw error
    } finally {
      setLoading(false)
    }
  }

  // Update password
  async function updatePassword(password: string) {
    try {
      setLoading(true)
      setError(null)
      
      // Use Supabase client directly instead of API route for password update
      const { error } = await supabase.auth.updateUser({
        password
      })
      
      if (error) {
        throw error
      }
    } catch (error) {
      console.error('Error updating password:', error)
      if (error instanceof Error) {
        setError(error.message)
      } else {
        setError('An unexpected error occurred')
      }
      throw error
    } finally {
      setLoading(false)
    }
  }

  // Refresh the session
  async function refreshSession() {
    try {
      const { data: { session }, error } = await supabase.auth.getSession()
      
      if (error) {
        throw error
      }
      
      if (session?.user) {
        setUser(session.user)
        const profileData = await fetchProfile(session.user.id)
        setProfile(profileData)
      } else {
        setUser(null)
        setProfile(null)
      }
      
      return { user: session?.user || null, profile: profile }
    } catch (error) {
      console.error('Error refreshing session:', error)
      return null
    }
  }

  const value = {
    user,
    profile,
    loading,
    error,
    signUp,
    signIn,
    signOut,
    resetPassword,
    updatePassword,
    refreshSession
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
} 