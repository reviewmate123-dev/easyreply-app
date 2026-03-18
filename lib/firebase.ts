import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { initializeFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyAJrIU-u2h2T5Fy3Nh6sYbyZzRg0_AyOJI",
  authDomain: "reviewreplyapp-9945d.firebaseapp.com",
  projectId: "reviewreplyapp-9945d",
  storageBucket: "reviewreplyapp-9945d.appspot.com",
  messagingSenderId: "815641724563",
  appId: "1:815641724563:web:e2dbd42c6e520df5b4ef66",
};

// prevent reinitialize
const app = getApps().length ? getApp() : initializeApp(firebaseConfig);

export const auth = getAuth(app);

// Firestore with long polling (Next.js friendly)
export const db = initializeFirestore(app, {
  experimentalForceLongPolling: true,
});