// middleware.ts
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

// Simple rate limiting store
const rateLimit = new Map();

export async function middleware(request: NextRequest) {
  // Sirf API routes ke liye
  if (request.nextUrl.pathname.startsWith('/api/')) {
    
    // ✅ FIX: IP address nikaalne ka sahi tarika
    const ip = request.headers.get('x-forwarded-for')?.split(',')[0] || 
               request.headers.get('x-real-ip') || 
               'anonymous';
    
    const now = Date.now();
    const windowMs = 60 * 1000; // 1 minute
    
    // Generate API pe strict limit
    const isGenerate = request.nextUrl.pathname.includes('/generate');
    const limit = isGenerate ? 10 : 30; // 10/min for generate, 30/min for others
    
    const key = `rate:${ip}`;
    const userRequests = rateLimit.get(key) || [];
    
    // Purani requests hatao
    const recentRequests = userRequests.filter((time: number) => time > now - windowMs);
    
    if (recentRequests.length >= limit) {
      return new NextResponse(
        JSON.stringify({ 
          error: 'Too many requests. Please wait a minute.' 
        }),
        { 
          status: 429,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }
    
    // Naya request add karo
    recentRequests.push(now);
    rateLimit.set(key, recentRequests);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/api/:path*']
}