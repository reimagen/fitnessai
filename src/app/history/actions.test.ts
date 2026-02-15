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

vi.mock('@/ai/flows/screenshot-workout-parser', () => ({
  parseWorkoutScreenshot: vi.fn(async () => ({ exercises: [] })),
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

vi.mock('@/lib/logging/error-classifier', () => ({
  classifyAIError: vi.fn((error: unknown) => ({
    category: 'unknown_error',
    statusCode: 500,
    shouldRetry: false,
    shouldCountAgainstLimit: false,
    userMessage: error instanceof Error ? error.message : 'Unknown error',
  })),
}));

vi.mock('@/lib/firestore-server', () => ({
  addWorkoutLog: vi.fn(async () => ({ id: 'log-123' })),
  updateWorkoutLog: vi.fn(async () => undefined),
  deleteWorkoutLog: vi.fn(async () => undefined),
  getWorkoutLogs: vi.fn(async () => []),
  incrementUsageCounter: vi.fn(async () => undefined),
}));

import {
  addWorkoutLog,
  deleteWorkoutLog,
  getWorkoutLogs,
  parseWorkoutScreenshotAction,
  updateWorkoutLog,
} from './actions';
import * as screenshotFlow from '@/ai/flows/screenshot-workout-parser';
import * as firestoreServer from '@/lib/firestore-server';
import * as envValidation from '@/lib/env-validation';
import * as rateLimiting from '@/app/prs/rate-limiting';
import * as errorClassifier from '@/lib/logging/error-classifier';
import * as loggerModule from '@/lib/logging/logger';
import { createClassifiedError, TEST_USER_ID, UNAUTHENTICATED_USER_ID } from '@/test/fixtures';

const validScreenshotInput = {
  photoDataUri: 'data:image/png;base64,Zm9v',
};

const validLogInput = {
  date: new Date('2026-02-01T00:00:00.000Z'),
  notes: 'Leg day',
  exercises: [
    {
      id: 'ex-1',
      name: 'Back Squat',
      sets: 3,
      reps: 5,
      weight: 225,
      weightUnit: 'lbs' as const,
      category: 'Lower Body' as const,
    },
  ],
};

describe('history server actions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubEnv('NODE_ENV', 'test');
    vi.mocked(envValidation.areAPIKeysAvailable).mockReturnValue(true);
    vi.mocked(rateLimiting.checkRateLimit).mockResolvedValue({ allowed: true });
    vi.mocked(screenshotFlow.parseWorkoutScreenshot).mockResolvedValue({ exercises: [] });
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  describe('parseWorkoutScreenshotAction', () => {
    it('returns validation error for invalid input', async () => {
      const result = await parseWorkoutScreenshotAction(TEST_USER_ID, {
        photoDataUri: 'bad',
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('Invalid input:');
      expect(screenshotFlow.parseWorkoutScreenshot).not.toHaveBeenCalled();
      expect(firestoreServer.incrementUsageCounter).not.toHaveBeenCalled();
    });

    it('returns auth error when userId is missing', async () => {
      const result = await parseWorkoutScreenshotAction(UNAUTHENTICATED_USER_ID, validScreenshotInput);

      expect(result).toEqual({ success: false, error: 'User not authenticated.' });
      expect(screenshotFlow.parseWorkoutScreenshot).not.toHaveBeenCalled();
      expect(firestoreServer.incrementUsageCounter).not.toHaveBeenCalled();
    });

    it('returns API unavailable when keys are missing', async () => {
      vi.mocked(envValidation.areAPIKeysAvailable).mockReturnValue(false);

      const result = await parseWorkoutScreenshotAction(TEST_USER_ID, validScreenshotInput);

      expect(result).toEqual({
        success: false,
        error: envValidation.API_UNAVAILABLE_ERROR,
      });
      expect(rateLimiting.checkRateLimit).not.toHaveBeenCalled();
      expect(screenshotFlow.parseWorkoutScreenshot).not.toHaveBeenCalled();
    });

    it('returns rate-limit error when blocked in non-development environments', async () => {
      vi.mocked(rateLimiting.checkRateLimit).mockResolvedValue({
        allowed: false,
        error: 'Daily limit reached.',
      });

      const result = await parseWorkoutScreenshotAction(TEST_USER_ID, validScreenshotInput);

      expect(result).toEqual({ success: false, error: 'Daily limit reached.' });
      expect(screenshotFlow.parseWorkoutScreenshot).not.toHaveBeenCalled();
      expect(firestoreServer.incrementUsageCounter).not.toHaveBeenCalled();
    });

    it('bypasses rate-limit check in development', async () => {
      vi.stubEnv('NODE_ENV', 'development');

      const result = await parseWorkoutScreenshotAction(TEST_USER_ID, validScreenshotInput);

      expect(result.success).toBe(true);
      expect(rateLimiting.checkRateLimit).not.toHaveBeenCalled();
    });

    it('increments usage and returns parsed payload on success', async () => {
      vi.mocked(screenshotFlow.parseWorkoutScreenshot).mockResolvedValue({
        exercises: [
          {
            name: 'Machine Chest Press',
            sets: 3,
            reps: 8,
            weight: 100,
            category: 'Upper Body',
            calories: 0,
          },
        ],
      });

      const result = await parseWorkoutScreenshotAction(TEST_USER_ID, validScreenshotInput);

      expect(result).toEqual({
        success: true,
        data: {
          exercises: [
            {
              name: 'Machine Chest Press',
              sets: 3,
              reps: 8,
              weight: 100,
              category: 'Upper Body',
              calories: 0,
            },
          ],
        },
      });
      expect(screenshotFlow.parseWorkoutScreenshot).toHaveBeenCalledWith(validScreenshotInput);
      expect(firestoreServer.incrementUsageCounter).toHaveBeenCalledWith(TEST_USER_ID, 'screenshotParses');
    });

    it('classifies AI errors and returns classified message without incrementing usage', async () => {
      vi.mocked(screenshotFlow.parseWorkoutScreenshot).mockRejectedValue(new Error('service unavailable'));
      vi.mocked(errorClassifier.classifyAIError).mockReturnValue(
        createClassifiedError({
          category: 'model_overloaded',
          statusCode: 503,
          shouldCountAgainstLimit: false,
          shouldRetry: true,
          userMessage: 'AI service temporarily unavailable. Try again in moments.',
        })
      );

      const result = await parseWorkoutScreenshotAction(TEST_USER_ID, validScreenshotInput);

      expect(result).toEqual({
        success: false,
        error: 'AI service temporarily unavailable. Try again in moments.',
      });
      expect(errorClassifier.classifyAIError).toHaveBeenCalled();
      expect(loggerModule.logger.error).toHaveBeenCalledWith(
        'Error parsing workout screenshot',
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

  describe('getWorkoutLogs', () => {
    it('throws when options schema is invalid', async () => {
      await expect(
        getWorkoutLogs(TEST_USER_ID, { since: 'not-a-date' as unknown as Date })
      ).rejects.toThrow('Invalid options:');
      expect(firestoreServer.getWorkoutLogs).not.toHaveBeenCalled();
    });

    it('throws when userId is missing', async () => {
      await expect(getWorkoutLogs(UNAUTHENTICATED_USER_ID)).rejects.toThrow('User not authenticated.');
      expect(firestoreServer.getWorkoutLogs).not.toHaveBeenCalled();
    });

    it('gets workout logs with validated options', async () => {
      await getWorkoutLogs(TEST_USER_ID, { since: new Date('2026-01-01T00:00:00.000Z') });

      expect(firestoreServer.getWorkoutLogs).toHaveBeenCalledWith(TEST_USER_ID, {
        since: new Date('2026-01-01T00:00:00.000Z'),
      });
    });
  });

  describe('addWorkoutLog', () => {
    it('rejects invalid workout log payload', async () => {
      await expect(
        addWorkoutLog(TEST_USER_ID, {
          ...validLogInput,
          exercises: [{ ...validLogInput.exercises[0], id: '' }],
        })
      ).rejects.toThrow('Invalid workout log');

      expect(firestoreServer.addWorkoutLog).not.toHaveBeenCalled();
    });

    it('throws when userId is missing', async () => {
      await expect(addWorkoutLog(UNAUTHENTICATED_USER_ID, validLogInput)).rejects.toThrow(
        'User not authenticated.'
      );
      expect(firestoreServer.addWorkoutLog).not.toHaveBeenCalled();
    });

    it('adds a workout log via firestore server helper', async () => {
      const result = await addWorkoutLog(TEST_USER_ID, validLogInput);

      expect(result).toEqual({ id: 'log-123' });
      expect(firestoreServer.addWorkoutLog).toHaveBeenCalledWith(TEST_USER_ID, validLogInput);
    });
  });

  describe('updateWorkoutLog', () => {
    it('throws for invalid update payload', async () => {
      await expect(
        updateWorkoutLog(TEST_USER_ID, 'log-1', { exercises: [{ ...validLogInput.exercises[0], id: '' }] })
      ).rejects.toThrow('Invalid workout log');
      expect(firestoreServer.updateWorkoutLog).not.toHaveBeenCalled();
    });

    it('throws when userId is missing', async () => {
      await expect(updateWorkoutLog(UNAUTHENTICATED_USER_ID, 'log-1', { notes: 'Updated notes' })).rejects.toThrow(
        'User not authenticated.'
      );
      expect(firestoreServer.updateWorkoutLog).not.toHaveBeenCalled();
    });

    it('updates workout log via firestore server helper', async () => {
      await updateWorkoutLog(TEST_USER_ID, 'log-1', { notes: 'Updated notes' });

      expect(firestoreServer.updateWorkoutLog).toHaveBeenCalledWith(TEST_USER_ID, 'log-1', {
        notes: 'Updated notes',
      });
    });
  });

  describe('deleteWorkoutLog', () => {
    it('validates delete id before calling server helper', async () => {
      await expect(deleteWorkoutLog(TEST_USER_ID, '')).rejects.toThrow('Invalid ID');
      expect(firestoreServer.deleteWorkoutLog).not.toHaveBeenCalled();
    });

    it('throws when userId is missing', async () => {
      await expect(deleteWorkoutLog(UNAUTHENTICATED_USER_ID, 'log-1')).rejects.toThrow(
        'User not authenticated.'
      );
      expect(firestoreServer.deleteWorkoutLog).not.toHaveBeenCalled();
    });

    it('delegates deletion to firestore helper on success', async () => {
      await deleteWorkoutLog(TEST_USER_ID, 'log-1');

      expect(firestoreServer.deleteWorkoutLog).toHaveBeenCalledWith(TEST_USER_ID, 'log-1');
    });
  });
});
