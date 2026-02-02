import { initializeApp, getApps, App, cert, applicationDefault } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore, Timestamp } from 'firebase-admin/firestore';
import type { AliasDocument, ExerciseDocument } from './exercise-types';

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

type FirestoreExerciseDocument = Omit<ExerciseDocument, 'createdAt' | 'updatedAt'> & {
  createdAt?: Timestamp;
  updatedAt?: Timestamp;
};

type FirestoreAliasDocument = Omit<AliasDocument, 'createdAt'> & {
  createdAt?: Timestamp;
};

export const exerciseConverter = {
  toFirestore: (exercise: ExerciseDocument): FirestoreExerciseDocument => ({
    ...exercise,
    createdAt: exercise.createdAt ? Timestamp.fromDate(exercise.createdAt) : undefined,
    updatedAt: exercise.updatedAt ? Timestamp.fromDate(exercise.updatedAt) : undefined,
  }),
  fromFirestore: (snapshot: FirebaseFirestore.QueryDocumentSnapshot): ExerciseDocument => {
    const data = snapshot.data() as FirestoreExerciseDocument;
    return {
      ...data,
      id: data.id || snapshot.id,
      createdAt: data.createdAt ? data.createdAt.toDate() : undefined,
      updatedAt: data.updatedAt ? data.updatedAt.toDate() : undefined,
    };
  },
};

export const exerciseAliasConverter = {
  toFirestore: (aliasDoc: AliasDocument): FirestoreAliasDocument => ({
    ...aliasDoc,
    createdAt: aliasDoc.createdAt ? Timestamp.fromDate(aliasDoc.createdAt) : undefined,
  }),
  fromFirestore: (snapshot: FirebaseFirestore.QueryDocumentSnapshot): AliasDocument => {
    const data = snapshot.data() as FirestoreAliasDocument;
    return {
      ...data,
      createdAt: data.createdAt ? data.createdAt.toDate() : undefined,
    };
  },
};
