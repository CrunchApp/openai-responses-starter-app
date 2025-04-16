import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    
    // Get the authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Not authenticated' },
        { status: 401 }
      )
    }
    
    // Get avatar data from request
    const { avatarUrl } = await request.json()
    
    if (!avatarUrl) {
      return NextResponse.json(
        { error: 'Avatar URL is required' },
        { status: 400 }
      )
    }
    
    // Update user metadata with new avatar URL
    const { data, error } = await supabase.auth.updateUser({
      data: { avatar_url: avatarUrl }
    })
    
    if (error) {
      console.error('Error updating avatar:', error)
      return NextResponse.json(
        { error: `Failed to update avatar: ${error.message}` },
        { status: 400 }
      )
    }
    
    return NextResponse.json({ 
      success: true,
      avatarUrl: data.user.user_metadata.avatar_url
    })
  } catch (error) {
    console.error('Error in avatar update route:', error)
    return NextResponse.json(
      { error: 'Internal server error during avatar update' },
      { status: 500 }
    )
  }
} 