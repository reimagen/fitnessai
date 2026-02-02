import fs from 'node:fs';
import path from 'node:path';
import dotenv from 'dotenv';
import { getAdminDb, exerciseConverter } from '../src/lib/firebase-admin';
import type { ExerciseDocument } from '../src/lib/exercise-types';

type NewExercise = {
  name: string;
  normalizedName: string;
  equipment: ExerciseDocument['equipment'];
  category: ExerciseDocument['category'];
  type: ExerciseDocument['type'];
  strengthStandards?: ExerciseDocument['strengthStandards'];
};

const NEW_EXERCISES: NewExercise[] = [
  {
    name: 'Cable Tricep Pushdown',
    normalizedName: 'cable tricep pushdown',
    equipment: 'cable',
    category: 'Upper Body',
    type: 'strength',
    strengthStandards: {
      baseType: 'bw',
      standards: {
        Male: { intermediate: 0.75, advanced: 1.0, elite: 1.5 },
        Female: { intermediate: 0.5, advanced: 0.75, elite: 1.05 },
      },
    },
  },
  {
    name: 'Tricep Rope Pushdown',
    normalizedName: 'tricep rope pushdown',
    equipment: 'cable',
    category: 'Upper Body',
    type: 'strength',
    strengthStandards: {
      baseType: 'bw',
      standards: {
        Male: { intermediate: 0.6, advanced: 0.9, elite: 1.25 },
        Female: { intermediate: 0.4, advanced: 0.6, elite: 0.85 },
      },
    },
  },
  {
    name: 'Deadlift',
    normalizedName: 'deadlift',
    equipment: 'barbell',
    category: 'Lower Body',
    type: 'strength',
    strengthStandards: {
      baseType: 'bw',
      standards: {
        Male: { intermediate: 2.0, advanced: 2.5, elite: 3.0 },
        Female: { intermediate: 1.25, advanced: 1.75, elite: 2.5 },
      },
    },
  },
  {
    name: 'Dumbbell Curl (Per Arm)',
    normalizedName: 'dumbbell curl per arm',
    equipment: 'dumbbell',
    category: 'Upper Body',
    type: 'strength',
    strengthStandards: {
      baseType: 'bw',
      standards: {
        Male: { intermediate: 0.3, advanced: 0.5, elite: 0.65 },
        Female: { intermediate: 0.2, advanced: 0.35, elite: 0.45 },
      },
    },
  },
  {
    name: 'Barbell Bench Press',
    normalizedName: 'barbell bench press',
    equipment: 'barbell',
    category: 'Upper Body',
    type: 'strength',
    strengthStandards: {
      baseType: 'bw',
      standards: {
        Male: { intermediate: 1.25, advanced: 1.75, elite: 2.0 },
        Female: { intermediate: 0.75, advanced: 1.0, elite: 1.5 },
      },
    },
  },
  {
    name: 'Barbell Overhead Press',
    normalizedName: 'barbell overhead press',
    equipment: 'barbell',
    category: 'Upper Body',
    type: 'strength',
    strengthStandards: {
      baseType: 'bw',
      standards: {
        Male: { intermediate: 0.8, advanced: 1.1, elite: 1.4 },
        Female: { intermediate: 0.5, advanced: 0.75, elite: 1.0 },
      },
    },
  },
  {
    name: 'Romanian Deadlift',
    normalizedName: 'romanian deadlift',
    equipment: 'barbell',
    category: 'Lower Body',
    type: 'strength',
    strengthStandards: {
      baseType: 'bw',
      standards: {
        Male: { intermediate: 1.5, advanced: 2.0, elite: 2.75 },
        Female: { intermediate: 1.0, advanced: 1.5, elite: 1.75 },
      },
    },
  },
  {
    name: 'Barbell Curl',
    normalizedName: 'barbell curl',
    equipment: 'barbell',
    category: 'Upper Body',
    type: 'strength',
    strengthStandards: {
      baseType: 'bw',
      standards: {
        Male: { intermediate: 0.6, advanced: 0.85, elite: 1.15 },
        Female: { intermediate: 0.4, advanced: 0.6, elite: 0.85 },
      },
    },
  },
  {
    name: 'Barbell Back Squat',
    normalizedName: 'barbell back squat',
    equipment: 'barbell',
    category: 'Lower Body',
    type: 'strength',
    strengthStandards: {
      baseType: 'bw',
      standards: {
        Male: { intermediate: 1.5, advanced: 2.25, elite: 2.75 },
        Female: { intermediate: 1.25, advanced: 1.5, elite: 2.0 },
      },
    },
  },
  {
    name: 'Incline Bench Press',
    normalizedName: 'incline bench press',
    equipment: 'barbell',
    category: 'Upper Body',
    type: 'strength',
    strengthStandards: {
      baseType: 'bw',
      standards: {
        Male: { intermediate: 1.0, advanced: 1.5, elite: 1.75 },
        Female: { intermediate: 0.65, advanced: 1.0, elite: 1.4 },
      },
    },
  },
  {
    name: 'Bent Over Row',
    normalizedName: 'bent over row',
    equipment: 'barbell',
    category: 'Upper Body',
    type: 'strength',
    strengthStandards: {
      baseType: 'bw',
      standards: {
        Male: { intermediate: 1.0, advanced: 1.5, elite: 1.75 },
        Female: { intermediate: 0.65, advanced: 0.9, elite: 1.2 },
      },
    },
  },
  {
    name: 'Barbell Hip Thrust',
    normalizedName: 'barbell hip thrust',
    equipment: 'barbell',
    category: 'Lower Body',
    type: 'strength',
    strengthStandards: {
      baseType: 'bw',
      standards: {
        Male: { intermediate: 1.75, advanced: 2.5, elite: 3.5 },
        Female: { intermediate: 1.5, advanced: 2.25, elite: 3.0 },
      },
    },
  },
  {
    name: 'Dumbbell Bench Press (Per Arm)',
    normalizedName: 'dumbbell bench press per arm',
    equipment: 'dumbbell',
    category: 'Upper Body',
    type: 'strength',
    strengthStandards: {
      baseType: 'bw',
      standards: {
        Male: { intermediate: 0.5, advanced: 0.75, elite: 1.0 },
        Female: { intermediate: 0.3, advanced: 0.5, elite: 0.7 },
      },
    },
  },
  {
    name: 'Incline Dumbbell Bench Press (Per Arm)',
    normalizedName: 'incline dumbbell bench press per arm',
    equipment: 'dumbbell',
    category: 'Upper Body',
    type: 'strength',
    strengthStandards: {
      baseType: 'bw',
      standards: {
        Male: { intermediate: 0.5, advanced: 0.65, elite: 0.85 },
        Female: { intermediate: 0.3, advanced: 0.45, elite: 0.6 },
      },
    },
  },
  {
    name: 'Dumbbell Shoulder Press (Per Arm)',
    normalizedName: 'dumbbell shoulder press per arm',
    equipment: 'dumbbell',
    category: 'Upper Body',
    type: 'strength',
    strengthStandards: {
      baseType: 'bw',
      standards: {
        Male: { intermediate: 0.4, advanced: 0.6, elite: 0.75 },
        Female: { intermediate: 0.25, advanced: 0.35, elite: 0.5 },
      },
    },
  },
  {
    name: 'Dumbbell Lateral Raise (Per Arm)',
    normalizedName: 'dumbbell lateral raise per arm',
    equipment: 'dumbbell',
    category: 'Upper Body',
    type: 'strength',
    strengthStandards: {
      baseType: 'bw',
      standards: {
        Male: { intermediate: 0.2, advanced: 0.3, elite: 0.45 },
        Female: { intermediate: 0.15, advanced: 0.2, elite: 0.3 },
      },
    },
  },
  {
    name: 'Dumbbell Row (Per Arm)',
    normalizedName: 'dumbbell row per arm',
    equipment: 'dumbbell',
    category: 'Upper Body',
    type: 'strength',
    strengthStandards: {
      baseType: 'bw',
      standards: {
        Male: { intermediate: 0.55, advanced: 0.8, elite: 1.05 },
        Female: { intermediate: 0.35, advanced: 0.5, elite: 0.65 },
      },
    },
  },
  {
    name: 'Hammer Curl (Per Arm)',
    normalizedName: 'hammer curl per arm',
    equipment: 'dumbbell',
    category: 'Upper Body',
    type: 'strength',
    strengthStandards: {
      baseType: 'bw',
      standards: {
        Male: { intermediate: 0.3, advanced: 0.45, elite: 0.6 },
        Female: { intermediate: 0.2, advanced: 0.3, elite: 0.4 },
      },
    },
  },
  {
    name: 'Seated Dumbbell Shoulder Press (Per Arm)',
    normalizedName: 'seated dumbbell shoulder press per arm',
    equipment: 'dumbbell',
    category: 'Upper Body',
    type: 'strength',
    strengthStandards: {
      baseType: 'bw',
      standards: {
        Male: { intermediate: 0.4, advanced: 0.55, elite: 0.75 },
        Female: { intermediate: 0.25, advanced: 0.35, elite: 0.5 },
      },
    },
  },
  {
    name: 'Dumbbell Bulgarian Split Squat (Per Arm)',
    normalizedName: 'dumbbell bulgarian split squat per arm',
    equipment: 'dumbbell',
    category: 'Lower Body',
    type: 'strength',
    strengthStandards: {
      baseType: 'bw',
      standards: {
        Male: { intermediate: 0.4, advanced: 0.6, elite: 0.8 },
        Female: { intermediate: 0.3, advanced: 0.45, elite: 0.6 },
      },
    },
  },
  {
    name: 'Goblet Squat',
    normalizedName: 'goblet squat',
    equipment: 'dumbbell',
    category: 'Lower Body',
    type: 'strength',
    strengthStandards: {
      baseType: 'bw',
      standards: {
        Male: { intermediate: 0.55, advanced: 0.85, elite: 1.15 },
        Female: { intermediate: 0.4, advanced: 0.6, elite: 0.85 },
      },
    },
  },
  {
    name: 'Dumbbell Fly (Per Arm)',
    normalizedName: 'dumbbell fly per arm',
    equipment: 'dumbbell',
    category: 'Upper Body',
    type: 'strength',
    strengthStandards: {
      baseType: 'bw',
      standards: {
        Male: { intermediate: 0.3, advanced: 0.5, elite: 0.7 },
        Female: { intermediate: 0.2, advanced: 0.3, elite: 0.45 },
      },
    },
  },
  {
    name: 'Dumbbell Reverse Fly (Per Arm)',
    normalizedName: 'dumbbell reverse fly per arm',
    equipment: 'dumbbell',
    category: 'Upper Body',
    type: 'strength',
    strengthStandards: {
      baseType: 'bw',
      standards: {
        Male: { intermediate: 0.25, advanced: 0.4, elite: 0.6 },
        Female: { intermediate: 0.15, advanced: 0.25, elite: 0.4 },
      },
    },
  },
  {
    name: 'Dumbbell Calf Raise (Per Arm)',
    normalizedName: 'dumbbell calf raise per arm',
    equipment: 'dumbbell',
    category: 'Lower Body',
    type: 'strength',
    strengthStandards: {
      baseType: 'bw',
      standards: {
        Male: { intermediate: 0.5, advanced: 0.85, elite: 1.25 },
        Female: { intermediate: 0.35, advanced: 0.5, elite: 0.7 },
      },
    },
  },
  {
    name: 'Dumbbell Romanian Deadlift (Per Arm)',
    normalizedName: 'dumbbell romanian deadlift per arm',
    equipment: 'dumbbell',
    category: 'Lower Body',
    type: 'strength',
    strengthStandards: {
      baseType: 'bw',
      standards: {
        Male: { intermediate: 0.55, advanced: 0.8, elite: 1.1 },
        Female: { intermediate: 0.4, advanced: 0.6, elite: 0.8 },
      },
    },
  },
  {
    name: 'Dumbbell Lunge (Per Arm)',
    normalizedName: 'dumbbell lunge per arm',
    equipment: 'dumbbell',
    category: 'Lower Body',
    type: 'strength',
    strengthStandards: {
      baseType: 'bw',
      standards: {
        Male: { intermediate: 0.4, advanced: 0.6, elite: 0.85 },
        Female: { intermediate: 0.3, advanced: 0.45, elite: 0.65 },
      },
    },
  },
  {
    name: 'Front Squat',
    normalizedName: 'front squat',
    equipment: 'barbell',
    category: 'Lower Body',
    type: 'strength',
    strengthStandards: {
      baseType: 'bw',
      standards: {
        Male: { intermediate: 1.25, advanced: 1.75, elite: 2.25 },
        Female: { intermediate: 1.0, advanced: 1.25, elite: 1.5 },
      },
    },
  },
  {
    name: 'Barbell Lunge',
    normalizedName: 'barbell lunge',
    equipment: 'barbell',
    category: 'Lower Body',
    type: 'strength',
    strengthStandards: {
      baseType: 'bw',
      standards: {
        Male: { intermediate: 1.0, advanced: 1.5, elite: 2.0 },
        Female: { intermediate: 0.75, advanced: 1.25, elite: 1.5 },
      },
    },
  },
  {
    name: 'Good Morning',
    normalizedName: 'good morning',
    equipment: 'barbell',
    category: 'Lower Body',
    type: 'strength',
    strengthStandards: {
      baseType: 'bw',
      standards: {
        Male: { intermediate: 1.0, advanced: 1.75, elite: 2.25 },
        Female: { intermediate: 0.7, advanced: 1.05, elite: 1.45 },
      },
    },
  },
  {
    name: 'Cable Kickback',
    normalizedName: 'cable kickback',
    equipment: 'cable',
    category: 'Lower Body',
    type: 'strength',
    strengthStandards: {
      baseType: 'bw',
      standards: {
        Male: { intermediate: 0.25, advanced: 0.4, elite: 0.6 },
        Female: { intermediate: 0.45, advanced: 0.8, elite: 1.2 },
      },
    },
  },
  {
    name: 'Cable Fly',
    normalizedName: 'cable fly',
    equipment: 'cable',
    category: 'Upper Body',
    type: 'strength',
    strengthStandards: {
      baseType: 'bw',
      standards: {
        Male: { intermediate: 0.5, advanced: 0.85, elite: 1.35 },
        Female: { intermediate: 0.3, advanced: 0.55, elite: 0.8 },
      },
    },
  },
  {
    name: 'Cable Lateral Raise',
    normalizedName: 'cable lateral raise',
    equipment: 'cable',
    category: 'Upper Body',
    type: 'strength',
    strengthStandards: {
      baseType: 'bw',
      standards: {
        Male: { intermediate: 0.25, advanced: 0.45, elite: 0.75 },
        Female: { intermediate: 0.15, advanced: 0.25, elite: 0.35 },
      },
    },
  },
  {
    name: 'Face Pull',
    normalizedName: 'face pull',
    equipment: 'cable',
    category: 'Upper Body',
    type: 'strength',
    strengthStandards: {
      baseType: 'bw',
      standards: {
        Male: { intermediate: 0.6, advanced: 0.9, elite: 1.3 },
        Female: { intermediate: 0.5, advanced: 0.8, elite: 1.1 },
      },
    },
  },
  {
    name: 'Cable Bicep Curl',
    normalizedName: 'cable bicep curl',
    equipment: 'cable',
    category: 'Upper Body',
    type: 'strength',
    strengthStandards: {
      baseType: 'bw',
      standards: {
        Male: { intermediate: 0.65, advanced: 1.05, elite: 1.5 },
        Female: { intermediate: 0.4, advanced: 0.7, elite: 1.0 },
      },
    },
  },
  {
    name: 'Cable Crunch',
    normalizedName: 'cable crunch',
    equipment: 'cable',
    category: 'Core',
    type: 'strength',
    strengthStandards: {
      baseType: 'bw',
      standards: {
        Male: { intermediate: 1.0, advanced: 1.5, elite: 2.25 },
        Female: { intermediate: 1.0, advanced: 1.5, elite: 2.25 },
      },
    },
  },
  {
    name: 'Dumbbell Tricep Kickback (Per Arm)',
    normalizedName: 'dumbbell tricep kickback per arm',
    equipment: 'dumbbell',
    category: 'Upper Body',
    type: 'strength',
    strengthStandards: {
      baseType: 'bw',
      standards: {
        Male: { intermediate: 0.25, advanced: 0.4, elite: 0.55 },
        Female: { intermediate: 0.15, advanced: 0.25, elite: 0.35 },
      },
    },
  },
];

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

