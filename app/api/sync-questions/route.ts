import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';
import { syncQuestionsForUser } from '@/lib/question-sync';
import { syncReviewsForUser } from '@/lib/review-sync';
import { autoFetchForUsers, getEligibleUsersForFetch } from '@/lib/auto-fetch';
import { autoGenerateForUsers } from '@/lib/auto-generate';
import { getUserPlanRules, shouldAutoFetch } from '@/lib/plan-rules';

// This is a cron job endpoint - call every hour
export async function GET(request: NextRequest) {
  try {
    // Verify cron secret
    const authHeader = request.headers.get('authorization');
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // =============================
    // STEP 1: Get users using old method (backward compatibility)
    // =============================
    const usersSnapshot = await adminDb.collection('users')
      .where('googleConnected', '==', true)
      .limit(50)
      .get();
    
    const oldResults = [];
    
    // Process each user with old method
    for (const userDoc of usersSnapshot.docs) {
      try {
        const uid = userDoc.id;

        const result = await syncQuestionsForUser(uid);
        const reviewResult = await syncReviewsForUser(uid);

        oldResults.push({
          uid,
          success: true,
          newQuestions: result?.newQuestions || 0,
          newReviews: reviewResult?.newReviews || 0
        });
        
        // Small delay to avoid rate limits
        await new Promise(resolve => setTimeout(resolve, 200));
      } catch (error) {
        oldResults.push({
          uid: userDoc.id,
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }

    // =============================
    // STEP 2: Get eligible users for auto fetch (new method)
    // =============================
    const eligibleUserIds = await getEligibleUsersForFetch(50);
    
    if (eligibleUserIds.length === 0) {
      return NextResponse.json({
        message: 'Old method completed, no eligible users for auto fetch',
        oldProcessed: usersSnapshot.size,
        oldResults,
        newProcessed: 0
      });
    }

    // =============================
    // STEP 3: Filter users based on plan rules
    // =============================
    const usersToFetch: string[] = [];

    for (const uid of eligibleUserIds) {
      const userDoc = await adminDb.collection('users').doc(uid).get();
      const userData = userDoc.data();
      const plan = userData?.plan || 'basic';
      const lastFetch = userData?.lastQuestionSync?.toDate?.() || null;

      const { shouldFetch } = shouldAutoFetch(plan, lastFetch);
      if (shouldFetch) {
        usersToFetch.push(uid);
      }
    }

    if (usersToFetch.length === 0) {
      return NextResponse.json({
        message: 'No users ready for fetch based on plan rules',
        oldProcessed: usersSnapshot.size,
        oldResults,
        newProcessed: 0
      });
    }

    // =============================
    // STEP 4: Auto fetch for users
    // =============================
    const fetchResults = await autoFetchForUsers(usersToFetch, 10);

    // =============================
    // STEP 5: Get users who got new questions
    // =============================
    const usersWithNewQuestions = fetchResults
      .filter(r => r.success && r.newQuestions > 0)
      .map(r => r.userId);

    // =============================
    // STEP 6: Auto generate for users with new questions
    // =============================
    let generateResults = {};
    if (usersWithNewQuestions.length > 0) {
      generateResults = await autoGenerateForUsers(usersWithNewQuestions, 5);
    }

    // =============================
    // STEP 7: Log cron run
    // =============================
    await adminDb.collection('cronLogs').add({
      type: 'auto_sync',
      timestamp: new Date(),
      oldProcessed: usersSnapshot.size,
      eligibleUsers: eligibleUserIds.length,
      usersFetched: usersToFetch.length,
      fetchResults: fetchResults.map(r => ({
        userId: r.userId,
        newQuestions: r.newQuestions,
        success: r.success
      })),
      generateResults
    });

    return NextResponse.json({
      success: true,
      oldProcessed: usersSnapshot.size,
      oldResults,
      eligibleUsers: eligibleUserIds.length,
      usersFetched: usersToFetch.length,
      fetchResults,
      generateResults
    });

  } catch (error) {
    console.error('Cron sync error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// Manual trigger for testing (admin only)
export async function POST(request: NextRequest) {
  try {
    // Verify admin
    const session = request.cookies.get('session')?.value;
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { userIds, limit = 10, useOldMethod = false } = await request.json();

    // If useOldMethod is true, use the old sync method
    if (useOldMethod) {
      const results = [];
      const usersToProcess = userIds || [];

      for (const uid of usersToProcess) {
        try {

          const result = await syncQuestionsForUser(uid);
          const reviewResult = await syncReviewsForUser(uid);

          results.push({
            uid,
            success: true,
            newQuestions: result?.newQuestions || 0,
            newReviews: reviewResult?.newReviews || 0
          });

          await new Promise(resolve => setTimeout(resolve, 200));

        } catch (error) {
          results.push({
            uid,
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error'
          });
        }
      }

      return NextResponse.json({
        success: true,
        method: 'old',
        results
      });
    }

    // New method
    if (userIds && userIds.length > 0) {
      // Manual fetch for specific users
      const fetchResults = await autoFetchForUsers(userIds, limit);
      const usersWithNewQuestions = fetchResults
        .filter(r => r.success && r.newQuestions > 0)
        .map(r => r.userId);

      let generateResults = {};
      if (usersWithNewQuestions.length > 0) {
        generateResults = await autoGenerateForUsers(usersWithNewQuestions, 5);
      }

      return NextResponse.json({
        success: true,
        method: 'new',
        fetchResults,
        generateResults
      });
    } else {
      // Run full cron manually
      const response = await GET(request);
      return response;
    }

  } catch (error) {
    console.error('Manual sync error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}