import { NextRequest, NextResponse } from 'next/server';
import { adminAuth, adminDb } from '@/lib/firebase-admin';
import { postAnswerToGoogle } from '@/lib/google-api';
import { refreshAccessTokenIfNeeded } from '@/lib/token-refresh';
import { FieldValue } from 'firebase-admin/firestore';
import { rateLimiter } from '@/lib/rate-limiter';
import { logAction } from '@/lib/history-logger';

export async function POST(request: NextRequest) {
  try {
    // =============================
    // RATE LIMITING
    // =============================
    const ip = request.headers.get('x-forwarded-for') || 'anonymous';
    const rateLimit = await rateLimiter(ip, 20, 60 * 1000); // 20 requests per minute
    if (!rateLimit.success) {
      return NextResponse.json({ error: 'Rate limit exceeded' }, { status: 429 });
    }
    
    // =============================
    // AUTH CHECK
    // =============================
    const session = request.cookies.get('session')?.value;
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const decodedClaims = await adminAuth.verifySessionCookie(session);
    const uid = decodedClaims.uid;
    
    // =============================
    // BODY
    // =============================
    const { questionId, answer } = await request.json();
    
    if (!questionId || !answer) {
      return NextResponse.json({ error: 'Missing fields' }, { status: 400 });
    }

    // =============================
    // GET QUESTION DATA
    // =============================
    const questionRef = adminDb.collection('questions').doc(questionId);
    const questionDoc = await questionRef.get();

    if (!questionDoc.exists) {
      return NextResponse.json({ error: 'Question not found' }, { status: 404 });
    }

    const questionData = questionDoc.data();

    // =============================
    // VERIFY OWNERSHIP
    // =============================
    if (questionData?.uid !== uid) {
      await logAction(uid, questionId, 'failed', {
        reason: 'Unauthorized access attempt',
        timestamp: new Date().toISOString()
      });
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // =============================
    // CHECK IF ALREADY ANSWERED
    // =============================
    if (questionData?.status === 'posted' || questionData?.status === 'external_replied') {
      return NextResponse.json({ 
        error: 'Already answered',
        code: 'ALREADY_ANSWERED'
      }, { status: 400 });
    }

    // =============================
    // GET USER DATA
    // =============================
    const userRef = adminDb.collection('users').doc(uid);
    const userDoc = await userRef.get();
    const userData = userDoc.data();

    if (!userData) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // =============================
    // CHECK GOOGLE CONNECTION
    // =============================
    if (!userData.googleConnected || !userData.googleLocationId) {
      await logAction(uid, questionId, 'failed', {
        reason: 'Google not connected',
        timestamp: new Date().toISOString()
      });
      return NextResponse.json({ 
        error: 'Google not connected',
        code: 'GOOGLE_NOT_CONNECTED'
      }, { status: 400 });
    }

    // =============================
    // CHECK CREDITS (TASK 22)
    // =============================
    if (userData.credits < 1) {
      await logAction(uid, questionId, 'failed', {
        reason: 'Insufficient credits',
        credits: userData.credits,
        timestamp: new Date().toISOString()
      });
      
      return NextResponse.json({ 
        error: 'Insufficient credits',
        code: 'INSUFFICIENT_CREDITS'
      }, { status: 402 });
    }

    // =============================
    // RUN TRANSACTION
    // =============================
    const result = await adminDb.runTransaction(async (transaction) => {
      
      // =============================
      // POST TO GOOGLE (TASK 21)
      // =============================
      try {
        // Refresh token if needed
        const tokens = await refreshAccessTokenIfNeeded(uid);
        if (!tokens) {
          throw new Error('TOKEN_REFRESH_FAILED');
        }

        // Post to Google
        await postAnswerToGoogle(
          uid,
          questionData.locationId,
          questionData.questionName,
          answer
       );
      } catch (googleError: any) {
        console.error('Google post error:', googleError);
        
        // Log failure
        await logAction(uid, questionId, 'failed', {
          reason: 'Google API error',
          error: googleError.message,
          timestamp: new Date().toISOString()
        });
        
        throw new Error('GOOGLE_API_ERROR');
      }

      // =============================
      // UPDATE QUESTION STATUS (TASK 23)
      // =============================
      transaction.update(questionRef, {
        status: 'posted',
        aiReply: answer,
        postedAt: FieldValue.serverTimestamp()
      });

      // =============================
      // DEDUCT CREDIT
      // =============================
      transaction.update(userRef, {
        credits: userData.credits - 1
      });

      // =============================
      // HISTORY LOGGING (TASK 24)
      // =============================
      const historyRef = adminDb.collection('questionHistory').doc();
      transaction.set(historyRef, {
        uid,
        questionId,
        actionType: 'posted',
        timestamp: FieldValue.serverTimestamp(),
        metadata: {
          answerLength: answer.length,
          creditDeducted: 1
        }
      });

      return { success: true };
    });
    
    return NextResponse.json({ 
      success: true,
      message: 'Answer posted successfully'
    });

  } catch (error: any) {
    console.error('Post answer error:', error);

    // =============================
    // ERROR HANDLING (TASK 25)
    // =============================
    if (error.message === 'GOOGLE_API_ERROR') {
      return NextResponse.json({ 
        error: 'Failed to post to Google. Please try again.',
        code: 'GOOGLE_API_ERROR'
      }, { status: 500 });
    }

    if (error.message === 'TOKEN_REFRESH_FAILED') {
      return NextResponse.json({ 
        error: 'Google connection expired. Please reconnect.',
        code: 'TOKEN_EXPIRED'
      }, { status: 401 });
    }

    if (error.message === 'Insufficient credits') {
      return NextResponse.json({ 
        error: 'Insufficient credits',
        code: 'INSUFFICIENT_CREDITS'
      }, { status: 402 });
    }

    if (error.message === 'Question not found') {
      return NextResponse.json({ 
        error: 'Question not found',
        code: 'NOT_FOUND'
      }, { status: 404 });
    }

    if (error.message === 'Unauthorized') {
      return NextResponse.json({ 
        error: 'Unauthorized',
        code: 'UNAUTHORIZED'
      }, { status: 401 });
    }

    if (error.message === 'Already answered') {
      return NextResponse.json({ 
        error: 'Already answered',
        code: 'ALREADY_ANSWERED'
      }, { status: 400 });
    }
    
    return NextResponse.json({ 
      error: 'Internal server error',
      code: 'INTERNAL_ERROR'
    }, { status: 500 });
  }
}