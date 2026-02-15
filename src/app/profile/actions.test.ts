import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/logging/server-action-wrapper', () => ({
  withServerActionLogging: async (_context: unknown, fn: () => Promise<unknown>) => fn(),
}));

vi.mock('@/lib/logging/request-context', () => ({
  createRequestContext: () => ({ requestId: 'test-request' }),
}));

vi.mock('@/lib/logging/logger', () => ({
  logger: {
    error: vi.fn(),
    info: vi.fn(),
  },
}));

vi.mock('@/lib/logging/error-classifier', () => ({
  classifyAIError: vi.fn((error: unknown) => ({
    category: 'unknown_error',
    statusCode: 500,
    shouldRetry: false,
    shouldCountAgainstLimit: false,
    userMessage: error instanceof Error ? error.message : 'Unknown error',
  })),
}));

vi.mock('@/app/prs/rate-limiting', () => ({
  checkRateLimit: vi.fn(async () => ({ allowed: true })),
}));

vi.mock('@/lib/env-validation', async () => {
  const actual = await vi.importActual<typeof import('@/lib/env-validation')>(
    '@/lib/env-validation'
  );
  return {
    ...actual,
    areAPIKeysAvailable: vi.fn(() => true),
  };
});

vi.mock('next/cache', () => ({
  revalidateTag: vi.fn(),
}));

vi.mock('@/ai/flows/lift-progression-analyzer', () => ({
  analyzeLiftProgression: vi.fn(async () => ({
    insight: 'Progress is steady.',
    recommendation: 'Add 2.5 lbs next week.',
  })),
}));

vi.mock('@/ai/flows/goal-analyzer', () => ({
  analyzeFitnessGoals: vi.fn(async () => ({
    overallSummary: 'Goals look good.',
    goalInsights: [],
  })),
}));

vi.mock('@/lib/strength-standards.server', () => ({
  getNormalizedExerciseName: vi.fn(async (name: string) => name.trim().toLowerCase()),
}));

vi.mock('@/lib/firestore-server', () => ({
  getUserProfile: vi.fn(async () => null),
  updateUserProfile: vi.fn(async () => undefined),
  incrementUsageCounter: vi.fn(async () => undefined),
  getGoalAnalysis: vi.fn(async () => null),
  saveGoalAnalysis: vi.fn(async () => undefined),
  getLiftProgressionAnalysis: vi.fn(async () => null),
  saveLiftProgressionAnalysis: vi.fn(async () => undefined),
  getFitnessGoals: vi.fn(async () => []),
  saveFitnessGoals: vi.fn(async () => undefined),
}));

import {
  analyzeGoalsAction,
  analyzeLiftProgressionAction,
  getGoalAnalysisAction,
  getGoalsAction,
  getUserProfile,
  saveGoalAnalysisAction,
  saveGoalsAction,
  updateUserProfile,
} from './actions';
import * as firestoreServer from '@/lib/firestore-server';
import * as envValidation from '@/lib/env-validation';
import * as rateLimiting from '@/app/prs/rate-limiting';
import * as errorClassifier from '@/lib/logging/error-classifier';
import * as loggerModule from '@/lib/logging/logger';
import { revalidateTag } from 'next/cache';
import * as liftFlow from '@/ai/flows/lift-progression-analyzer';
import * as goalsFlow from '@/ai/flows/goal-analyzer';
import * as strengthStandardsServer from '@/lib/strength-standards.server';
import { createClassifiedError, TEST_USER_ID, UNAUTHENTICATED_USER_ID } from '@/test/fixtures';

const validLiftProgressionInput = {
  exerciseName: 'Bench Press',
  exerciseHistory: [
    { date: '2026-02-01', weight: 100, sets: 3, reps: 8 },
    { date: '2026-02-08', weight: 105, sets: 3, reps: 8 },
  ],
  userProfile: {
    age: 30,
    gender: 'Male',
    weightValue: 180,
    weightUnit: 'lbs' as const,
    skeletalMuscleMassValue: 80,
    skeletalMuscleMassUnit: 'lbs' as const,
  },
  currentLevel: 'Intermediate' as const,
  trendPercentage: 5,
  volumeTrendPercentage: 3,
};

const validGoalsInput = {
  userProfileContext: 'User profile summary and goals',
};

const validStoredGoalAnalysis = {
  result: {
    overallSummary: 'Summary',
    goalInsights: [],
  },
  generatedDate: new Date('2026-02-14T00:00:00.000Z'),
};

const validGoalsPayload = [
  {
    id: 'goal-1',
    description: 'Run 5k',
    targetDate: '2026-05-01T00:00:00.000Z',
    achieved: false,
    isPrimary: true,
  },
];

