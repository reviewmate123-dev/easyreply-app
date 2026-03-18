import { NextRequest, NextResponse } from 'next/server';
import { adminAuth, adminDb } from '@/lib/firebase-admin';
import { syncReviewsForUser } from '@/lib/review-sync';
import { rateLimiter } from '@/lib/rate-limiter';
// ✅ NEW IMPORT
import { verifyLocationOwnership } from '@/lib/review-security';

export async function POST(request: NextRequest) {
  try {
    const ip = request.headers.get('x-forwarded-for') ||
      request.headers.get('x-real-ip') ||
      'anonymous';
    
    const rateLimit = await rateLimiter(ip, 20, 60 * 1000);
    if (!rateLimit.success) {
      return NextResponse.json({
        error: 'Too many requests. Please wait a minute.'
      }, { status: 429 });
    }

    const session = request.cookies.get('session')?.value;
    if (!session) {
      return NextResponse.json({ error: 'Please login first' }, { status: 401 });
    }

    const decodedClaims = await adminAuth.verifySessionCookie(session);
    const uid = decodedClaims.uid;

    const userDoc = await adminDb.collection('users').doc(uid).get();
    const userData = userDoc.data();

    if (!userData?.googleConnected) {
      return NextResponse.json({
        error: 'Google Business Profile not connected. Please connect first.'
      }, { status: 400 });
    }

    if (!userData?.googleLocationId) {
      return NextResponse.json({
        error: 'Location ID missing. Please reconnect Google Business Profile.'
      }, { status: 400 });
    }

    // =============================
    // ✅ LOCATION OWNERSHIP CHECK
    // =============================
    const locationCheck = await verifyLocationOwnership(userData.googleLocationId, uid);
    if (!locationCheck.valid) {
      return NextResponse.json({
        error: locationCheck.error || 'Location access denied'
      }, { status: 403 });
    }

    if (userData?.googleLocationId === 'test_location_123') {
      return NextResponse.json({
        error: 'Your Google Business Profile is not fully set up. Please complete verification in Google Business dashboard first.',
        details: 'Business verification pending'
      }, { status: 400 });
    }

    try {
      const result = await syncReviewsForUser(uid);
      const newReviewsCount = result?.newReviews || 0;
      
      return NextResponse.json({
        success: true,
        newReviews: newReviewsCount,
        message: newReviewsCount > 0
          ? `Found ${newReviewsCount} new reviews`
          : 'No new reviews found'
      });

    } catch (syncError: any) {
      console.error('Sync error:', syncError);

      if (syncError.message?.includes('rate limit')) {
        return NextResponse.json({
          error: 'Google API rate limit exceeded. Please wait 5 minutes and try again.'
        }, { status: 429 });
      } else if (syncError.message?.includes('timeout')) {
        return NextResponse.json({
          error: 'Request timed out. Please try again.'
        }, { status: 504 });
      } else if (syncError.message?.includes('404')) {
        return NextResponse.json({
          error: 'Business location not found. Please verify your Google Business Profile is set up correctly.'
        }, { status: 404 });
      } else if (syncError.message?.includes('401')) {
        return NextResponse.json({
          error: 'Google access expired. Please reconnect your business profile.'
        }, { status: 401 });
      } else {
        return NextResponse.json({
          error: syncError.message || 'Failed to sync reviews'
        }, { status: 500 });
      }
    }

  } catch (error) {
    console.error('API error:', error);
    return NextResponse.json({
      error: 'Internal server error. Please try again.'
    }, { status: 500 });
  }
}