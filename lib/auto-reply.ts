// lib/auto-reply.ts
// Auto-reply engine with smart delay and confidence check

import { adminDb } from './firebase-admin';
import { generateAIReply } from './openai';
import { postAnswerToGoogle } from './google-api';
import { refreshAccessTokenIfNeeded } from './token-refresh';
import { checkConfidence } from './confidence-check';
import { isSafeCategory } from './category-rules';
import { containsSensitiveKeywords } from './sensitive-keywords';
import { FieldValue } from 'firebase-admin/firestore';
import { logAction } from './history-logger';
import { generateReviewReply } from './review-generator';
import { postReviewReplyToGoogle } from './google-api';
import { updateReviewStatus } from './review-status';
import { logReviewAIGenerated, logReviewReplyPosted, logReviewFailed } from './history-logger';
import { hasEnoughCredits } from './credits';

export interface AutoReplyResult {
  questionId: string;
  success: boolean;
  autoPosted: boolean;
  reason?: string;
  confidence?: number;
  delay?: number;
}

// Smart delay function (Task 39)
export function getSmartDelay(): number {
  // Random delay between 15 to 45 minutes (in milliseconds)
  const minDelay = 15 * 60 * 1000;  // 15 minutes
  const maxDelay = 45 * 60 * 1000;  // 45 minutes
  
  return Math.floor(Math.random() * (maxDelay - minDelay + 1)) + minDelay;
}

// Check if auto-reply should be attempted for this question
export async function shouldAutoReply(
  uid: string,
  questionId: string,
  questionText: string,
  category: string,
  businessContext?: any
): Promise<{ should: boolean; reason: string; confidence?: number }> {
  
  // Check 1: Category safe hai?
  if (!isSafeCategory(category)) {
    return { 
      should: false, 
      reason: `Category '${category}' requires manual review` 
    };
  }

  // Check 2: Sensitive keywords present?
  const { hasSensitive, matchedKeywords } = containsSensitiveKeywords(questionText);
  if (hasSensitive) {
    return { 
      should: false, 
      reason: `Sensitive keywords detected: ${matchedKeywords.join(', ')}` 
    };
  }

  // Check 3: Generate AI reply and check confidence
  const aiReply = await generateAIReply(questionText, {
    businessName: businessContext?.businessName || 'Our Business',
    category: category,
    tone: businessContext?.tone || 'friendly',
    description: businessContext?.description || '',
    city: businessContext?.city || 'your city',
    keywords: businessContext?.keywords || [],
    language: businessContext?.language || ['english'],
    length: 'medium'
  });

  if (aiReply.error || !aiReply.text) {
    return { 
      should: false, 
      reason: 'AI generation failed' 
    };
  }

  // Check confidence (Task 38)
  const confidence = await checkConfidence(questionText, aiReply.text, category);
  
  if (confidence.score < 80) {
    return { 
      should: false, 
      reason: `Low confidence (${confidence.score}%)`,
      confidence: confidence.score 
    };
  }

  return { 
    should: true, 
    reason: 'Auto-reply eligible',
    confidence: confidence.score 
  };
}

