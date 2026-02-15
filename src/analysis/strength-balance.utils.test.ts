import { describe, expect, it, vi } from 'vitest';
import type { ExerciseDocument } from '@/lib/exercise-types';
import type { StrengthFinding, UserProfile, WorkoutLog } from '@/lib/types';
import type { ImbalanceConfigLoadResult } from '@/lib/imbalance-config-types';
import {
  buildClientSideFindings,
  buildStrengthAnalysisInput,
  getGuidingLevel,
  getNextStrengthLevel,
  parseBalancedRange,
  parseRatioValue,
  ratioSeverityBadge,
} from './strength-balance.utils';

const now = new Date('2026-02-14T12:00:00.000Z');

const exercises: ExerciseDocument[] = [
  {
    id: 'machine-chest-press',
    name: 'Machine Chest Press',
    normalizedName: 'machine chest press',
    equipment: 'machine',
    category: 'Upper Body',
    type: 'strength',
    isActive: true,
    legacyNames: ['chest press'],
    strengthStandards: {
      baseType: 'bw',
      standards: {
        Male: { intermediate: 0.75, advanced: 1.0, elite: 1.3 },
        Female: { intermediate: 0.55, advanced: 0.8, elite: 1.0 },
      },
    },
  },
  {
    id: 'seated-row',
    name: 'Seated Row',
    normalizedName: 'seated row',
    equipment: 'machine',
    category: 'Upper Body',
    type: 'strength',
    isActive: true,
    strengthStandards: {
      baseType: 'bw',
      standards: {
        Male: { intermediate: 0.75, advanced: 1.0, elite: 1.3 },
        Female: { intermediate: 0.55, advanced: 0.8, elite: 1.0 },
      },
    },
  },
  {
    id: 'shoulder-press',
    name: 'Shoulder Press',
    normalizedName: 'shoulder press',
    equipment: 'machine',
    category: 'Upper Body',
    type: 'strength',
    isActive: true,
    strengthStandards: {
      baseType: 'bw',
      standards: {
        Male: { intermediate: 0.6, advanced: 0.8, elite: 1.1 },
        Female: { intermediate: 0.4, advanced: 0.6, elite: 0.9 },
      },
    },
  },
  {
    id: 'lat-pulldown',
    name: 'Lat Pulldown',
    normalizedName: 'lat pulldown',
    equipment: 'machine',
    category: 'Upper Body',
    type: 'strength',
    isActive: true,
    strengthStandards: {
      baseType: 'bw',
      standards: {
        Male: { intermediate: 0.8, advanced: 1.0, elite: 1.3 },
        Female: { intermediate: 0.55, advanced: 0.8, elite: 1.0 },
      },
    },
  },
  {
    id: 'leg-curl',
    name: 'Leg Curl',
    normalizedName: 'leg curl',
    equipment: 'machine',
    category: 'Lower Body',
    type: 'strength',
    isActive: true,
    strengthStandards: {
      baseType: 'bw',
      standards: {
        Male: { intermediate: 0.5, advanced: 0.7, elite: 0.9 },
        Female: { intermediate: 0.35, advanced: 0.5, elite: 0.75 },
      },
    },
  },
  {
    id: 'leg-extension',
    name: 'Leg Extension',
    normalizedName: 'leg extension',
    equipment: 'machine',
    category: 'Lower Body',
    type: 'strength',
    isActive: true,
    strengthStandards: {
      baseType: 'bw',
      standards: {
        Male: { intermediate: 0.6, advanced: 0.8, elite: 1.0 },
        Female: { intermediate: 0.4, advanced: 0.6, elite: 0.8 },
      },
    },
  },
  {
    id: 'adductor',
    name: 'Adductor',
    normalizedName: 'adductor',
    equipment: 'machine',
    category: 'Lower Body',
    type: 'strength',
    isActive: true,
    strengthStandards: {
      baseType: 'bw',
      standards: {
        Male: { intermediate: 0.45, advanced: 0.65, elite: 0.85 },
        Female: { intermediate: 0.3, advanced: 0.5, elite: 0.7 },
      },
    },
  },
  {
    id: 'abductor',
    name: 'Abductor',
    normalizedName: 'abductor',
    equipment: 'machine',
    category: 'Lower Body',
    type: 'strength',
    isActive: true,
    strengthStandards: {
      baseType: 'bw',
      standards: {
        Male: { intermediate: 0.45, advanced: 0.65, elite: 0.85 },
        Female: { intermediate: 0.3, advanced: 0.5, elite: 0.7 },
      },
    },
  },
];

