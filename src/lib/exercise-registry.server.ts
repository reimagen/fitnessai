import { unstable_cache } from 'next/cache';
import { getAdminDb, exerciseConverter, exerciseAliasConverter } from './firebase-admin';
import type {
  ExerciseAliasMap,
  ExerciseCategoryMap,
  ExerciseStandardData,
  StrengthRatiosMap,
  StrengthStandardsMap,
} from './exercise-types';
import type { ExerciseCategory } from './types';
import type { AliasDocument, ExerciseDocument } from './exercise-types';
import {
  STRENGTH_STANDARDS,
  STRENGTH_RATIOS,
  CARDIO_EXERCISES,
  LIFT_NAME_ALIASES,
} from './exercise-data';

const EXERCISE_CACHE_TTL_SECONDS = 3600;
const ALIAS_CACHE_TTL_SECONDS = 86400;
const RATIOS_CACHE_TTL_SECONDS = 86400;

export function normalizeExerciseName(input: string): string {
  return input
    .trim()
    .toLowerCase()
    .replace(/^egym\s+/, '')
    .replace(/[()]/g, '')
    .replace(/\s+/g, ' ');
}

function toSlug(input: string): string {
  return normalizeExerciseName(input).replace(/\s+/g, '-');
}

function toTitleCase(input: string): string {
  return normalizeExerciseName(input)
    .split(' ')
    .map(word => (word ? word[0].toUpperCase() + word.slice(1) : ''))
    .join(' ');
}

function buildFallbackExercises(): ExerciseDocument[] {
  const strengthExercises: ExerciseDocument[] = Object.entries(STRENGTH_STANDARDS).map(
    ([name, data]) => {
      const normalizedName = normalizeExerciseName(name);
      const machineNormalizedName = `machine ${normalizedName}`;
      return {
        id: `machine-${toSlug(name)}`,
        name: `Machine ${toTitleCase(name)}`,
        normalizedName: machineNormalizedName,
        equipment: 'machine',
        category: data.category,
        type: 'strength',
        strengthStandards: {
          baseType: data.type,
          standards: data.standards,
        },
        isActive: true,
        legacyNames: [normalizedName, machineNormalizedName],
      };
    }
  );

  const cardioExercises: ExerciseDocument[] = Object.entries(CARDIO_EXERCISES).map(
    ([name, category]) => {
      const normalizedName = normalizeExerciseName(name);
      return {
        id: `other-${toSlug(name)}`,
        name: toTitleCase(name),
        normalizedName,
        equipment: 'other',
        category,
        type: 'cardio',
        isActive: true,
        legacyNames: [normalizedName],
      };
    }
  );

  return [...strengthExercises, ...cardioExercises];
}

const getCachedActiveExercises = unstable_cache(
  async (): Promise<ExerciseDocument[]> => {
    const db = getAdminDb();
    const snapshot = await db
      .collection('exercises')
      .withConverter(exerciseConverter)
      .where('isActive', '==', true)
      .get();

    return snapshot.docs.map(doc => doc.data());
  },
  ['exercise-registry', 'active-exercises'],
  { revalidate: EXERCISE_CACHE_TTL_SECONDS, tags: ['exercises'] }
);

const getCachedAliases = unstable_cache(
  async (): Promise<AliasDocument[]> => {
    const db = getAdminDb();
    const snapshot = await db
      .collection('exerciseAliases')
      .withConverter(exerciseAliasConverter)
      .get();

    return snapshot.docs.map(doc => doc.data());
  },
  ['exercise-registry', 'aliases'],
  { revalidate: ALIAS_CACHE_TTL_SECONDS, tags: ['exercises'] }
);

const getCachedStrengthRatios = unstable_cache(
  async (): Promise<StrengthRatiosMap | null> => {
    const db = getAdminDb();
    const doc = await db.collection('config').doc('strengthRatios').get();
    const data = doc.data();
    return data?.data || null;
  },
  ['exercise-registry', 'strength-ratios'],
  { revalidate: RATIOS_CACHE_TTL_SECONDS, tags: ['exercises'] }
);

