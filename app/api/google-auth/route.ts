import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { adminAuth } from '@/lib/firebase-admin'
import { getGoogleAuthURL } from '@/lib/google-oauth'

export async function GET(request: NextRequest) {
  try {
    // Get session cookie
    const cookieStore = await cookies()
    const sessionCookie = cookieStore.get('session')?.value

    console.log('Session cookie:', sessionCookie ? 'Present' : 'Missing')

    if (!sessionCookie) {
      return NextResponse.redirect(new URL('/auth-login', request.url))
    }

    // Verify Firebase session
    let uid: string

    try {
      const decodedClaims = await adminAuth.verifySessionCookie(sessionCookie)
      uid = decodedClaims.uid
      console.log('Verified UID:', uid)
    } catch (error) {
      console.error('Session verification failed:', error)
      return NextResponse.redirect(new URL('/auth-login', request.url))
    }

    // Generate Google OAuth URL
    const authUrl = getGoogleAuthURL(uid)

    return NextResponse.redirect(authUrl)

  } catch (error) {
    console.error('Google auth error:', error)
    return NextResponse.redirect(new URL('/reputation?error=auth_failed', request.url))
  }
}