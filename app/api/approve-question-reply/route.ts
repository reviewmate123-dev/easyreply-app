import { NextRequest, NextResponse } from 'next/server'
import { adminDb } from '@/lib/firebase-admin'

export async function POST(req: NextRequest) {
  try {
    const { questionId } = await req.json()

    if (!questionId) {
      return NextResponse.json({ error: 'Missing questionId' }, { status: 400 })
    }

    await adminDb.collection('questions').doc(questionId).update({
      status: 'approved'
    })

    return NextResponse.json({ success: true })

  } catch (error) {
    console.error(error)
    return NextResponse.json({ error: 'Failed' }, { status: 500 })
  }
}