// lib/history-logger.ts
// Har action log karta hai

import { db } from './firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';

// EXISTING Action Types + REVIEW Action Types ADD kiye
export type ActionType = 
  // Q&A Actions (existing)
  | 'question_fetched'
  | 'ai_generated'
  | 'regenerated'
  | 'approved'
  | 'posted'
  | 'failed'
  | 'auto_posted'
  | 'auto_skipped'
  | 'auto_failed'
  | 'warning_shown'
  | 'warning_accepted'
  | 'warning_cancelled'
  
  // REVIEW Actions - YEH SAB ADD KIYE
  | 'review_fetched'
  | 'review_ai_generated'
  | 'review_reply_posted'
  | 'review_failed'
  | 'review_manual_reply';

export interface HistoryEntry {
  uid: string;
  questionId: string;
  actionType: ActionType;
  metadata?: any;
  timestamp: any;
}

// EXISTING logAction function - YEH VESA HI RAHEGA
export async function logAction(
  uid: string,
  questionId: string,
  actionType: ActionType,
  metadata?: any
): Promise<void> {
  
  try {
    await addDoc(collection(db, 'questionHistory'), {
      uid,
      questionId,
      actionType,
      metadata,
      timestamp: serverTimestamp()
    });
  } catch (error) {
    console.error('Failed to log action:', error);
    // Non-critical, don't throw
  }
}

// EXISTING helper function - YEH VESA HI RAHEGA
export async function logRegenerateWithWarning(
  uid: string,
  questionId: string,
  warningAccepted: boolean,
  extraCredits: number
): Promise<void> {
  
  await logAction(uid, questionId, warningAccepted ? 'warning_accepted' : 'warning_cancelled', {
    extraCredits,
    timestamp: new Date().toISOString()
  });
  
  if (warningAccepted) {
    await logAction(uid, questionId, 'regenerated', {
      creditDeducted: extraCredits
    });
  }
}

// ============================================
// 🔥 REVIEW LOGGING FUNCTIONS - YEH SAB NAYE ADD KIYE
// ============================================

/**
 * Jab review Google se fetch ho to ye use karo
 */
export async function logReviewFetched(
  uid: string,
  reviewId: string,
  metadata?: {
    locationId?: string;
    reviewerName?: string;
    rating?: number;
    commentPreview?: string;
    source?: string;
  }
): Promise<void> {
  await logAction(uid, reviewId, 'review_fetched', {
    ...metadata,
    actionTime: new Date().toISOString()
  });
}

/**
 * Jab AI review ka reply generate kare to ye use karo
 */
export async function logReviewAIGenerated(
  uid: string,
  reviewId: string,
  metadata?: {
    locationId?: string;
    rating?: number;
    replyPreview?: string;
    confidence?: number;  // 0-100
  }
): Promise<void> {
  await logAction(uid, reviewId, 'review_ai_generated', {
    ...metadata,
    actionTime: new Date().toISOString()
  });
}

/**
 * Jab review reply Google pe post ho jaye to ye use karo
 */
export async function logReviewReplyPosted(
  uid: string,
  reviewId: string,
  metadata?: {
    locationId?: string;
    rating?: number;
    replyPreview?: string;
    postedAt?: string;
  }
): Promise<void> {
  await logAction(uid, reviewId, 'review_reply_posted', {
    ...metadata,
    postedAt: metadata?.postedAt || new Date().toISOString(),
    actionTime: new Date().toISOString()
  });
}

/**
 * Jab review operation fail ho to ye use karo
 */
export async function logReviewFailed(
  uid: string,
  reviewId: string,
  metadata?: {
    locationId?: string;
    stage: 'fetch' | 'generate' | 'post';  // Kahaan fail hua
    error?: string;
    rating?: number;
  }
): Promise<void> {
  await logAction(uid, reviewId, 'review_failed', {
    ...metadata,
    actionTime: new Date().toISOString()
  });
}

/**
 * Jab user manually review ka reply likhe to ye use karo
 */
export async function logReviewManualReply(
  uid: string,
  reviewId: string,
  metadata?: {
    locationId?: string;
    rating?: number;
    replyPreview?: string;
  }
): Promise<void> {
  await logAction(uid, reviewId, 'review_manual_reply', {
    ...metadata,
    actionTime: new Date().toISOString()
  });
}