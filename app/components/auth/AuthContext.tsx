'use client'

import React, { createContext, useContext, useEffect, useState } from 'react'
import { User, Session } from '@supabase/supabase-js'
import { createBrowserClient } from '@supabase/ssr'
import { useRouter } from 'next/navigation'
import { Database } from '@/lib/database.types'
import useProfileStore from '@/stores/useProfileStore'
import { UserProfile } from '@/app/types/profile-schema'

type Profile = Database['public']['Tables']['profiles']['Row']

// Helper function to map Supabase profile row to UserProfile
function mapDbProfileToUserProfile(dbProfile: Profile): UserProfile {
  // Use type assertions and provide defaults cautiously
  return {
    userId: dbProfile.id,
    firstName: dbProfile.first_name || '',
    lastName: dbProfile.last_name || '',
    email: dbProfile.email || '',
    phone: dbProfile.phone || '',
    preferredName: dbProfile.preferred_name || '',
    linkedInProfile: dbProfile.linkedin_profile || '',
    currentLocation: dbProfile.current_location || '',
    nationality: dbProfile.nationality || '',
    targetStudyLevel: (dbProfile.target_study_level as UserProfile['targetStudyLevel']) || '__NONE__',
    // Assert the array type but provide default empty array
    languageProficiency: (dbProfile.language_proficiency as UserProfile['languageProficiency']) || [],
    // Assert the array type but provide default education record
    education: (dbProfile.education as UserProfile['education']) || [{ degreeLevel: '__NONE__', institution: '', fieldOfStudy: '', graduationYear: '' }],
    // Assert the object type but provide default career goals
    careerGoals: (dbProfile.career_goals as UserProfile['careerGoals']) || { shortTerm: '', longTerm: '', achievements: '', desiredIndustry: [], desiredRoles: [] },
    // Assert the array type but provide default empty array
    skills: (dbProfile.skills as UserProfile['skills']) || [],
    // Assert the object type but provide default preferences
    preferences: (dbProfile.preferences as UserProfile['preferences']) || {
      preferredLocations: [], studyMode: 'Full-time', startDate: '', budgetRange: { min: 0, max: 100000 },
      preferredDuration: { min: undefined, max: undefined, unit: undefined }, preferredStudyLanguage: '',
      livingExpensesBudget: { min: undefined, max: undefined, currency: 'USD' }, residencyInterest: false
    },
    // Assert the object type but provide default documents
    documents: (dbProfile.documents as UserProfile['documents']) || {},
    vectorStoreId: dbProfile.vector_store_id || undefined,
    profileFileId: dbProfile.profile_file_id || undefined,
  };
}

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
  const [isSigningOut, setIsSigningOut] = useState(false)

  // --- Zustand Store Access --- 
  const setProfileDataInStore = useProfileStore((state) => state.setProfileData);
  const clearProfileStore = useProfileStore((state) => state.clearStore);
  const setVectorStoreIdInStore = useProfileStore((state) => state.setVectorStoreId);
  // --- End Zustand Store Access ---

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

      // === Update Profile Store ===
      if (data) {
        const userProfile = mapDbProfileToUserProfile(data);
        console.log("[AuthContext] Setting profile data in Zustand store:", userProfile);
        setProfileDataInStore(userProfile);
        setVectorStoreIdInStore(userProfile.vectorStoreId || null);
      } else {
        // Ensure store is cleared if profile fetch fails or returns null
        console.log("[AuthContext] No profile data found or fetch failed, clearing Zustand store.");
        clearProfileStore(); 
      }
      // =========================

      return data
    } catch (error) {
      console.error('Unexpected error fetching profile:', error)
      // === Clear Profile Store on Error ===
      console.log("[AuthContext] Error fetching profile, clearing Zustand store.");
      clearProfileStore(); 
      // ==================================
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
      console.log(`Auth state changed: ${event}`);
      
      // Treat INITIAL_SESSION with a valid session as SIGNED_IN for state purposes
      if ((event === 'SIGNED_IN' || (event === 'INITIAL_SESSION' && session?.user))) {
        if (session?.user) {
          if (isMounted) setUser(session.user);
          // Fetch user profile
          const profileData = await fetchProfile(session.user.id);
          if (isMounted) setProfile(profileData);
        }
      } else if (event === 'SIGNED_OUT' || (event === 'INITIAL_SESSION' && !session?.user)) {
        if (isMounted) {
          setUser(null);
          setProfile(null);
          // === Clear Profile Store on Sign Out ===
          console.log("[AuthContext] User signed out, clearing Zustand store.");
          clearProfileStore();
          // ====================================
        }
      }
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
      setLoading(true);
      setError(null);
      
      // First, sign out from Supabase and wait for it to complete
      const { error } = await supabase.auth.signOut();
      
      if (error) {
        console.error('Supabase sign out error:', error);
        throw error;
      }
      
      // After successful Supabase sign out, clear local state
      setUser(null);
      setProfile(null);
      setVectorStoreId(null);
      // === Clear Profile Store on Explicit Sign Out ===
      console.log("[AuthContext] Explicit signOut called, clearing Zustand store.");
      clearProfileStore();
      // ============================================
      
      // Navigate as the final step
      router.push('/');
    } catch (error) {
      console.error('Error signing out:', error);
      if (error instanceof Error) {
        setError(error.message);
      } else {
        setError('An unexpected error occurred during logout');
      }
    } finally {
      setLoading(false);
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
        // === Update Profile Store on Refresh === 
        const userProfile = mapDbProfileToUserProfile(profileData);
        console.log("[AuthContext] Refreshing session, setting profile data in Zustand store:", userProfile);
        setProfileDataInStore(userProfile);
        setVectorStoreIdInStore(userProfile.vectorStoreId || null);
        // =====================================

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