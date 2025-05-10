'use client'

import React, { createContext, useContext, useEffect, useState } from 'react'
import { User } from '@supabase/supabase-js'
import { useRouter } from 'next/navigation'
import { Database } from '@/lib/database.types'
import useProfileStore from '@/stores/useProfileStore'
import { UserProfile } from '@/app/types/profile-schema'
import useConversationStore from '@/stores/useConversationStore'
import usePathwayStore from '@/stores/usePathwayStore'

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
  profile: UserProfile | null
  vectorStoreId: string | null
  loading: boolean
  error: string | null
  signUp: (email: string, password: string, firstName: string, lastName: string) => Promise<User | null>
  signIn: (email: string, password: string) => Promise<void>
  signOut: () => Promise<void>
  resetPassword: (email: string) => Promise<void>
  refreshSession: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter()

  // Zustand stores
  const setProfileDataInStore = useProfileStore((state) => state.setProfileData);
  const clearProfileStore = useProfileStore((state) => state.clearStore);
  const setVectorStoreIdInStore = useProfileStore((state) => state.setVectorStoreId);
  const setAuthConversation = useConversationStore((state) => state.setAuthState);
  const resetConversation = useConversationStore((state) => state.resetState);
  const setAuthPathway = usePathwayStore((state) => state.setAuthState);
  const clearPathway = usePathwayStore((state) => state.clearStore);

  const [user, setUser] = useState<User | null>(null)
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [vectorStoreId, setVectorStoreId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Fetch the current session from the server
  async function fetchSession() {
    try {
      const res = await fetch('/api/auth/session', { credentials: 'include' });
      if (!res.ok) throw new Error('Failed to fetch session');
      const data = await res.json();
      return data.user as User | null;
    } catch (err) {
      console.error('fetchSession error', err);
      return null;
    }
  }

  // Fetch or create the profile via API
  async function fetchProfileData(userId: string) {
    try {
      const res = await fetch(`/api/profile/${userId}`, { credentials: 'include' });
      if (!res.ok) {
        if (res.status === 404) {
          const createRes = await fetch('/api/profile/create', {
            method: 'POST',
            credentials: 'include',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ userId }),
          });
          if (createRes.ok) {
            const json = await createRes.json();
            return json.profile as UserProfile;
          }
        }
        throw new Error('Failed to fetch profile');
      }
      const json = await res.json();
      return json.profile as UserProfile;
    } catch (err) {
      console.error('fetchProfileData error', err);
      return null;
    }
  }

  // Initialize on mount
  useEffect(() => {
    let mounted = true;
    async function init() {
      setLoading(true);
      const sessionUser = await fetchSession();
      if (mounted && sessionUser) {
        setUser(sessionUser);
        setAuthConversation(true, sessionUser.id);
        setAuthPathway(true, sessionUser.id);
        const prof = await fetchProfileData(sessionUser.id);
        if (prof) {
          setProfile(prof);
          setProfileDataInStore(prof);
          setVectorStoreIdInStore(prof.vectorStoreId || null);
          setVectorStoreId(prof.vectorStoreId || null);
        }
      }
      if (mounted) setLoading(false);
    }
    init();
    return () => {
      mounted = false;
    };
  }, []);

  // Sign in via API
  async function signIn(email: string, password: string) {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Login failed');
      const sessionUser = await fetchSession();
      if (sessionUser) {
        setUser(sessionUser);
        setAuthConversation(true, sessionUser.id);
        setAuthPathway(true, sessionUser.id);
        const prof = await fetchProfileData(sessionUser.id);
        if (prof) {
          setProfile(prof);
          setProfileDataInStore(prof);
          setVectorStoreIdInStore(prof.vectorStoreId || null);
          setVectorStoreId(prof.vectorStoreId || null);
        }
        router.push('/dashboard');
      }
    } catch (err) {
      console.error('signIn error', err);
      if (err instanceof Error) setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }

  // Sign up via API
  async function signUp(email: string, password: string, firstName: string, lastName: string): Promise<User | null> {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch('/api/auth/signup', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, firstName, lastName }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Signup failed');
      // Return the new user object for consumers
      return data.user as User;
    } catch (err) {
      console.error('signUp error', err);
      if (err instanceof Error) setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }

  // Sign out via API
  async function signOut() {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch('/api/auth/logout', { method: 'POST', credentials: 'include' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Logout failed');
      setUser(null);
      setProfile(null);
      setVectorStoreId(null);
      clearProfileStore();
      resetConversation();
      clearPathway();
      router.push('/');
    } catch (err) {
      console.error('signOut error', err);
      if (err instanceof Error) setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  // Reset password via API
  async function resetPassword(email: string): Promise<void> {
    try {
      setLoading(true)
      setError(null)
      const res = await fetch('/api/auth/reset-password', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Password reset failed')
    } catch (err) {
      console.error('resetPassword error', err)
      if (err instanceof Error) setError(err.message)
      throw err
    } finally {
      setLoading(false)
    }
  }

  // Refresh session manually
  async function refreshSession() {
    setLoading(true);
    const sessionUser = await fetchSession();
    if (sessionUser) {
      setUser(sessionUser);
      const prof = await fetchProfileData(sessionUser.id);
      if (prof) {
        setProfile(prof);
        setProfileDataInStore(prof);
        setVectorStoreIdInStore(prof.vectorStoreId || null);
        setVectorStoreId(prof.vectorStoreId || null);
      }
    } else {
      setUser(null);
      setProfile(null);
      setVectorStoreId(null);
      clearProfileStore();
      resetConversation();
      clearPathway();
    }
    setLoading(false);
  }

  return (
    <AuthContext.Provider value={{ user, profile, vectorStoreId, loading, error, signUp, signIn, signOut, resetPassword, refreshSession }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) throw new Error('useAuth must be used within an AuthProvider')
  return context
} 