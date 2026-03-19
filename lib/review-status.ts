import 'server-only';
import { adminDb } from './firebase-admin';
import {
  canTransitionTo,
  canPostToGoogle,
  getNextAction,
  getStatusColor,
  getStatusLabel,
  needsAttention,
  type ReviewStatus
} from './review-status-shared';

export interface Review {
  userId: string;
  locationId: string;
  reviewerName: string;
  rating: number;
  comment: string;
  source: "google";
  status: ReviewStatus;
  reply?: string;
  aiConfidence?: number;
  createdAt: Date;
  updatedAt?: Date;
  repliedAt?: Date;
  regenerateCount?: number;
}

export {
  canTransitionTo,
  canPostToGoogle,
  getNextAction,
  getStatusColor,
  getStatusLabel,
  needsAttention,
  type ReviewStatus
};

// --------------------------------
// UPDATE REVIEW STATUS
// --------------------------------

export async function updateReviewStatus(
  reviewId: string,
  newStatus: ReviewStatus,
  userId: string,
  reply?: string,
  metadata?: { confidence?: number }
): Promise<boolean> {

  try {

    const reviewRef = adminDb.collection('reviews').doc(reviewId);
    const reviewDoc = await reviewRef.get();

    if (!reviewDoc.exists) {
      console.error('Review not found');
      return false;
    }

    const reviewData = reviewDoc.data() as Review;

    // ownership validation
    if (reviewData.userId !== userId) {
      console.error('Unauthorized review access');
      return false;
    }

    // transition validation
    if (!canTransitionTo(reviewData.status, newStatus)) {
      console.error(`Invalid transition ${reviewData.status} -> ${newStatus}`);
      return false;
    }

    const updateData: any = {
      status: newStatus,
      updatedAt: new Date()
    };

    if (reply) {
      updateData.reply = reply;
    }

    if (metadata?.confidence !== undefined) {
      updateData.aiConfidence = metadata.confidence;
    }

    if (newStatus === 'posted') {
      updateData.repliedAt = new Date();
    }

    await reviewRef.update(updateData);

    return true;

  } catch (error) {

    console.error('Error updating review status', error);
    return false;

  }

}

// --------------------------------
// BULK STATUS UPDATE
// --------------------------------

export async function bulkUpdateReviewStatus(
  reviewIds: string[],
  newStatus: ReviewStatus,
  userId: string
): Promise<{ success: number; failed: number }> {

  const results = await Promise.all(
    reviewIds.map(id =>
      updateReviewStatus(id, newStatus, userId)
    )
  );

  const success = results.filter(Boolean).length;
  const failed = results.length - success;

  return { success, failed };

}

// --------------------------------
// GET REVIEWS BY STATUS
// --------------------------------

export async function getReviewsByStatus(
  userId: string,
  status: ReviewStatus,
  limit: number = 50
): Promise<any[]> {

  const snapshot = await adminDb
    .collection('reviews')
    .where('userId', '==', userId)
    .where('status', '==', status)
    .orderBy('createdAt', 'desc')
    .limit(limit)
    .get();

  return snapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data()
  }));

}

// --------------------------------
// POSTING HELPERS
// --------------------------------

export function getFailureReason(review: any): string {

  if (!review || review.status !== 'failed') return '';

  return review.lastError?.message || 'Unknown error';

}

export async function markAsPosted(
  reviewId: string,
  userId: string,
  reply: string
): Promise<boolean> {

  return updateReviewStatus(
    reviewId,
    'posted',
    userId,
    reply
  );

}

export async function markAsFailed(
  reviewId: string,
  userId: string,
  errorMessage: string
): Promise<boolean> {

  try {

    const reviewRef = adminDb.collection('reviews').doc(reviewId);

    await reviewRef.update({

      status: 'failed',
      updatedAt: new Date(),
      lastError: {
        message: errorMessage,
        timestamp: new Date()
      }

    });

    return true;

  } catch (error) {

    console.error('Error marking review failed', error);
    return false;

  }

}

export async function retryFailedReview(
  reviewId: string,
  userId: string
): Promise<boolean> {

  return updateReviewStatus(
    reviewId,
    'new',
    userId
  );

}

// --------------------------------
// REVIEW STATS
// --------------------------------

export async function getReviewStats(
  userId: string
): Promise<Record<ReviewStatus, number>> {

  const stats: Record<ReviewStatus, number> = {
    new: 0,
    ai_generated: 0,
    approved: 0,
    posted: 0,
    failed: 0
  };

  const snapshot = await adminDb
    .collection('reviews')
    .where('userId', '==', userId)
    .get();

  snapshot.docs.forEach(doc => {

    const status = doc.data().status as ReviewStatus;

    if (stats[status] !== undefined) {
      stats[status]++;
    }

  });

  return stats;

}
