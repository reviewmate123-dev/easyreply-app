// lib/auto-generate.ts
// Auto generate replies for pending questions (no alerts)

import { adminDb } from './firebase-admin';
import { generateAIReply } from './openai';
import { getRequiredCredits, hasEnoughCredits } from './credits';
import { FieldValue } from 'firebase-admin/firestore';

export interface AutoGenerateResult {
  questionId: string;
  success: boolean;
  reply?: string;
  error?: string;
  creditDeducted?: number;
}

// Auto generate for a single question
export async function autoGenerateForQuestion(
  uid: string,
  questionId: string,
  questionText: string,
  businessContext: any
): Promise<AutoGenerateResult> {
  try {
    // Get user data
    const userRef = adminDb.collection('users').doc(uid);
    const userDoc = await userRef.get();
    const userData = userDoc.data();

    if (!userData) {
      return {
        questionId,
        success: false,
        error: 'User not found'
      };
    }

    // Check if user has enough credits
    const requiredCredits = 2; // Q&A = 2 credits
    if (!hasEnoughCredits(userData.credits || 0, requiredCredits)) {
      return {
        questionId,
        success: false,
        error: 'Insufficient credits'
      };
    }

    // Generate AI reply
    const { text: reply, error: aiError } = await generateAIReply(questionText, {
      businessName: businessContext?.businessName || 'Our Business',
      category: businessContext?.category || 'Local Business',
      tone: businessContext?.tone || 'friendly',
      description: businessContext?.description || '',
      city: businessContext?.city || 'your city',
      keywords: businessContext?.keywords || [],
      language: businessContext?.language || ['english'],
      length: 'medium'
    });

    if (aiError || !reply) {
      return {
        questionId,
        success: false,
        error: aiError || 'Generation failed'
      };
    }

    // Update question in transaction
    await adminDb.runTransaction(async (transaction) => {
      const questionRef = adminDb.collection('questions').doc(questionId);
      
      transaction.update(questionRef, {
        status: 'ai_generated',
        aiReply: reply,
        generatedAt: FieldValue.serverTimestamp()
      });

      transaction.update(userRef, {
        credits: userData.credits - requiredCredits
      });

      const historyRef = adminDb.collection('questionHistory').doc();
      transaction.set(historyRef, {
        uid,
        questionId,
        actionType: 'auto_generated',
        timestamp: FieldValue.serverTimestamp(),
        metadata: {
          creditDeducted: requiredCredits
        }
      });
    });

    return {
      questionId,
      success: true,
      reply,
      creditDeducted: requiredCredits
    };

  } catch (error: any) {
    console.error(`Auto generate error for question ${questionId}:`, error);
    return {
      questionId,
      success: false,
      error: error.message || 'Unknown error'
    };
  }
}

// Auto generate for all pending questions of a user
export async function autoGenerateForUser(
  uid: string,
  limit: number = 10
): Promise<AutoGenerateResult[]> {
  try {
    // Get user data for business context
    const userDoc = await adminDb.collection('users').doc(uid).get();
    const userData = userDoc.data();
    const businessContext = userData?.businessContext;

    // Get pending questions
    const questionsSnapshot = await adminDb.collection('questions')
      .where('uid', '==', uid)
      .where('status', '==', 'pending')
      .limit(limit)
      .get();

    if (questionsSnapshot.empty) {
      return [];
    }

    // Generate for each question
    const results = await Promise.all(
      questionsSnapshot.docs.map(doc =>
        autoGenerateForQuestion(
          uid,
          doc.id,
          doc.data().questionText,
          businessContext
        )
      )
    );

    return results;

  } catch (error: any) {
    console.error(`Auto generate error for user ${uid}:`, error);
    return [];
  }
}

// Auto generate for multiple users
export async function autoGenerateForUsers(
  userIds: string[],
  questionsPerUser: number = 5
): Promise<{ [uid: string]: AutoGenerateResult[] }> {
  const results: { [uid: string]: AutoGenerateResult[] } = {};

  for (const uid of userIds) {
    const userResults = await autoGenerateForUser(uid, questionsPerUser);
    if (userResults.length > 0) {
      results[uid] = userResults;
    }
    // Small delay to avoid rate limits
    await new Promise(resolve => setTimeout(resolve, 500));
  }

  return results;
}

