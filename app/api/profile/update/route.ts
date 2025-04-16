import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { ProfileSchema, UserProfile } from '@/app/types/profile-schema' // Import UserProfile type

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    
    // Securely get the authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Not authenticated' },
        { status: 401 }
      )
    }
    
    // Get profile data from request
    const profileData: Partial<UserProfile> = await request.json() // Expect partial or full profile

    // Log document structure for debugging
    console.log('Update request received with documents:', JSON.stringify(profileData.documents || {}));

    // Optional: Validate incoming data against a partial schema if needed
    // try {
    //   PartialProfileSchema.parse(profileData); 
    // } catch (validationError) {
    //   console.error('Profile update validation error:', validationError);
    //   return NextResponse.json({ error: 'Invalid profile data', details: validationError }, { status: 400 });
    // }

    // Map frontend UserProfile fields to database column names
    const updateData: { [key: string]: any } = {
      first_name: profileData.firstName,
      last_name: profileData.lastName,
      email: profileData.email, // Be cautious updating email if it's tied to auth
      phone: profileData.phone,
      preferred_name: profileData.preferredName,
      linkedin_profile: profileData.linkedInProfile,
      goal: profileData.goal,
      desired_field: profileData.desiredField,
      // Add new direct fields
      current_location: profileData.currentLocation,
      nationality: profileData.nationality,
      target_study_level: profileData.targetStudyLevel,
      language_proficiency: profileData.languageProficiency,
      // Map complex types directly if column names match or transform if needed
      education: profileData.education,
      career_goals: profileData.careerGoals,
      skills: profileData.skills,
      preferences: profileData.preferences,
      documents: profileData.documents, // Include documents for updating
      updated_at: new Date().toISOString()
    };

    // Add the profile_file_id if provided
    if (profileData.profileFileId) {
      updateData.profile_file_id = profileData.profileFileId;
    }

    // Remove undefined fields to avoid overwriting existing data with null
    Object.keys(updateData).forEach(key => updateData[key] === undefined && delete updateData[key]);

    if (Object.keys(updateData).length <= 1) { // Only updated_at
        return NextResponse.json({ message: 'No fields to update' }, { status: 200 });
    }
    
    // Update profile in the database using the authenticated user's ID
    const { data, error } = await supabase
      .from('profiles')
      .update(updateData)
      .eq('id', user.id) // Ensure update is for the authenticated user
      .select()
      .single(); // Expecting a single row back
    
    if (error) {
      console.error('Error updating profile:', error)
      return NextResponse.json(
        { error: `Failed to update profile: ${error.message}` },
        { status: 400 }
      )
    }
    
    // Return the updated profile data (consider formatting it back to UserProfile)
    return NextResponse.json({ profile: data }) 
  } catch (error) {
    console.error('Error in profile update route:', error)
    return NextResponse.json(
      { error: 'Internal server error during profile update' },
      { status: 500 }
    )
  }
} 