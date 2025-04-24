import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import type { EmailOtpType } from '@supabase/supabase-js'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const token_hash = searchParams.get('token_hash')
  const type = searchParams.get('type') as EmailOtpType | null

  // Where we'll send the user if OTP is valid
  const onSuccess = request.nextUrl.clone()
  onSuccess.pathname = '/auth/reset-password/update'
  onSuccess.search = ''  // clear query params

  // Where we'll send them on error
  const onError = request.nextUrl.clone()
  onError.pathname = '/auth/auth-code-error'
  onError.search = ''  

  if (token_hash && type === 'recovery') {
    // Create our SSR supabase client (sets cookies)
    const supabase = await createClient()
    const { error } = await supabase.auth.verifyOtp({ type, token_hash })

    if (!error) {
      // OTP verified → redirect into the "update password" page
      return NextResponse.redirect(onSuccess)
    }
  }

  // OTP missing/invalid/expired
  return NextResponse.redirect(onError)
}

export async function POST(request: NextRequest) {
  try {
    const { password } = await request.json()
    // Create our SSR supabase client (reads cookies)
    const supabase = await createClient()

    const { error } = await supabase.auth.updateUser({ password })

    if (error) {
      console.error('Error updating password:', error.message)
      return NextResponse.json(
        { error: error.message },
        { status: 400 }
      )
    }

    return NextResponse.json({
      message: 'Password updated successfully'
    })
  } catch (error) {
    console.error('Unexpected error in password update:', error)
    return NextResponse.json(
      { error: 'An unexpected error occurred' },
      { status: 500 }
    )
  }
} 