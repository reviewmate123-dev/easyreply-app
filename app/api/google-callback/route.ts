import { NextRequest, NextResponse } from 'next/server'
import { adminDb } from '@/lib/firebase-admin'
import { getGoogleTokens } from '@/lib/google-oauth'
import { FieldValue } from 'firebase-admin/firestore'
import { google } from 'googleapis'

export const dynamic = 'force-dynamic'

async function fetchWithRetry(fn: () => Promise<any>, retries = 3, delay = 2000) {
  for (let i = 0; i < retries; i++) {
    try {
      return await fn()
    } catch (error) {
      if (i === retries - 1) throw error
      await new Promise(r => setTimeout(r, delay))
    }
  }
}

export async function GET(request: NextRequest) {

  try {

    const searchParams = request.nextUrl.searchParams
    const code = searchParams.get('code')
    const state = searchParams.get('state')

    if (!code || !state) {
      return NextResponse.redirect(
        new URL('/reputation?error=invalid_callback', request.url)
      )
    }

    const tokens = await getGoogleTokens(code)

    const oauth2Client = new google.auth.OAuth2()
    oauth2Client.setCredentials(tokens)

    let accountId = ''
    let locationId = ''

    try {

      await fetchWithRetry(async () => {

        const accountAPI = google.mybusinessaccountmanagement({
          version: 'v1',
          auth: oauth2Client
        })

        const businessAPI = google.mybusinessbusinessinformation({
          version: 'v1',
          auth: oauth2Client
        })

        const accountsRes = await accountAPI.accounts.list()
        const accounts = (accountsRes.data as any).accounts

        if (!accounts?.length) return

        const account = accounts[0]
        accountId = account.name.split('/').pop()

        const locationsRes = await businessAPI.accounts.locations.list({
          parent: account.name,
          pageSize: 1,
          readMask: 'name'
        })

        const locations = (locationsRes.data as any).locations

        if (locations?.length) {
          locationId = locations[0].name.split('/').pop()
        }

      })

    } catch (err) {
      console.log("Location fetch skipped")
    }

    const userRef = adminDb.collection('users').doc(state)

    const updateData: any = {
      googleConnected: true,
      updatedAt: FieldValue.serverTimestamp()
    }

    if (tokens.refresh_token) {
      updateData.refreshToken = tokens.refresh_token
    }

    if (accountId) updateData.googleAccountId = accountId
    if (locationId) updateData.googleLocationId = locationId

    await userRef.set(updateData, { merge: true })

    return NextResponse.redirect(
      new URL(`/reputation?success=connected`, request.url)
    )

  } catch (error) {

    console.error("Google callback error", error)

    return NextResponse.redirect(
      new URL('/reputation?error=connection_failed', request.url)
    )

  }
}
