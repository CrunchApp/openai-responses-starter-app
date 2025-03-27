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
    
    // Return only the authenticated user object (or necessary parts)
    // Avoid returning sensitive details if not needed client-side
    return NextResponse.json({ 
      user: {
        id: user.id,
        email: user.email,
        // Add other non-sensitive fields if required by the client
      } 
    })
    
  } catch (error) {
    console.error('Session route error:', error)
    return NextResponse.json(
      { error: 'An unexpected error occurred while checking session' },
      { status: 500 }
    )
  }
} 