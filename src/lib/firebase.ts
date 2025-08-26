
import { initializeApp, getApps, getApp, FirebaseOptions } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth } from "firebase/auth";

// This configuration is for the PRODUCTION environment.
// It will be used when the app is deployed to Firebase Hosting.
// The environment variables are loaded from .env.production.local during the build process.
const firebaseConfig: FirebaseOptions = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

// This configuration is for the DEVELOPMENT environment.
// It is loaded from the .env.development.local file.
const firebaseConfigDev: FirebaseOptions = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY_DEV,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN_DEV,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID_DEV,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET_DEV,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID_DEV,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID_DEV,
};

// Determine which config to use based on the environment
const configToUse = process.env.NODE_ENV === 'production' ? firebaseConfig : firebaseConfigDev;

// Initialize Firebase
const app = !getApps().length ? initializeApp(configToUse) : getApp();
const db = getFirestore(app);
const auth = getAuth(app);

export { db, auth };
