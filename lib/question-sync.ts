import { adminDb } from './firebase-admin'
import { fetchGoogleQuestions } from './google-api'
import { FieldValue } from 'firebase-admin/firestore'

export async function syncQuestionsForUser(uid: string) {

  try {

    const userRef = adminDb.collection('users').doc(uid)
    const userDoc = await userRef.get()

    if (!userDoc.exists) return

    const userData = userDoc.data()

    if (!userData?.googleConnected || !userData?.googleLocationId) {
      return
    }

    // Fetch questions from Google
    const googleQuestions = await fetchGoogleQuestions(
      uid,
      userData.googleLocationId
    )

    const batch = adminDb.batch()

    let newCount = 0

    for (const q of googleQuestions) {

      const questionName = q.name
      const questionId = q.name?.split('/').pop()

      if (!questionId || !questionName) continue

      const questionRef = adminDb.collection('questions').doc(questionId)

      const questionDoc = await questionRef.get()

      if (!questionDoc.exists) {

        const status = q.answer ? 'external_replied' : 'pending'

        batch.set(questionRef, {

          uid,
          locationId: userData.googleLocationId,

          questionName,     // ✅ VERY IMPORTANT
          questionId,

          text: q.text,
          askerName: q.author?.displayName || 'Anonymous',

          status,
          aiReply: null,

          createdAt: FieldValue.serverTimestamp(),

          googleData: {
            createTime: q.createTime,
            updateTime: q.updateTime,
            ...(q.answer && { answer: q.answer.text })
          }

        })

        newCount++

        // ✅ STEP 5 — Question aate hi notification create karo
        try {
          const appUrl = process.env.NEXT_PUBLIC_APP_URL;
          if (appUrl) {
            // Don't await - fire and forget
            fetch(`${appUrl}/api/notifications/create`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                uid: uid,
                type: "question",
                itemId: questionId,
                message: "New question received"
              })
            }).catch(err => console.error("Question notification error:", err));
          }
        } catch (notifError) {
          console.error("Failed to create question notification:", notifError);
        }

        const historyRef = adminDb.collection('questionHistory').doc()

        batch.set(historyRef, {

          uid,
          questionId,

          actionType: 'question_fetched',

          timestamp: FieldValue.serverTimestamp(),

          metadata: {
            hasAnswer: !!q.answer
          }

        })
      }
    }

    if (newCount > 0) {
      await batch.commit()
    }

    await userRef.update({
      lastQuestionSync: FieldValue.serverTimestamp()
    })

    return { newQuestions: newCount }

  } catch (error) {

    console.error(`Sync error for user ${uid}:`, error)
    throw error

  }
}