// Main auto-reply function
export async function processAutoReply(
  uid: string,
  questionId: string,
  questionText: string,
  locationId: string,
  category: string,
  businessContext?: any
): Promise<AutoReplyResult> {
  
  try {
    // Step 1: Check if auto-reply should happen
    const check = await shouldAutoReply(uid, questionId, questionText, category, businessContext);
    
    if (!check.should) {
      await logAction(uid, questionId, 'auto_skipped', {
        reason: check.reason,
        confidence: check.confidence,
        timestamp: new Date().toISOString()
      });
      
      return {
        questionId,
        success: true,
        autoPosted: false,
        reason: check.reason,
        confidence: check.confidence
      };
    }

    // Step 2: Get user data for credits
    const userRef = adminDb.collection('users').doc(uid);
    const userDoc = await userRef.get();
    const userData = userDoc.data();

    // Respect user setting: auto replies can be toggled off
    if (!userData?.autoReplyEnabled) {
      await logAction(uid, questionId, 'auto_skipped', {
        reason: 'Auto-reply disabled',
        timestamp: new Date().toISOString()
      });
      
      return {
        questionId,
        success: true,
        autoPosted: false,
        reason: 'Auto-reply disabled'
      };
    }

    if (!userData) {
      return {
        questionId,
        success: false,
        autoPosted: false,
        reason: 'User not found'
      };
    }

    // Step 3: Check credits (Q&A = 2 credits)
    if (userData.credits < 2) {
      await logAction(uid, questionId, 'auto_failed', {
        reason: 'Insufficient credits',
        credits: userData.credits,
        timestamp: new Date().toISOString()
      });
      
      return {
        questionId,
        success: false,
        autoPosted: false,
        reason: 'Insufficient credits'
      };
    }

    // Step 4: Generate AI reply again (or use cached)
    const aiReply = await generateAIReply(questionText, {
      businessName: businessContext?.businessName || 'Our Business',
      category: category,
      tone: businessContext?.tone || 'friendly',
      description: businessContext?.description || '',
      city: businessContext?.city || 'your city',
      keywords: businessContext?.keywords || [],
      language: businessContext?.language || ['english'],
      length: 'medium'
    });

    if (aiReply.error || !aiReply.text) {
      return {
        questionId,
        success: false,
        autoPosted: false,
        reason: 'AI generation failed'
      };
    }

    // Step 5: Smart delay (Task 39)
    const delay = getSmartDelay();
    console.log(`Auto-reply for question ${questionId} will post after ${delay/60000} minutes`);
    
    // Wait for the delay
    await new Promise(resolve => setTimeout(resolve, delay));

    // ============================================
    // 🔥 FIX 1: Q&A - STEP 6 & 7 - REMOVED POST TO GOOGLE, ONLY SAVE AI REPLY
    // ============================================

    // ✅ NEW: Step 6 & 7 - SAVE AI REPLY ONLY (NO POST)
    await adminDb.runTransaction(async (transaction) => {
      const questionRef = adminDb.collection('questions').doc(questionId);
      
      transaction.update(questionRef, {
        status: 'ai_generated',           // ✅ Changed from 'posted' to 'ai_generated'
        aiReply: aiReply.text,
        generatedAt: FieldValue.serverTimestamp(),  // ✅ Changed from postedAt to generatedAt
        autoReplied: true,
        autoReplyConfidence: check.confidence,
        autoReplyDelay: delay
      });

      // Deduct credits (2 credits for Q&A)
      transaction.update(userRef, {
        credits: userData.credits - 2
      });

      // Add to history
      const historyRef = adminDb.collection('questionHistory').doc();
      transaction.set(historyRef, {
        uid,
        questionId,
        actionType: 'ai_generated',       // ✅ Changed from 'auto_posted' to 'ai_generated'
        timestamp: FieldValue.serverTimestamp(),
        metadata: {
          confidence: check.confidence,
          delay: delay,
          creditDeducted: 2
        }
      });
    });

    return {
      questionId,
      success: true,
      autoPosted: false,                   // ✅ Changed from true to false
      confidence: check.confidence,
      delay
    };

  } catch (error: any) {
    console.error('Auto-reply error:', error);
    
    await logAction(uid, questionId, 'auto_failed', {
      reason: error.message || 'Unknown error',
      timestamp: new Date().toISOString()
    });

    return {
      questionId,
      success: false,
      autoPosted: false,
      reason: error.message || 'Unknown error'
    };
  }
}

// Process all pending questions for auto-reply
export async function processAutoRepliesForUser(
  uid: string,
  limit: number = 10
): Promise<AutoReplyResult[]> {
  
  const userDoc = await adminDb.collection('users').doc(uid).get();
  const userData = userDoc.data();
  
  if (!userData?.autoReplyEnabled) {
    return [];
  }

  const businessContext = userData?.businessContext;
  const category = businessContext?.category || 'Local Business';

  // 🔥 FIX: Dynamic status based on user setting
  let statusToFetch = []

  if (userData?.autoReplyEnabled) {
    statusToFetch = ['ai_generated']  // Auto mode ON → fetch AI generated questions
  } else {
    statusToFetch = ['pending']        // Auto mode OFF → fetch pending questions
  }

  const questionsSnapshot = await adminDb.collection('questions')
    .where('uid', '==', uid)
    .where('status', 'in', statusToFetch)  // ✅ Changed from '==' to 'in'
    .limit(limit)
    .get();

  if (questionsSnapshot.empty) {
    return [];
  }

  const results: AutoReplyResult[] = [];

  for (const doc of questionsSnapshot.docs) {
    const questionData = doc.data();
    
    const result = await processAutoReply(
      uid,
      doc.id,
      questionData.text,
      questionData.locationId,
      category,
      businessContext
    );

    results.push(result);

    // Small delay between questions
    await new Promise(resolve => setTimeout(resolve, 1000));
  }

  return results;
}

