import 'server-only';

import * as admin from "firebase-admin";

function getFirebaseAdminApp() {
  const projectId = process.env.FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n");

  if (!projectId || !clientEmail || !privateKey) {
    throw new Error("Firebase Admin ENV variables are missing");
  }

  if (!admin.apps.length) {
    admin.initializeApp({
      credential: admin.credential.cert({
        projectId,
        clientEmail,
        privateKey,
      }),
    });
  }

  return admin.app();
}

function getAdminDb() {
  getFirebaseAdminApp();
  return admin.firestore();
}

function getAdminAuth() {
  getFirebaseAdminApp();
  return admin.auth();
}

export const adminDb = new Proxy({} as admin.firestore.Firestore, {
  get(_target, prop) {
    const db = getAdminDb() as unknown as Record<PropertyKey, unknown>;
    return db[prop];
  },
}) as admin.firestore.Firestore;

export const adminAuth = new Proxy({} as admin.auth.Auth, {
  get(_target, prop) {
    const auth = getAdminAuth() as unknown as Record<PropertyKey, unknown>;
    return auth[prop];
  },
}) as admin.auth.Auth;
