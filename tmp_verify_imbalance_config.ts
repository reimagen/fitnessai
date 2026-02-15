import fs from 'node:fs';
import path from 'node:path';
import dotenv from 'dotenv';
import { getAdminDb, exerciseConverter } from './src/lib/firebase-admin';

async function main() {
  const envPath = process.env.FIREBASE_PROJECT_ID ? undefined : path.resolve('.env.development.local');
  if (envPath && fs.existsSync(envPath)) dotenv.config({ path: envPath });

  const db = getAdminDb();
  const cfgSnap = await db.collection('config').doc('imbalanceConfig').get();
  const cfg = cfgSnap.data() as { pairs?: Array<{imbalanceType:string;lift1CanonicalId:string;lift2CanonicalId:string;isActive?:boolean}> } | undefined;

  const exSnap = await db.collection('exercises').withConverter(exerciseConverter).where('isActive', '==', true).get();
  const active = new Set(exSnap.docs.map(d => d.id));

  let issueCount = 0;
  for (const p of (cfg?.pairs ?? []).filter(p => p.isActive !== false)) {
    if (!active.has(p.lift1CanonicalId) || !active.has(p.lift2CanonicalId) || p.lift1CanonicalId === p.lift2CanonicalId) {
      issueCount += 1;
      console.log(`issue: ${p.imbalanceType} -> ${p.lift1CanonicalId} vs ${p.lift2CanonicalId}`);
    }
  }

  console.log(`activePairs=${(cfg?.pairs ?? []).filter(p => p.isActive !== false).length}`);
  console.log(`validationIssueCount=${issueCount}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
