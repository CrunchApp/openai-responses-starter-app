import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(
  request: NextRequest,
  context: { params: { userId: string | Promise<string> } }
) {
  try {
    const params = context.params
    const requestedUserId = await params.userId
    
    if (!requestedUserId) {
      return NextResponse.json({ error: 'User ID parameter is required' }, { status: 400 })
    }
    
    // Create Supabase client
    const supabase = await createClient()

    // Securely get the authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    // Verify the authenticated user is requesting their own profile
    if (user.id !== requestedUserId) {
      return NextResponse.json({ error: 'Forbidden: You can only access your own profile' }, { status: 403 })
    }
    
    // Get the user's profile using the authenticated user's ID
    const { data: profile, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id) // Use authenticated user ID
      .single()
    
    if (error) {
      // Handle case where profile might not exist yet for a valid user
      if (error.code === 'PGRST116') { 
        return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
      }
      console.error('Error fetching profile:', error)
      return NextResponse.json(
        { error: 'Failed to fetch profile data' },
        { status: 500 } // Use 500 for unexpected DB errors
      )
    }
    
    // Transform the database profile to match our schema format
    const formattedProfile = {
      userId: profile.id,
      firstName: profile.first_name || '', // Ensure defaults for potentially null fields
      lastName: profile.last_name || '',
      email: profile.email || '', // Should ideally come from auth user, but sync if needed
      phone: profile.phone || '',
      preferredName: profile.preferred_name || '',
      linkedInProfile: profile.linkedin_profile || '',
      currentLocation: profile.current_location || '',
      nationality: profile.nationality || '',
      targetStudyLevel: profile.target_study_level || '',
      languageProficiency: profile.language_proficiency || [],
      goal: profile.goal || '',
      desiredField: profile.desired_field || '',
      
      // Complex data from JSON/array columns
      education: profile.education || [],
      careerGoals: profile.career_goals || { shortTerm: '', longTerm: '', desiredIndustry: [], desiredRoles: [] }, // Provide default structure
      skills: profile.skills || [],
      preferences: profile.preferences || { preferredLocations: [], studyMode: 'Full-time', startDate: '', budgetRange: { min: 0, max: 0 } }, // Provide default structure
      documents: profile.documents || {},
      
      vectorStoreId: profile.vector_store_id || undefined,
      profileFileId: profile.profile_file_id || undefined
    }
    
    return NextResponse.json({ profile: formattedProfile })
  } catch (error) {
    console.error('Error in profile retrieval:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
} 