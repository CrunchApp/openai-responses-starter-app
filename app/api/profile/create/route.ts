import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { ProfileSchema } from '@/app/types/profile-schema'

export async function POST(request: NextRequest) {
  try {
    const { userId, profileData } = await request.json()
    
    if (!userId) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 })
    }
    
    // Validate the profile data against our schema
    try {
      ProfileSchema.parse(profileData)
    } catch (validationError) {
      console.error('Profile validation error:', validationError)
      return NextResponse.json(
        { error: 'Invalid profile data', details: validationError },
        { status: 400 }
      )
    }
    
    // Create Supabase client
    const supabase = await createClient()
    
    const now = new Date().toISOString()
    
    // Insert or update profile with both basic and complex data
    const { error } = await supabase
      .from('profiles')
      .upsert({
        // Basic fields as direct columns
        id: userId,
        first_name: profileData.firstName,
        last_name: profileData.lastName,
        email: profileData.email,
        phone: profileData.phone || null,
        preferred_name: profileData.preferredName || null,
        linkedin_profile: profileData.linkedInProfile || null, // Note: changed from linkedin_url
        goal: profileData.goal || null,
        desired_field: profileData.desiredField || null,
        
        // Complex data as JSON/array columns
        education: profileData.education || [],
        career_goals: profileData.careerGoals || {},
        skills: profileData.skills || [],
        preferences: profileData.preferences || {},
        documents: profileData.documents || {},
        vector_store_id: profileData.vectorStoreId || null,
        profile_file_id: profileData.profileFileId || null,
        
        // Timestamps
        created_at: now,
        updated_at: now
      })
    
    if (error) {
      console.error('Error creating profile:', error)
      return NextResponse.json(
        { error: error.message },
        { status: 400 }
      )
    }
    
    return NextResponse.json({ 
      success: true,
      message: 'Profile created successfully' 
    })
  } catch (error) {
    console.error('Error in profile creation:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
} 