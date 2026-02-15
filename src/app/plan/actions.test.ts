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

vi.mock('@/ai/flows/weekly-workout-planner', () => ({
  generateWeeklyWorkoutPlan: vi.fn(async () => ({
    weeklyPlan: 'Sunday: Lift',
  })),
}));

vi.mock('@/lib/firestore-server', () => ({
  incrementUsageCounter: vi.fn(async () => undefined),
  getWeeklyPlan: vi.fn(async () => null),
  saveWeeklyPlan: vi.fn(async () => undefined),
}));

import {
  generateWeeklyWorkoutPlanAction,
  getWeeklyPlanAction,
  saveWeeklyPlanAction,
} from './actions';
import * as planFlow from '@/ai/flows/weekly-workout-planner';
import * as firestoreServer from '@/lib/firestore-server';
import * as envValidation from '@/lib/env-validation';
import * as rateLimiting from '@/app/prs/rate-limiting';
import * as errorClassifier from '@/lib/logging/error-classifier';
import * as loggerModule from '@/lib/logging/logger';
import { createClassifiedError, TEST_USER_ID, UNAUTHENTICATED_USER_ID } from '@/test/fixtures';

const validGenerateInput = {
  userId: TEST_USER_ID,
  userProfileContext: 'User context',
  weekStartDate: '2026-02-15',
};

const validStoredWeeklyPlan = {
  plan: 'Sunday: Lift',
  generatedDate: new Date('2026-02-15T00:00:00.000Z'),
  contextUsed: 'User context',
  userId: TEST_USER_ID,
  weekStartDate: '2026-02-15',
};

