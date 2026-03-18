import { NextRequest, NextResponse } from 'next/server';
import { adminAuth, adminDb } from '@/lib/firebase-admin';
import { FieldValue } from 'firebase-admin/firestore';

export async function POST(request: NextRequest) {
  try {
    // Auth check
    const session = request.cookies.get('session')?.value;
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const decodedClaims = await adminAuth.verifySessionCookie(session);
    const uid = decodedClaims.uid;

    // Get user data to check plan
    const userDoc = await adminDb.collection('users').doc(uid).get();
    const userData = userDoc.data();

    if (!userData) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Check if Pro plan
    if (userData.plan !== 'pro') {
      return NextResponse.json({ 
        error: 'Competitor tracking only available in Pro plan',
        code: 'PLAN_LIMIT'
      }, { status: 403 });
    }

    const { competitorName, competitorPlaceId, competitorUrl } = await request.json();

    if (!competitorName || !competitorPlaceId) {
      return NextResponse.json({ error: 'Missing competitor details' }, { status: 400 });
    }

    // Get current competitors
    const competitors = userData.competitors || [];
    
    // Check limit (Pro = 5 competitors)
    if (competitors.length >= 5) {
      return NextResponse.json({ 
        error: 'Maximum 5 competitors allowed in Pro plan',
        code: 'LIMIT_EXCEEDED'
      }, { status: 403 });
    }

    // Check if already added
    if (competitors.some((c: any) => c.placeId === competitorPlaceId)) {
      return NextResponse.json({ 
        error: 'Competitor already tracked',
        code: 'ALREADY_EXISTS'
      }, { status: 400 });
    }

    // Add competitor
    const newCompetitor = {
      name: competitorName,
      placeId: competitorPlaceId,
      url: competitorUrl || `https://maps.google.com/?cid=${competitorPlaceId}`,
      addedAt: new Date().toISOString(),
      lastFetched: null,
      stats: {
        totalQuestions: 0,
        avgResponseTime: 0,
        recentReplies: []
      }
    };

    await adminDb.collection('users').doc(uid).update({
      competitors: FieldValue.arrayUnion(newCompetitor)
    });

    return NextResponse.json({ 
      success: true, 
      competitor: newCompetitor,
      remaining: 4 - competitors.length
    });

  } catch (error) {
    console.error('Competitor add error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// Get all competitors
export async function GET(request: NextRequest) {
  try {
    const session = request.cookies.get('session')?.value;
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const decodedClaims = await adminAuth.verifySessionCookie(session);
    const uid = decodedClaims.uid;

    const userDoc = await adminDb.collection('users').doc(uid).get();
    const userData = userDoc.data();

    return NextResponse.json({ 
      competitors: userData?.competitors || [],
      plan: userData?.plan || 'basic'
    });

  } catch (error) {
    console.error('Competitor fetch error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// Remove competitor
export async function DELETE(request: NextRequest) {
  try {
    const session = request.cookies.get('session')?.value;
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const decodedClaims = await adminAuth.verifySessionCookie(session);
    const uid = decodedClaims.uid;

    const { placeId } = await request.json();

    if (!placeId) {
      return NextResponse.json({ error: 'Missing placeId' }, { status: 400 });
    }

    const userDoc = await adminDb.collection('users').doc(uid).get();
    const userData = userDoc.data();
    
    const competitors = userData?.competitors || [];
    const updatedCompetitors = competitors.filter((c: any) => c.placeId !== placeId);

    await adminDb.collection('users').doc(uid).update({
      competitors: updatedCompetitors
    });

    return NextResponse.json({ success: true });

  } catch (error) {
    console.error('Competitor remove error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}