function toSlug(input: string): string {
  return input.trim().toLowerCase().replace(/\s+/g, '-');
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
  const exerciseDocs: ExerciseDocument[] = NEW_EXERCISES.map(exercise => {
    const id = `${exercise.equipment}-${toSlug(exercise.normalizedName)}`;
    return {
      id,
      name: exercise.name,
      normalizedName: exercise.normalizedName,
      equipment: exercise.equipment,
      category: exercise.category,
      type: exercise.type,
      strengthStandards: exercise.strengthStandards,
      isActive: true,
      legacyNames: [exercise.normalizedName],
      createdAt: now,
      updatedAt: now,
    };
  });

  console.log(`Project: ${projectId}`);
  console.log(`New exercises: ${exerciseDocs.length}`);
  console.log(`Mode: ${options.apply ? 'apply' : 'dry-run'}`);
  console.log(`IDs: ${exerciseDocs.map(ex => ex.id).join(', ')}`);

  if (!options.apply) {
    console.log('Dry-run complete. Re-run with --apply to write to Firestore.');
    return;
  }

  const db = getAdminDb();
  const collectionRef = db.collection('exercises').withConverter(exerciseConverter);
  const batch = db.batch();

  exerciseDocs.forEach(exercise => {
    batch.set(collectionRef.doc(exercise.id), exercise, { merge: true });
  });

  await batch.commit();
  console.log('Exercise upsert complete.');
}

main().catch(error => {
  console.error(error);
  process.exit(1);
});
