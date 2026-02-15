import { renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { ExerciseDocument } from '@/lib/exercise-types';
import type { StrengthFinding, UserProfile } from '@/lib/types';
import * as strengthBalanceUtils from '@/analysis/strength-balance.utils';
import * as analysisConfig from '@/analysis/analysis.config';
import { useStrengthBalanceData } from './useStrengthBalanceData';

const exercises: ExerciseDocument[] = [];

const userProfile: UserProfile = {
  id: 'user-1',
  name: 'Test User',
  email: 'test@example.com',
  gender: 'Male',
  age: 30,
  weightValue: 180,
  weightUnit: 'lbs',
  skeletalMuscleMassValue: 80,
  skeletalMuscleMassUnit: 'lbs',
  fitnessGoals: [],
};

const ratioFinding: StrengthFinding = {
  imbalanceType: 'Horizontal Push vs. Pull',
  lift1Name: 'Machine Chest Press',
  lift1Weight: 200,
  lift1Unit: 'lbs',
  lift2Name: 'Seated Row',
  lift2Weight: 100,
  lift2Unit: 'lbs',
  userRatio: '2.00:1',
  targetRatio: '1.00:1',
  balancedRange: '0.90-1.10:1',
  imbalanceFocus: 'Ratio Imbalance',
  lift1Level: 'Advanced',
  lift2Level: 'Intermediate',
};

describe('useStrengthBalanceData', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('returns null analysis input when userProfile is unavailable', () => {
    vi.spyOn(strengthBalanceUtils, 'buildClientSideFindings').mockReturnValue([]);
    vi.spyOn(analysisConfig, 'validateImbalanceConfigExercises').mockReturnValue([]);
    vi.spyOn(analysisConfig, 'reportImbalanceConfigValidationIssues').mockImplementation(() => {});

    const { result } = renderHook(() =>
      useStrengthBalanceData({
        workoutLogs: [],
        userProfile: undefined,
        exercises,
      })
    );

    expect(result.current.analysisInput).toBeNull();
    expect(result.current.hasFindings).toBe(false);
  });

  it('keeps hasFindings false when all findings are no-data entries', () => {
    vi.spyOn(strengthBalanceUtils, 'buildClientSideFindings').mockReturnValue([
      { imbalanceType: 'Horizontal Push vs. Pull', hasData: false },
    ]);
    vi.spyOn(analysisConfig, 'validateImbalanceConfigExercises').mockReturnValue([]);
    vi.spyOn(analysisConfig, 'reportImbalanceConfigValidationIssues').mockImplementation(() => {});

    const { result } = renderHook(() =>
      useStrengthBalanceData({
        workoutLogs: [],
        userProfile,
        exercises,
      })
    );

    expect(result.current.hasFindings).toBe(false);
    expect(result.current.analysisInput?.clientSideFindings).toEqual([]);
  });

  it('sets hasFindings true when at least one finding has data', () => {
    vi.spyOn(strengthBalanceUtils, 'buildClientSideFindings').mockReturnValue([ratioFinding]);
    vi.spyOn(analysisConfig, 'validateImbalanceConfigExercises').mockReturnValue([]);
    vi.spyOn(analysisConfig, 'reportImbalanceConfigValidationIssues').mockImplementation(() => {});

    const { result } = renderHook(() =>
      useStrengthBalanceData({
        workoutLogs: [],
        userProfile,
        exercises,
      })
    );

    expect(result.current.hasFindings).toBe(true);
    expect(result.current.analysisInput?.clientSideFindings).toHaveLength(1);
  });

  it('returns config issues and reports them', () => {
    const issues = [
      {
        imbalanceType: 'Horizontal Push vs. Pull' as const,
        liftField: 'lift1Options' as const,
        configuredExerciseName: 'chest press',
        resolvedExerciseName: 'chest press',
      },
    ];

    vi.spyOn(strengthBalanceUtils, 'buildClientSideFindings').mockReturnValue([ratioFinding]);
    vi.spyOn(analysisConfig, 'validateImbalanceConfigExercises').mockReturnValue(issues);
    const reportSpy = vi
      .spyOn(analysisConfig, 'reportImbalanceConfigValidationIssues')
      .mockImplementation(() => {});

    const { result } = renderHook(() =>
      useStrengthBalanceData({
        workoutLogs: [],
        userProfile,
        exercises,
      })
    );

    expect(result.current.imbalanceConfigIssues).toEqual(issues);
    expect(reportSpy).toHaveBeenCalledWith(issues);
  });
});
