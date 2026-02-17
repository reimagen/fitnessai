import fs from 'node:fs';
import path from 'node:path';
import dotenv from 'dotenv';
import { getAdminDb, exerciseConverter } from '../src/lib/firebase-admin';
import { resolveExerciseLoadSemantics } from '../src/lib/exercise-load-semantics';

type BackfillOptions = {
  apply: boolean;
  envPath?: string;
};

function parseArgs(argv: string[]): BackfillOptions {
  const options: BackfillOptions = { apply: false };
  for (const arg of argv) {
    if (arg === '--apply') {
      options.apply = true;
    } else if (arg.startsWith('--env=')) {
      options.envPath = arg.split('=')[1];
    }
  }
  return options;
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

  const db = getAdminDb();
  const exercisesCollection = db.collection('exercises').withConverter(exerciseConverter);
  const snapshot = await exercisesCollection.where('isActive', '==', true).get();
  const now = new Date();

  const updates = snapshot.docs
    .map(doc => {
      const exercise = doc.data();
      const resolved =
        exercise.type === 'strength' ? resolveExerciseLoadSemantics(exercise.loadSemantics) : 'unknown';
      if (exercise.loadSemantics === resolved) {
        return null;
      }

      return {
        id: doc.id,
        name: exercise.name,
        from: exercise.loadSemantics ?? '(unset)',
        to: resolved,
      };
    })
    .filter(item => item !== null);

  console.log(`Project: ${projectId}`);
  console.log(`Active exercises: ${snapshot.size}`);
  console.log(`Pending loadSemantics updates: ${updates.length}`);
  console.log(`Mode: ${options.apply ? 'apply' : 'dry-run'}`);

  if (updates.length > 0) {
    console.log('Sample updates:');
    updates.slice(0, 20).forEach(update => {
      console.log(`- ${update.id} (${update.name}): ${update.from} -> ${update.to}`);
    });
  }

  if (!options.apply) {
    console.log('Dry-run complete. Re-run with --apply to write to Firestore.');
    return;
  }

  const batchSize = 500;
  const rawExercisesCollection = db.collection('exercises');
  for (let i = 0; i < updates.length; i += batchSize) {
    const batch = db.batch();
    const slice = updates.slice(i, i + batchSize);
    slice.forEach(update => {
      const ref = rawExercisesCollection.doc(update.id);
      batch.set(
        ref,
        {
          loadSemantics: update.to,
          updatedAt: now,
        },
        { merge: true }
      );
    });
    await batch.commit();
    console.log(`Committed ${i + slice.length}/${updates.length}`);
  }

  console.log('Backfill complete.');
}

main().catch(error => {
  console.error(error);
  process.exit(1);
});
