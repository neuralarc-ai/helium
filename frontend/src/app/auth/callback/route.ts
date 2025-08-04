import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const next = searchParams.get('next') ?? '/dashboard'
  const error = searchParams.get('error')
  const errorDescription = searchParams.get('error_description')

  console.log('🔵 Auth callback triggered:', { 
    hasCode: !!code, 
    next, 
    error, 
    errorDescription 
  })

  if (error) {
    console.error('❌ Auth callback error:', error, errorDescription)
    return NextResponse.redirect(`${origin}/auth?error=${encodeURIComponent(error)}`)
  }

  if (code) {
    const supabase = await createClient()
    
    try {
      const { data, error } = await supabase.auth.exchangeCodeForSession(code)
      
      if (error) {
        console.error('❌ Error exchanging code for session:', error)
        return NextResponse.redirect(`${origin}/auth?error=${encodeURIComponent(error.message)}`)
      }

      console.log('✅ Successfully exchanged code for session:', { 
        userId: data.user?.id,
        email: data.user?.email 
      })

      // URL to redirect to after sign in process completes
      return NextResponse.redirect(`${origin}${next}`)
    } catch (error) {
      console.error('❌ Unexpected error in auth callback:', error)
      return NextResponse.redirect(`${origin}/auth?error=unexpected_error`)
    }
  }

  // No code present, redirect to auth page
  console.log('⚠️ No code present in auth callback, redirecting to auth')
  return NextResponse.redirect(`${origin}/auth`)
}
