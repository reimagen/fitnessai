import fs from 'node:fs';
import path from 'node:path';
import dotenv from 'dotenv';
import { getAdminDb } from '../src/lib/firebase-admin';

async function main() {
  const envPath =
    process.env.FIREBASE_PROJECT_ID ? undefined : path.resolve('.env.development.local');

  if (envPath && fs.existsSync(envPath)) {
    dotenv.config({ path: envPath });
  }

  const projectId = process.env.FIREBASE_PROJECT_ID;
  if (!projectId) {
    throw new Error('Missing FIREBASE_PROJECT_ID. Set env vars or use .env.development.local.');
  }

  const db = getAdminDb();
  const now = new Date();

  const barbellRef = db.collection('exercises').doc('barbell-bench-press');
  const machineRef = db.collection('exercises').doc('machine-bench-press');

  const batch = db.batch();

  batch.set(
    barbellRef,
    {
      name: 'Barbell Bench Press',
      normalizedName: 'barbell bench press',
      legacyNames: ['bench press', 'barbell bench press'],
      updatedAt: now,
    },
    { merge: true }
  );

  batch.set(
    machineRef,
    {
      isActive: false,
      updatedAt: now,
    },
    { merge: true }
  );

  await batch.commit();

  console.log(`Project: ${projectId}`);
  console.log('Updated barbell bench press and deactivated machine bench press.');
}

main().catch(error => {
  console.error(error);
  process.exit(1);
});
