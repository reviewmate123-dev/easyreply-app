// lib/server-validation.ts

import { adminDb } from './firebase-admin';
import { FieldValue } from 'firebase-admin/firestore';

// ==============================
// VALIDATE USER ACCESS
// ==============================
export async function validateUserAccess(
  uid: string,
  requiredCredits: number = 1
) {
  const userRef = adminDb.collection("users").doc(uid);
  const snap = await userRef.get();

  if (!snap.exists) {
    throw new Error("USER_NOT_FOUND");
  }

  const user = snap.data()!;

  // ==============================
  // BLOCK CHECK
  // ==============================
  if (user?.blocked === true) {
    throw new Error("USER_BLOCKED");
  }

  // ==============================
  // PLAN EXPIRY CHECK
  // ==============================
  if (user?.planExpiry) {
    const expiry =
      user.planExpiry.toDate
        ? user.planExpiry.toDate()
        : new Date(user.planExpiry);

    if (expiry < new Date()) {
      throw new Error("PLAN_EXPIRED");
    }
  }

  // ==============================
  // ✅ DAILY LIMIT (NEW SECURITY)
  // ==============================
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const usageToday = await adminDb
    .collection("usageHistory")
    .where("uid", "==", uid)
    .where("createdAt", ">=", today)
    .get();

  if (usageToday.size >= 100 && user.role !== "admin") {
    throw new Error("DAILY_LIMIT_REACHED");
  }

  // ==============================
  // CREDIT CHECK
  // ==============================
  if (user.role !== 'admin' && (user.credits || 0) < requiredCredits) {
    throw new Error("INSUFFICIENT_CREDITS");
  }

  return user;
}

// ==============================
// SAFE CREDIT DEDUCTION
// ==============================
export async function deductCredits(uid: string, amount: number = 1) {
  const userRef = adminDb.collection("users").doc(uid);

  return await adminDb.runTransaction(async (transaction) => {
    const userDoc = await transaction.get(userRef);

    if (!userDoc.exists) {
      throw new Error("USER_NOT_FOUND");
    }

    const userData = userDoc.data()!;

    // Admin unlimited
    if (userData.role === 'admin') {
      return { success: true, credits: userData.credits };
    }

    const currentCredits = userData.credits || 0;

    if (currentCredits < amount) {
      throw new Error("INSUFFICIENT_CREDITS");
    }

    transaction.update(userRef, {
      credits: FieldValue.increment(-amount)
    });

    return {
      success: true,
      before: currentCredits,
      after: currentCredits - amount
    };
  });
}