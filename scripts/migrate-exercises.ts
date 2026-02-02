import fs from 'node:fs';
import path from 'node:path';
import dotenv from 'dotenv';
import { getAdminDb, exerciseConverter, exerciseAliasConverter } from '../src/lib/firebase-admin';
import {
  STRENGTH_STANDARDS,
  STRENGTH_RATIOS,
  CARDIO_EXERCISES,
  LIFT_NAME_ALIASES,
} from '../src/lib/exercise-data';
import type { AliasDocument, ExerciseDocument } from '../src/lib/exercise-types';

type MigrationOptions = {
  apply: boolean;
  envPath?: string;
};

function parseArgs(argv: string[]): MigrationOptions {
  const options: MigrationOptions = { apply: false };
  for (const arg of argv) {
    if (arg === '--apply') {
      options.apply = true;
    } else if (arg.startsWith('--env=')) {
      options.envPath = arg.split('=')[1];
    }
  }
  return options;
}

function normalizeName(input: string): string {
  return input
    .trim()
    .toLowerCase()
    .replace(/^egym\s+/, '')
    .replace(/\s+/g, ' ');
}

function toSlug(input: string): string {
  return normalizeName(input).replace(/\s+/g, '-');
}

function toTitleCase(input: string): string {
  return normalizeName(input)
    .split(' ')
    .map(word => (word ? word[0].toUpperCase() + word.slice(1) : ''))
    .join(' ');
}

async function writeInBatches<T>(
  collection: FirebaseFirestore.CollectionReference<T>,
  docs: T[],
  label: string,
  getId: (doc: T) => string
) {
  const db = getAdminDb();
  const batchSize = 500;
  for (let i = 0; i < docs.length; i += batchSize) {
    const batch = db.batch();
    const slice = docs.slice(i, i + batchSize);
    slice.forEach(doc => {
      const ref = collection.doc(getId(doc));
      batch.set(ref, doc);
    });
    await batch.commit();
    console.log(`[${label}] Committed ${i + slice.length}/${docs.length}`);
  }
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  const envPath =
    options.envPath ||
    (process.env.FIREBASE_PROJECT_ID ? undefined : path.resolve('.env.development.local'));

  if (envPath && fs.existsSync(envPath)) {
    dotenv.config({ path: envPath });
  }

  const projectId = process.env.FIREBASE_PROJECT_ID;
  if (!projectId) {
    throw new Error('Missing FIREBASE_PROJECT_ID. Set env vars or pass --env=path/to/.env');
  }

  const now = new Date();

  const strengthExercises: ExerciseDocument[] = Object.entries(STRENGTH_STANDARDS).map(
    ([name, data]) => {
      const normalizedName = normalizeName(name);
      const id = `machine-${toSlug(name)}`;
      return {
        id,
        name: toTitleCase(name),
        normalizedName,
        equipment: 'machine',
        category: data.category,
        type: 'strength',
        strengthStandards: {
          baseType: data.type,
          standards: data.standards,
        },
        isActive: true,
        createdAt: now,
        updatedAt: now,
        legacyNames: [normalizedName],
      };
    }
  );

  const cardioExercises: ExerciseDocument[] = Object.entries(CARDIO_EXERCISES).map(
    ([name, category]) => {
      const normalizedName = normalizeName(name);
      const id = `other-${toSlug(name)}`;
      return {
        id,
        name: toTitleCase(name),
        normalizedName,
        equipment: 'other',
        category,
        type: 'cardio',
        isActive: true,
        createdAt: now,
        updatedAt: now,
        legacyNames: [normalizedName],
      };
    }
  );

  const aliasDocs: AliasDocument[] = Object.entries(LIFT_NAME_ALIASES).map(
    ([alias, canonical]) => {
      const canonicalId = `machine-${toSlug(canonical)}`;
      return {
        alias: normalizeName(alias),
        canonicalId,
        createdAt: now,
      };
    }
  );

  console.log(`Project: ${projectId}`);
  console.log(`Exercises: ${strengthExercises.length + cardioExercises.length}`);
  console.log(`Aliases: ${aliasDocs.length}`);
  console.log(`Mode: ${options.apply ? 'apply' : 'dry-run'}`);
  console.log(`Sample exercise IDs: ${strengthExercises.slice(0, 3).map(ex => ex.id).join(', ')}`);
  console.log(`Sample alias: ${aliasDocs[0]?.alias} -> ${aliasDocs[0]?.canonicalId}`);

  if (!options.apply) {
    console.log('Dry-run complete. Re-run with --apply to write to Firestore.');
    return;
  }

  const db = getAdminDb();
  const exercisesCollection = db.collection('exercises').withConverter(exerciseConverter);
  const aliasesCollection = db.collection('exerciseAliases').withConverter(exerciseAliasConverter);

  await writeInBatches(
    exercisesCollection,
    [...strengthExercises, ...cardioExercises],
    'exercises',
    doc => doc.id
  );
  await writeInBatches(aliasesCollection, aliasDocs, 'aliases', doc => toSlug(doc.alias));

  await db.collection('config').doc('strengthRatios').set(
    {
      data: STRENGTH_RATIOS,
      updatedAt: now,
    },
    { merge: true }
  );

  console.log('Migration complete.');
}

main().catch(error => {
  console.error(error);
  process.exit(1);
});
