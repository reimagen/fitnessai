import fs from 'node:fs';
import path from 'node:path';
import dotenv from 'dotenv';
import { getAdminDb } from './src/lib/firebase-admin';

async function main() {
  const envPath = process.env.FIREBASE_PROJECT_ID ? undefined : path.resolve('.env.development.local');
  if (envPath && fs.existsSync(envPath)) dotenv.config({ path: envPath });

  const db = getAdminDb();
  const now = new Date();

  const doc = {
    version: 1,
    updatedAt: now,
    updatedBy: 'manual-sync-2026-02-15',
    pairs: [
      {
        imbalanceType: 'Horizontal Push vs. Pull',
        lift1CanonicalId: 'machine-chest-press',
        lift2CanonicalId: 'machine-seated-row',
        isActive: true,
      },
      {
        imbalanceType: 'Vertical Push vs. Pull',
        lift1CanonicalId: 'machine-shoulder-press',
        lift2CanonicalId: 'machine-lat-pulldown',
        isActive: true,
      },
      {
        imbalanceType: 'Hamstring vs. Quad',
        lift1CanonicalId: 'machine-leg-curl',
        lift2CanonicalId: 'machine-leg-extension',
        isActive: true,
      },
      {
        imbalanceType: 'Adductor vs. Abductor',
        lift1CanonicalId: 'machine-adductor',
        lift2CanonicalId: 'machine-abductor',
        isActive: true,
      },
    ],
  };

  await db.collection('config').doc('imbalanceConfig').set(doc, { merge: true });

  const saved = await db.collection('config').doc('imbalanceConfig').get();
  const data = saved.data() as { version?: number; pairs?: Array<{ imbalanceType: string; lift1CanonicalId: string; lift2CanonicalId: string }> };
  console.log(`savedVersion=${data?.version ?? 'n/a'} savedPairs=${data?.pairs?.length ?? 0}`);
  for (const pair of data?.pairs ?? []) {
    console.log(`${pair.imbalanceType}: ${pair.lift1CanonicalId} vs ${pair.lift2CanonicalId}`);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
