import { NextRequest, NextResponse } from 'next/server'
import { adminDb } from '@/lib/firebase-admin'
import { autoPostReviewsForUser } from '@/lib/auto-review-poster'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {

  try {

    const authHeader = request.headers.get('authorization')

    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const usersSnapshot = await adminDb
      .collection('users')
      .where('googleConnected', '==', true)
      .limit(50)
      .get()

    const results = []

    for (const userDoc of usersSnapshot.docs) {

      const uid = userDoc.id

      const result = await autoPostReviewsForUser(uid)

      results.push({
        uid,
        processed: result.processed
      })

      await new Promise(r => setTimeout(r, 300))

    }

    return NextResponse.json({
      success: true,
      results
    })

  } catch (error) {

    console.error('Cron post error', error)

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )

  }

}