// ============================================
// 🔥 REVIEW AUTO-REPLY FUNCTIONS
// ============================================

export interface AutoReviewReplyResult {
  reviewId: string;
  success: boolean;
  autoPosted: boolean;
  reason?: string;
  confidence?: number;
  delay?: number;
}

/**
 * Check if review should be auto-replied
 */
export async function shouldAutoReplyReview(
  uid: string,
  reviewId: string,
  reviewData: any,
  businessContext?: any
): Promise<{ should: boolean; reason: string; confidence?: number }> {
  
  // Check 1: Review already has reply?
  if (reviewData.reply) {
    return { 
      should: false, 
      reason: 'Review already has a reply' 
    };
  }

  // Check 2: Rating-based auto-reply rules
  if (reviewData.rating >= 4) {
    // Positive reviews - always auto-reply
    return { should: true, reason: 'Positive review' };
  } else if (reviewData.rating <= 2) {
    // Negative reviews - check sensitivity
    const { containsSensitiveKeywords } = await import('./sensitive-keywords');
    const { hasSensitive } = containsSensitiveKeywords(reviewData.comment);
    
    if (hasSensitive) {
      return { 
        should: false, 
        reason: 'Negative review with sensitive content - needs manual review' 
      };
    }
    return { should: true, reason: 'Negative review - safe to reply' };
  } else {
    // 3-star reviews - check confidence
    const result = await generateReviewReply({
      comment: reviewData.comment,
      rating: reviewData.rating,
      reviewerName: reviewData.reviewerName,
      context: businessContext
    });

    if (result.error || !result.reply) {
      return { 
        should: false, 
        reason: 'AI generation failed' 
      };
    }

    if (result.confidence < 80) {
      return { 
        should: false, 
        reason: `Low confidence (${result.confidence}%)`,
        confidence: result.confidence 
      };
    }

    return { 
      should: true, 
      reason: 'Confidence check passed',
      confidence: result.confidence 
    };
  }
}

/**
 * Process auto-reply for a single review
 */
