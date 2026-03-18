import { NextRequest, NextResponse } from 'next/server';
import { adminAuth, adminDb } from '@/lib/firebase-admin';
import { postReviewReplyToGoogle } from '@/lib/google-api';
import { updateReviewStatus } from '@/lib/review-status';
import { logReviewReplyPosted, logReviewFailed } from '@/lib/history-logger';
import { rateLimiter } from '@/lib/rate-limiter';
// ✅ NEW IMPORTS
import { verifyReviewOwnership, verifyLocationOwnership } from '@/lib/review-security';

export async function POST(request: NextRequest) {
  try {
    // =============================
    // RATE LIMITING
    // =============================
    const ip = request.headers.get('x-forwarded-for') ||
      request.headers.get('x-real-ip') ||
      'anonymous';
    
    const rateLimit = await rateLimiter(ip, 20, 60 * 1000);
    if (!rateLimit.success) {
      return NextResponse.json({
        error: 'Too many requests. Please wait a minute.'
      }, { status: 429 });
    }

    // =============================
    // AUTH CHECK
    // =============================
    const session = request.cookies.get('session')?.value;
    if (!session) {
      return NextResponse.json({ error: 'Please login first' }, { status: 401 });
    }

    const decodedClaims = await adminAuth.verifySessionCookie(session);
    const uid = decodedClaims.uid;

    // =============================
    // REQUEST BODY
    // =============================
    const { reviewId, reply } = await request.json();

    if (!reviewId || !reply) {
      return NextResponse.json({
        error: 'Review ID and reply are required'
      }, { status: 400 });
    }

    // =============================
    // ✅ REVIEW OWNERSHIP CHECK
    // =============================
    const ownershipCheck = await verifyReviewOwnership(reviewId, uid);
    if (!ownershipCheck.valid) {
      return NextResponse.json(
        { error: ownershipCheck.error || 'Review not found' },
        { status: 403 }
      );
    }

    const reviewData = ownershipCheck.review;

    // =============================
    // ✅ LOCATION OWNERSHIP CHECK
    // =============================
    const locationCheck = await verifyLocationOwnership(reviewData.locationId, uid);
    if (!locationCheck.valid) {
      return NextResponse.json(
        { error: locationCheck.error || 'Location access denied' },
        { status: 403 }
      );
    }

    // Check if review already has reply on Google
    if (reviewData?.reviewReply?.comment) {
      return NextResponse.json({
        error: 'This review already has a reply on Google'
      }, { status: 400 });
    }

    // =============================
    // CHECK USER HAS GOOGLE CONNECTED
    // =============================
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

    // Verify location matches
    if (userData.googleLocationId !== reviewData.locationId) {
      return NextResponse.json({
        error: 'Location mismatch. Please reconnect Google Business Profile.'
      }, { status: 400 });
    }

    // =============================
    // PREPARE REVIEW NAME FOR GOOGLE API
    // =============================
    const accountId = userData.googleAccountId;
    const locationId = userData.googleLocationId;
    const reviewName = `accounts/${accountId}/locations/${locationId}/reviews/${reviewData.reviewId}`;

    // =============================
    // POST REPLY TO GOOGLE
    // =============================
    try {
      console.log(`Posting reply to Google for review: ${reviewId}`);
      
      const result = await postReviewReplyToGoogle(uid, locationId, reviewName, reply);

      // =============================
      // UPDATE STATUS TO POSTED
      // =============================
      await updateReviewStatus(
        reviewId,
        'posted',
        uid,
        reply,
        { confidence: reviewData?.aiConfidence }
      );

      // =============================
      // LOG SUCCESS
      // =============================
      await logReviewReplyPosted(uid, reviewId, {
        locationId,
        rating: reviewData?.rating,
        replyPreview: reply.substring(0, 100)
      });

      return NextResponse.json({
        success: true,
        message: 'Reply posted successfully to Google',
        data: result
      });

    } catch (apiError: any) {
      console.error('Google API error:', apiError);

      // =============================
      // UPDATE STATUS TO FAILED
      // =============================
      await updateReviewStatus(
        reviewId,
        'failed',
        uid,
        reply
      );

      // =============================
      // LOG FAILURE
      // =============================
      await logReviewFailed(uid, reviewId, {
        locationId,
        stage: 'post',
        error: apiError.message,
        rating: reviewData?.rating
      });

      // Handle specific errors
      if (apiError.message?.includes('rate limit')) {
        return NextResponse.json({
          error: 'Google API rate limit exceeded. Please wait 5 minutes and try again.'
        }, { status: 429 });
      } else if (apiError.message?.includes('401')) {
        return NextResponse.json({
          error: 'Google access expired. Please reconnect your business profile.'
        }, { status: 401 });
      } else if (apiError.message?.includes('403')) {
        return NextResponse.json({
          error: 'You do not have permission to reply to this review. Please check Google Business Profile permissions.'
        }, { status: 403 });
      } else {
        return NextResponse.json({
          error: apiError.message || 'Failed to post reply to Google'
        }, { status: 500 });
      }
    }

  } catch (error) {
    console.error('Post reply API error:', error);
    return NextResponse.json({
      error: 'Internal server error. Please try again.'
    }, { status: 500 });
  }
}