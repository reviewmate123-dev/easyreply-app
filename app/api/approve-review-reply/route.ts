import { NextRequest, NextResponse } from 'next/server'
import { adminAuth } from '@/lib/firebase-admin'
import { updateReviewStatus } from '@/lib/review-status'
import { verifyReviewOwnership } from '@/lib/review-security'

export async function POST(request: NextRequest) {

  try {

    const session = request.cookies.get('session')?.value

    if (!session) {
      return NextResponse.json(
        { error: 'Please login first' },
        { status: 401 }
      )
    }

    const decoded = await adminAuth.verifySessionCookie(session)
    const uid = decoded.uid

    const { reviewId } = await request.json()

    if (!reviewId) {
      return NextResponse.json(
        { error: 'Review ID required' },
        { status: 400 }
      )
    }

    // verify ownership
    const check = await verifyReviewOwnership(reviewId, uid)

    if (!check.valid) {
      return NextResponse.json(
        { error: check.error || 'Review not found' },
        { status: 403 }
      )
    }

    // update status
    const updated = await updateReviewStatus(
      reviewId,
      'approved',
      uid
    )

    if (!updated) {
      return NextResponse.json(
        { error: 'Failed to approve review' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      message: 'Review approved successfully'
    })

  } catch (error) {

    console.error('Approve review error', error)

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )

  }

}