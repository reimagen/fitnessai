import fs from 'node:fs';
import path from 'node:path';
import dotenv from 'dotenv';
import { getAdminDb, exerciseConverter } from '../src/lib/firebase-admin';
import type { ExerciseDocument } from '../src/lib/exercise-types';

type Options = {
  apply: boolean;
  envPath?: string;
};

function parseArgs(argv: string[]): Options {
  const options: Options = { apply: false };
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

  // Query all exercises with equipment: 'machine'
  const snapshot = await db
    .collection('exercises')
    .withConverter(exerciseConverter)
    .where('equipment', '==', 'machine')
    .get();

  const machineExercises = snapshot.docs.map(doc => doc.data());

  console.log(`Project: ${projectId}`);
  console.log(`Machine exercises found: ${machineExercises.length}`);
  console.log(`Mode: ${options.apply ? 'apply' : 'dry-run'}`);
  console.log('');

  if (machineExercises.length === 0) {
    console.log('No machine exercises found.');
    return;
  }

  // Preview changes
  console.log('Changes to be made:');
  console.log('-------------------');
  machineExercises.forEach(exercise => {
    const newName = `Machine ${exercise.name}`;
    const newNormalizedName = `machine ${exercise.normalizedName}`;
    const newLegacyNames = [
      ...(exercise.legacyNames || []),
      exercise.normalizedName,
    ];

    console.log(`
ID: ${exercise.id}
  name: "${exercise.name}" → "${newName}"
  normalizedName: "${exercise.normalizedName}" → "${newNormalizedName}"
  legacyNames: [${newLegacyNames.map(n => `"${n}"`).join(', ')}]`);
  });

  if (!options.apply) {
    console.log('');
    console.log('Dry-run complete. Re-run with --apply to write to Firestore.');
    return;
  }

  // Apply changes
  console.log('');
  console.log('Applying changes to Firestore...');
  const batch = db.batch();
  const collectionRef = db.collection('exercises').withConverter(exerciseConverter);

  machineExercises.forEach(exercise => {
    const newLegacyNames = [
      ...(exercise.legacyNames || []),
      exercise.normalizedName,
    ];

    // Remove duplicates
    const uniqueLegacyNames = Array.from(new Set(newLegacyNames));

    const updatedExercise: ExerciseDocument = {
      ...exercise,
      name: `Machine ${exercise.name}`,
      normalizedName: `machine ${exercise.normalizedName}`,
      legacyNames: uniqueLegacyNames,
      updatedAt: new Date(),
    };

    batch.set(collectionRef.doc(exercise.id), updatedExercise, { merge: true });
  });

  await batch.commit();
  console.log(`✓ Successfully renamed ${machineExercises.length} machine exercises.`);
}

main().catch(error => {
  console.error(error);
  process.exit(1);
});
