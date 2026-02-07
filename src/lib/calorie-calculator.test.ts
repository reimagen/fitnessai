import { describe, expect, it } from 'vitest';
import { calculateExerciseCalories } from './calorie-calculator';
import type { UserProfile } from './types';

const baseProfile: UserProfile = {
  id: 'u1',
  name: 'Test User',
  email: 'test@example.com',
  fitnessGoals: [],
  age: 30,
  gender: 'Male',
  weightValue: 70,
  weightUnit: 'kg',
  skeletalMuscleMassValue: 30,
  skeletalMuscleMassUnit: 'kg',
  experienceLevel: 'intermediate',
};

describe('calculateExerciseCalories', () => {
  it('returns existing calories when already provided', () => {
    const calories = calculateExerciseCalories(
      {
        name: 'Running',
        category: 'Cardio',
        sets: 0,
        reps: 0,
        weight: 0,
        duration: 20,
        durationUnit: 'min',
        distance: 2,
        distanceUnit: 'mi',
        calories: 321,
      },
      baseProfile
    );

    expect(calories).toBe(321);
  });

  it('calculates cardio calories from explicit run pace', () => {
    const calories = calculateExerciseCalories(
      {
        name: 'Running',
        category: 'Cardio',
        sets: 0,
        reps: 0,
        weight: 0,
        duration: 10,
        durationUnit: 'min',
        distance: 1,
        distanceUnit: 'mi',
      },
      baseProfile
    );

    expect(calories).toBe(114);
  });

  it('estimates walk duration when missing duration', () => {
    const calories = calculateExerciseCalories(
      {
        name: 'Walk',
        category: 'Cardio',
        sets: 0,
        reps: 0,
        weight: 0,
        distance: 1,
        distanceUnit: 'mi',
      },
      baseProfile,
      []
    );

    expect(calories).toBe(82);
  });

  it('returns 0 for unsupported cardio activity', () => {
    const calories = calculateExerciseCalories(
      {
        name: 'Yoga Flow',
        category: 'Cardio',
        sets: 0,
        reps: 0,
        weight: 0,
        duration: 30,
        durationUnit: 'min',
      },
      baseProfile
    );

    expect(calories).toBe(0);
  });

  it('calculates bodyweight strength exercise calories', () => {
    const calories = calculateExerciseCalories(
      {
        name: 'Pull-up',
        category: 'Upper Body',
        sets: 4,
        reps: 6,
        weight: 0,
      },
      baseProfile
    );

    expect(calories).toBeGreaterThan(0);
  });

  it('returns 0 for strength exercise without sets/reps', () => {
    const calories = calculateExerciseCalories(
      {
        name: 'Bench Press',
        category: 'Upper Body',
        sets: 0,
        reps: 8,
        weight: 135,
        weightUnit: 'lbs',
      },
      baseProfile
    );

    expect(calories).toBe(0);
  });

  it('returns 0 when user weight is missing', () => {
    const calories = calculateExerciseCalories(
      {
        name: 'Running',
        category: 'Cardio',
        sets: 0,
        reps: 0,
        weight: 0,
        duration: 20,
        durationUnit: 'min',
        distance: 2,
        distanceUnit: 'mi',
      },
      {
        ...baseProfile,
        weightValue: undefined,
      }
    );

    expect(calories).toBe(0);
  });
});