export async function getActiveExercises(): Promise<ExerciseDocument[]> {
  try {
    const exercises = await getCachedActiveExercises();
    if (exercises.length > 0) {
      return exercises;
    }
  } catch (error) {
    console.error('Failed to load exercises from Firestore:', error);
  }

  return buildFallbackExercises();
}

export async function getStrengthStandards(): Promise<StrengthStandardsMap> {
  const exercises = await getActiveExercises();
  const standards: StrengthStandardsMap = {};

  exercises.forEach(exercise => {
    if (exercise.type !== 'strength' || !exercise.strengthStandards) {
      return;
    }

    standards[exercise.normalizedName] = {
      type: exercise.strengthStandards.baseType,
      category: exercise.category,
      standards: exercise.strengthStandards.standards,
    };
  });

  if (Object.keys(standards).length > 0) {
    return standards;
  }

  return STRENGTH_STANDARDS;
}

export async function getExerciseStandard(
  exerciseName: string
): Promise<ExerciseStandardData | undefined> {
  const standards = await getStrengthStandards();
  const normalized = normalizeExerciseName(exerciseName);
  const cached = standards[normalized];
  if (cached) {
    return cached;
  }

  try {
    const db = getAdminDb();
    const snapshot = await db
      .collection('exercises')
      .withConverter(exerciseConverter)
      .where('normalizedName', '==', normalized)
      .where('isActive', '==', true)
      .limit(1)
      .get();

    if (!snapshot.empty) {
      const exercise = snapshot.docs[0].data();
      if (exercise.type === 'strength' && exercise.strengthStandards) {
        return {
          type: exercise.strengthStandards.baseType,
          category: exercise.category,
          standards: exercise.strengthStandards.standards,
        };
      }
    }
  } catch (error) {
    console.error('Failed to load exercise standard from Firestore:', error);
  }

  return undefined;
}

export async function getCardioExercises(): Promise<ExerciseCategoryMap> {
  const exercises = await getActiveExercises();
  const categories: ExerciseCategoryMap = {};

  exercises.forEach(exercise => {
    if (exercise.type === 'cardio') {
      categories[exercise.normalizedName] = exercise.category;
    }
  });

  if (Object.keys(categories).length > 0) {
    return categories;
  }

  return CARDIO_EXERCISES;
}

export async function getCardioCategory(
  exerciseName: string
): Promise<ExerciseCategory | undefined> {
  const categories = await getCardioExercises();
  return categories[exerciseName];
}

export async function getStrengthRatios(): Promise<StrengthRatiosMap> {
  try {
    const ratios = await getCachedStrengthRatios();
    if (ratios) {
      return ratios;
    }
  } catch (error) {
    console.error('Failed to load strength ratios from Firestore:', error);
  }

  return STRENGTH_RATIOS;
}

export async function getExerciseAliases(): Promise<ExerciseAliasMap> {
  try {
    const aliasDocs = await getCachedAliases();
    if (aliasDocs.length > 0) {
      return aliasDocs.reduce<ExerciseAliasMap>((acc, aliasDoc) => {
        acc[aliasDoc.alias] = aliasDoc.canonicalId;
        return acc;
      }, {});
    }
  } catch (error) {
    console.error('Failed to load exercise aliases from Firestore:', error);
  }

  return LIFT_NAME_ALIASES;
}

export async function getExerciseAlias(alias: string): Promise<string | null> {
  const aliases = await getExerciseAliases();
  return aliases[normalizeExerciseName(alias)] || null;
}

export async function getExerciseById(id: string): Promise<ExerciseDocument | null> {
  const exercises = await getActiveExercises();
  return exercises.find(exercise => exercise.id === id) || null;
}

export async function findExerciseByLegacyName(
  name: string
): Promise<ExerciseDocument | null> {
  const normalizedName = normalizeExerciseName(name);
  const exercises = await getActiveExercises();
  return (
    exercises.find(exercise => exercise.legacyNames?.includes(normalizedName)) || null
  );
}
