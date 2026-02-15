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

vi.mock('@/ai/flows/personal-record-parser', () => ({
  parsePersonalRecords: vi.fn(async () => ({ records: [] })),
}));

vi.mock('@/lib/firestore-server', () => ({
  getPersonalRecords: vi.fn(async () => []),
  addPersonalRecords: vi.fn(async () => ({ success: true, message: 'added' })),
  updatePersonalRecord: vi.fn(async () => undefined),
  clearAllPersonalRecords: vi.fn(async () => undefined),
  incrementUsageCounter: vi.fn(async () => undefined),
}));

import {
  addPersonalRecords,
  clearAllPersonalRecords,
  getPersonalRecords,
  parsePersonalRecordsAction,
  updatePersonalRecord,
} from './actions';
import * as firestoreServer from '@/lib/firestore-server';
import * as prsFlow from '@/ai/flows/personal-record-parser';
import * as envValidation from '@/lib/env-validation';
import * as rateLimiting from './rate-limiting';
import * as errorClassifier from '@/lib/logging/error-classifier';
import * as loggerModule from '@/lib/logging/logger';
import { createClassifiedError, TEST_USER_ID, UNAUTHENTICATED_USER_ID } from '@/test/fixtures';

const validParseInput = {
  photoDataUri: 'data:image/png;base64,Zm9v',
};

const validRecords = [
  {
    exerciseName: 'Machine Chest Press',
    weight: 120,
    weightUnit: 'lbs' as const,
    date: new Date('2026-02-10T00:00:00.000Z'),
    category: 'Upper Body' as const,
  },
];

