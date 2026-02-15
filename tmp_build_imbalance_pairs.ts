import fs from 'node:fs';
import path from 'node:path';
import dotenv from 'dotenv';
import { getActiveExercises } from './src/lib/exercise-registry.server';
import { IMBALANCE_TYPES, IMBALANCE_CONFIG } from './src/analysis/analysis.config';
import { getNormalizedExerciseName } from './src/lib/strength-standards';

function resolveId(options: string[], idByNormalizedName: Map<string, string>) {
  for (const option of options) {
    const id = idByNormalizedName.get(getNormalizedExerciseName(option));
    if (id) return id;
  }
  return null;
}

async function main() {
  const envPath = process.env.FIREBASE_PROJECT_ID ? undefined : path.resolve('.env.development.local');
  if (envPath && fs.existsSync(envPath)) dotenv.config({ path: envPath });

  const exercises = await getActiveExercises();
  const idByNormalizedName = new Map<string, string>();
  for (const exercise of exercises) {
    idByNormalizedName.set(getNormalizedExerciseName(exercise.normalizedName), exercise.id);
    for (const legacyName of exercise.legacyNames ?? []) {
      idByNormalizedName.set(getNormalizedExerciseName(legacyName), exercise.id);
    }
  }

  const pairs = [] as Array<{imbalanceType: string; lift1CanonicalId: string; lift2CanonicalId: string; isActive: true}>;
  const unresolved: Array<{imbalanceType: string; missing: string[]}> = [];

  for (const type of IMBALANCE_TYPES) {
    const config = IMBALANCE_CONFIG[type];
    const lift1 = resolveId(config.lift1Options, idByNormalizedName);
    const lift2 = resolveId(config.lift2Options, idByNormalizedName);
    const missing: string[] = [];
    if (!lift1) missing.push('lift1CanonicalId');
    if (!lift2) missing.push('lift2CanonicalId');
    if (missing.length > 0 || !lift1 || !lift2) {
      unresolved.push({ imbalanceType: type, missing });
      continue;
    }
    pairs.push({ imbalanceType: type, lift1CanonicalId: lift1, lift2CanonicalId: lift2, isActive: true });
  }

  console.log(JSON.stringify({ pairCount: pairs.length, unresolved, pairs }, null, 2));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