describe('plan server actions', () => {
  let consoleErrorSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    vi.clearAllMocks();
    consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.stubEnv('NODE_ENV', 'test');
    vi.mocked(envValidation.areAPIKeysAvailable).mockReturnValue(true);
    vi.mocked(rateLimiting.checkRateLimit).mockResolvedValue({ allowed: true });
    vi.mocked(planFlow.generateWeeklyWorkoutPlan).mockResolvedValue({
      weeklyPlan: 'Sunday: Lift',
    });
  });

  afterEach(() => {
    consoleErrorSpy.mockRestore();
    vi.unstubAllEnvs();
  });

  describe('generateWeeklyWorkoutPlanAction', () => {
    it('returns validation error for invalid input', async () => {
      const result = await generateWeeklyWorkoutPlanAction({
        userId: '',
        userProfileContext: '',
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('userId');
      expect(planFlow.generateWeeklyWorkoutPlan).not.toHaveBeenCalled();
      expect(firestoreServer.incrementUsageCounter).not.toHaveBeenCalled();
    });

    it('returns API unavailable when keys are missing', async () => {
      vi.mocked(envValidation.areAPIKeysAvailable).mockReturnValue(false);

      const result = await generateWeeklyWorkoutPlanAction(validGenerateInput);

      expect(result).toEqual({
        success: false,
        error: envValidation.API_UNAVAILABLE_ERROR,
      });
      expect(rateLimiting.checkRateLimit).not.toHaveBeenCalled();
      expect(planFlow.generateWeeklyWorkoutPlan).not.toHaveBeenCalled();
    });

    it('returns rate-limit error when blocked in non-development environments', async () => {
      vi.mocked(rateLimiting.checkRateLimit).mockResolvedValue({
        allowed: false,
        error: 'Daily limit reached.',
      });

      const result = await generateWeeklyWorkoutPlanAction(validGenerateInput);

      expect(result).toEqual({ success: false, error: 'Daily limit reached.' });
      expect(planFlow.generateWeeklyWorkoutPlan).not.toHaveBeenCalled();
      expect(firestoreServer.incrementUsageCounter).not.toHaveBeenCalled();
    });

    it('bypasses rate-limit check in development', async () => {
      vi.stubEnv('NODE_ENV', 'development');

      const result = await generateWeeklyWorkoutPlanAction(validGenerateInput);

      expect(result.success).toBe(true);
      expect(rateLimiting.checkRateLimit).not.toHaveBeenCalled();
    });

    it('returns flow output and increments usage on success', async () => {
      const result = await generateWeeklyWorkoutPlanAction(validGenerateInput);

      expect(result).toEqual({
        success: true,
        data: {
          weeklyPlan: 'Sunday: Lift',
        },
      });
      expect(planFlow.generateWeeklyWorkoutPlan).toHaveBeenCalledWith(validGenerateInput);
      expect(firestoreServer.incrementUsageCounter).toHaveBeenCalledWith(TEST_USER_ID, 'planGenerations');
    });

    it('classifies AI errors and returns classified message without side effects', async () => {
      vi.mocked(planFlow.generateWeeklyWorkoutPlan).mockRejectedValue(new Error('upstream overload'));
      vi.mocked(errorClassifier.classifyAIError).mockReturnValue(
        createClassifiedError({
          category: 'model_overloaded',
          statusCode: 503,
          shouldCountAgainstLimit: false,
          shouldRetry: true,
          userMessage: 'AI service temporarily unavailable. Try again in moments.',
        })
      );

      const result = await generateWeeklyWorkoutPlanAction(validGenerateInput);

      expect(result).toEqual({
        success: false,
        error: 'AI service temporarily unavailable. Try again in moments.',
      });
      expect(errorClassifier.classifyAIError).toHaveBeenCalled();
      expect(loggerModule.logger.error).toHaveBeenCalledWith(
        'Error generating weekly workout plan',
        expect.objectContaining({
          errorType: 'model_overloaded',
          statusCode: 503,
        })
      );
      expect(loggerModule.logger.info).toHaveBeenCalledWith(
        'Skipping usage counter increment due to service error',
        expect.objectContaining({
          errorType: 'model_overloaded',
        })
      );
      expect(firestoreServer.incrementUsageCounter).not.toHaveBeenCalled();
    });
  });

  describe('getWeeklyPlanAction', () => {
    it('returns auth error when userId is missing', async () => {
      const result = await getWeeklyPlanAction(UNAUTHENTICATED_USER_ID);

      expect(result).toEqual({ success: false, error: 'User not authenticated.' });
      expect(firestoreServer.getWeeklyPlan).not.toHaveBeenCalled();
    });

    it('returns weekly plan when found', async () => {
      vi.mocked(firestoreServer.getWeeklyPlan).mockResolvedValue(validStoredWeeklyPlan);

      const result = await getWeeklyPlanAction(TEST_USER_ID);

      expect(result).toEqual({ success: true, data: validStoredWeeklyPlan });
      expect(firestoreServer.getWeeklyPlan).toHaveBeenCalledWith(TEST_USER_ID, {
        enableLazyBackfill: true,
      });
    });

    it('returns undefined data when no plan exists', async () => {
      vi.mocked(firestoreServer.getWeeklyPlan).mockResolvedValue(null);

      const result = await getWeeklyPlanAction(TEST_USER_ID);

      expect(result).toEqual({ success: true, data: undefined });
    });

    it('returns firestore error string on failure', async () => {
      vi.mocked(firestoreServer.getWeeklyPlan).mockRejectedValue(new Error('Firestore down'));

      const result = await getWeeklyPlanAction(TEST_USER_ID);

      expect(result).toEqual({ success: false, error: 'Firestore down' });
    });
  });

  describe('saveWeeklyPlanAction', () => {
    it('returns validation error for invalid schema', async () => {
      const result = await saveWeeklyPlanAction(TEST_USER_ID, {
        ...validStoredWeeklyPlan,
        plan: '',
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('Invalid plan data:');
      expect(firestoreServer.saveWeeklyPlan).not.toHaveBeenCalled();
    });

    it('returns auth error when userId is missing', async () => {
      const result = await saveWeeklyPlanAction(UNAUTHENTICATED_USER_ID, validStoredWeeklyPlan);

      expect(result).toEqual({ success: false, error: 'User not authenticated.' });
      expect(firestoreServer.saveWeeklyPlan).not.toHaveBeenCalled();
    });

    it('saves validated data and transforms generatedDate string to Date', async () => {
      const result = await saveWeeklyPlanAction(TEST_USER_ID, {
        ...validStoredWeeklyPlan,
        generatedDate: '2026-02-15T00:00:00.000Z' as unknown as Date,
      });

      expect(result).toEqual({ success: true });
      expect(firestoreServer.saveWeeklyPlan).toHaveBeenCalledWith(
        TEST_USER_ID,
        expect.objectContaining({
          generatedDate: expect.any(Date),
        })
      );
    });

    it('returns firestore error string on failure', async () => {
      vi.mocked(firestoreServer.saveWeeklyPlan).mockRejectedValue(new Error('Write failed'));

      const result = await saveWeeklyPlanAction(TEST_USER_ID, validStoredWeeklyPlan);

      expect(result).toEqual({ success: false, error: 'Write failed' });
    });
  });
});
