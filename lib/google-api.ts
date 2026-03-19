import 'server-only';

import { refreshAccessTokenIfNeeded } from './token-refresh'
import { adminDb } from './firebase-admin'

const QANDA_API = 'https://mybusinessqanda.googleapis.com/v1'

/* -------------------------------------------------- */
function fetchWithTimeout(url: string, options: any, timeout = 10000) {

  const controller = new AbortController()
  const id = setTimeout(() => controller.abort(), timeout)

  return fetch(url, {
    ...options,
    signal: controller.signal
  }).finally(() => clearTimeout(id))
}

/* --------------------------------------------------
   GET ACCOUNT ID
-------------------------------------------------- */

export async function getAccountId(uid: string): Promise<string> {

  const userDoc = await adminDb.collection('users').doc(uid).get()
  const userData = userDoc.data()

  if (!userData) {
    throw new Error('User not found')
  }

  if (userData.googleAccountId) {
    return userData.googleAccountId
  }

  const tokens = await refreshAccessTokenIfNeeded(uid)

  if (!tokens || !tokens.accessToken) {
    throw new Error('No valid tokens')
  }

  const response = await fetchWithTimeout(
    'https://mybusinessaccountmanagement.googleapis.com/v1/accounts',
    {
      headers: {
        Authorization: `Bearer ${tokens.accessToken}`
      }
    }
  )

  if (!response.ok) {
    throw new Error('Unable to fetch account')
  }

  const data = await response.json()

  if (!data.accounts || data.accounts.length === 0) {
    throw new Error('No Google Business accounts found')
  }

  const accountId = data.accounts[0].name.split('/').pop()

  await adminDb.collection('users').doc(uid).update({
    googleAccountId: accountId
  })

  return accountId
}

/* --------------------------------------------------
   FETCH QUESTIONS (PAGINATION FIX)
-------------------------------------------------- */

export async function fetchGoogleQuestions(
  uid: string,
  locationId: string
) {

  const tokens = await refreshAccessTokenIfNeeded(uid)

  if (!tokens || !tokens.accessToken) {
    throw new Error('No valid tokens')
  }

  const accountId = await getAccountId(uid)

  let allQuestions: any[] = []
  let nextPageToken: string | null = null

  do {

    const url =
      `${QANDA_API}/accounts/${accountId}/locations/${locationId}/questions`
      + (nextPageToken ? `?pageToken=${nextPageToken}` : '')

    const response = await fetchWithTimeout(url, {
      headers: {
        Authorization: `Bearer ${tokens.accessToken}`,
        'Content-Type': 'application/json'
      }
    })

    if (response.status === 429) {
      throw new Error('Rate limit exceeded')
    }

    if (!response.ok) {
      throw new Error(`Google API error ${response.status}`)
    }

    const data = await response.json()

    if (Array.isArray(data.questions)) {
      allQuestions.push(...data.questions)
    }

    nextPageToken = data.nextPageToken || null

  } while (nextPageToken)

  console.log(`Total questions fetched: ${allQuestions.length}`)

  return allQuestions
}

/* --------------------------------------------------
   POST ANSWER
-------------------------------------------------- */

export async function postAnswerToGoogle(
  uid: string,
  locationId: string,
  questionName: string,
  answerText: string
) {

  const tokens = await refreshAccessTokenIfNeeded(uid)

  if (!tokens || !tokens.accessToken) {
    throw new Error('No valid tokens')
  }

  const response = await fetchWithTimeout(
    `${QANDA_API}/${questionName}/answers`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${tokens.accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        text: answerText
      })
    }
  )

  if (response.status === 429) {
    throw new Error('Rate limit exceeded')
  }

  if (!response.ok) {
    throw new Error(`Google API error ${response.status}`)
  }

  return await response.json()
}
// ============================================
// REVIEW FUNCTIONS - YEH SAB ADD KARO (END OF FILE)
// ============================================

const REVIEW_API = 'https://mybusiness.googleapis.com/v4';

/* --------------------------------------------------
   FETCH GOOGLE REVIEWS
-------------------------------------------------- */

export async function fetchGoogleReviews(
  uid: string,
  locationId: string
): Promise<any[]> {

  const tokens = await refreshAccessTokenIfNeeded(uid);

  if (!tokens || !tokens.accessToken) {
    throw new Error('No valid tokens');
  }

  const accountId = await getAccountId(uid);

  let allReviews: any[] = [];
  let nextPageToken: string | null = null;

  do {
    const url = 
      `${REVIEW_API}/accounts/${accountId}/locations/${locationId}/reviews`
      + (nextPageToken ? `?pageToken=${nextPageToken}` : '');

    const response = await fetchWithTimeout(url, {
      headers: {
        Authorization: `Bearer ${tokens.accessToken}`,
        'Content-Type': 'application/json'
      }
    });

    if (response.status === 429) {
      throw new Error('Rate limit exceeded');
    }

    if (!response.ok) {
      throw new Error(`Google API error ${response.status}`);
    }

    const data = await response.json();

    if (Array.isArray(data.reviews)) {
      allReviews.push(...data.reviews);
    }

    nextPageToken = data.nextPageToken || null;

  } while (nextPageToken);

  console.log(`Total reviews fetched: ${allReviews.length}`);
  return allReviews;
}

/* --------------------------------------------------
   POST REVIEW REPLY TO GOOGLE
-------------------------------------------------- */

export async function postReviewReplyToGoogle(
  uid: string,
  locationId: string,
  reviewName: string,  // Format: accounts/{accountId}/locations/{locationId}/reviews/{reviewId}
  replyText: string
) {

  const tokens = await refreshAccessTokenIfNeeded(uid);

  if (!tokens || !tokens.accessToken) {
    throw new Error('No valid tokens');
  }

  // Google API endpoint for updating reply
  const url = `https://mybusiness.googleapis.com/v4/${reviewName}/reply`;

  const response = await fetchWithTimeout(url, {
    method: 'PUT',
    headers: {
      Authorization: `Bearer ${tokens.accessToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      comment: replyText
    })
  });

  if (response.status === 429) {
    throw new Error('Rate limit exceeded');
  }

  if (!response.ok) {
    const errorData = await response.text();
    throw new Error(`Google API error ${response.status}: ${errorData}`);
  }

  return await response.json();
}
