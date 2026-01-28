import { initializeApp, getApps, App, cert, applicationDefault } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';

let adminApp: App | null = null;

// On Firebase App Hosting, Application Default Credentials are available automatically.
// For local dev, we use explicit service account credentials from env vars.
function isAppHosting(): boolean {
  return !!process.env.FIREBASE_CONFIG;
}

function getServiceAccount() {
  const projectId = process.env.FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n');

  if (!projectId || !clientEmail || !privateKey) {
    throw new Error('Missing Firebase admin credentials in environment variables.');
  }

  return { projectId, clientEmail, privateKey };
}

export function getAdminApp(): App {
  if (adminApp) {
    return adminApp;
  }

  const existingApp = getApps().find(app => app.name === 'admin');
  if (existingApp) {
    adminApp = existingApp;
    return adminApp;
  }

  if (isAppHosting()) {
    adminApp = initializeApp(
      { credential: applicationDefault() },
      'admin'
    );
  } else {
    adminApp = initializeApp(
      { credential: cert(getServiceAccount()) },
      'admin'
    );
  }

  return adminApp;
}

export function getAdminDb() {
  return getFirestore(getAdminApp());
}

export function getAdminAuth() {
  return getAuth(getAdminApp());
}
