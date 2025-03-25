import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(
  request: NextRequest,
  { params }: { params: { userId: string } }
) {
  try {
    const userId = params.userId
    
    if (!userId) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 })
    }
    
    // Create Supabase client
    const supabase = await createClient()
    
    // Get the user's profile
    const { data: profile, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single()
    
    if (error) {
      console.error('Error fetching profile:', error)
      return NextResponse.json(
        { error: 'Profile not found' },
        { status: 404 }
      )
    }
    
    // Transform the database profile to match our schema format
    const formattedProfile = {
      userId: profile.id,
      firstName: profile.first_name,
      lastName: profile.last_name,
      email: profile.email,
      phone: profile.phone || '',
      preferredName: profile.preferred_name || '',
      linkedInProfile: profile.linkedin_profile || '',
      goal: profile.goal || '',
      desiredField: profile.desired_field || '',
      
      // Complex data from JSON/array columns
      education: profile.education || [],
      careerGoals: profile.career_goals || {},
      skills: profile.skills || [],
      preferences: profile.preferences || {},
      documents: profile.documents || {},
      
      vectorStoreId: profile.vector_store_id || undefined
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