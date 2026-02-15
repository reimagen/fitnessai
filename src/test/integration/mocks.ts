import { vi } from 'vitest';
import * as harness from './harness';

export const rateLimitMock = vi.fn<
  (userId: string, feature: string) => Promise<{ allowed: boolean; error?: string }>
>(async () => ({ allowed: true }));
export const apiAvailableMock = vi.fn(() => true);

vi.mock('next/cache', () => ({
  revalidateTag: vi.fn(),
  unstable_cache: <TArgs extends unknown[], TReturn>(
    fn: (...args: TArgs) => Promise<TReturn>
  ) => fn,
}));

vi.mock('@/lib/logging/server-action-wrapper', () => ({
  withServerActionLogging: async (_context: unknown, fn: () => Promise<unknown>) => fn(),
}));

vi.mock('@/lib/logging/request-context', () => ({
  createRequestContext: () => ({ requestId: 'integration-test' }),
}));

vi.mock('@/lib/logging/logger', () => ({
  logger: {
    info: vi.fn(async () => undefined),
    warn: vi.fn(async () => undefined),
    error: vi.fn(async () => undefined),
  },
}));

vi.mock('@/lib/logging/error-classifier', () => ({
  classifyAIError: (error: unknown) => ({
    category: 'unknown_error',
    statusCode: 500,
    shouldRetry: false,
    shouldCountAgainstLimit: false,
    userMessage: error instanceof Error ? error.message : 'Unknown error',
  }),
}));

vi.mock('@/lib/env-validation', () => ({
  areAPIKeysAvailable: apiAvailableMock,
  API_UNAVAILABLE_ERROR: 'API unavailable',
}));

vi.mock('@/app/prs/rate-limiting', () => ({
  checkRateLimit: rateLimitMock,
}));

vi.mock('@/lib/strength-standards.server', () => ({
  getStrengthLevel: vi.fn(async () => 'Intermediate'),
  getNormalizedExerciseName: vi.fn(async (name: string) =>
    name.toLowerCase().replace(/\s+/g, '_')
  ),
}));

vi.mock('@/ai/flows/strength-imbalance-analyzer', () => ({
  analyzeStrengthImbalances: vi.fn(async () => ({ summary: 'ok', findings: [] })),
}));

vi.mock('@/ai/flows/goal-analyzer', () => ({
  analyzeFitnessGoals: vi.fn(async () => ({ overallSummary: 'ok', goalInsights: [] })),
}));

vi.mock('@/ai/flows/lift-progression-analyzer', () => ({
  analyzeLiftProgression: vi.fn(async () => ({
    insight: 'steady',
    recommendation: 'continue',
  })),
}));

vi.mock('@/ai/flows/weekly-workout-planner', () => ({
  generateWeeklyWorkoutPlan: vi.fn(async () => ({ weeklyPlan: 'generated weekly plan' })),
}));

vi.mock('@/lib/firestore-server', () => ({
  getWorkoutLogs: harness.getWorkoutLogs,
  addWorkoutLog: harness.addWorkoutLog,
  updateWorkoutLog: harness.updateWorkoutLog,
  deleteWorkoutLog: harness.deleteWorkoutLog,
  getPersonalRecords: harness.getPersonalRecords,
  addPersonalRecords: harness.addPersonalRecords,
  updatePersonalRecord: harness.updatePersonalRecord,
  clearAllPersonalRecords: harness.clearAllPersonalRecords,
  getWeeklyPlan: harness.getWeeklyPlan,
  saveWeeklyPlan: harness.saveWeeklyPlan,
  getStrengthAnalysis: harness.getStrengthAnalysis,
  saveStrengthAnalysis: harness.saveStrengthAnalysis,
  getGoalAnalysis: harness.getGoalAnalysis,
  saveGoalAnalysis: harness.saveGoalAnalysis,
  getLiftProgressionAnalysis: harness.getLiftProgressionAnalysis,
  saveLiftProgressionAnalysis: harness.saveLiftProgressionAnalysis,
  getFitnessGoals: harness.getFitnessGoals,
  saveFitnessGoals: harness.saveFitnessGoals,
  getUserProfile: harness.getUserProfile,
  updateUserProfile: harness.updateUserProfile,
  incrementUsageCounter: harness.incrementUsageCounter,
}));

export function resetIntegrationMocks(): void {
  vi.clearAllMocks();
  harness.resetHarness();
  rateLimitMock.mockResolvedValue({ allowed: true });
  apiAvailableMock.mockReturnValue(true);
}

export { harness };
