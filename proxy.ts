// proxy.ts - Next.js 16.1.5 ka sahi syntax
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

// ⚠️ FUNCTION NAME MUST BE "proxy" (middleware nahi)
export function proxy(request: NextRequest) {
  // Simple proxy - sab allow karo
  return NextResponse.next()
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!api|_next/static|_next/image|favicon.ico).*)',
  ],
}