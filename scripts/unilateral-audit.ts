import fs from 'node:fs';
import path from 'node:path';
import dotenv from 'dotenv';
import { getAdminDb, exerciseConverter, exerciseAliasConverter } from '../src/lib/firebase-admin';

type Bucket = 'per_limb' | 'total_load' | 'ambiguous';

const envPath = process.env.FIREBASE_PROJECT_ID
  ? undefined
  : path.resolve('.env.development.local');
if (envPath && fs.existsSync(envPath)) dotenv.config({ path: envPath });

const unilateralRegex = /(single\s*arm|single\s*leg|single-leg|single-arm|one\s*arm|one\s*leg|unilateral|split squat|lunge|kickback|pistol)/i;
const explicitPerLimbRegex = /(per\s*arm|per\s*leg|each\s*arm|each\s*leg|single\s*arm|single\s*leg|one\s*arm|one\s*leg)/i;
const totalLoadRegex = /(barbell\s+lunge|walking\s+lunge|lunge(?!.*per\s*(arm|leg))|split squat(?!.*per\s*(arm|leg)))/i;

function classify(name: string, normalizedName: string, legacyNames: string[] = []): Bucket | null {
  const joined = [name, normalizedName, ...legacyNames].join(' | ').toLowerCase();
  if (!unilateralRegex.test(joined) && !explicitPerLimbRegex.test(joined)) return null;
  if (explicitPerLimbRegex.test(joined)) return 'per_limb';
  if (totalLoadRegex.test(joined)) return 'total_load';
  return 'ambiguous';
}

async function main() {
  const db = getAdminDb();
  const exercisesSnap = await db.collection('exercises').withConverter(exerciseConverter).where('isActive', '==', true).get();
  const aliasesSnap = await db.collection('exerciseAliases').withConverter(exerciseAliasConverter).get();

  const aliasesByCanonical = new Map<string, string[]>();
  for (const d of aliasesSnap.docs) {
    const a = d.data();
    const arr = aliasesByCanonical.get(a.canonicalId) ?? [];
    arr.push(a.alias);
    aliasesByCanonical.set(a.canonicalId, arr);
  }

  const buckets: Record<Bucket, Array<{id: string; name: string; normalizedName: string; aliases: string[]}>> = {
    per_limb: [],
    total_load: [],
    ambiguous: [],
  };

  for (const d of exercisesSnap.docs) {
    const e = d.data();
    const aliases = aliasesByCanonical.get(e.id) ?? [];
    const bucket = classify(e.name, e.normalizedName, [...(e.legacyNames ?? []), ...aliases]);
    if (bucket) {
      buckets[bucket].push({
        id: e.id,
        name: e.name,
        normalizedName: e.normalizedName,
        aliases,
      });
    }
  }

  for (const key of Object.keys(buckets) as Bucket[]) {
    buckets[key].sort((a, b) => a.name.localeCompare(b.name));
  }

  console.log(JSON.stringify({
    projectId: process.env.FIREBASE_PROJECT_ID,
    activeExerciseCount: exercisesSnap.size,
    aliasCount: aliasesSnap.size,
    unilateralAudit: {
      per_limb_count: buckets.per_limb.length,
      total_load_count: buckets.total_load.length,
      ambiguous_count: buckets.ambiguous.length,
      per_limb: buckets.per_limb,
      total_load: buckets.total_load,
      ambiguous: buckets.ambiguous,
    }
  }, null, 2));
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
