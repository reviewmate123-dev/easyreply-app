// app/api/cron-expiry/route.ts
import { NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';
import { processAutoReviewsForUser } from '@/lib/auto-reply';
import { processAutoRepliesForUser } from '@/lib/auto-reply';
import { autoGenerateReviewsForUser } from '@/lib/auto-generate';

export async function GET(request: Request) {

  const { searchParams } = new URL(request.url);
  const urlSecret = searchParams.get('secret');
  const authHeader = request.headers.get('authorization');

  const secret = process.env.CRON_SECRET;

  const isValid = secret && (
    authHeader === `Bearer ${secret}` ||
    urlSecret === secret
  );

  if (!isValid) {
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 401 }
    );
  }

  try {

    const now = new Date();

    const results: any = {
      expiryDowngrades: 0,
      reviewAutomation: {
        processed: 0,
        posted: 0,
        failed: 0,
        skipped: 0,
        users: 0
      },
      reviewGeneration: {
        generated: 0,
        failed: 0,
        users: 0
      },
      qaAutomation: {
        processed: 0,
        posted: 0,
        failed: 0,
        users: 0
      }
    };

    // =====================================================
    // GLOBAL AUTOMATION SETTINGS
    // =====================================================

    const settingsDoc = await adminDb
      .collection('settings')
      .doc('automation')
      .get();

    const settings = settingsDoc.data() || {};

    const globalReviewEnabled = settings.globalAutoReviewEnabled ?? true;
    const globalQAEnabled = settings.globalAutoQAEnabled ?? true;

    // =====================================================
    // PART 1: EXPIRY CHECK
    // =====================================================

    const paidUsers = await adminDb.collection('users')
      .where('plan', '!=', 'free')
      .get();

    const batch = adminDb.batch();
    let count = 0;

    paidUsers.forEach(doc => {

      const userData = doc.data();

      const planExpiry = userData.planExpiry?.toDate
        ? userData.planExpiry.toDate()
        : new Date(userData.planExpiry);

      if (planExpiry < now) {

        batch.update(doc.ref, {
          plan: 'free',
          planExpiry: null
        });

        count++;

      }

    });

    if (count > 0) {

      await batch.commit();
      results.expiryDowngrades = count;

    }

    // =====================================================
    // STOP IF GLOBAL AUTOMATION OFF
    // =====================================================

    if (!globalReviewEnabled && !globalQAEnabled) {

      return NextResponse.json({
        success: true,
        message: 'All automation globally disabled',
        results
      });

    }

    // =====================================================
    // PART 2: REVIEW + QA AUTOMATION
    // =====================================================

    console.log('🚀 Starting automation cron...');

    const usersSnapshot = await adminDb.collection('users')
      .where('plan', 'in', ['growth', 'pro'])
      .limit(50)
      .get();

    const userIds = usersSnapshot.docs.map(doc => doc.id);

    if (userIds.length > 0) {

      for (const uid of userIds) {

        try {

          // ======================================
          // REVIEW AI GENERATION
          // ======================================

          if (globalReviewEnabled) {

            const generateResults = await autoGenerateReviewsForUser(uid, 5);

            generateResults.forEach((r: any) => {

              if (r.success) {
                results.reviewGeneration.generated++;
              } else {
                results.reviewGeneration.failed++;
              }

            });

            if (generateResults.length > 0) {
              results.reviewGeneration.users++;
            }

          }

          // ======================================
          // REVIEW AUTO POST
          // ======================================

          if (globalReviewEnabled) {

            const replyResults = await processAutoReviewsForUser(uid, 5);

            replyResults.forEach((r: any) => {

              results.reviewAutomation.processed++;

              if (r.autoPosted) {
                results.reviewAutomation.posted++;
              }
              else if (r.success && !r.autoPosted) {
                results.reviewAutomation.skipped++;
              }
              else {
                results.reviewAutomation.failed++;
              }

            });

            if (replyResults.length > 0) {
              results.reviewAutomation.users++;
            }

          }

          // ======================================
          // Q&A AUTOMATION
          // ======================================

          if (globalQAEnabled) {

            const qaResults = await processAutoRepliesForUser(uid, 5);

            qaResults.forEach((r: any) => {

              results.qaAutomation.processed++;

              if (r.autoPosted) {
                results.qaAutomation.posted++;
              }
              else if (!r.success) {
                results.qaAutomation.failed++;
              }

            });

            if (qaResults.length > 0) {
              results.qaAutomation.users++;
            }

          }

          await new Promise(resolve => setTimeout(resolve, 1000));

        }

        catch (userError) {

          console.error(`Error processing user ${uid}:`, userError);

        }

      }

    }

    console.log('✅ Automation complete:', results);

    return NextResponse.json({
      success: true,
      message: `Cron executed successfully`,
      results,
      timestamp: new Date().toISOString()
    });

  }

  catch (error) {

    console.error('Cron error:', error);

    return NextResponse.json(
      {
        error: 'Server error',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );

  }

}

export async function POST(request: Request) {
  return GET(request);
}