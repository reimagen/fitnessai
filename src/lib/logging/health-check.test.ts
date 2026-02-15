import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/exercise-registry.server', () => ({
  getActiveExercises: vi.fn(),
}));

vi.mock('@/analysis/analysis.config', () => ({
  validateImbalanceConfigExercises: vi.fn(),
}));

vi.mock('@/lib/imbalance-config.server', () => ({
  getImbalanceConfig: vi.fn(),
}));

import { getActiveExercises } from '@/lib/exercise-registry.server';
import { validateImbalanceConfigExercises } from '@/analysis/analysis.config';
import { getImbalanceConfig } from '@/lib/imbalance-config.server';
import {
  checkAnalysisConfig,
  checkImbalanceConfig,
  getAnalysisConfigHealthDetails,
  getImbalanceConfigHealthDetails,
} from './health-check';

describe('checkAnalysisConfig', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns ok when no config issues are found', async () => {
    vi.mocked(getActiveExercises).mockResolvedValue([]);
    vi.mocked(validateImbalanceConfigExercises).mockReturnValue([]);

    await expect(checkAnalysisConfig()).resolves.toBe('ok');
  });

  it('returns degraded when config issues exist', async () => {
    vi.mocked(getActiveExercises).mockResolvedValue([]);
    vi.mocked(validateImbalanceConfigExercises).mockReturnValue([
      {
        imbalanceType: 'Horizontal Push vs. Pull',
        liftField: 'lift1Options',
        configuredExerciseName: 'bad exercise',
        resolvedExerciseName: 'bad exercise',
      },
    ]);

    await expect(checkAnalysisConfig()).resolves.toBe('degraded');
  });

  it('returns degraded when validation throws', async () => {
    vi.mocked(getActiveExercises).mockRejectedValue(new Error('boom'));

    await expect(checkAnalysisConfig()).resolves.toBe('degraded');
  });
});

describe('getAnalysisConfigHealthDetails', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns mismatch metadata when degraded', async () => {
    vi.mocked(getActiveExercises).mockResolvedValue([]);
    vi.mocked(validateImbalanceConfigExercises).mockReturnValue([
      {
        imbalanceType: 'Horizontal Push vs. Pull',
        liftField: 'lift1Options',
        configuredExerciseName: 'bad exercise 1',
        resolvedExerciseName: 'bad exercise 1',
      },
      {
        imbalanceType: 'Vertical Push vs. Pull',
        liftField: 'lift2Options',
        configuredExerciseName: 'bad exercise 2',
        resolvedExerciseName: 'bad exercise 2',
      },
    ]);

    await expect(getAnalysisConfigHealthDetails()).resolves.toEqual({
      status: 'degraded',
      mismatchCount: 2,
      sampleMismatches: [
        {
          imbalanceType: 'Horizontal Push vs. Pull',
          liftField: 'lift1Options',
          configuredExerciseName: 'bad exercise 1',
          resolvedExerciseName: 'bad exercise 1',
        },
        {
          imbalanceType: 'Vertical Push vs. Pull',
          liftField: 'lift2Options',
          configuredExerciseName: 'bad exercise 2',
          resolvedExerciseName: 'bad exercise 2',
        },
      ],
    });
  });
});

describe('checkImbalanceConfig', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns ok for firestore source with zero validation issues', async () => {
    vi.mocked(getImbalanceConfig).mockResolvedValue({
      pairs: [],
      source: 'firestore',
      version: 1,
      validationIssueCount: 0,
    });

    await expect(checkImbalanceConfig()).resolves.toBe('ok');
  });

  it('returns degraded for fallback source', async () => {
    vi.mocked(getImbalanceConfig).mockResolvedValue({
      pairs: [],
      source: 'fallback',
      version: null,
      validationIssueCount: 0,
    });

    await expect(checkImbalanceConfig()).resolves.toBe('degraded');
  });
});

describe('getImbalanceConfigHealthDetails', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns metadata for firestore config', async () => {
    vi.mocked(getImbalanceConfig).mockResolvedValue({
      pairs: [],
      source: 'firestore',
      version: 12,
      validationIssueCount: 2,
    });

    await expect(getImbalanceConfigHealthDetails()).resolves.toEqual({
      status: 'degraded',
      source: 'firestore',
      version: 12,
      validationIssueCount: 2,
    });
  });
});