describe('prs server actions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubEnv('NODE_ENV', 'test');
    vi.mocked(envValidation.areAPIKeysAvailable).mockReturnValue(true);
    vi.mocked(rateLimiting.checkRateLimit).mockResolvedValue({ allowed: true });
    vi.mocked(prsFlow.parsePersonalRecords).mockResolvedValue({ records: [] });
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  describe('parsePersonalRecordsAction', () => {
    it('returns validation error for invalid input schema', async () => {
      const result = await parsePersonalRecordsAction(TEST_USER_ID, {
        photoDataUri: 'not-a-data-uri',
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('Invalid input:');
      expect(prsFlow.parsePersonalRecords).not.toHaveBeenCalled();
      expect(firestoreServer.incrementUsageCounter).not.toHaveBeenCalled();
    });

    it('returns auth error when userId is missing', async () => {
      const result = await parsePersonalRecordsAction(UNAUTHENTICATED_USER_ID, validParseInput);

      expect(result).toEqual({ success: false, error: 'User not authenticated.' });
      expect(prsFlow.parsePersonalRecords).not.toHaveBeenCalled();
      expect(firestoreServer.incrementUsageCounter).not.toHaveBeenCalled();
    });

    it('returns API unavailable when keys are missing', async () => {
      vi.mocked(envValidation.areAPIKeysAvailable).mockReturnValue(false);

      const result = await parsePersonalRecordsAction(TEST_USER_ID, validParseInput);

      expect(result).toEqual({
        success: false,
        error: envValidation.API_UNAVAILABLE_ERROR,
      });
      expect(rateLimiting.checkRateLimit).not.toHaveBeenCalled();
      expect(prsFlow.parsePersonalRecords).not.toHaveBeenCalled();
    });

    it('returns rate-limit error when blocked in non-development environments', async () => {
      vi.mocked(rateLimiting.checkRateLimit).mockResolvedValue({
        allowed: false,
        error: 'Daily limit reached.',
      });

      const result = await parsePersonalRecordsAction(TEST_USER_ID, validParseInput);

      expect(result).toEqual({ success: false, error: 'Daily limit reached.' });
      expect(prsFlow.parsePersonalRecords).not.toHaveBeenCalled();
      expect(firestoreServer.incrementUsageCounter).not.toHaveBeenCalled();
    });

    it('bypasses rate-limit check in development', async () => {
      vi.stubEnv('NODE_ENV', 'development');

      const result = await parsePersonalRecordsAction(TEST_USER_ID, validParseInput);

      expect(result.success).toBe(true);
      expect(rateLimiting.checkRateLimit).not.toHaveBeenCalled();
      expect(firestoreServer.incrementUsageCounter).toHaveBeenCalledWith(TEST_USER_ID, 'prParses');
    });

    it('increments usage counter and returns flow output on success', async () => {
      vi.mocked(prsFlow.parsePersonalRecords).mockResolvedValue({
        records: [
          {
            exerciseName: 'Machine Chest Press',
            weight: 120,
            weightUnit: 'lbs',
            category: 'Upper Body',
          },
        ],
      });

      const result = await parsePersonalRecordsAction(TEST_USER_ID, validParseInput);

      expect(result).toEqual({
        success: true,
        data: {
          records: [
            {
              exerciseName: 'Machine Chest Press',
              weight: 120,
              weightUnit: 'lbs',
              category: 'Upper Body',
            },
          ],
        },
      });
      expect(prsFlow.parsePersonalRecords).toHaveBeenCalledWith(validParseInput);
      expect(firestoreServer.incrementUsageCounter).toHaveBeenCalledWith(TEST_USER_ID, 'prParses');
    });

    it('classifies AI errors and returns classified message without incrementing usage', async () => {
      vi.mocked(prsFlow.parsePersonalRecords).mockRejectedValue(new Error('quota exceeded'));
      vi.mocked(errorClassifier.classifyAIError).mockReturnValue(
        createClassifiedError({
          category: 'quota_exceeded',
          statusCode: 429,
          shouldCountAgainstLimit: false,
          shouldRetry: true,
          userMessage: 'Request quota exceeded. Try again later.',
        })
      );

      const result = await parsePersonalRecordsAction(TEST_USER_ID, validParseInput);

      expect(result).toEqual({
        success: false,
        error: 'Request quota exceeded. Try again later.',
      });
      expect(errorClassifier.classifyAIError).toHaveBeenCalled();
      expect(loggerModule.logger.error).toHaveBeenCalledWith(
        'Error processing personal records screenshot',
        expect.objectContaining({
          errorType: 'quota_exceeded',
          statusCode: 429,
        })
      );
      expect(firestoreServer.incrementUsageCounter).not.toHaveBeenCalled();
    });
  });

  describe('getPersonalRecords', () => {
    it('throws when userId is missing', async () => {
      await expect(getPersonalRecords(UNAUTHENTICATED_USER_ID)).rejects.toThrow(
        'User not authenticated.'
      );
      expect(firestoreServer.getPersonalRecords).not.toHaveBeenCalled();
    });

    it('delegates to firestore server helper on success', async () => {
      vi.mocked(firestoreServer.getPersonalRecords).mockResolvedValue([
        {
          id: 'pr-1',
          userId: TEST_USER_ID,
          exerciseName: 'Machine Chest Press',
          weight: 120,
          weightUnit: 'lbs',
          date: new Date('2026-02-10T00:00:00.000Z'),
          category: 'Upper Body',
        },
      ]);

      const result = await getPersonalRecords(TEST_USER_ID);

      expect(result).toHaveLength(1);
      expect(firestoreServer.getPersonalRecords).toHaveBeenCalledWith(TEST_USER_ID);
    });
  });

  describe('addPersonalRecords', () => {
    it('throws for invalid records payload', async () => {
      await expect(
        addPersonalRecords(TEST_USER_ID, [{ ...validRecords[0], weight: -1 }])
      ).rejects.toThrow('Invalid records:');
      expect(firestoreServer.addPersonalRecords).not.toHaveBeenCalled();
    });

    it('throws when userId is missing', async () => {
      await expect(addPersonalRecords(UNAUTHENTICATED_USER_ID, validRecords)).rejects.toThrow(
        'User not authenticated.'
      );
      expect(firestoreServer.addPersonalRecords).not.toHaveBeenCalled();
    });

    it('delegates validated records to firestore helper', async () => {
      const result = await addPersonalRecords(TEST_USER_ID, validRecords);

      expect(result).toEqual({ success: true, message: 'added' });
      expect(firestoreServer.addPersonalRecords).toHaveBeenCalledWith(TEST_USER_ID, validRecords);
    });
  });

  describe('updatePersonalRecord', () => {
    it('throws for invalid record data', async () => {
      await expect(
        updatePersonalRecord(TEST_USER_ID, 'pr-1', { weight: -10 })
      ).rejects.toThrow('Invalid record data:');
      expect(firestoreServer.updatePersonalRecord).not.toHaveBeenCalled();
    });

    it('throws when userId is missing', async () => {
      await expect(
        updatePersonalRecord(UNAUTHENTICATED_USER_ID, 'pr-1', { weight: 125 })
      ).rejects.toThrow('User not authenticated.');
      expect(firestoreServer.updatePersonalRecord).not.toHaveBeenCalled();
    });

    it('delegates validated update payload to firestore helper', async () => {
      await updatePersonalRecord(TEST_USER_ID, 'pr-1', { weight: 125 });

      expect(firestoreServer.updatePersonalRecord).toHaveBeenCalledWith(TEST_USER_ID, 'pr-1', {
        weight: 125,
      });
    });
  });

  describe('clearAllPersonalRecords', () => {
    it('throws when userId is missing', async () => {
      await expect(clearAllPersonalRecords(UNAUTHENTICATED_USER_ID)).rejects.toThrow(
        'User not authenticated.'
      );
      expect(firestoreServer.clearAllPersonalRecords).not.toHaveBeenCalled();
    });

    it('delegates to firestore helper on success', async () => {
      await clearAllPersonalRecords(TEST_USER_ID);

      expect(firestoreServer.clearAllPersonalRecords).toHaveBeenCalledWith(TEST_USER_ID);
    });
  });
});