// ============================================
// 🔥 REVIEW AUTO-GENERATE FUNCTIONS - ADD AT END OF FILE
// ============================================

import { generateReviewReply } from './review-generator';
import { updateReviewStatus } from './review-status';

export interface AutoGenerateReviewResult {
  reviewId: string;
  success: boolean;
  reply?: string;
  error?: string;
  creditDeducted?: number;
  confidence?: number;
}

/**
 * Auto generate reply for a single review
 */
export async function autoGenerateForReview(
  uid: string,
  reviewId: string,
  reviewData: any,
  businessContext: any
): Promise<AutoGenerateReviewResult> {
  try {
    // Get user data
    const userRef = adminDb.collection('users').doc(uid);
    const userDoc = await userRef.get();
    const userData = userDoc.data();

    if (!userData) {
      return {
        reviewId,
        success: false,
        error: 'User not found'
      };
    }

    // Check if user has enough credits
    const requiredCredits = 1; // Review = 1 credit
    if (!hasEnoughCredits(userData.credits || 0, requiredCredits)) {
      return {
        reviewId,
        success: false,
        error: 'Insufficient credits'
      };
    }

    // Generate AI reply
    const result = await generateReviewReply({
      comment: reviewData.comment,
      rating: reviewData.rating || 0,
      reviewerName: reviewData.reviewerName,
      context: businessContext,
      tone: businessContext?.tone || 'friendly'
    });

    if (result.error || !result.reply) {
      return {
        reviewId,
        success: false,
        error: result.error || 'Generation failed'
      };
    }

    // Update review in transaction
    await adminDb.runTransaction(async (transaction) => {
      const reviewRef = adminDb.collection('reviews').doc(reviewId);
      
      transaction.update(reviewRef, {
        status: 'ai_generated',
        reply: result.reply,
        aiConfidence: result.confidence,
        generatedAt: new Date()
      });

      transaction.update(userRef, {
        credits: userData.credits - requiredCredits
      });

      const historyRef = adminDb.collection('usageHistory').doc();
      transaction.set(historyRef, {
        uid,
        reviewId,
        action: 'auto_generated',
        rating: reviewData.rating,
        confidence: result.confidence,
        creditDeducted: requiredCredits,
        timestamp: new Date()
      });
    });

    return {
      reviewId,
      success: true,
      reply: result.reply,
      confidence: result.confidence,
      creditDeducted: requiredCredits
    };

  } catch (error: any) {
    console.error(`Auto generate error for review ${reviewId}:`, error);
    return {
      reviewId,
      success: false,
      error: error.message || 'Unknown error'
    };
  }
}

/**
 * Auto generate for all new reviews of a user
 */
export async function autoGenerateReviewsForUser(
  uid: string,
  limit: number = 10
): Promise<AutoGenerateReviewResult[]> {
  try {
    // Get user data for business context
    const userDoc = await adminDb.collection('users').doc(uid).get();
    const userData = userDoc.data();
    const businessContext = userData?.businessContext;

    // Get new reviews
    const reviewsSnapshot = await adminDb.collection('reviews')
      .where('uid', '==', uid)
      .where('status', '==', 'new')
      .limit(limit)
      .get();

    if (reviewsSnapshot.empty) {
      return [];
    }

    // Generate for each review
    const results = await Promise.all(
      reviewsSnapshot.docs.map(doc =>
        autoGenerateForReview(
          uid,
          doc.id,
          doc.data(),
          businessContext
        )
      )
    );

    return results;

  } catch (error: any) {
    console.error(`Auto generate error for user ${uid}:`, error);
    return [];
  }
}

/**
 * Auto generate for multiple users
 */
export async function autoGenerateReviewsForUsers(
  userIds: string[],
  reviewsPerUser: number = 5
): Promise<{ [uid: string]: AutoGenerateReviewResult[] }> {
  const results: { [uid: string]: AutoGenerateReviewResult[] } = {};

  for (const uid of userIds) {
    const userResults = await autoGenerateReviewsForUser(uid, reviewsPerUser);
    if (userResults.length > 0) {
      results[uid] = userResults;
    }
    // Small delay to avoid rate limits
    await new Promise(resolve => setTimeout(resolve, 500));
  }

  return results;
}