const userProfile: UserProfile = {
  id: 'u1',
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

const createFinding = (overrides: Partial<StrengthFinding>): StrengthFinding => ({
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
  ...overrides,
});

describe('strength-balance.utils parsing and classification', () => {
  it('parses user ratio values', () => {
    expect(parseRatioValue('1.25:1')).toBe(1.25);
    expect(parseRatioValue('invalid')).toBeNull();
  });

  it('parses balanced ranges', () => {
    expect(parseBalancedRange('0.90-1.10:1')).toEqual({ lower: 0.9, upper: 1.1 });
    expect(parseBalancedRange('bad-range')).toBeNull();
  });

  it('maps ratio distance to severity badge bands', () => {
    expect(ratioSeverityBadge(createFinding({ userRatio: '1.13:1' }))).toEqual({
      text: 'Minor',
      variant: 'secondary',
    });
    expect(ratioSeverityBadge(createFinding({ userRatio: '1.18:1' }))).toEqual({
      text: 'Watch',
      variant: 'accent',
    });
    expect(ratioSeverityBadge(createFinding({ userRatio: '1.23:1' }))).toEqual({
      text: 'Risk',
      variant: 'default',
    });
    expect(ratioSeverityBadge(createFinding({ userRatio: '1.35:1' }))).toEqual({
      text: 'High Risk',
      variant: 'destructive',
    });
  });

  it('computes guiding and next levels', () => {
    expect(getGuidingLevel('Advanced', 'Intermediate')).toBe('Intermediate');
    expect(getNextStrengthLevel('Intermediate')).toBe('Advanced');
    expect(getNextStrengthLevel('Elite')).toBeNull();
  });
});

describe('buildClientSideFindings', () => {
  it('uses shared six-week aggregation and resolves aliases', () => {
    vi.useFakeTimers();
    vi.setSystemTime(now);

    const logs: WorkoutLog[] = [
      {
        id: 'log-1',
        userId: 'u1',
        date: new Date('2026-02-12T12:00:00.000Z'),
        exercises: [
          { id: 'e1', name: 'Machine Chest Press', sets: 3, reps: 5, weight: 220, weightUnit: 'lbs' },
          { id: 'e2', name: 'Seated Row', sets: 3, reps: 8, weight: 100, weightUnit: 'lbs' },
          { id: 'e3', name: 'Shoulder Press', sets: 3, reps: 8, weight: 110, weightUnit: 'lbs' },
          { id: 'e4', name: 'Lat Pulldown', sets: 3, reps: 8, weight: 110, weightUnit: 'lbs' },
          { id: 'e5', name: 'Leg Curl', sets: 3, reps: 10, weight: 90, weightUnit: 'lbs' },
          { id: 'e6', name: 'Leg Extension', sets: 3, reps: 10, weight: 90, weightUnit: 'lbs' },
          { id: 'e7', name: 'Adductor', sets: 3, reps: 10, weight: 80, weightUnit: 'lbs' },
          { id: 'e8', name: 'Abductor', sets: 3, reps: 10, weight: 80, weightUnit: 'lbs' },
        ],
      },
    ];

    const findings = buildClientSideFindings(logs, userProfile, exercises);
    const horizontal = findings.find(f => f.imbalanceType === 'Horizontal Push vs. Pull');

    expect(horizontal).toBeDefined();
    expect(horizontal && 'hasData' in horizontal).toBe(false);

    if (horizontal && !('hasData' in horizontal)) {
      expect(horizontal.lift1Name).toContain('Machine Chest Press');
      expect(horizontal.imbalanceFocus).toBe('Ratio Imbalance');
      expect(horizontal.lift1SessionCount).toBe(1);
    }

    vi.useRealTimers();
  });

  it('returns no-data entry when a configured pair is missing in six-week metrics', () => {
    vi.useFakeTimers();
    vi.setSystemTime(now);

    const logs: WorkoutLog[] = [
      {
        id: 'log-1',
        userId: 'u1',
        date: new Date('2026-02-12T12:00:00.000Z'),
        exercises: [
          { id: 'e1', name: 'Machine Chest Press', sets: 3, reps: 5, weight: 220, weightUnit: 'lbs' },
        ],
      },
    ];

    const findings = buildClientSideFindings(logs, userProfile, exercises);
    const horizontal = findings.find(f => f.imbalanceType === 'Horizontal Push vs. Pull');

    expect(horizontal).toEqual({ imbalanceType: 'Horizontal Push vs. Pull', hasData: false });

    vi.useRealTimers();
  });

  it('uses firestore config pairs when source is firestore', () => {
    vi.useFakeTimers();
    vi.setSystemTime(now);

    const logs: WorkoutLog[] = [
      {
        id: 'log-1',
        userId: 'u1',
        date: new Date('2026-02-12T12:00:00.000Z'),
        exercises: [
          { id: 'e1', name: 'Machine Chest Press', sets: 3, reps: 5, weight: 220, weightUnit: 'lbs' },
          { id: 'e2', name: 'Seated Row', sets: 3, reps: 8, weight: 100, weightUnit: 'lbs' },
        ],
      },
    ];

    const imbalanceConfig: ImbalanceConfigLoadResult = {
      source: 'firestore',
      version: 1,
      validationIssueCount: 0,
      pairs: [
        {
          imbalanceType: 'Horizontal Push vs. Pull',
          lift1CanonicalId: 'machine-chest-press',
          lift2CanonicalId: 'seated-row',
        },
      ],
    };

    const findings = buildClientSideFindings(logs, userProfile, exercises, imbalanceConfig);
    expect(findings).toHaveLength(1);

    const finding = findings[0];
    expect(finding && 'hasData' in finding).toBe(false);
    if (finding && !('hasData' in finding)) {
      expect(finding.imbalanceType).toBe('Horizontal Push vs. Pull');
      expect(finding.imbalanceFocus).toBe('Ratio Imbalance');
    }

    vi.useRealTimers();
  });

  it('returns missingLifts when firestore pair has missing six-week data', () => {
    vi.useFakeTimers();
    vi.setSystemTime(now);

    const logs: WorkoutLog[] = [
      {
        id: 'log-1',
        userId: 'u1',
        date: new Date('2026-02-12T12:00:00.000Z'),
        exercises: [
          { id: 'e1', name: 'Machine Chest Press', sets: 3, reps: 5, weight: 220, weightUnit: 'lbs' },
        ],
      },
    ];

    const imbalanceConfig: ImbalanceConfigLoadResult = {
      source: 'firestore',
      version: 1,
      validationIssueCount: 0,
      pairs: [
        {
          imbalanceType: 'Horizontal Push vs. Pull',
          lift1CanonicalId: 'machine-chest-press',
          lift2CanonicalId: 'seated-row',
        },
      ],
    };

    const findings = buildClientSideFindings(logs, userProfile, exercises, imbalanceConfig);

    expect(findings).toEqual([
      {
        imbalanceType: 'Horizontal Push vs. Pull',
        hasData: false,
        missingLifts: ['Seated Row'],
      },
    ]);

    vi.useRealTimers();
  });

  it('returns canonical id and exercise name in missingLifts when firestore pair ids/metrics are missing', () => {
    vi.useFakeTimers();
    vi.setSystemTime(now);

    const logs: WorkoutLog[] = [
      {
        id: 'log-1',
        userId: 'u1',
        date: new Date('2026-02-12T12:00:00.000Z'),
        exercises: [
          { id: 'e1', name: 'Machine Chest Press', sets: 3, reps: 5, weight: 220, weightUnit: 'lbs' },
        ],
      },
    ];

    const imbalanceConfig: ImbalanceConfigLoadResult = {
      source: 'firestore',
      version: 1,
      validationIssueCount: 0,
      pairs: [
        {
          imbalanceType: 'Horizontal Push vs. Pull',
          lift1CanonicalId: 'missing-canonical-id',
          lift2CanonicalId: 'seated-row',
        },
      ],
    };

    const findings = buildClientSideFindings(logs, userProfile, exercises, imbalanceConfig);

    expect(findings).toEqual([
      {
        imbalanceType: 'Horizontal Push vs. Pull',
        hasData: false,
        missingLifts: ['missing-canonical-id', 'Seated Row'],
      },
    ]);

    vi.useRealTimers();
  });
});

describe('buildStrengthAnalysisInput', () => {
  it('filters no-data findings and excludes achieved goals', () => {
    const analysisInput = buildStrengthAnalysisInput(
      userProfile,
      [
        createFinding({}),
        { imbalanceType: 'Vertical Push vs. Pull', hasData: false },
      ],
      [
        {
          id: 'goal-1',
          description: 'Improve pushing strength',
          achieved: false,
          isPrimary: true,
          targetDate: new Date('2026-04-01T00:00:00.000Z'),
        },
        {
          id: 'goal-2',
          description: 'Completed goal',
          achieved: true,
          targetDate: new Date('2026-03-01T00:00:00.000Z'),
        },
      ]
    );

    expect(analysisInput.clientSideFindings).toHaveLength(1);
    expect(analysisInput.userProfile.fitnessGoals).toEqual([
      { description: 'Improve pushing strength', isPrimary: true },
    ]);
  });
});
