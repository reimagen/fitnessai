import fs from 'node:fs';
import path from 'node:path';
import dotenv from 'dotenv';
import { getAdminDb } from './src/lib/firebase-admin';

type Pair = {
  imbalanceType: string;
  lift1CanonicalId: string;
  lift2CanonicalId: string;
  isActive?: boolean;
};

async function main() {
  const envPath = process.env.FIREBASE_PROJECT_ID ? undefined : path.resolve('.env.development.local');
  if (envPath && fs.existsSync(envPath)) dotenv.config({ path: envPath });

  const db = getAdminDb();
  const cfgSnap = await db.collection('config').doc('imbalanceConfig').get();
  if (!cfgSnap.exists) {
    console.log('imbalanceConfig doc missing');
    return;
  }

  const cfg = cfgSnap.data() as { version?: number; pairs?: Pair[] };
  const pairs = (cfg.pairs ?? []).filter(p => p.isActive !== false);

  const exSnap = await db.collection('exercises').where('isActive', '==', true).get();
  const activeIds = new Set(exSnap.docs.map(d => d.id));

  console.log(`version=${cfg.version ?? 'n/a'} activePairs=${pairs.length} activeExercises=${activeIds.size}`);

  let issues = 0;
  for (const p of pairs) {
    const lift1Ok = activeIds.has(p.lift1CanonicalId);
    const lift2Ok = activeIds.has(p.lift2CanonicalId);
    const same = p.lift1CanonicalId === p.lift2CanonicalId;
    if (!lift1Ok || !lift2Ok || same) {
      issues += 1;
      console.log(JSON.stringify({ imbalanceType: p.imbalanceType, lift1CanonicalId: p.lift1CanonicalId, lift2CanonicalId: p.lift2CanonicalId, lift1Ok, lift2Ok, same }));
    }
  }
  console.log(`issuePairs=${issues}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
