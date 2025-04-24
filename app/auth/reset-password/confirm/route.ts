import { NextRequest, NextResponse } from 'next/server'
import type { EmailOtpType } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const token_hash = searchParams.get('token_hash')
  const type = searchParams.get('type') as EmailOtpType | null

  // On success redirect to the update-password page
  const successUrl = request.nextUrl.clone()
  successUrl.pathname = '/auth/reset-password/update'
  successUrl.search = ''

  // On error redirect to an error page
  const errorUrl = request.nextUrl.clone()
  errorUrl.pathname = '/auth/auth-code-error'
  errorUrl.search = ''

  if (token_hash && type === 'recovery') {
    const supabase = await createClient()
    const { error } = await supabase.auth.verifyOtp({ type, token_hash })
    if (!error) {
      return NextResponse.redirect(successUrl)
    }
  }

  return NextResponse.redirect(errorUrl)
} 