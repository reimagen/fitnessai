import { describe, expect, it, vi } from 'vitest';
import type { ExerciseDocument } from '@/lib/exercise-types';
import type { WorkoutLog } from '@/lib/types';
import { buildSixWeekLiftMetrics } from './six-week-lift-metrics';

const now = new Date('2026-02-14T12:00:00.000Z');

const exercises: ExerciseDocument[] = [
  {
    id: 'machine-shoulder-press',
    name: 'Machine Shoulder Press',
    normalizedName: 'machine shoulder press',
    equipment: 'machine',
    category: 'Upper Body',
    type: 'strength',
    isActive: true,
    legacyNames: ['shoulder press'],
  },
];

describe('buildSixWeekLiftMetrics', () => {
  it('builds per-lift day metrics and average e1RM once across 6-week logs', () => {
    vi.useFakeTimers();
    vi.setSystemTime(now);

    const logs: WorkoutLog[] = [
      {
        id: '1',
        userId: 'u1',
        date: new Date('2026-02-13T12:00:00.000Z'),
        exercises: [
          {
            id: 'e1',
            name: 'Machine Shoulder Press',
            sets: 3,
            reps: 8,
            weight: 44,
            weightUnit: 'lbs',
          },
        ],
      },
    ];

    const metrics = buildSixWeekLiftMetrics(logs, exercises);
    const shoulder = metrics['machine shoulder press'];
    expect(shoulder).toBeDefined();
    expect(shoulder.sessionCount).toBe(1);
    expect(shoulder.avgE1RMUnit).toBe('lbs');
    expect(shoulder.avgE1RM).toBe(56);
    expect(shoulder.dayMetrics).toHaveLength(1);
    expect(Math.round(shoulder.dayMetrics[0].e1RM)).toBe(56);
    expect(shoulder.dayMetrics[0].volume).toBe(1056);

    vi.useRealTimers();
  });

  it('chooses kg display unit when kg sessions are more common', () => {
    vi.useFakeTimers();
    vi.setSystemTime(now);

    const logs: WorkoutLog[] = [
      {
        id: '1',
        userId: 'u1',
        date: new Date('2026-02-13T12:00:00.000Z'),
        exercises: [
          {
            id: 'e1',
            name: 'Shoulder Press',
            sets: 3,
            reps: 8,
            weight: 20,
            weightUnit: 'kg',
          },
          {
            id: 'e2',
            name: 'Shoulder Press',
            sets: 3,
            reps: 8,
            weight: 22.5,
            weightUnit: 'kg',
          },
          {
            id: 'e3',
            name: 'Shoulder Press',
            sets: 3,
            reps: 8,
            weight: 44,
            weightUnit: 'lbs',
          },
        ],
      },
    ];

    const metrics = buildSixWeekLiftMetrics(logs, exercises);
    const shoulder = metrics['machine shoulder press'];
    expect(shoulder).toBeDefined();
    expect(shoulder.avgE1RMUnit).toBe('kg');
    expect(shoulder.avgE1RM).toBe(26);

    vi.useRealTimers();
  });
});
