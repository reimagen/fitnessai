import { initializeApp, getApps, App, cert } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';

let adminApp: App | null = null;

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

  adminApp = initializeApp(
    {
      credential: cert(getServiceAccount()),
    },
    'admin'
  );
  return adminApp;
}

export function getAdminDb() {
  return getFirestore(getAdminApp());
}

export function getAdminAuth() {
  return getAuth(getAdminApp());
}
