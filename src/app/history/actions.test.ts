import { beforeEach, describe, expect, it, vi } from 'vitest';

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
  parseWorkoutScreenshot: vi.fn(),
}));

vi.mock('@/app/prs/rate-limiting', () => ({
  checkRateLimit: vi.fn(async () => ({ allowed: true })),
}));

vi.mock('@/lib/logging/error-classifier', () => ({
  classifyAIError: vi.fn((error: unknown) => ({
    category: 'unknown',
    statusCode: 500,
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
  updateWorkoutLog,
} from './actions';
import * as firestoreServer from '@/lib/firestore-server';

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
  });

  it('adds a workout log via firestore server helper', async () => {
    const result = await addWorkoutLog('user-1', validLogInput);

    expect(result).toEqual({ id: 'log-123' });
    expect(firestoreServer.addWorkoutLog).toHaveBeenCalledWith('user-1', validLogInput);
  });

  it('rejects invalid workout log payload', async () => {
    await expect(
      addWorkoutLog('user-1', {
        ...validLogInput,
        exercises: [{ ...validLogInput.exercises[0], id: '' }],
      })
    ).rejects.toThrow('Invalid workout log');

    expect(firestoreServer.addWorkoutLog).not.toHaveBeenCalled();
  });

  it('gets workout logs with validated options', async () => {
    await getWorkoutLogs('user-1', { since: new Date('2026-01-01T00:00:00.000Z') });

    expect(firestoreServer.getWorkoutLogs).toHaveBeenCalledTimes(1);
    expect(firestoreServer.getWorkoutLogs).toHaveBeenCalledWith('user-1', {
      since: new Date('2026-01-01T00:00:00.000Z'),
    });
  });

  it('updates workout log via firestore server helper', async () => {
    await updateWorkoutLog('user-1', 'log-1', {
      notes: 'Updated notes',
    });

    expect(firestoreServer.updateWorkoutLog).toHaveBeenCalledWith('user-1', 'log-1', {
      notes: 'Updated notes',
    });
  });

  it('validates delete id before calling server helper', async () => {
    await expect(deleteWorkoutLog('user-1', '')).rejects.toThrow('Invalid ID');
    expect(firestoreServer.deleteWorkoutLog).not.toHaveBeenCalled();
  });

  it('requires user id for protected actions', async () => {
    await expect(getWorkoutLogs('')).rejects.toThrow('User not authenticated.');
    expect(firestoreServer.getWorkoutLogs).not.toHaveBeenCalled();
  });
});
