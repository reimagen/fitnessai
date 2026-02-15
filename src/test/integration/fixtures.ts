import type {
  AnalyzeFitnessGoalsOutput,
  AnalyzeLiftProgressionOutput,
  FitnessGoal,
  PersonalRecord,
  StoredGoalAnalysis,
  StoredLiftProgressionAnalysis,
  StoredStrengthAnalysis,
  StoredWeeklyPlan,
  WorkoutLog,
} from '@/lib/types';

export const INTEGRATION_USER_ID = 'integration-user-1';

export function workoutInput(overrides: Partial<Omit<WorkoutLog, 'id' | 'userId'>> = {}): Omit<WorkoutLog, 'id' | 'userId'> {
  return {
    date: new Date('2026-02-10T00:00:00.000Z'),
    notes: 'Integration workout',
    exercises: [
      {
        id: 'ex-1',
        name: 'Machine Chest Press',
        sets: 3,
        reps: 8,
        weight: 120,
        weightUnit: 'lbs',
        category: 'Upper Body',
      },
    ],
    ...overrides,
  };
}

export function prInput(overrides: Partial<Omit<PersonalRecord, 'id' | 'userId'>> = {}): Omit<PersonalRecord, 'id' | 'userId'> {
  return {
    exerciseName: 'Machine Chest Press',
    weight: 120,
    weightUnit: 'lbs',
    date: new Date('2026-02-10T00:00:00.000Z'),
    category: 'Upper Body',
    ...overrides,
  };
}

export function goalsInput(): FitnessGoal[] {
  return [
    {
      id: 'goal-1',
      description: 'Increase bench strength',
      targetDate: new Date('2026-05-01T00:00:00.000Z'),
      achieved: false,
      isPrimary: true,
    },
  ];
}

export function goalAnalysisInput(): StoredGoalAnalysis {
  return {
    generatedDate: new Date('2026-02-10T00:00:00.000Z'),
    result: {
      overallSummary: 'Solid direction',
      goalInsights: [],
    } as AnalyzeFitnessGoalsOutput,
  };
}

export function liftAnalysisInput(): StoredLiftProgressionAnalysis {
  return {
    generatedDate: new Date('2026-02-10T00:00:00.000Z'),
    result: {
      insight: 'Progress is steady',
      recommendation: 'Increase load gradually',
    } as AnalyzeLiftProgressionOutput,
  };
}

export function strengthAnalysisInput(): StoredStrengthAnalysis {
  return {
    generatedDate: new Date('2026-02-10T00:00:00.000Z'),
    result: {
      summary: 'No major imbalances',
      findings: [],
    },
  };
}

export function weeklyPlanInput(userId: string = INTEGRATION_USER_ID): StoredWeeklyPlan {
  return {
    plan: 'Sunday: Upper body',
    generatedDate: new Date('2026-02-10T00:00:00.000Z'),
    contextUsed: 'User context for weekly planning',
    userId,
    weekStartDate: '2026-02-09',
  };
}
