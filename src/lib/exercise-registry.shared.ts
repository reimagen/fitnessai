import type {
  AliasDocument,
  ExerciseAliasMap,
  ExerciseCategoryMap,
  ExerciseDocument,
  StrengthStandardsMap,
} from './exercise-types';
export function normalizeExerciseName(input: string): string {
  return input
    .trim()
    .toLowerCase()
    .replace(/^egym\s+/, '')
    .replace(/[()]/g, '')
    .replace(/\s+/g, ' ');
}

export function buildStrengthStandardsFromExercises(
  exercises: ExerciseDocument[]
): StrengthStandardsMap {
  const standards: StrengthStandardsMap = {};

  exercises.forEach(exercise => {
    if (exercise.type !== 'strength' || !exercise.strengthStandards) {
      return;
    }

    standards[normalizeExerciseName(exercise.normalizedName)] = {
      type: exercise.strengthStandards.baseType,
      category: exercise.category,
      standards: exercise.strengthStandards.standards,
    };
  });

  return standards;
}

export function buildCardioCategoryMapFromExercises(
  exercises: ExerciseDocument[]
): ExerciseCategoryMap {
  const categories: ExerciseCategoryMap = {};

  exercises.forEach(exercise => {
    if (exercise.type !== 'cardio') {
      return;
    }

    categories[normalizeExerciseName(exercise.normalizedName)] = exercise.category;
  });

  return categories;
}

export function buildAliasMapFromDocuments(aliasDocs: AliasDocument[]): ExerciseAliasMap {
  return aliasDocs.reduce<ExerciseAliasMap>((acc, aliasDoc) => {
    acc[normalizeExerciseName(aliasDoc.alias)] = aliasDoc.canonicalId;
    return acc;
  }, {});
}