export async function processAutoReviewReply(
  uid: string,
  reviewId: string,
  locationId: string,
  businessContext?: any
): Promise<AutoReviewReplyResult> {
  
  let reviewData: any | null = null;

  try {
    // Get review data
    const reviewDoc = await adminDb.collection('reviews').doc(reviewId).get();
    if (!reviewDoc.exists) {
      return {
        reviewId,
        success: false,
        autoPosted: false,
        reason: 'Review not found'
      };
    }

    reviewData = reviewDoc.data();
    if (!reviewData) {
      return {
        reviewId,
        success: false,
        autoPosted: false,
        reason: 'Review data not found'
      };
    }

    // Check if already posted
    if (reviewData?.status === 'posted') {
      return {
        reviewId,
        success: true,
        autoPosted: false,
        reason: 'Already posted'
      };
    }

    // Step 1: Check if should auto-reply
    const check = await shouldAutoReplyReview(uid, reviewId, reviewData, businessContext);
    
    if (!check.should) {
      // Use 'post' as stage since it's the closest match
      await logReviewFailed(uid, reviewId, {
        locationId,
        stage: 'post',
        error: check.reason,
        rating: reviewData?.rating
      });
      
      return {
        reviewId,
        success: true,
        autoPosted: false,
        reason: check.reason,
        confidence: check.confidence
      };
    }

    // Step 2: Get user data for credits
    const userRef = adminDb.collection('users').doc(uid);
    const userDoc = await userRef.get();
    const userData = userDoc.data();

    if (!userData) {
      return {
        reviewId,
        success: false,
        autoPosted: false,
        reason: 'User not found'
      };
    }

    // Step 3: Check credits (Review = 1 credit)
    if (userData.credits < 1) {
      // Use 'post' as stage
      await logReviewFailed(uid, reviewId, {
        locationId,
        stage: 'post',
        error: 'Insufficient credits',
        rating: reviewData?.rating
      });
      
      return {
        reviewId,
        success: false,
        autoPosted: false,
        reason: 'Insufficient credits'
      };
    }

    // Step 4: Generate AI reply
    const result = await generateReviewReply({
      comment: reviewData.comment,
      rating: reviewData.rating,
      reviewerName: reviewData.reviewerName,
      context: businessContext,
      tone: businessContext?.tone || 'friendly'
    });

    if (result.error || !result.reply) {
      return {
        reviewId,
        success: false,
        autoPosted: false,
        reason: result.error || 'AI generation failed'
      };
    }

    // Step 5: Smart delay (15-45 minutes)
    const delay = getSmartDelay();
    console.log(`Auto-reply for review ${reviewId} will post after ${delay/60000} minutes`);
    
    // Wait for the delay
    await new Promise(resolve => setTimeout(resolve, delay));

    // ============================================
    // 🔥 FIX 2: REVIEW - REMOVED POST TO GOOGLE, ONLY SAVE AI REPLY
    // ============================================

    // ✅ NEW: Step 6 - SAVE AI REPLY ONLY (NO POST)
    await adminDb.runTransaction(async (transaction) => {

      const reviewRef = adminDb.collection('reviews').doc(reviewId);

      transaction.update(reviewRef, {
        status: 'ai_generated',                    // ✅ Changed from 'posted' to 'ai_generated'
        reply: result.reply,
        aiConfidence: result.confidence,
        generatedAt: new Date(),                    // ✅ Changed from postedAt to generatedAt
        autoReplyDelay: delay
      });

      // Deduct credits (1 credit for review)
      transaction.update(userRef, {
        credits: userData.credits - 1
      });

      // Log to history
      const historyRef = adminDb.collection('usageHistory').doc();
      transaction.set(historyRef, {
        uid,
        reviewId,
        action: 'ai_generated',                     // ✅ Changed from 'auto_reply_posted' to 'ai_generated'
        rating: reviewData.rating,
        confidence: result.confidence,
        delay,
        creditDeducted: 1,
        timestamp: new Date()
      });

    });

    // Log AI generated
    await logReviewAIGenerated(uid, reviewId, {
      locationId,
      rating: reviewData.rating,
      replyPreview: result.reply.substring(0, 100),
      confidence: result.confidence
    });

    return {
      reviewId,
      success: true,
      autoPosted: false,                            // ✅ Changed from true to false
      confidence: result.confidence,
      delay
    };

  } catch (error: any) {
    console.error('Auto review reply error:', error);
    
    // Use 'post' as stage
    await logReviewFailed(uid, reviewId, {
      locationId,
      stage: 'post',
      error: error.message || 'Unknown error',
      rating: reviewData?.rating
    });

    return {
      reviewId,
      success: false,
      autoPosted: false,
      reason: error.message || 'Unknown error'
    };
  }
}

/**
 * Process all pending reviews for auto-reply
 */
export async function processAutoReviewsForUser(
  uid: string,
  limit: number = 10
): Promise<AutoReviewReplyResult[]> {
  
  const userDoc = await adminDb.collection('users').doc(uid).get();
  const userData = userDoc.data();
  
  // Check if auto-reply is enabled (we'll add this later)
  // For now, always process
  const businessContext = userData?.businessContext;

  // Get reviews that need auto-reply
  const reviewsSnapshot = await adminDb.collection('reviews')
    .where('uid', '==', uid)
    .where('status', 'in', ['new', 'ai_generated'])
    .limit(limit)
    .get();

  if (reviewsSnapshot.empty) {
    return [];
  }

  const results: AutoReviewReplyResult[] = [];

  for (const doc of reviewsSnapshot.docs) {
    const reviewData = doc.data();
    
    const result = await processAutoReviewReply(
      uid,
      doc.id,
      reviewData.locationId,
      businessContext
    );

    results.push(result);

    // Small delay between reviews
    await new Promise(resolve => setTimeout(resolve, 1000));
  }

  return results;
}

/**
 * Process auto-replies for all users (for cron job)
 */
export async function processAllAutoReviews(
  maxUsers: number = 50,
  reviewsPerUser: number = 5
): Promise<{ [uid: string]: AutoReviewReplyResult[] }> {
  
  // Get users with auto-reply enabled
  const usersSnapshot = await adminDb.collection('users')
    .where('plan', 'in', ['growth', 'pro']) // Only Growth/Pro users
    .limit(maxUsers)
    .get();

  const results: { [uid: string]: AutoReviewReplyResult[] } = {};

  for (const userDoc of usersSnapshot.docs) {
    const uid = userDoc.id;
    const userResults = await processAutoReviewsForUser(uid, reviewsPerUser);
    
    if (userResults.length > 0) {
      results[uid] = userResults;
    }
    
    // Small delay between users
    await new Promise(resolve => setTimeout(resolve, 2000));
  }

  return results;
}