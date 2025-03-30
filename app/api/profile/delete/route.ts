// IMPORTANT: This endpoint requires a SUPABASE_SERVICE_ROLE_KEY environment variable
// to fully delete the user from both the profiles table and the auth system.
// Without this key, only the profile data will be deleted, but the auth user will remain.
// To obtain a service role key:
// 1. Go to your Supabase project dashboard
// 2. Navigate to Project Settings > API
// 3. Copy the "service_role" key (NOT the anon/public key)
// 4. Add it to your .env.local file as SUPABASE_SERVICE_ROLE_KEY
// SECURITY WARNING: NEVER expose this key to the client side or public repositories

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function DELETE(request: NextRequest) {
  try {
    console.log('Starting profile deletion process');
    
    // Create Supabase client
    const supabase = await createClient()
    console.log('Supabase client created');
    
    // Securely get the authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      console.error('Authentication error:', authError);
      return NextResponse.json(
        { error: 'Not authenticated' },
        { status: 401 }
      )
    }
    
    console.log('Authenticated user ID:', user.id);
    
    // Get the user's vector store ID before deleting the profile
    const { data: profileData, error: profileFetchError } = await supabase
      .from('profiles')
      .select('vector_store_id')
      .eq('id', user.id)
      .single();
    
    let vectorStoreId = null;
    if (profileFetchError) {
      console.error('Error fetching profile for vector store ID:', profileFetchError);
      // If the profile doesn't exist, we can skip cleanup
      if (profileFetchError.code === 'PGRST116') {
        console.log('Profile not found, skipping cleanup');
        return NextResponse.json({
          success: true,
          message: 'No profile found to delete'
        });
      }
    } else {
      console.log('Retrieved profile data:', profileData);
      vectorStoreId = profileData?.vector_store_id;
    }
    
    // Delete recommendations associated with the user
    console.log('Deleting recommendations for user:', user.id);
    const { error: recommendationsDeleteError } = await supabase
      .from('recommendations')
      .delete()
      .eq('user_id', user.id);
    
    if (recommendationsDeleteError) {
      console.error('Error deleting recommendations:', recommendationsDeleteError);
      // Continue despite error - we'll still try to delete the profile
    } else {
      console.log('Successfully deleted recommendations');
    }
    
    // Delete the user's profile
    console.log('Deleting profile for user:', user.id);
    const { data: profileDeleteData, error: profileDeleteError } = await supabase
      .from('profiles')
      .delete()
      .eq('id', user.id)
      .select(); // Add select to get feedback on the deletion
    
    if (profileDeleteError) {
      console.error('Error deleting profile:', profileDeleteError);
      // Check if this is a permissions issue
      if (profileDeleteError.code === 'PGRST124') {
        console.error('This appears to be a permissions error. Check RLS policies.');
      }
      return NextResponse.json(
        { error: `Failed to delete profile: ${profileDeleteError.message}` },
        { status: 400 }
      );
    } else {
      console.log('Profile deleted successfully:', profileDeleteData);
    }
    
    // Clean up vector store data if we have a vector store ID
    if (vectorStoreId) {
      try {
        console.log('Cleaning up vector store:', vectorStoreId);
        const cleanupResponse = await fetch(`${request.nextUrl.origin}/api/vector_stores/cleanup?vector_store_id=${vectorStoreId}`, {
          method: 'DELETE'
        });
        
        if (!cleanupResponse.ok) {
          console.error('Failed to clean up vector store:', cleanupResponse.statusText);
        } else {
          console.log('Vector store cleanup successful');
        }
      } catch (cleanupError) {
        console.error('Error cleaning up vector store:', cleanupError);
        // Continue despite error - we've already deleted the profile
      }
    } else {
      console.log('No vector store ID found, skipping cleanup');
    }
    
    // Delete the user's auth record
    console.log('Attempting to delete auth user:', user.id);
    try {
      // Note: This requires a service role key with admin privileges
      // Add SUPABASE_SERVICE_ROLE_KEY to your environment variables
      const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
      
      if (!serviceRoleKey) {
        console.error('Missing SUPABASE_SERVICE_ROLE_KEY environment variable');
        // Return success for profile deletion but warn about missing auth deletion
        return NextResponse.json({
          success: true,
          message: 'Profile deleted successfully, but auth user remains due to missing service role key',
          authUserDeleted: false
        });
      }
      
      // Create admin client with service role key
      const { createClient: createServerClient } = await import('@supabase/supabase-js');
      
      const supabaseAdmin = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        serviceRoleKey,
        {
          auth: {
            autoRefreshToken: false,
            persistSession: false
          }
        }
      );
      
      // Delete the user
      const { error: deleteUserError } = await supabaseAdmin.auth.admin.deleteUser(user.id);
      
      if (deleteUserError) {
        console.error('Error deleting auth user:', deleteUserError);
        return NextResponse.json({
          success: true,
          message: 'Profile deleted successfully, but failed to delete auth user',
          authUserDeleted: false,
          error: deleteUserError.message
        });
      }
      
      console.log('Auth user deleted successfully');
      
      // Return success response
      console.log('Profile and auth user deletion process completed successfully');
      return NextResponse.json({
        success: true,
        message: 'Profile and auth user deleted successfully',
        authUserDeleted: true
      });
    } catch (authDeleteError) {
      console.error('Error during auth user deletion:', authDeleteError);
      // Return partial success
      return NextResponse.json({
        success: true,
        message: 'Profile deleted successfully, but failed to delete auth user',
        authUserDeleted: false,
        error: authDeleteError instanceof Error ? authDeleteError.message : String(authDeleteError)
      });
    }
  } catch (error) {
    console.error('Unexpected error in profile deletion:', error);
    return NextResponse.json(
      { error: 'Internal server error during profile deletion', details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
} 