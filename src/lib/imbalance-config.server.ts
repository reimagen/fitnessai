import { unstable_cache } from 'next/cache';
import { getAdminDb } from '@/lib/firebase-admin';
import { getActiveExercises } from '@/lib/exercise-registry.server';
import {
  IMBALANCE_CONFIG,
  IMBALANCE_TYPES,
  type ImbalanceType,
} from '@/analysis/analysis.config';
import { getNormalizedExerciseName } from '@/lib/strength-standards';
import type { ExerciseDocument } from '@/lib/exercise-types';
import {
  ImbalanceConfigDocumentSchema,
  type ImbalanceConfigDocument,
  type ImbalanceConfigLoadResult,
  type ImbalancePairConfig,
} from '@/lib/imbalance-config-types';

const IMBALANCE_CONFIG_CACHE_TTL_SECONDS = 86400;

const getCachedImbalanceConfig = unstable_cache(
  async (): Promise<ImbalanceConfigDocument | null> => {
    const db = getAdminDb();
    const doc = await db.collection('config').doc('imbalanceConfig').get();
    if (!doc.exists) return null;
    return doc.data() as ImbalanceConfigDocument;
  },
  ['imbalance-config'],
  { revalidate: IMBALANCE_CONFIG_CACHE_TTL_SECONDS, tags: ['imbalance-config'] }
);

async function getUncachedImbalanceConfig(): Promise<ImbalanceConfigDocument | null> {
  const db = getAdminDb();
  const doc = await db.collection('config').doc('imbalanceConfig').get();
  if (!doc.exists) return null;
  return doc.data() as ImbalanceConfigDocument;
}

function buildExerciseMaps(exercises: ExerciseDocument[]) {
  const exerciseById = new Map<string, ExerciseDocument>();
  const idByNormalizedName = new Map<string, string>();

  for (const exercise of exercises) {
    exerciseById.set(exercise.id, exercise);
    idByNormalizedName.set(getNormalizedExerciseName(exercise.normalizedName), exercise.id);
    for (const legacyName of exercise.legacyNames ?? []) {
      idByNormalizedName.set(getNormalizedExerciseName(legacyName), exercise.id);
    }
  }

  return { exerciseById, idByNormalizedName };
}

function resolveFallbackPair(
  imbalanceType: ImbalanceType,
  exercises: ExerciseDocument[],
  idByNormalizedName: Map<string, string>
): { pair: ImbalancePairConfig | null; issueCount: number } {
  const config = IMBALANCE_CONFIG[imbalanceType];

  const resolveId = (options: string[]) => {
    for (const option of options) {
      const candidateId = idByNormalizedName.get(getNormalizedExerciseName(option));
      if (candidateId) return candidateId;

      const optionNormalized = getNormalizedExerciseName(option);
      const direct = exercises.find(
        exercise => getNormalizedExerciseName(exercise.normalizedName) === optionNormalized
      );
      if (direct) return direct.id;
    }
    return null;
  };

  const lift1CanonicalId = resolveId(config.lift1Options);
  const lift2CanonicalId = resolveId(config.lift2Options);

  let issueCount = 0;
  if (!lift1CanonicalId) issueCount += 1;
  if (!lift2CanonicalId) issueCount += 1;

  if (!lift1CanonicalId || !lift2CanonicalId || lift1CanonicalId === lift2CanonicalId) {
    if (lift1CanonicalId === lift2CanonicalId && lift1CanonicalId) {
      issueCount += 1;
    }
    return { pair: null, issueCount };
  }

  return {
    pair: {
      imbalanceType,
      lift1CanonicalId,
      lift2CanonicalId,
      isActive: true,
    },
    issueCount,
  };
}

function buildFallbackResult(exercises: ExerciseDocument[]): ImbalanceConfigLoadResult {
  const { idByNormalizedName } = buildExerciseMaps(exercises);
  let validationIssueCount = 0;

  const pairs: ImbalancePairConfig[] = [];
  for (const imbalanceType of IMBALANCE_TYPES) {
    const { pair, issueCount } = resolveFallbackPair(imbalanceType, exercises, idByNormalizedName);
    validationIssueCount += issueCount;
    if (pair) {
      pairs.push(pair);
    }
  }

  return {
    pairs,
    source: 'fallback',
    version: null,
    validationIssueCount,
  };
}

export async function getImbalanceConfig(): Promise<ImbalanceConfigLoadResult> {
  const exercises = await getActiveExercises();
  const fallback = buildFallbackResult(exercises);

  try {
    const { exerciseById } = buildExerciseMaps(exercises);
    const buildResultFromDocument = (doc: ImbalanceConfigDocument): ImbalanceConfigLoadResult => {
      const parsed = ImbalanceConfigDocumentSchema.safeParse(doc);
      if (!parsed.success) {
        return {
          ...fallback,
          validationIssueCount: fallback.validationIssueCount + parsed.error.issues.length,
        };
      }

      const seen = new Set<string>();
      let validationIssueCount = 0;

      const pairs: ImbalancePairConfig[] = [];
      for (const pair of parsed.data.pairs) {
        if (pair.isActive === false) {
          continue;
        }

        if (pair.lift1CanonicalId === pair.lift2CanonicalId) {
          validationIssueCount += 1;
          continue;
        }

        const lift1Exists = exerciseById.has(pair.lift1CanonicalId);
        const lift2Exists = exerciseById.has(pair.lift2CanonicalId);
        if (!lift1Exists || !lift2Exists) {
          validationIssueCount += 1;
          continue;
        }

        const key = `${pair.imbalanceType}|${pair.lift1CanonicalId}|${pair.lift2CanonicalId}`;
        if (seen.has(key)) {
          validationIssueCount += 1;
          continue;
        }

        seen.add(key);
        pairs.push(pair);
      }

      if (pairs.length === 0) {
        return {
          ...fallback,
          validationIssueCount: fallback.validationIssueCount + validationIssueCount,
        };
      }

      return {
        pairs,
        source: 'firestore',
        version: parsed.data.version,
        validationIssueCount,
      };
    };

    const raw = await getCachedImbalanceConfig();
    if (raw) {
      const cachedResult = buildResultFromDocument(raw);
      if (cachedResult.source === 'firestore') {
        return cachedResult;
      }
    }

    const uncached = await getUncachedImbalanceConfig();
    if (!uncached) {
      return fallback;
    }

    return buildResultFromDocument(uncached);
  } catch (error) {
    console.error('Failed to load imbalance config from Firestore:', error);
    return fallback;
  }
}