describe('profile server actions (Phase 2 subset)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubEnv('NODE_ENV', 'test');
    vi.mocked(envValidation.areAPIKeysAvailable).mockReturnValue(true);
    vi.mocked(rateLimiting.checkRateLimit).mockResolvedValue({ allowed: true });
    vi.mocked(strengthStandardsServer.getNormalizedExerciseName).mockImplementation(
      async (name: string) => name.trim().toLowerCase()
    );
    vi.mocked(liftFlow.analyzeLiftProgression).mockResolvedValue({
      insight: 'Progress is steady.',
      recommendation: 'Add 2.5 lbs next week.',
    });
    vi.mocked(goalsFlow.analyzeFitnessGoals).mockResolvedValue({
      overallSummary: 'Goals look good.',
      goalInsights: [],
    });
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  describe('getUserProfile', () => {
    it('throws when userId is missing', async () => {
      await expect(getUserProfile('')).rejects.toThrow('User not authenticated.');
      expect(firestoreServer.getUserProfile).not.toHaveBeenCalled();
    });

    it('delegates to firestore when userId is present', async () => {
      vi.mocked(firestoreServer.getUserProfile).mockResolvedValue({
        id: 'user-1',
        name: 'Test User',
        email: 'test@example.com',
        fitnessGoals: [],
      });

      const result = await getUserProfile(TEST_USER_ID);

      expect(result).toEqual({
        id: 'user-1',
        name: 'Test User',
        email: 'test@example.com',
        fitnessGoals: [],
      });
      expect(firestoreServer.getUserProfile).toHaveBeenCalledWith(TEST_USER_ID);
    });
  });

  describe('updateUserProfile', () => {
    it('throws for invalid profile data', async () => {
      await expect(updateUserProfile('user-1', { email: 'invalid-email' })).rejects.toThrow(
        'Invalid profile data:'
      );
      expect(firestoreServer.updateUserProfile).not.toHaveBeenCalled();
      expect(revalidateTag).not.toHaveBeenCalled();
    });

    it('throws when userId is missing', async () => {
      await expect(updateUserProfile('', { name: 'Updated Name' })).rejects.toThrow(
        'User not authenticated.'
      );
      expect(firestoreServer.updateUserProfile).not.toHaveBeenCalled();
    });

    it('updates profile and revalidates cache on success', async () => {
      await updateUserProfile('user-1', { name: 'Updated Name' });

      expect(firestoreServer.updateUserProfile).toHaveBeenCalledWith('user-1', {
        name: 'Updated Name',
      });
      expect(revalidateTag).toHaveBeenCalledWith('user-profile-user-1', 'max');
    });
  });

  describe('analyzeLiftProgressionAction', () => {
    it('returns validation error for invalid input', async () => {
      const result = await analyzeLiftProgressionAction('user-1', {
        ...validLiftProgressionInput,
        exerciseName: '',
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('Invalid input:');
      expect(liftFlow.analyzeLiftProgression).not.toHaveBeenCalled();
      expect(firestoreServer.incrementUsageCounter).not.toHaveBeenCalled();
    });

    it('returns API unavailable when keys are missing', async () => {
      vi.mocked(envValidation.areAPIKeysAvailable).mockReturnValue(false);

      const result = await analyzeLiftProgressionAction('user-1', validLiftProgressionInput);

      expect(result).toEqual({
        success: false,
        error: envValidation.API_UNAVAILABLE_ERROR,
      });
      expect(rateLimiting.checkRateLimit).not.toHaveBeenCalled();
      expect(firestoreServer.incrementUsageCounter).not.toHaveBeenCalled();
    });

    it('returns auth error when userId is missing', async () => {
      const result = await analyzeLiftProgressionAction('', validLiftProgressionInput);

      expect(result).toEqual({ success: false, error: 'User not authenticated.' });
      expect(liftFlow.analyzeLiftProgression).not.toHaveBeenCalled();
      expect(firestoreServer.incrementUsageCounter).not.toHaveBeenCalled();
    });

    it('returns rate-limit error when blocked in non-development environments', async () => {
      vi.mocked(rateLimiting.checkRateLimit).mockResolvedValue({
        allowed: false,
        error: 'Daily limit reached.',
      });

      const result = await analyzeLiftProgressionAction('user-1', validLiftProgressionInput);

      expect(result).toEqual({ success: false, error: 'Daily limit reached.' });
      expect(liftFlow.analyzeLiftProgression).not.toHaveBeenCalled();
      expect(firestoreServer.incrementUsageCounter).not.toHaveBeenCalled();
    });

    it('bypasses rate-limit check in development', async () => {
      vi.stubEnv('NODE_ENV', 'development');

      const result = await analyzeLiftProgressionAction('user-1', validLiftProgressionInput);

      expect(result.success).toBe(true);
      expect(rateLimiting.checkRateLimit).not.toHaveBeenCalled();
    });

    it('saves analysis, increments usage, and revalidates cache on success', async () => {
      const result = await analyzeLiftProgressionAction('user-1', validLiftProgressionInput);

      expect(result).toEqual({
        success: true,
        data: {
          insight: 'Progress is steady.',
          recommendation: 'Add 2.5 lbs next week.',
        },
      });
      expect(strengthStandardsServer.getNormalizedExerciseName).toHaveBeenCalledWith('Bench Press');
      expect(firestoreServer.saveLiftProgressionAnalysis).toHaveBeenCalledWith(
        'user-1',
        'bench press',
        expect.objectContaining({
          result: {
            insight: 'Progress is steady.',
            recommendation: 'Add 2.5 lbs next week.',
          },
        })
      );
      expect(firestoreServer.incrementUsageCounter).toHaveBeenCalledWith('user-1', 'liftProgressionAnalyses');
      expect(revalidateTag).toHaveBeenCalledWith('user-profile-user-1', 'max');
    });

    it('classifies AI error and returns classified message', async () => {
      vi.mocked(liftFlow.analyzeLiftProgression).mockRejectedValue(new Error('service down'));
      vi.mocked(errorClassifier.classifyAIError).mockReturnValue(
        createClassifiedError({
          category: 'model_overloaded',
          statusCode: 503,
          shouldCountAgainstLimit: false,
          shouldRetry: true,
          userMessage: 'Service temporarily unavailable.',
        })
      );

      const result = await analyzeLiftProgressionAction('user-1', validLiftProgressionInput);

      expect(result).toEqual({ success: false, error: 'Service temporarily unavailable.' });
      expect(errorClassifier.classifyAIError).toHaveBeenCalled();
      expect(loggerModule.logger.error).toHaveBeenCalledWith(
        'Error analyzing lift progression',
        expect.objectContaining({
          errorType: 'model_overloaded',
          statusCode: 503,
        })
      );
      expect(loggerModule.logger.info).toHaveBeenCalledWith(
        'Skipping usage counter increment due to service error',
        expect.objectContaining({ errorType: 'model_overloaded' })
      );
      expect(firestoreServer.incrementUsageCounter).not.toHaveBeenCalled();
    });
  });

  describe('analyzeGoalsAction', () => {
    it('returns validation error for invalid input', async () => {
      const result = await analyzeGoalsAction('user-1', { userProfileContext: '' });

      expect(result.success).toBe(false);
      expect(result.error).toContain('Invalid input:');
      expect(goalsFlow.analyzeFitnessGoals).not.toHaveBeenCalled();
      expect(firestoreServer.incrementUsageCounter).not.toHaveBeenCalled();
    });

    it('returns API unavailable when keys are missing', async () => {
      vi.mocked(envValidation.areAPIKeysAvailable).mockReturnValue(false);

      const result = await analyzeGoalsAction('user-1', validGoalsInput);

      expect(result).toEqual({
        success: false,
        error: envValidation.API_UNAVAILABLE_ERROR,
      });
      expect(rateLimiting.checkRateLimit).not.toHaveBeenCalled();
      expect(firestoreServer.incrementUsageCounter).not.toHaveBeenCalled();
    });

    it('returns auth error when userId is missing', async () => {
      const result = await analyzeGoalsAction('', validGoalsInput);

      expect(result).toEqual({ success: false, error: 'User not authenticated.' });
      expect(goalsFlow.analyzeFitnessGoals).not.toHaveBeenCalled();
      expect(firestoreServer.incrementUsageCounter).not.toHaveBeenCalled();
    });

    it('returns rate-limit error when blocked in non-development environments', async () => {
      vi.mocked(rateLimiting.checkRateLimit).mockResolvedValue({
        allowed: false,
        error: 'Daily limit reached.',
      });

      const result = await analyzeGoalsAction('user-1', validGoalsInput);

      expect(result).toEqual({ success: false, error: 'Daily limit reached.' });
      expect(goalsFlow.analyzeFitnessGoals).not.toHaveBeenCalled();
      expect(firestoreServer.incrementUsageCounter).not.toHaveBeenCalled();
    });

    it('bypasses rate-limit check in development', async () => {
      vi.stubEnv('NODE_ENV', 'development');

      const result = await analyzeGoalsAction('user-1', validGoalsInput);

      expect(result.success).toBe(true);
      expect(rateLimiting.checkRateLimit).not.toHaveBeenCalled();
    });

    it('saves analysis, increments usage, and revalidates cache on success', async () => {
      const result = await analyzeGoalsAction('user-1', validGoalsInput);

      expect(result).toEqual({
        success: true,
        data: {
          overallSummary: 'Goals look good.',
          goalInsights: [],
        },
      });
      expect(firestoreServer.saveGoalAnalysis).toHaveBeenCalledWith(
        'user-1',
        expect.objectContaining({
          result: {
            overallSummary: 'Goals look good.',
            goalInsights: [],
          },
        })
      );
      expect(firestoreServer.incrementUsageCounter).toHaveBeenCalledWith('user-1', 'goalAnalyses');
      expect(revalidateTag).toHaveBeenCalledWith('user-profile-user-1', 'max');
    });

    it('classifies AI error and returns classified message', async () => {
      vi.mocked(goalsFlow.analyzeFitnessGoals).mockRejectedValue(new Error('service down'));
      vi.mocked(errorClassifier.classifyAIError).mockReturnValue(
        createClassifiedError({
          category: 'model_overloaded',
          statusCode: 503,
          shouldCountAgainstLimit: false,
          shouldRetry: true,
          userMessage: 'Service temporarily unavailable.',
        })
      );

      const result = await analyzeGoalsAction('user-1', validGoalsInput);

      expect(result).toEqual({ success: false, error: 'Service temporarily unavailable.' });
      expect(errorClassifier.classifyAIError).toHaveBeenCalled();
      expect(loggerModule.logger.error).toHaveBeenCalledWith(
        'Error analyzing fitness goals',
        expect.objectContaining({
          errorType: 'model_overloaded',
          statusCode: 503,
        })
      );
      expect(loggerModule.logger.info).toHaveBeenCalledWith(
        'Skipping usage counter increment due to service error',
        expect.objectContaining({ errorType: 'model_overloaded' })
      );
      expect(firestoreServer.incrementUsageCounter).not.toHaveBeenCalled();
    });
  });

  describe('getGoalAnalysisAction', () => {
    it('returns auth error when userId is missing', async () => {
      const result = await getGoalAnalysisAction('');

      expect(result).toEqual({ success: false, error: 'User not authenticated.' });
      expect(firestoreServer.getGoalAnalysis).not.toHaveBeenCalled();
    });

    it('returns data when analysis exists', async () => {
      vi.mocked(firestoreServer.getGoalAnalysis).mockResolvedValue(validStoredGoalAnalysis);

      const result = await getGoalAnalysisAction('user-1');

      expect(result).toEqual({ success: true, data: validStoredGoalAnalysis });
      expect(firestoreServer.getGoalAnalysis).toHaveBeenCalledWith('user-1', {
        enableLazyBackfill: true,
      });
    });

    it('returns undefined data when analysis is absent', async () => {
      vi.mocked(firestoreServer.getGoalAnalysis).mockResolvedValue(null);

      const result = await getGoalAnalysisAction('user-1');

      expect(result).toEqual({ success: true, data: undefined });
    });

    it('returns firestore error on failure', async () => {
      vi.mocked(firestoreServer.getGoalAnalysis).mockRejectedValue(new Error('read failed'));

      const result = await getGoalAnalysisAction('user-1');

      expect(result).toEqual({ success: false, error: 'read failed' });
    });
  });

  describe('saveGoalAnalysisAction', () => {
    it('returns validation error for invalid schema', async () => {
      const result = await saveGoalAnalysisAction('user-1', {
        result: {},
        generatedDate: 'not-a-date',
      } as unknown as typeof validStoredGoalAnalysis);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Invalid analysis data:');
      expect(firestoreServer.saveGoalAnalysis).not.toHaveBeenCalled();
    });

    it('returns auth error when userId is missing', async () => {
      const result = await saveGoalAnalysisAction(UNAUTHENTICATED_USER_ID, validStoredGoalAnalysis);

      expect(result).toEqual({ success: false, error: 'User not authenticated.' });
      expect(firestoreServer.saveGoalAnalysis).not.toHaveBeenCalled();
    });

    it('saves analysis on success', async () => {
      const result = await saveGoalAnalysisAction('user-1', validStoredGoalAnalysis);

      expect(result).toEqual({ success: true });
      expect(firestoreServer.saveGoalAnalysis).toHaveBeenCalledWith(
        'user-1',
        expect.objectContaining({
          result: { overallSummary: 'Summary', goalInsights: [] },
        })
      );
    });

    it('returns firestore error on save failure', async () => {
      vi.mocked(firestoreServer.saveGoalAnalysis).mockRejectedValue(new Error('write failed'));

      const result = await saveGoalAnalysisAction('user-1', validStoredGoalAnalysis);

      expect(result).toEqual({ success: false, error: 'write failed' });
    });
  });

  describe('getGoalsAction', () => {
    it('returns auth error when userId is missing', async () => {
      const result = await getGoalsAction('');

      expect(result).toEqual({ success: false, error: 'User not authenticated.' });
      expect(firestoreServer.getFitnessGoals).not.toHaveBeenCalled();
    });

    it('returns goals on success', async () => {
      const goals = [
        {
          id: 'goal-1',
          description: 'Run 5k',
          targetDate: new Date('2026-05-01T00:00:00.000Z'),
          achieved: false,
        },
      ];
      vi.mocked(firestoreServer.getFitnessGoals).mockResolvedValue(goals);

      const result = await getGoalsAction('user-1');

      expect(result).toEqual({ success: true, data: goals });
      expect(firestoreServer.getFitnessGoals).toHaveBeenCalledWith('user-1', {
        enableLazyBackfill: true,
      });
    });

    it('returns firestore error on failure', async () => {
      vi.mocked(firestoreServer.getFitnessGoals).mockRejectedValue(new Error('read failed'));

      const result = await getGoalsAction('user-1');

      expect(result).toEqual({ success: false, error: 'read failed' });
    });
  });

  describe('saveGoalsAction', () => {
    it('returns validation error for malformed goals payload', async () => {
      const result = await saveGoalsAction('user-1', [
        {
          id: 'goal-1',
          description: 'Run 5k',
          targetDate: 'bad-date',
          achieved: false,
        },
      ] as unknown as never);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Invalid goals data:');
      expect(firestoreServer.saveFitnessGoals).not.toHaveBeenCalled();
    });

    it('accepts dateAchieved as null', async () => {
      const result = await saveGoalsAction('user-1', [
        {
          id: 'goal-1',
          description: 'Run 5k',
          targetDate: '2026-05-01T00:00:00.000Z',
          achieved: true,
          dateAchieved: null,
        },
      ] as unknown as never);

      expect(result).toEqual({ success: true });
      expect(firestoreServer.saveFitnessGoals).toHaveBeenCalledWith(
        'user-1',
        expect.arrayContaining([
          expect.objectContaining({
            id: 'goal-1',
            dateAchieved: undefined,
          }),
        ])
      );
    });

    it('accepts dateAchieved as undefined', async () => {
      const result = await saveGoalsAction('user-1', [
        {
          id: 'goal-1',
          description: 'Run 5k',
          targetDate: '2026-05-01T00:00:00.000Z',
          achieved: true,
          dateAchieved: undefined,
        },
      ] as unknown as never);

      expect(result).toEqual({ success: true });
      expect(firestoreServer.saveFitnessGoals).toHaveBeenCalledWith(
        'user-1',
        expect.arrayContaining([
          expect.objectContaining({
            id: 'goal-1',
            dateAchieved: undefined,
          }),
        ])
      );
    });

    it('accepts dateAchieved as valid date string', async () => {
      const result = await saveGoalsAction('user-1', [
        {
          id: 'goal-1',
          description: 'Run 5k',
          targetDate: '2026-05-01T00:00:00.000Z',
          achieved: true,
          dateAchieved: '2026-04-01T00:00:00.000Z',
        },
      ] as unknown as never);

      expect(result).toEqual({ success: true });
      expect(firestoreServer.saveFitnessGoals).toHaveBeenCalledWith(
        'user-1',
        expect.arrayContaining([
          expect.objectContaining({
            id: 'goal-1',
            dateAchieved: new Date('2026-04-01T00:00:00.000Z'),
          }),
        ])
      );
    });

    it('returns auth error when userId is missing', async () => {
      const result = await saveGoalsAction(UNAUTHENTICATED_USER_ID, validGoalsPayload as unknown as never);

      expect(result).toEqual({ success: false, error: 'User not authenticated.' });
      expect(firestoreServer.saveFitnessGoals).not.toHaveBeenCalled();
    });

    it('returns firestore error on save failure', async () => {
      vi.mocked(firestoreServer.saveFitnessGoals).mockRejectedValue(new Error('write failed'));

      const result = await saveGoalsAction('user-1', validGoalsPayload as unknown as never);

      expect(result).toEqual({ success: false, error: 'write failed' });
    });
  });
});
