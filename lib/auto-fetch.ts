// lib/auto-fetch.ts
// Auto fetch system - har 1 hour mein fetch karega (no alerts)

import { adminDb } from './firebase-admin';
import { fetchGoogleQuestions } from './google-api';
import { refreshAccessTokenIfNeeded } from './token-refresh';
import { FieldValue } from 'firebase-admin/firestore';

export interface FetchResult {
  userId: string;
  success: boolean;
  newQuestions: number;
  error?: string;
  timestamp: Date;
}

// Auto fetch for a single user
export async function autoFetchForUser(uid: string): Promise<FetchResult> {
  try {
    const userRef = adminDb.collection('users').doc(uid);
    const userDoc = await userRef.get();

    if (!userDoc.exists) {
      return {
        userId: uid,
        success: false,
        newQuestions: 0,
        error: 'User not found',
        timestamp: new Date()
      };
    }

    const userData = userDoc.data();

    // Check if user has Google connected
    if (!userData?.googleConnected || !userData?.googleLocationId) {
      return {
        userId: uid,
        success: false,
        newQuestions: 0,
        error: 'Google not connected',
        timestamp: new Date()
      };
    }

    // Check last fetch time - don't fetch too frequently
    const lastFetch = userData.lastQuestionSync?.toDate?.() || new Date(0);
    const now = new Date();
    const hoursSinceLastFetch = (now.getTime() - lastFetch.getTime()) / (1000 * 60 * 60);

    // If last fetch was less than 1 hour ago, skip
    if (hoursSinceLastFetch < 1) {
      return {
        userId: uid,
        success: true,
        newQuestions: 0,
        error: 'Skipped - too soon',
        timestamp: new Date()
      };
    }

    // Refresh token if needed
    const tokens = await refreshAccessTokenIfNeeded(uid);
    if (!tokens) {
      return {
        userId: uid,
        success: false,
        newQuestions: 0,
        error: 'Token refresh failed',
        timestamp: new Date()
      };
    }

    // Fetch questions from Google
    const googleQuestions = await fetchGoogleQuestions(uid, userData.googleLocationId);

    // Store in Firestore
    const batch = adminDb.batch();
    let newCount = 0;

    for (const q of googleQuestions) {
      const questionId = q.name?.split('/').pop();
      if (!questionId) continue;

      const questionRef = adminDb.collection('questions').doc(questionId);
      const questionDoc = await questionRef.get();

      if (!questionDoc.exists) {
        batch.set(questionRef, {
          uid,
          locationId: userData.googleLocationId,
          text: q.text,
          askerName: q.author?.displayName || 'Anonymous',
          status: q.answer ? 'external_replied' : 'pending',
          createdAt: FieldValue.serverTimestamp(),
          fetchedAt: FieldValue.serverTimestamp()
        });
        newCount++;
      }
    }

    if (newCount > 0) {
      await batch.commit();
    }

    // Update last sync time
    await userRef.update({
      lastQuestionSync: FieldValue.serverTimestamp()
    });

    return {
      userId: uid,
      success: true,
      newQuestions: newCount,
      timestamp: new Date()
    };

  } catch (error: any) {
    console.error(`Auto fetch error for user ${uid}:`, error);
    return {
      userId: uid,
      success: false,
      newQuestions: 0,
      error: error.message || 'Unknown error',
      timestamp: new Date()
    };
  }
}

// Auto fetch for multiple users (batch processing)
export async function autoFetchForUsers(
  userIds: string[],
  batchSize: number = 10
): Promise<FetchResult[]> {
  const results: FetchResult[] = [];

  // Process in batches to avoid rate limits
  for (let i = 0; i < userIds.length; i += batchSize) {
    const batch = userIds.slice(i, i + batchSize);
    const batchResults = await Promise.all(
      batch.map(uid => autoFetchForUser(uid))
    );
    results.push(...batchResults);

    // Add delay between batches
    if (i + batchSize < userIds.length) {
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
  }

  return results;
}

// Get users eligible for auto fetch
export async function getEligibleUsersForFetch(
  limit: number = 50
): Promise<string[]> {
  const now = new Date();
  const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);

  const usersSnapshot = await adminDb.collection('users')
    .where('googleConnected', '==', true)
    .where('lastQuestionSync', '<', oneHourAgo)
    .orderBy('lastQuestionSync', 'asc')
    .limit(limit)
    .get();

  return usersSnapshot.docs.map(doc => doc.id);
}