import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { ExerciseDocument } from '@/lib/exercise-types';

const { getDocMock, getActiveExercisesMock } = vi.hoisted(() => ({
  getDocMock: vi.fn(),
  getActiveExercisesMock: vi.fn(),
}));

vi.mock('next/cache', () => ({
  unstable_cache: (fn: (...args: unknown[]) => unknown) => fn,
}));

vi.mock('@/lib/firebase-admin', () => ({
  getAdminDb: () => ({
    collection: () => ({
      doc: () => ({
        get: getDocMock,
      }),
    }),
  }),
}));

vi.mock('@/lib/exercise-registry.server', () => ({
  getActiveExercises: getActiveExercisesMock,
}));

import { getImbalanceConfig } from './imbalance-config.server';

const exercises: ExerciseDocument[] = [
  {
    id: 'machine-chest-press',
    name: 'Machine Chest Press',
    normalizedName: 'chest press',
    equipment: 'machine',
    category: 'Upper Body',
    type: 'strength',
    isActive: true,
  },
  {
    id: 'seated-row',
    name: 'Seated Row',
    normalizedName: 'seated row',
    equipment: 'machine',
    category: 'Upper Body',
    type: 'strength',
    isActive: true,
  },
  {
    id: 'shoulder-press',
    name: 'Shoulder Press',
    normalizedName: 'shoulder press',
    equipment: 'machine',
    category: 'Upper Body',
    type: 'strength',
    isActive: true,
  },
  {
    id: 'lat-pulldown',
    name: 'Lat Pulldown',
    normalizedName: 'lat pulldown',
    equipment: 'machine',
    category: 'Upper Body',
    type: 'strength',
    isActive: true,
  },
  {
    id: 'leg-curl',
    name: 'Leg Curl',
    normalizedName: 'leg curl',
    equipment: 'machine',
    category: 'Lower Body',
    type: 'strength',
    isActive: true,
  },
  {
    id: 'leg-extension',
    name: 'Leg Extension',
    normalizedName: 'leg extension',
    equipment: 'machine',
    category: 'Lower Body',
    type: 'strength',
    isActive: true,
  },
  {
    id: 'adductor',
    name: 'Adductor',
    normalizedName: 'adductor',
    equipment: 'machine',
    category: 'Lower Body',
    type: 'strength',
    isActive: true,
  },
  {
    id: 'abductor',
    name: 'Abductor',
    normalizedName: 'abductor',
    equipment: 'machine',
    category: 'Lower Body',
    type: 'strength',
    isActive: true,
  },
];

describe('getImbalanceConfig', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getActiveExercisesMock.mockResolvedValue(exercises);
  });

  it('returns firestore source when config doc is valid', async () => {
    getDocMock.mockResolvedValue({
      exists: true,
      data: () => ({
        version: 1,
        updatedAt: new Date(),
        updatedBy: 'admin',
        pairs: [
          {
            imbalanceType: 'Horizontal Push vs. Pull',
            lift1CanonicalId: 'machine-chest-press',
            lift2CanonicalId: 'seated-row',
          },
        ],
      }),
    });

    const result = await getImbalanceConfig();

    expect(result.source).toBe('firestore');
    expect(result.version).toBe(1);
    expect(result.validationIssueCount).toBe(0);
    expect(result.pairs).toHaveLength(1);
  });

  it('falls back when doc is missing', async () => {
    getDocMock.mockResolvedValue({ exists: false, data: () => null });

    const result = await getImbalanceConfig();

    expect(result.source).toBe('fallback');
    expect(result.version).toBeNull();
    expect(result.pairs.length).toBeGreaterThan(0);
  });

  it('falls back when schema is invalid', async () => {
    getDocMock.mockResolvedValue({
      exists: true,
      data: () => ({
        version: 'bad',
        updatedBy: 'admin',
        pairs: [],
      }),
    });

    const result = await getImbalanceConfig();

    expect(result.source).toBe('fallback');
    expect(result.validationIssueCount).toBeGreaterThan(0);
  });

  it('filters unknown canonical IDs and counts validation issues', async () => {
    getDocMock.mockResolvedValue({
      exists: true,
      data: () => ({
        version: 2,
        updatedAt: new Date(),
        updatedBy: 'admin',
        pairs: [
          {
            imbalanceType: 'Horizontal Push vs. Pull',
            lift1CanonicalId: 'missing-id',
            lift2CanonicalId: 'seated-row',
          },
          {
            imbalanceType: 'Vertical Push vs. Pull',
            lift1CanonicalId: 'shoulder-press',
            lift2CanonicalId: 'lat-pulldown',
          },
        ],
      }),
    });

    const result = await getImbalanceConfig();

    expect(result.source).toBe('firestore');
    expect(result.validationIssueCount).toBe(1);
    expect(result.pairs).toHaveLength(1);
    expect(result.pairs[0].imbalanceType).toBe('Vertical Push vs. Pull');
  });

  it('falls back when all firestore pairs are filtered out', async () => {
    getDocMock.mockResolvedValue({
      exists: true,
      data: () => ({
        version: 3,
        updatedAt: new Date(),
        updatedBy: 'admin',
        pairs: [
          {
            imbalanceType: 'Horizontal Push vs. Pull',
            lift1CanonicalId: 'missing-id-1',
            lift2CanonicalId: 'missing-id-2',
          },
        ],
      }),
    });

    const result = await getImbalanceConfig();

    expect(result.source).toBe('fallback');
    expect(result.version).toBeNull();
    expect(result.validationIssueCount).toBeGreaterThan(0);
    expect(result.pairs.length).toBeGreaterThan(0);
  });
});
