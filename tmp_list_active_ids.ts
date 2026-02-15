import fs from 'node:fs';
import path from 'node:path';
import dotenv from 'dotenv';
import { getAdminDb, exerciseConverter } from './src/lib/firebase-admin';

async function main() {
  const envPath = process.env.FIREBASE_PROJECT_ID ? undefined : path.resolve('.env.development.local');
  if (envPath && fs.existsSync(envPath)) dotenv.config({ path: envPath });

  const db = getAdminDb();
  const snap = await db.collection('exercises').withConverter(exerciseConverter).where('isActive', '==', true).get();
  const ids = snap.docs.map(d => d.id).sort();
  const needed = [
    'machine-chest-press',
    'machine-seated-row',
    'machine-shoulder-press',
    'machine-lat-pulldown',
    'machine-leg-curl',
    'machine-leg-extension',
    'machine-adductor',
    'machine-abductor',
  ];

  console.log(`activeCount=${ids.length}`);
  for (const id of needed) {
    console.log(`${id}: ${ids.includes(id) ? 'present' : 'missing'}`);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
