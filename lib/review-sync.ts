import { adminDb } from './firebase-admin';
import { fetchGoogleReviews } from './google-api';
import { logReviewFetched } from './history-logger';

interface SyncResult {
  newReviews: number;
  totalFetched: number;
  errors?: string[];
}

export async function syncReviewsForUser(uid: string): Promise<SyncResult> {

  const result: SyncResult = {
    newReviews: 0,
    totalFetched: 0,
    errors: []
  };

  try {

    const userDoc = await adminDb.collection('users').doc(uid).get();
    const userData = userDoc.data();

    if (!userData?.googleLocationId) {
      throw new Error('No location ID found for user');
    }

    const locationId = userData.googleLocationId;

    console.log(`Fetching reviews for user ${uid}, location ${locationId}`);

    const reviews = await fetchGoogleReviews(uid, locationId);

    result.totalFetched = reviews.length;

    console.log(`Fetched ${reviews.length} reviews from Google`);

    for (const review of reviews) {

      try {

        const reviewData = extractReviewData(review, uid, locationId);

        const reviewRef = adminDb
          .collection('reviews')
          .doc(`${uid}_${reviewData.reviewId}`);

        /**
         * TRANSACTION FIX
         * prevents duplicate + race condition
         */

        await adminDb.runTransaction(async (transaction) => {

          const doc = await transaction.get(reviewRef);

          if (!doc.exists) {

            transaction.set(reviewRef, {
              ...reviewData,
              createdAt: new Date(),
              updatedAt: new Date()
            });

            result.newReviews++;

            // ✅ STEP 4 — Review aate hi notification create karo
            try {
              const appUrl = process.env.NEXT_PUBLIC_APP_URL;
              if (appUrl) {
                // Don't await - fire and forget
                fetch(`${appUrl}/api/notifications/create`, {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({
                    uid: uid,
                    type: "review",
                    itemId: `${uid}_${reviewData.reviewId}`,
                    message: "New review received"
                  })
                }).catch(err => console.error("Notification error:", err));
              }
            } catch (notifError) {
              console.error("Failed to create notification:", notifError);
            }

          } else {

            const existingData = doc.data();

            if (
              existingData?.comment !== reviewData.comment ||
              existingData?.rating !== reviewData.rating
            ) {

              transaction.update(reviewRef, {
                comment: reviewData.comment,
                rating: reviewData.rating,
                updatedAt: new Date()
              });

            }

          }

        });

        await logReviewFetched(uid, reviewData.reviewId, {
          locationId,
          reviewerName: reviewData.reviewerName,
          rating: reviewData.rating,
          commentPreview: reviewData.comment?.substring(0, 100),
          source: 'google_api'
        });

        console.log(`Processed review: ${reviewData.reviewId}`);

      } catch (reviewError: any) {

        console.error('Error processing review', reviewError);

        result.errors?.push(
          `Review processing error: ${reviewError.message}`
        );

      }

    }

    return result;

  } catch (error: any) {

    console.error('Error in syncReviewsForUser:', error);

    throw error;

  }

}


/**
 * Extract review data from Google API response
 */

function extractReviewData(
  googleReview: any,
  uid: string,
  locationId: string
) {

  /**
   * Safe review ID extraction
   */

  const reviewId =
    googleReview.reviewId ||
    googleReview.name?.split('/').pop() ||
    `review_${Date.now()}`;

  let rating = 0;

  if (googleReview.starRating) {

    const starMap: Record<string, number> = {
      ONE: 1,
      TWO: 2,
      THREE: 3,
      FOUR: 4,
      FIVE: 5
    };

    rating = starMap[googleReview.starRating] || 0;

  }

  return {

    /**
     * CORE IDS
     */

    reviewId,
    userId: uid,
    locationId,

    /**
     * REVIEW INFO
     */

    reviewerName:
      googleReview.reviewer?.displayName || 'Anonymous',

    reviewerPhoto:
      googleReview.reviewer?.profilePhotoUrl || '',

    rating,

    comment:
      googleReview.comment || '',

    /**
     * PLATFORM
     */

    source: "google",

    /**
     * STATUS SYSTEM
     */

    status: 'new',

    reply:
      googleReview.reply?.comment || '',

    aiConfidence: 0,

    regenerateCount: 0,

    /**
     * GOOGLE TIME DATA
     */

    reviewTime: googleReview.createTime
      ? new Date(googleReview.createTime)
      : new Date(),

    updateTime: googleReview.updateTime
      ? new Date(googleReview.updateTime)
      : new Date(),

    googleUpdateTime: googleReview.updateTime
      ? new Date(googleReview.updateTime)
      : null,

    /**
     * GOOGLE REPLY OBJECT
     */

    reviewReply: googleReview.reply
      ? {
          comment: googleReview.reply.comment,
          updateTime: googleReview.reply.updateTime
            ? new Date(googleReview.reply.updateTime)
            : null
        }
      : null,

    /**
     * FLAGS
     */

    isStarred: false,

    isArchived: false

  };

}