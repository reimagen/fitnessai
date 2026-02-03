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

// Detect and remove duplicate equipment prefix (including mid-string duplicates)
function getFixedId(id: string): { original: string; fixed: string; hasIssue: boolean } {
  // Common equipment prefixes
  const prefixes = ['barbell-', 'dumbbell-', 'cable-', 'machine-', 'smith-', 'other-'];

  for (const prefix of prefixes) {
    // Check for prefix at start (barbell-barbell-*)
    if (id.startsWith(prefix)) {
      const remainder = id.slice(prefix.length);
      if (remainder.startsWith(prefix)) {
        const fixed = prefix + remainder.slice(prefix.length);
        return { original: id, fixed, hasIssue: true };
      }
    }

    // Check for prefix appearing twice anywhere in the id (e.g., dumbbell-incline-dumbbell-*)
    const prefixWithoutDash = prefix.slice(0, -1); // 'dumbbell' from 'dumbbell-'
    const firstIndex = id.indexOf(prefix);
    if (firstIndex >= 0) {
      const secondIndex = id.indexOf(prefix, firstIndex + prefix.length);
      if (secondIndex >= 0) {
        // Remove the second occurrence
        const fixed = id.slice(0, secondIndex) + id.slice(secondIndex + prefix.length);
        return { original: id, fixed, hasIssue: true };
      }
    }
  }

  return { original: id, fixed: id, hasIssue: false };
}

function getFixedNormalizedName(normalizedName: string, equipment: string): { original: string; fixed: string; hasIssue: boolean } {
  const equipmentLower = equipment.toLowerCase();
  const equipmentPrefix = `${equipmentLower} `;

  // Check if it starts with double prefix like "barbell barbell "
  if (normalizedName.startsWith(`${equipmentPrefix}${equipmentPrefix}`)) {
    const fixed = normalizedName.replace(`${equipmentPrefix}${equipmentPrefix}`, equipmentPrefix);
    return { original: normalizedName, fixed, hasIssue: true };
  }

  // Check for equipment appearing twice anywhere (e.g., "incline dumbbell bench press" should stay, but "incline dumbbell dumbbell" should be fixed)
  // This is trickier - only remove if it appears as a standalone word twice
  const words = normalizedName.split(' ');
  const equipmentOccurrences = words.filter(w => w === equipmentLower).length;

  if (equipmentOccurrences > 1) {
    // Remove duplicates, keeping first occurrence
    let found = false;
    const fixed = words
      .filter(w => {
        if (w === equipmentLower) {
          if (!found) {
            found = true;
            return true;
          }
          return false;
        }
        return true;
      })
      .join(' ');

    if (fixed !== normalizedName) {
      return { original: normalizedName, fixed, hasIssue: true };
    }
  }

  return { original: normalizedName, fixed: normalizedName, hasIssue: false };
}

function getFixedName(name: string): { original: string; fixed: string; hasIssue: boolean } {
  // Check for patterns like "Barbell Barbell Back Squat" or "Dumbbell Incline Dumbbell Bench Press"
  const doublePatterns = [
    { pattern: /^(Barbell) \1 /i, replacement: '$1 ' },
    { pattern: /^(Dumbbell) \1 /i, replacement: '$1 ' },
    { pattern: /^(Cable) \1 /i, replacement: '$1 ' },
    { pattern: /^(Machine) \1 /i, replacement: '$1 ' },
    { pattern: / (Dumbbell) (?=[A-Z])/g, replacement: ' ' }, // "Incline Dumbbell Bench" -> "Incline Bench"
    { pattern: / (Barbell) (?=[A-Z])/g, replacement: ' ' },
    { pattern: / (Cable) (?=[A-Z])/g, replacement: ' ' },
    { pattern: / (Smith) (?=[A-Z])/g, replacement: ' ' },
  ];

  let fixed = name;
  let hasIssue = false;

  for (const { pattern, replacement } of doublePatterns) {
    if (pattern.test(fixed)) {
      const newFixed = fixed.replace(pattern, replacement);
      if (newFixed !== fixed) {
        hasIssue = true;
        fixed = newFixed;
      }
    }
  }

  return { original: name, fixed, hasIssue };
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

  // Query all active exercises
  const snapshot = await db
    .collection('exercises')
    .withConverter(exerciseConverter)
    .where('isActive', '==', true)
    .get();

  const allExercises = snapshot.docs.map(doc => doc.data());

  // Find exercises with duplicate prefixes
  const exercisesToFix: Array<{
    exercise: ExerciseDocument;
    idFix: ReturnType<typeof getFixedId>;
    normalizedNameFix: ReturnType<typeof getFixedNormalizedName>;
    nameFix: ReturnType<typeof getFixedName>;
  }> = [];

  allExercises.forEach(exercise => {
    const idFix = getFixedId(exercise.id);
    const normalizedNameFix = getFixedNormalizedName(exercise.normalizedName, exercise.equipment);
    const nameFix = getFixedName(exercise.name);

    if (idFix.hasIssue || normalizedNameFix.hasIssue || nameFix.hasIssue) {
      exercisesToFix.push({ exercise, idFix, normalizedNameFix, nameFix });
    }
  });

  console.log(`Project: ${projectId}`);
  console.log(`Total exercises: ${allExercises.length}`);
  console.log(`Exercises with duplicate prefixes: ${exercisesToFix.length}`);
  console.log(`Mode: ${options.apply ? 'apply' : 'dry-run'}`);
  console.log('');

  if (exercisesToFix.length === 0) {
    console.log('No exercises with duplicate prefixes found. ✓');
    return;
  }

  // Preview changes
  console.log('Changes to be made:');
  console.log('-------------------');
  exercisesToFix.forEach(({ exercise, idFix, normalizedNameFix, nameFix }) => {
    console.log(`\n${exercise.id} ${idFix.hasIssue ? '→ ' + idFix.fixed : ''}`);
    if (idFix.hasIssue) {
      console.log(`  id: "${idFix.original}" → "${idFix.fixed}"`);
    }
    if (normalizedNameFix.hasIssue) {
      console.log(`  normalizedName: "${normalizedNameFix.original}" → "${normalizedNameFix.fixed}"`);
    }
    if (nameFix.hasIssue) {
      console.log(`  name: "${nameFix.original}" → "${nameFix.fixed}"`);
    }
  });

  if (!options.apply) {
    console.log('\n-------------------');
    console.log('Dry-run complete. Re-run with --apply to write to Firestore.');
    return;
  }

  // Apply changes
  console.log('\nApplying changes to Firestore...');
  const batch = db.batch();
  const collectionRef = db.collection('exercises').withConverter(exerciseConverter);

  exercisesToFix.forEach(({ exercise, idFix, normalizedNameFix, nameFix }) => {
    const updatedExercise: ExerciseDocument = {
      ...exercise,
      id: idFix.fixed,
      name: nameFix.fixed,
      normalizedName: normalizedNameFix.fixed,
      updatedAt: new Date(),
    };

    // If ID changed, delete old and create new
    if (idFix.hasIssue) {
      batch.delete(collectionRef.doc(exercise.id));
      batch.set(collectionRef.doc(idFix.fixed), updatedExercise);
    } else {
      batch.set(collectionRef.doc(exercise.id), updatedExercise, { merge: true });
    }
  });

  await batch.commit();
  console.log(`✓ Successfully fixed ${exercisesToFix.length} exercises.`);
}

main().catch(error => {
  console.error(error);
  process.exit(1);
});
