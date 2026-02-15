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

vi.mock('@/ai/flows/strength-imbalance-analyzer', () => ({
  analyzeStrengthImbalances: vi.fn(async () => ({
    summary: 'Balanced',
    findings: [],
  })),
}));

vi.mock('@/lib/strength-standards.server', () => ({
  getStrengthLevel: vi.fn(async () => 'Intermediate'),
}));

vi.mock('@/lib/firestore-server', () => ({
  incrementUsageCounter: vi.fn(async () => undefined),
  getStrengthAnalysis: vi.fn(async () => null),
  saveStrengthAnalysis: vi.fn(async () => undefined),
}));

vi.mock('@/lib/imbalance-config.server', () => ({
  getImbalanceConfig: vi.fn(async () => ({
    pairs: [],
    source: 'fallback',
    version: null,
    validationIssueCount: 0,
  })),
}));

import {
  analyzeStrengthAction,
  getLiftStrengthLevelAction,
  getImbalanceConfigAction,
  getStrengthAnalysisAction,
  saveStrengthAnalysisAction,
} from './actions';
import * as strengthFlow from '@/ai/flows/strength-imbalance-analyzer';
import * as firestoreServer from '@/lib/firestore-server';
import * as envValidation from '@/lib/env-validation';
import * as rateLimiting from '@/app/prs/rate-limiting';
import * as errorClassifier from '@/lib/logging/error-classifier';
import * as loggerModule from '@/lib/logging/logger';
import * as strengthStandardsServer from '@/lib/strength-standards.server';
import type { StrengthImbalanceInput } from '@/ai/flows/strength-imbalance-analyzer';
import { createClassifiedError, TEST_USER_ID, UNAUTHENTICATED_USER_ID } from '@/test/fixtures';
import * as imbalanceConfigServer from '@/lib/imbalance-config.server';

const validStrengthInput: StrengthImbalanceInput = {
  userProfile: {
    age: 30,
    gender: 'Male',
    weightValue: 180,
    weightUnit: 'lbs' as const,
    skeletalMuscleMassValue: 80,
    skeletalMuscleMassUnit: 'lbs' as const,
  },
  clientSideFindings: [
    {
      imbalanceType: 'Horizontal Push vs. Pull',
      lift1Name: 'Chest Press',
      lift1Weight: 100,
      lift1Unit: 'lbs' as const,
      lift1Level: 'Intermediate' as const,
      lift2Name: 'Seated Row',
      lift2Weight: 90,
      lift2Unit: 'lbs' as const,
      lift2Level: 'Intermediate' as const,
      userRatio: '1.11:1',
      targetRatio: '1.00:1',
      balancedRange: '0.90-1.10:1',
      imbalanceFocus: 'Ratio Imbalance' as const,
    },
  ],
};

const validStoredStrengthAnalysis = {
  result: {
    summary: 'Summary',
    findings: [],
  },
  generatedDate: new Date('2026-02-14T00:00:00.000Z'),
};

