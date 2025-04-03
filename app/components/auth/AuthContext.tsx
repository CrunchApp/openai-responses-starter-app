'use client'

import React, { createContext, useContext, useEffect, useState } from 'react'
import { User, Session } from '@supabase/supabase-js'
import { createBrowserClient } from '@supabase/ssr'
import { useRouter } from 'next/navigation'
import { Database } from '@/lib/database.types'

type Profile = Database['public']['Tables']['profiles']['Row']

interface AuthContextType {
  user: User | null
  profile: Profile | null
  vectorStoreId: string | null
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

// Create a single supabase instance to use throughout the component
const supabase = createBrowserClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const [user, setUser] = useState<User | null>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [vectorStoreId, setVectorStoreId] = useState<string | null>(null)
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
        if (error.code === 'PGRST116') {
          console.log('Profile not found for user, creating a default profile')
          
          // Get user metadata
          const { data: userData } = await supabase.auth.getUser()
          const userMeta = userData?.user?.user_metadata

          // Create a basic profile for the user
          const { data: newProfile, error: insertError } = await supabase
            .from('profiles')
            .upsert({
              id: userId,
              first_name: userMeta?.first_name || '',
              last_name: userMeta?.last_name || '',
              email: userData?.user?.email || '',
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
              vector_store_id: null,
              profile_file_id: null
            })
            .select('*')
            .single()
            
          if (insertError) {
            console.error('Error creating profile:', insertError)
            return null
          }
          
          return newProfile
        }
        return null
      }

      // If profile has a vector_store_id, set it in the state
      if (data && data.vector_store_id) {
        setVectorStoreId(data.vector_store_id);
      } else {
        setVectorStoreId(null);
      }

      // Log profile data for debugging
      console.log("Fetched profile data:", {
        id: data.id,
        vectorStoreId: data.vector_store_id,
        profileFileId: data.profile_file_id
      });

      return data
    } catch (error) {
      console.error('Unexpected error fetching profile:', error)
      return null
    }
  }

  // Check for user session on mount
  useEffect(() => {
    let isMounted = true;
    
    async function getInitialSession() {
      try {
        // Get current session
        const { data: { session }, error } = await supabase.auth.getSession()
        
        if (error) {
          console.error('Session error:', error)
          if (isMounted) {
            setError('Failed to load user session')
            setLoading(false)
          }
          return
        }
        
        if (session?.user) {
          if (isMounted) setUser(session.user)
          
          // Fetch user profile
          const profileData = await fetchProfile(session.user.id)
          if (isMounted) setProfile(profileData)
        }
      } catch (error) {
        console.error('Error getting initial session:', error)
        if (isMounted) setError('Failed to load user session')
      } finally {
        if (isMounted) setLoading(false)
      }
    }

    getInitialSession()

    // Listen for auth changes
    const { data: authListener } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log(`Auth state changed: ${event}`)
      
      if (session?.user) {
        if (isMounted) setUser(session.user)
        
        const profileData = await fetchProfile(session.user.id)
        if (isMounted) setProfile(profileData)
      } else {
        if (isMounted) {
          setUser(null)
          setProfile(null)
        }
      }
      
      if (isMounted) setLoading(false)
    })

    return () => {
      isMounted = false;
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
      
      // Redirect to dashboard after successful login
      if (data?.user) {
        router.push('/dashboard')
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
      
      // Use zustand store's clearStore method to clean up guest profile data
      const useProfileStore = (await import('@/stores/useProfileStore')).default;
      useProfileStore.getState().clearStore();
      
      // Use Supabase client directly instead of API route for logout
      const { error } = await supabase.auth.signOut()
      
      if (error) {
        throw error
      }
      
      setUser(null)
      setProfile(null)
      setVectorStoreId(null)
      
      // Redirect to homepage after logout
      router.push('/')
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
      setLoading(true)
      setError(null)
      
      const { data: { user: currentUser } } = await supabase.auth.getUser()
      
      if (!currentUser) {
        setUser(null)
        setProfile(null)
        setVectorStoreId(null)
        return null
      }
      
      setUser(currentUser)
      
      const profileData = await fetchProfile(currentUser.id)
      setProfile(profileData)
      
      // Update tools store with vectorStoreId if available
      if (profileData?.vector_store_id) {
        const useToolsStore = (await import('@/stores/useToolsStore')).default;
        useToolsStore.getState().setVectorStore({
          id: profileData.vector_store_id,
          name: `${profileData.first_name || 'User'}'s Vector Store`
        });
      }
      
      return { user: currentUser, profile: profileData }
    } catch (error) {
      console.error('Error refreshing session:', error)
      if (error instanceof Error) {
        setError(error.message)
      } else {
        setError('An unexpected error occurred while refreshing session')
      }
      return null
    } finally {
      setLoading(false)
    }
  }

  const contextValue: AuthContextType = {
    user,
    profile,
    vectorStoreId,
    loading,
    error,
    signUp,
    signIn,
    signOut,
    resetPassword,
    updatePassword,
    refreshSession,
  }

  return <AuthContext.Provider value={contextValue}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
} 