import { google } from 'googleapis'
import { adminDb } from './firebase-admin'
import { FieldValue } from 'firebase-admin/firestore'

interface GoogleTokens {
  accessToken: string
  refreshToken: string
  expiryDate: number
}

export async function refreshAccessTokenIfNeeded(uid: string): Promise<GoogleTokens | null> {

  try {

    const userRef = adminDb.collection('users').doc(uid)
    const userDoc = await userRef.get()

    if (!userDoc.exists) return null

    const userData = userDoc.data()

    if (!userData?.googleConnected || !userData?.refreshToken) return null

    const now = Date.now()
    const expiryDate =
  userData.tokenExpiry?.toDate?.()?.getTime?.() ||
  userData.tokenExpiry ||
  0

    if (now > expiryDate - 5 * 60 * 1000) {

      const oauth2Client = new google.auth.OAuth2(
        process.env.GOOGLE_CLIENT_ID,
        process.env.GOOGLE_CLIENT_SECRET,
        process.env.GOOGLE_REDIRECT_URI
      )

      oauth2Client.setCredentials({
        refresh_token: userData.refreshToken
      })

      const { token } = await oauth2Client.getAccessToken()

      const credentials = oauth2Client.credentials

      await userRef.update({
        accessToken: token,
        tokenExpiry: credentials.expiry_date ? new Date(credentials.expiry_date) : null,
        updatedAt: FieldValue.serverTimestamp()
      })

      return {
        accessToken: token!,
        refreshToken: userData.refreshToken,
        expiryDate: credentials.expiry_date!
      }

    }

    return {
      accessToken: userData.accessToken,
      refreshToken: userData.refreshToken,
      expiryDate
    }

  } catch (error) {

    console.error('Token refresh error:', error)

    return null
  }
}