describe('analysis server actions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (process.env as Record<string, string | undefined>).NODE_ENV = 'test';
    vi.mocked(envValidation.areAPIKeysAvailable).mockReturnValue(true);
    vi.mocked(rateLimiting.checkRateLimit).mockResolvedValue({ allowed: true });
    vi.mocked(strengthFlow.analyzeStrengthImbalances).mockResolvedValue({
      summary: 'Balanced',
      findings: [],
    });
    vi.mocked(strengthStandardsServer.getStrengthLevel).mockResolvedValue('Intermediate');
  });

  afterEach(() => {
    (process.env as Record<string, string | undefined>).NODE_ENV = 'test';
  });

  describe('analyzeStrengthAction', () => {
    it('returns validation error for invalid input schema', async () => {
      const result = await analyzeStrengthAction('user-1', {
        userProfile: {},
        clientSideFindings: 'bad-input',
      } as unknown as typeof validStrengthInput);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Invalid input:');
      expect(strengthFlow.analyzeStrengthImbalances).not.toHaveBeenCalled();
      expect(firestoreServer.incrementUsageCounter).not.toHaveBeenCalled();
    });

    it('returns auth error when userId is missing', async () => {
      const result = await analyzeStrengthAction(UNAUTHENTICATED_USER_ID, validStrengthInput);

      expect(result).toEqual({ success: false, error: 'User not authenticated.' });
      expect(strengthFlow.analyzeStrengthImbalances).not.toHaveBeenCalled();
      expect(firestoreServer.incrementUsageCounter).not.toHaveBeenCalled();
    });

    it('returns API unavailable when keys are missing', async () => {
      vi.mocked(envValidation.areAPIKeysAvailable).mockReturnValue(false);

      const result = await analyzeStrengthAction(TEST_USER_ID, validStrengthInput);

      expect(result).toEqual({
        success: false,
        error: envValidation.API_UNAVAILABLE_ERROR,
      });
      expect(rateLimiting.checkRateLimit).not.toHaveBeenCalled();
      expect(strengthFlow.analyzeStrengthImbalances).not.toHaveBeenCalled();
    });

    it('classifies AI errors and returns classified message without incrementing usage', async () => {
      vi.mocked(strengthFlow.analyzeStrengthImbalances).mockRejectedValue(new Error('upstream quota'));
      vi.mocked(errorClassifier.classifyAIError).mockReturnValue(
        createClassifiedError({
          category: 'quota_exceeded',
          statusCode: 429,
          shouldCountAgainstLimit: false,
          shouldRetry: true,
          userMessage: 'Daily quota reached. Please try again tomorrow.',
        })
      );

      const result = await analyzeStrengthAction(TEST_USER_ID, validStrengthInput);

      expect(result).toEqual({
        success: false,
        error: 'Daily quota reached. Please try again tomorrow.',
      });
      expect(errorClassifier.classifyAIError).toHaveBeenCalled();
      expect(loggerModule.logger.error).toHaveBeenCalledWith(
        'Error analyzing strength imbalances',
        expect.objectContaining({
          errorType: 'quota_exceeded',
          statusCode: 429,
        })
      );
      expect(firestoreServer.incrementUsageCounter).not.toHaveBeenCalled();
    });

    it('returns rate-limit error when blocked in non-development environments', async () => {
      vi.mocked(rateLimiting.checkRateLimit).mockResolvedValue({
        allowed: false,
        error: 'Daily limit reached.',
      });

      const result = await analyzeStrengthAction(TEST_USER_ID, validStrengthInput);

      expect(result).toEqual({ success: false, error: 'Daily limit reached.' });
      expect(strengthFlow.analyzeStrengthImbalances).not.toHaveBeenCalled();
      expect(firestoreServer.incrementUsageCounter).not.toHaveBeenCalled();
    });

    it('bypasses rate-limit check in development', async () => {
      (process.env as Record<string, string | undefined>).NODE_ENV = 'development';

      const result = await analyzeStrengthAction('user-1', validStrengthInput);

      expect(result.success).toBe(true);
      expect(rateLimiting.checkRateLimit).not.toHaveBeenCalled();
    });

    it('saves and increments usage on success', async () => {
      const result = await analyzeStrengthAction('user-1', validStrengthInput);

      expect(result).toEqual({
        success: true,
        data: {
          summary: 'Balanced',
          findings: [],
        },
      });
      expect(firestoreServer.saveStrengthAnalysis).toHaveBeenCalledWith(
        'user-1',
        expect.objectContaining({ result: { summary: 'Balanced', findings: [] } })
      );
      expect(firestoreServer.incrementUsageCounter).toHaveBeenCalledWith('user-1', 'strengthAnalyses');
    });
  });

  describe('getLiftStrengthLevelAction', () => {
    it('returns validation error for invalid input', async () => {
      const result = await getLiftStrengthLevelAction('user-1', {
        exerciseName: '',
        weight: -1,
        weightUnit: 'lbs',
        userProfile: {},
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('Invalid input:');
      expect(strengthStandardsServer.getStrengthLevel).not.toHaveBeenCalled();
    });

    it('returns auth error when userId is missing', async () => {
      const result = await getLiftStrengthLevelAction('', {
        exerciseName: 'Bench Press',
        weight: 185,
        weightUnit: 'lbs',
        userProfile: {
          age: 30,
          gender: 'Male',
          weightValue: 180,
          weightUnit: 'lbs',
        },
      });

      expect(result).toEqual({ success: false, error: 'User not authenticated.' });
      expect(strengthStandardsServer.getStrengthLevel).not.toHaveBeenCalled();
    });

    it('returns computed strength level from synthetic record + mapped profile', async () => {
      const result = await getLiftStrengthLevelAction('user-1', {
        exerciseName: 'Bench Press',
        weight: 185,
        weightUnit: 'lbs',
        userProfile: {
          age: 30,
          gender: 'Male',
          weightValue: 180,
          weightUnit: 'lbs',
          skeletalMuscleMassValue: 80,
          skeletalMuscleMassUnit: 'lbs',
        },
      });

      expect(result).toEqual({ success: true, data: 'Intermediate' });
      expect(strengthStandardsServer.getStrengthLevel).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: 'user-1',
          exerciseName: 'Bench Press',
          weight: 185,
          weightUnit: 'lbs',
        }),
        expect.objectContaining({
          id: 'user-1',
          gender: 'Male',
          weightValue: 180,
          weightUnit: 'lbs',
        })
      );
    });
  });

  describe('getStrengthAnalysisAction', () => {
    it('returns auth error when userId is missing', async () => {
      const result = await getStrengthAnalysisAction('');

      expect(result).toEqual({ success: false, error: 'User not authenticated.' });
      expect(firestoreServer.getStrengthAnalysis).not.toHaveBeenCalled();
    });

    it('returns analysis when present', async () => {
      vi.mocked(firestoreServer.getStrengthAnalysis).mockResolvedValue(validStoredStrengthAnalysis);

      const result = await getStrengthAnalysisAction('user-1');

      expect(result).toEqual({ success: true, data: validStoredStrengthAnalysis });
      expect(firestoreServer.getStrengthAnalysis).toHaveBeenCalledWith('user-1', {
        enableLazyBackfill: true,
      });
    });

    it('returns undefined data when no analysis exists', async () => {
      vi.mocked(firestoreServer.getStrengthAnalysis).mockResolvedValue(null);

      const result = await getStrengthAnalysisAction('user-1');

      expect(result).toEqual({ success: true, data: undefined });
    });

    it('returns firestore error message on failure', async () => {
      vi.mocked(firestoreServer.getStrengthAnalysis).mockRejectedValue(new Error('Firestore down'));

      const result = await getStrengthAnalysisAction('user-1');

      expect(result).toEqual({ success: false, error: 'Firestore down' });
    });
  });

  describe('saveStrengthAnalysisAction', () => {
    it('returns validation error for invalid schema', async () => {
      const result = await saveStrengthAnalysisAction('user-1', {
        result: {},
        generatedDate: 'not-a-date',
      } as unknown as typeof validStoredStrengthAnalysis);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Invalid analysis data:');
      expect(firestoreServer.saveStrengthAnalysis).not.toHaveBeenCalled();
    });

    it('returns auth error when userId is missing', async () => {
      const result = await saveStrengthAnalysisAction('', validStoredStrengthAnalysis);

      expect(result).toEqual({ success: false, error: 'User not authenticated.' });
      expect(firestoreServer.saveStrengthAnalysis).not.toHaveBeenCalled();
    });

    it('delegates to firestore on success', async () => {
      const result = await saveStrengthAnalysisAction('user-1', validStoredStrengthAnalysis);

      expect(result).toEqual({ success: true });
      expect(firestoreServer.saveStrengthAnalysis).toHaveBeenCalledWith(
        'user-1',
        expect.objectContaining({
          result: { summary: 'Summary', findings: [] },
        })
      );
    });

    it('returns firestore error on save failure', async () => {
      vi.mocked(firestoreServer.saveStrengthAnalysis).mockRejectedValue(new Error('write failed'));

      const result = await saveStrengthAnalysisAction('user-1', validStoredStrengthAnalysis);

      expect(result).toEqual({ success: false, error: 'write failed' });
    });
  });

  describe('getImbalanceConfigAction', () => {
    it('returns auth error when userId is missing', async () => {
      const result = await getImbalanceConfigAction(UNAUTHENTICATED_USER_ID);

      expect(result).toEqual({ success: false, error: 'User not authenticated.' });
      expect(imbalanceConfigServer.getImbalanceConfig).not.toHaveBeenCalled();
    });

    it('delegates to loader on success', async () => {
      vi.mocked(imbalanceConfigServer.getImbalanceConfig).mockResolvedValue({
        pairs: [
          {
            imbalanceType: 'Horizontal Push vs. Pull',
            lift1CanonicalId: 'machine-chest-press',
            lift2CanonicalId: 'seated-row',
          },
        ],
        source: 'firestore',
        version: 1,
        validationIssueCount: 0,
      });

      const result = await getImbalanceConfigAction(TEST_USER_ID);

      expect(result).toEqual({
        success: true,
        data: {
          pairs: [
            {
              imbalanceType: 'Horizontal Push vs. Pull',
              lift1CanonicalId: 'machine-chest-press',
              lift2CanonicalId: 'seated-row',
            },
          ],
          source: 'firestore',
          version: 1,
          validationIssueCount: 0,
        },
      });
      expect(imbalanceConfigServer.getImbalanceConfig).toHaveBeenCalledTimes(1);
    });
  });
});
