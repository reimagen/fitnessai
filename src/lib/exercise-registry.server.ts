import { unstable_cache } from 'next/cache';
import { getAdminDb, exerciseConverter, exerciseAliasConverter } from './firebase-admin';
import type {
  AliasDocument,
  ExerciseAliasMap,
  ExerciseCategoryMap,
  ExerciseDocument,
  ExerciseStandardData,
  StrengthRatiosMap,
  StrengthStandardsMap,
} from './exercise-types';
import type { ExerciseCategory } from './types';
import {
  buildAliasMapFromDocuments,
  buildCardioCategoryMapFromExercises,
  buildStrengthStandardsFromExercises,
  normalizeExerciseName,
} from './exercise-registry.shared';

const EXERCISE_CACHE_TTL_SECONDS = 3600;
const ALIAS_CACHE_TTL_SECONDS = 86400;
const RATIOS_CACHE_TTL_SECONDS = 86400;

export { normalizeExerciseName };

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
    if (exercises.length === 0) {
      console.error('Exercise registry degraded: no active exercises found in Firestore.');
    }
    return exercises;
  } catch (error) {
    console.error('Failed to load exercises from Firestore:', error);
    return [];
  }
}

export async function getStrengthStandards(): Promise<StrengthStandardsMap> {
  const exercises = await getActiveExercises();
  return buildStrengthStandardsFromExercises(exercises);
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
  return buildCardioCategoryMapFromExercises(exercises);
}

export async function getCardioCategory(
  exerciseName: string
): Promise<ExerciseCategory | undefined> {
  const categories = await getCardioExercises();
  return categories[normalizeExerciseName(exerciseName)];
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

  return {};
}

export async function getExerciseAliases(): Promise<ExerciseAliasMap> {
  try {
    const aliasDocs = await getCachedAliases();
    if (aliasDocs.length > 0) {
      return buildAliasMapFromDocuments(aliasDocs);
    }
  } catch (error) {
    console.error('Failed to load exercise aliases from Firestore:', error);
  }

  return {};
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
