import { adminDb } from './firebase-admin'
import { postReviewReplyToGoogle } from './google-api'
import { updateReviewStatus } from './review-status'

export async function autoPostReviewsForUser(uid: string) {

  const userDoc = await adminDb.collection('users').doc(uid).get()
  const userData = userDoc.data()

  if (!userData) {
    return { processed: 0 }
  }

  // 🔥 MAIN LOGIC (AUTO ON / OFF HANDLE)
  let statusToFetch: string[] = []

  if (userData?.autoReviewEnabled) {
    // 🟢 AUTO ON → AI generated ko post karo
    statusToFetch = ['ai_generated']
  } else {
    // 🔵 AUTO OFF → sirf approved ko post karo
    statusToFetch = ['approved']
  }

  const snapshot = await adminDb
    .collection('reviews')
    .where('userId', '==', uid)
    .where('status', 'in', statusToFetch)
    .limit(10)
    .get()

  let processed = 0

  for (const doc of snapshot.docs) {

    const review = doc.data()
    const reviewId = doc.id

    try {

      // 🛑 OPTIONAL SAFETY (EMPTY REPLY BLOCK)
      if (!review.reply || review.reply.trim().length < 3) {
        console.log('Skipped empty reply:', reviewId)
        continue
      }

      const reviewName = `accounts/${userData.googleAccountId}/locations/${userData.googleLocationId}/reviews/${review.reviewId}`

      await postReviewReplyToGoogle(
        uid,
        userData.googleLocationId,
        reviewName,
        review.reply
      )

      await updateReviewStatus(
        reviewId,
        'posted',
        uid,
        review.reply
      )

      processed++

    } catch (error) {

      console.error('Auto post failed', error)

      await updateReviewStatus(
        reviewId,
        'failed',
        uid,
        review.reply
      )

    }

  }

  return { processed }

}