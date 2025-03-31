import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

// Define public routes that don't require authentication
const PUBLIC_ROUTES = [
  '/',  // Landing page
  '/profile-wizard', // Onboarding flow
  '/profile', // Public profile view
  '/recommendations', // Public recommendations
  '/chat', // Public chat
]

// Define public API routes needed for onboarding
const PUBLIC_API_ROUTES = [
  '/api/vector_stores/create_store',
  '/api/vector_stores/upload_file',
  '/api/vector_stores/add_file',
  '/api/vector_stores/delete_file',
  '/api/vector_stores/cleanup',
  '/api/profile/create',
  '/api/profile/extract-from-documents',
  '/api/auth/linkedin-profile',
  '/api/recommendations/generate',
  '/api/turn_response',
  '/api/conversations',
  '/api/conversations/:id',
  '/api/conversations/:id/messages'
]

export async function middleware(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => request.cookies.set(name, value))
          supabaseResponse = NextResponse.next({
            request,
          })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  // Do not run code between createServerClient and
  // supabase.auth.getUser(). A simple mistake could make it very hard to debug
  // issues with users being randomly logged out.

  // IMPORTANT: DO NOT REMOVE auth.getUser()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  // Check if the current path is in the public routes list
  const isPublicRoute = PUBLIC_ROUTES.some(route => 
    request.nextUrl.pathname === route || 
    request.nextUrl.pathname.startsWith(`${route}/`)
  )

  // Check if the current path is a public API route
  const isPublicApiRoute = PUBLIC_API_ROUTES.some(route => 
    request.nextUrl.pathname === route || 
    request.nextUrl.pathname.startsWith(`${route}/`)
  )

  // Check if this is any API route
  const isApiRoute = request.nextUrl.pathname.startsWith('/api/')

  if (!user && !isPublicRoute && !isPublicApiRoute && 
      !request.nextUrl.pathname.startsWith('/auth/login') &&
      !request.nextUrl.pathname.startsWith('/auth') &&
      !request.nextUrl.pathname.startsWith('/_next') &&
      !request.nextUrl.pathname.startsWith('/api/auth/callback')) {
    
    // Handle API routes differently - return JSON error instead of redirecting
    if (isApiRoute) {
      return NextResponse.json(
        { error: 'Unauthorized. Authentication required.' },
        { status: 401 }
      )
    }
    
    // For non-API routes, redirect to the login page
    const url = request.nextUrl.clone()
    url.pathname = '/auth/login'
    return NextResponse.redirect(url)
  }

  // IMPORTANT: You *must* return the supabaseResponse object as it is.
  return supabaseResponse
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * Feel free to modify this pattern to include more paths.
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
} 