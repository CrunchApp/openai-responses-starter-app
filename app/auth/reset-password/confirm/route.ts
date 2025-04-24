import { type EmailOtpType } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const token_hash = searchParams.get('token_hash')
  const type = searchParams.get('type') as EmailOtpType | null

  // redirect on success to the password update page
  const onSuccess = request.nextUrl.clone()
  onSuccess.pathname = '/auth/reset-password/update'
  onSuccess.search = ''

  // redirect on error
  const onError = request.nextUrl.clone()
  onError.pathname = '/auth/auth-code-error'
  onError.search = ''

  if (token_hash && type === 'recovery') {
    const supabase = await createClient()
    const { error } = await supabase.auth.verifyOtp({ type, token_hash })
    if (!error) {
      return NextResponse.redirect(onSuccess)
    }
  }

  return NextResponse.redirect(onError)
} 