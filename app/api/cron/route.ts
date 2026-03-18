import { NextResponse } from 'next/server'
import { adminDb } from '@/lib/firebase-admin'
import { autoPostReviewsForUser } from '@/lib/auto-review-poster'
import { processAutoRepliesForUser } from '@/lib/auto-reply'

export async function GET() {
  try {

    console.log('🚀 CRON STARTED')

    // 🔥 SAB USERS FETCH KAR
    const usersSnapshot = await adminDb.collection('users').get()

    let totalProcessed = 0

    for (const userDoc of usersSnapshot.docs) {

      const uid = userDoc.id

      try {

        // 🟢 REVIEW AUTO POST
        const reviewResult = await autoPostReviewsForUser(uid)

        // 🔵 Q&A AUTO POST
        const qaResults = await processAutoRepliesForUser(uid)

        totalProcessed += (reviewResult.processed || 0) + qaResults.length

      } catch (err) {
        console.error('User processing failed:', uid, err)
      }

    }

    console.log('✅ CRON DONE', totalProcessed)

    return NextResponse.json({
      success: true,
      processed: totalProcessed
    })

  } catch (error) {
    console.error('CRON ERROR', error)

    return NextResponse.json({
      error: 'Cron failed'
    }, { status: 500 })
  }
}
