import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET() {
  try {
    const supabase = await createClient()
    
    // Use getUser() to securely get the authenticated user
    const { data: { user }, error: userError } = await supabase.auth.getUser()

    if (userError) {
      // Log the error but return a standard unauthenticated response
      console.error('Session user fetch error:', userError.message)
      return NextResponse.json({ user: null }, { status: 200 })
    }
    
    if (!user) {
      return NextResponse.json({ user: null }, { status: 200 })
    }
    
    // Return the full authenticated user object (including metadata)
    return NextResponse.json({ user })
    
  } catch (error) {
    console.error('Session route error:', error)
    return NextResponse.json(
      { error: 'An unexpected error occurred while checking session' },
      { status: 500 }
    )
  }
} 