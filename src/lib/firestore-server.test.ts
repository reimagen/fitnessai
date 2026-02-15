import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { FieldValue, Timestamp } from 'firebase-admin/firestore';
import { format } from 'date-fns';
import type { FitnessGoal, PersonalRecord, StoredWeeklyPlan } from '@/lib/types';

const {
  getAdminDbMock,
  getStrengthLevelMock,
  getNormalizedExerciseNameMock,
  loggerErrorMock,
  loggerInfoMock,
  loggerWarnMock,
} = vi.hoisted(() => ({
  getAdminDbMock: vi.fn(),
  getStrengthLevelMock: vi.fn(),
  getNormalizedExerciseNameMock: vi.fn(),
  loggerErrorMock: vi.fn(async () => undefined),
  loggerInfoMock: vi.fn(async () => undefined),
  loggerWarnMock: vi.fn(async () => undefined),
}));

vi.mock('@/lib/firebase-admin', () => ({
  getAdminDb: getAdminDbMock,
}));

vi.mock('@/lib/strength-standards.server', () => ({
  getStrengthLevel: getStrengthLevelMock,
  getNormalizedExerciseName: getNormalizedExerciseNameMock,
}));

vi.mock('@/lib/logging/logger', () => ({
  logger: {
    error: loggerErrorMock,
    info: loggerInfoMock,
    warn: loggerWarnMock,
  },
}));

vi.mock('@/lib/logging/data-redactor', () => ({
  redactPII: (input: unknown) => input,
}));

import {
  addPersonalRecords,
  addWorkoutLog,
  clearAllPersonalRecords,
  deleteFitnessGoals,
  deleteGoalAnalysis,
  deleteLiftProgressionAnalysis,
  deleteStrengthAnalysis,
  deleteWeeklyPlan,
  deleteWorkoutLog,
  getFitnessGoals,
  getGoalAnalysis,
  getLiftProgressionAnalysis,
  getPersonalRecords,
  getStrengthAnalysis,
  getUserProfile,
  getWeeklyPlan,
  getWorkoutLogs,
  incrementUsageCounter,
  saveFitnessGoals,
  saveGoalAnalysis,
  saveLiftProgressionAnalysis,
  saveStrengthAnalysis,
  saveWeeklyPlan,
  updateWorkoutLog,
  updatePersonalRecord,
  updateUserProfile,
  userProfileConverter,
} from '@/lib/firestore-server';

type RawDoc = {
  id: string;
  data: Record<string, unknown>;
};

type ConverterMock = {
  fromFirestore?: (snapshot: unknown) => unknown;
  toFirestore?: (input: unknown) => unknown;
};

type FirestoreDocRefMock = {
  __path: string;
  __id: string;
  __exists: boolean;
  __rawData: Record<string, unknown>;
  __converter?: ConverterMock;
  __getError?: unknown;
  __lastSetData?: unknown;
  __lastSetOptions?: unknown;
  __lastUpdateData?: unknown;
  __setError?: unknown;
  __updateError?: unknown;
  __deleteError?: unknown;
  __setData: (data: Record<string, unknown>, exists?: boolean) => void;
  __setGetError: (error: unknown) => void;
  __setSetError: (error: unknown) => void;
  __setUpdateError: (error: unknown) => void;
  __setDeleteError: (error: unknown) => void;
  withConverter: ReturnType<typeof vi.fn>;
  get: ReturnType<typeof vi.fn>;
  set: ReturnType<typeof vi.fn>;
  update: ReturnType<typeof vi.fn>;
  delete: ReturnType<typeof vi.fn>;
};

type FirestoreCollectionMock = {
  __path: string;
  __converter?: ConverterMock;
  __rawQueryDocs: RawDoc[];
  __getError?: unknown;
  __lastAddData?: unknown;
  __setQueryDocs: (docs: RawDoc[]) => void;
  __setGetError: (error: unknown) => void;
  withConverter: ReturnType<typeof vi.fn>;
  where: ReturnType<typeof vi.fn>;
  orderBy: ReturnType<typeof vi.fn>;
  limit: ReturnType<typeof vi.fn>;
  get: ReturnType<typeof vi.fn>;
  add: ReturnType<typeof vi.fn>;
  doc: ReturnType<typeof vi.fn>;
};

type FirestoreMockHarness = {
  adminDb: {
    collection: ReturnType<typeof vi.fn>;
    batch: ReturnType<typeof vi.fn>;
  };
  getCollection: (path: string) => FirestoreCollectionMock;
  getDoc: (path: string, id: string) => FirestoreDocRefMock;
  batch: {
    delete: ReturnType<typeof vi.fn>;
    update: ReturnType<typeof vi.fn>;
    commit: ReturnType<typeof vi.fn>;
  };
};

function userIdFromPath(path: string): string {
  const match = path.match(/^users\/([^/]+)/);
  return match ? match[1] : '';
}

function makeSnapshot(path: string, id: string, data: Record<string, unknown>) {
  return {
    id,
    data: () => data,
    ref: {
      parent: {
        parent: {
          id: userIdFromPath(path),
        },
      },
    },
  };
}

function createFirestoreMock(): FirestoreMockHarness {
  const collections = new Map<string, FirestoreCollectionMock>();

  const batch = {
    delete: vi.fn(),
    update: vi.fn(),
    commit: vi.fn(async () => undefined),
  };

  const createDocRef = (path: string, id: string) => {
    const ref: FirestoreDocRefMock = {
      __path: path,
      __id: id,
      __exists: false,
      __rawData: {},
      __converter: undefined,
      __getError: undefined,
      __lastSetData: undefined,
      __lastSetOptions: undefined,
      __lastUpdateData: undefined,
      __setError: undefined,
      __updateError: undefined,
      __deleteError: undefined,
      __setData(data: Record<string, unknown>, exists = true) {
        ref.__rawData = data;
        ref.__exists = exists;
      },
      __setGetError(error: unknown) {
        ref.__getError = error;
      },
      __setSetError(error: unknown) {
        ref.__setError = error;
      },
      __setUpdateError(error: unknown) {
        ref.__updateError = error;
      },
      __setDeleteError(error: unknown) {
        ref.__deleteError = error;
      },
      withConverter: vi.fn((converter: ConverterMock) => {
        ref.__converter = converter;
        return ref;
      }),
      get: vi.fn(async () => {
        if (ref.__getError) {
          throw ref.__getError;
        }

        if (!ref.__exists) {
          return {
            exists: false,
            id,
            data: () => undefined,
            ref: makeSnapshot(path, id, {}).ref,
          };
        }

        const rawSnapshot = makeSnapshot(path, id, ref.__rawData);
        if (ref.__converter?.fromFirestore) {
          const converted = ref.__converter.fromFirestore(rawSnapshot);
          return {
            exists: true,
            id,
            data: () => converted,
            ref: rawSnapshot.ref,
          };
        }

        return {
          exists: true,
          id,
          data: () => ref.__rawData,
          ref: rawSnapshot.ref,
        };
      }),
      set: vi.fn(async (data: unknown, options?: unknown) => {
        if (ref.__setError) {
          throw ref.__setError;
        }
        ref.__lastSetData = data;
        ref.__lastSetOptions = options;
      }),
      update: vi.fn(async (data: unknown) => {
        if (ref.__updateError) {
          throw ref.__updateError;
        }
        ref.__lastUpdateData = data;
      }),
      delete: vi.fn(async () => {
        if (ref.__deleteError) {
          throw ref.__deleteError;
        }
      }),
    };

    return ref;
  };

  const createCollectionRef = (path: string) => {
    const docRefs = new Map<string, FirestoreDocRefMock>();

    const ref: FirestoreCollectionMock = {
      __path: path,
      __converter: undefined,
      __rawQueryDocs: [] as RawDoc[],
      __getError: undefined,
      __lastAddData: undefined,
      __setQueryDocs(docs: RawDoc[]) {
        ref.__rawQueryDocs = docs;
      },
      __setGetError(error: unknown) {
        ref.__getError = error;
      },
      withConverter: vi.fn((converter: ConverterMock) => {
        ref.__converter = converter;
        return ref;
      }),
      where: vi.fn(() => ref),
      orderBy: vi.fn(() => ref),
      limit: vi.fn(() => ref),
      get: vi.fn(async () => {
        if (ref.__getError) {
          throw ref.__getError;
        }

        if (ref.__converter?.fromFirestore) {
          const converter = ref.__converter;
          const docs = ref.__rawQueryDocs.map((rawDoc: RawDoc) => {
            const rawSnapshot = makeSnapshot(path, rawDoc.id, rawDoc.data);
            return {
              id: rawDoc.id,
              ref: rawSnapshot.ref,
              data: () => converter.fromFirestore?.(rawSnapshot),
            };
          });
          return { docs, empty: docs.length === 0 };
        }

        const docs = ref.__rawQueryDocs.map((rawDoc: RawDoc) => {
          const rawSnapshot = makeSnapshot(path, rawDoc.id, rawDoc.data);
          return {
            id: rawDoc.id,
            ref: rawSnapshot.ref,
            data: () => rawDoc.data,
          };
        });
        return { docs, empty: docs.length === 0 };
      }),
      add: vi.fn(async (data: unknown) => {
        ref.__lastAddData = ref.__converter?.toFirestore ? ref.__converter.toFirestore(data) : data;
        return { id: 'added-doc-id' };
      }),
      doc: vi.fn((id: string) => {
        if (!docRefs.has(id)) {
          docRefs.set(id, createDocRef(path, id));
        }
        return docRefs.get(id);
      }),
    };

    return ref;
  };

  const adminDb = {
    collection: vi.fn((path: string) => {
      const existing = collections.get(path);
      if (existing) {
        return existing;
      }
      const created = createCollectionRef(path);
      collections.set(path, created);
      return created;
    }),
    batch: vi.fn(() => batch),
  };

  return {
    adminDb,
    getCollection(path: string) {
      return adminDb.collection(path) as FirestoreCollectionMock;
    },
    getDoc(path: string, id: string) {
      return adminDb.collection(path).doc(id) as FirestoreDocRefMock;
    },
    batch,
  };
}

function createUserProfileRaw(overrides: Record<string, unknown> = {}) {
  return {
    name: 'Test User',
    email: 'test@example.com',
    fitnessGoals: [],
    ...overrides,
  };
}

describe('firestore-server (Phase 3)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getStrengthLevelMock.mockResolvedValue('Intermediate');
    getNormalizedExerciseNameMock.mockResolvedValue('machine_chest_press');
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('converter and query reliability', () => {
    it('serializes workout log dates through converter when adding logs', async () => {
      const firestore = createFirestoreMock();
      getAdminDbMock.mockReturnValue(firestore.adminDb);

      await addWorkoutLog('user-a', {
        date: new Date('2026-02-10T00:00:00.000Z'),
        notes: 'Push day',
        exercises: [],
      });

      const logsCollection = firestore.getCollection('users/user-a/workoutLogs');
      expect((logsCollection.__lastAddData as Record<string, unknown>).date).toBeInstanceOf(Timestamp);
    });

    it('converts workout log snapshots to Date in getWorkoutLogs', async () => {
      const firestore = createFirestoreMock();
      getAdminDbMock.mockReturnValue(firestore.adminDb);

      const logsCollection = firestore.getCollection('users/user-b/workoutLogs');
      logsCollection.__setQueryDocs([
        {
          id: 'log-1',
          data: {
            date: Timestamp.fromDate(new Date('2026-02-05T00:00:00.000Z')),
            notes: 'Leg day',
            exercises: [],
          },
        },
      ]);

      const result = await getWorkoutLogs('user-b', {
        startDate: new Date('2026-02-01T00:00:00.000Z'),
        endDate: new Date('2026-02-28T00:00:00.000Z'),
      });

      expect(result).toHaveLength(1);
      expect(result[0].date).toBeInstanceOf(Date);
      expect(logsCollection.where).toHaveBeenCalledTimes(2);
      expect(logsCollection.orderBy).toHaveBeenCalledWith('date', 'desc');
    });

    it('uses since query branch in getWorkoutLogs', async () => {
      const firestore = createFirestoreMock();
      getAdminDbMock.mockReturnValue(firestore.adminDb);

      const since = new Date('2026-01-15T00:00:00.000Z');
      const logsCollection = firestore.getCollection('users/user-b2/workoutLogs');
      logsCollection.__setQueryDocs([]);

      await getWorkoutLogs('user-b2', { since });

      expect(logsCollection.where).toHaveBeenCalledTimes(1);
      expect(logsCollection.where).toHaveBeenCalledWith('date', '>=', since);
      expect(logsCollection.orderBy).toHaveBeenCalledWith('date', 'desc');
    });

    it('uses default branch in getWorkoutLogs when no options provided', async () => {
      const firestore = createFirestoreMock();
      getAdminDbMock.mockReturnValue(firestore.adminDb);

      const logsCollection = firestore.getCollection('users/user-b3/workoutLogs');
      logsCollection.__setQueryDocs([]);

      await getWorkoutLogs('user-b3');

      expect(logsCollection.where).not.toHaveBeenCalled();
      expect(logsCollection.orderBy).toHaveBeenCalledWith('date', 'desc');
    });

    it('returns empty array when workout query fails with missing index', async () => {
      const firestore = createFirestoreMock();
      getAdminDbMock.mockReturnValue(firestore.adminDb);

      const logsCollection = firestore.getCollection('users/user-c/workoutLogs');
      logsCollection.__setGetError({ code: 5, details: 'query requires an index' });

      const result = await getWorkoutLogs('user-c');

      expect(result).toEqual([]);
      expect(loggerWarnMock).toHaveBeenCalled();
    });

    it('returns empty array when workout query fails with permission denied', async () => {
      const firestore = createFirestoreMock();
      getAdminDbMock.mockReturnValue(firestore.adminDb);

      const logsCollection = firestore.getCollection('users/user-d/workoutLogs');
      logsCollection.__setGetError({ code: 7, details: 'Permission denied by rule' });

      const result = await getWorkoutLogs('user-d');

      expect(result).toEqual([]);
      expect(loggerWarnMock).toHaveBeenCalled();
    });

    it('rethrows unexpected errors from getWorkoutLogs', async () => {
      const firestore = createFirestoreMock();
      getAdminDbMock.mockReturnValue(firestore.adminDb);

      const logsCollection = firestore.getCollection('users/user-e/workoutLogs');
      logsCollection.__setGetError(new Error('network timeout'));

      await expect(getWorkoutLogs('user-e')).rejects.toThrow('network timeout');
      expect(loggerErrorMock).toHaveBeenCalled();
    });

    it('throws when personal record timestamp is malformed in converter', async () => {
      const firestore = createFirestoreMock();
      getAdminDbMock.mockReturnValue(firestore.adminDb);

      const prCollection = firestore.getCollection('users/user-f/personalRecords');
      prCollection.__setQueryDocs([
        {
          id: 'record-1',
          data: {
            exerciseName: 'Machine Chest Press',
            weight: 120,
            weightUnit: 'lbs',
            date: '2026-02-01',
          },
        },
      ]);

      await expect(getPersonalRecords('user-f')).rejects.toThrow('required field "date" is missing or malformed');
    });

    it('throws when weekly plan generatedDate is malformed in converter', async () => {
      const firestore = createFirestoreMock();
      getAdminDbMock.mockReturnValue(firestore.adminDb);

      const planDoc = firestore.getDoc('users/user-g/weeklyPlans', 'current');
      planDoc.__setData({
        plan: 'plan body',
        generatedDate: 'bad-date',
        contextUsed: 'ctx',
        userId: 'user-g',
        weekStartDate: '2026-02-09',
      });

      await expect(getWeeklyPlan('user-g')).rejects.toThrow('required field "generatedDate" is missing or malformed');
    });

    it('throws when strength analysis generatedDate is malformed in converter', async () => {
      const firestore = createFirestoreMock();
      getAdminDbMock.mockReturnValue(firestore.adminDb);

      const analysisDoc = firestore.getDoc('users/user-h/strengthAnalyses', 'current');
      analysisDoc.__setData({ result: {}, generatedDate: 'bad' });

      await expect(getStrengthAnalysis('user-h')).rejects.toThrow('required field "generatedDate" is missing or malformed');
    });

    it('throws when goal analysis generatedDate is malformed in converter', async () => {
      const firestore = createFirestoreMock();
      getAdminDbMock.mockReturnValue(firestore.adminDb);

      const analysisDoc = firestore.getDoc('users/user-i/goalAnalyses', 'current');
      analysisDoc.__setData({ result: {}, generatedDate: 'bad' });

      await expect(getGoalAnalysis('user-i')).rejects.toThrow('required field "generatedDate" is missing or malformed');
    });

    it('throws when fitness goals targetDate is malformed in converter', async () => {
      const firestore = createFirestoreMock();
      getAdminDbMock.mockReturnValue(firestore.adminDb);

      const goalsDoc = firestore.getDoc('users/user-j/goals', 'preferences');
      goalsDoc.__setData({
        goals: [
          {
            id: 'g1',
            description: 'Lose weight',
            targetDate: 'bad-date',
            achieved: false,
          },
        ],
      });

      await expect(getFitnessGoals('user-j')).rejects.toThrow('required field "targetDate" is missing or malformed');
    });

    it('converts user profile nested dates in userProfileConverter', () => {
      const generatedDate = new Date('2026-02-10T00:00:00.000Z');
      const targetDate = new Date('2026-03-01T00:00:00.000Z');

      const toFirestoreResult = userProfileConverter.toFirestore({
        joinedDate: new Date('2026-01-01T00:00:00.000Z'),
        fitnessGoals: [
          {
            id: 'goal-1',
            description: 'Build strength',
            achieved: false,
            targetDate,
          },
        ],
        weeklyPlan: {
          plan: 'A',
          generatedDate,
          contextUsed: 'ctx',
          userId: 'user-k',
          weekStartDate: '2026-02-09',
        },
      });

      const serializedGoals = toFirestoreResult.fitnessGoals as Array<Record<string, unknown>>;
      expect(toFirestoreResult.joinedDate).toBeInstanceOf(Timestamp);
      expect(serializedGoals[0].targetDate).toBeInstanceOf(Timestamp);

      const snapshot = {
        id: 'user-k',
        data: () => createUserProfileRaw({
          joinedDate: Timestamp.fromDate(new Date('2026-01-01T00:00:00.000Z')),
          fitnessGoals: [
            {
              id: 'goal-1',
              description: 'Build strength',
              achieved: false,
              targetDate: Timestamp.fromDate(targetDate),
            },
          ],
          weeklyPlan: {
            plan: 'A',
            generatedDate: Timestamp.fromDate(generatedDate),
            contextUsed: 'ctx',
            userId: 'user-k',
            weekStartDate: '2026-02-09',
          },
        }),
      };

      const converted = userProfileConverter.fromFirestore(snapshot as never);
      expect(converted.joinedDate).toBeInstanceOf(Date);
      expect(converted.fitnessGoals[0].targetDate).toBeInstanceOf(Date);
      expect(converted.weeklyPlan?.generatedDate).toBeInstanceOf(Date);
    });
  });

  describe('batch 2 side effects and semantics', () => {
    it('recalculates strength level when adding personal records', async () => {
      const firestore = createFirestoreMock();
      getAdminDbMock.mockReturnValue(firestore.adminDb);
      getStrengthLevelMock.mockResolvedValue('Advanced');
      getNormalizedExerciseNameMock.mockResolvedValue('machine_chest_press');

      const userDoc = firestore.getDoc('users', 'user-l');
      userDoc.__setData(createUserProfileRaw());

      const prDoc = firestore.getDoc('users/user-l/personalRecords', 'machine_chest_press');
      prDoc.__setData({}, false);

      const records: Omit<PersonalRecord, 'id' | 'userId'>[] = [
        {
          exerciseName: 'Machine Chest Press',
          weight: 100,
          weightUnit: 'kg',
          date: new Date('2026-02-10T00:00:00.000Z'),
          category: 'Upper Body',
        },
      ];

      const result = await addPersonalRecords('user-l', records);

      expect(result.success).toBe(true);
      expect(getStrengthLevelMock).toHaveBeenCalledTimes(1);
      expect(prDoc.set).toHaveBeenCalledTimes(1);
      const setPayload = prDoc.__lastSetData as Record<string, unknown>;
      expect(setPayload.strengthLevel).toBe('Advanced');
      expect(setPayload.date).toBeInstanceOf(Timestamp);
    });

    it('recalculates strength level when updating personal records', async () => {
      const firestore = createFirestoreMock();
      getAdminDbMock.mockReturnValue(firestore.adminDb);
      getStrengthLevelMock.mockResolvedValue('Elite');

      const userDoc = firestore.getDoc('users', 'user-m');
      userDoc.__setData(createUserProfileRaw());

      const prDoc = firestore.getDoc('users/user-m/personalRecords', 'machine_chest_press');
      prDoc.__setData({
        exerciseName: 'Machine Chest Press',
        weight: 210,
        weightUnit: 'lbs',
        date: Timestamp.fromDate(new Date('2026-01-01T00:00:00.000Z')),
        category: 'Upper Body',
      });

      await updatePersonalRecord('user-m', 'machine_chest_press', {
        weight: 240,
        date: new Date('2026-02-10T00:00:00.000Z'),
      });

      expect(getStrengthLevelMock).toHaveBeenCalledTimes(1);
      expect(prDoc.update).toHaveBeenCalledTimes(1);
      const updatePayload = prDoc.__lastUpdateData as Record<string, unknown>;
      expect(updatePayload.strengthLevel).toBe('Elite');
      expect(updatePayload.date).toBeInstanceOf(Timestamp);
    });

    it('throws in addPersonalRecords when records do not improve existing PRs', async () => {
      const firestore = createFirestoreMock();
      getAdminDbMock.mockReturnValue(firestore.adminDb);
      getNormalizedExerciseNameMock.mockResolvedValue('machine_chest_press');

      const userDoc = firestore.getDoc('users', 'user-m2');
      userDoc.__setData(createUserProfileRaw());

      const prDoc = firestore.getDoc('users/user-m2/personalRecords', 'machine_chest_press');
      prDoc.__setData({
        exerciseName: 'Machine Chest Press',
        weight: 250,
        weightUnit: 'lbs',
        date: Timestamp.fromDate(new Date('2026-01-01T00:00:00.000Z')),
        category: 'Upper Body',
      });

      await expect(
        addPersonalRecords('user-m2', [
          {
            exerciseName: 'Machine Chest Press',
            weight: 200,
            weightUnit: 'lbs',
            date: new Date('2026-02-10T00:00:00.000Z'),
            category: 'Upper Body',
          },
        ])
      ).rejects.toThrow('No new personal records to add');

      expect(prDoc.set).not.toHaveBeenCalled();
      expect(getStrengthLevelMock).not.toHaveBeenCalled();
    });

    it('throws in addPersonalRecords when normalization returns null for all records', async () => {
      const firestore = createFirestoreMock();
      getAdminDbMock.mockReturnValue(firestore.adminDb);
      getNormalizedExerciseNameMock.mockResolvedValue(null);

      const userDoc = firestore.getDoc('users', 'user-m3');
      userDoc.__setData(createUserProfileRaw());

      await expect(
        addPersonalRecords('user-m3', [
          {
            exerciseName: 'Unknown Lift',
            weight: 100,
            weightUnit: 'lbs',
            date: new Date('2026-02-10T00:00:00.000Z'),
            category: 'Upper Body',
          },
        ])
      ).rejects.toThrow('No new personal records to add');
    });

    it('throws updatePersonalRecord when user profile is missing', async () => {
      const firestore = createFirestoreMock();
      getAdminDbMock.mockReturnValue(firestore.adminDb);

      await expect(
        updatePersonalRecord('user-m4', 'machine_chest_press', { weight: 220 })
      ).rejects.toThrow('User profile not found');
    });

    it('throws updatePersonalRecord when record is missing', async () => {
      const firestore = createFirestoreMock();
      getAdminDbMock.mockReturnValue(firestore.adminDb);

      const userDoc = firestore.getDoc('users', 'user-m5');
      userDoc.__setData(createUserProfileRaw());

      const prDoc = firestore.getDoc('users/user-m5/personalRecords', 'machine_chest_press');
      prDoc.__setData({}, false);

      await expect(
        updatePersonalRecord('user-m5', 'machine_chest_press', { weight: 220 })
      ).rejects.toThrow('Record not found.');
    });

    it('truncates weekly plan contextUsed to 500 chars before save', async () => {
      const firestore = createFirestoreMock();
      getAdminDbMock.mockReturnValue(firestore.adminDb);

      const longContext = 'x'.repeat(510);
      const plan: StoredWeeklyPlan = {
        plan: 'Week plan',
        generatedDate: new Date('2026-02-10T00:00:00.000Z'),
        contextUsed: longContext,
        userId: 'user-n',
        weekStartDate: '2026-02-09',
      };

      await saveWeeklyPlan('user-n', plan);

      const planDoc = firestore.getDoc('users/user-n/weeklyPlans', 'current');
      const payload = planDoc.__lastSetData as Record<string, unknown>;
      expect(payload.generatedDate).toBeInstanceOf(Timestamp);
      expect(typeof payload.contextUsed).toBe('string');
      expect((payload.contextUsed as string).endsWith('...[truncated]')).toBe(true);
      expect((payload.contextUsed as string).length).toBe(514);
    });

    it('returns early in clearAllPersonalRecords when collection is empty', async () => {
      const firestore = createFirestoreMock();
      getAdminDbMock.mockReturnValue(firestore.adminDb);

      const recordsCollection = firestore.getCollection('users/user-n2/personalRecords');
      recordsCollection.__setQueryDocs([]);

      await clearAllPersonalRecords('user-n2');

      expect(firestore.batch.delete).not.toHaveBeenCalled();
      expect(firestore.batch.commit).not.toHaveBeenCalled();
    });

    it('batch deletes records in clearAllPersonalRecords when docs exist', async () => {
      const firestore = createFirestoreMock();
      getAdminDbMock.mockReturnValue(firestore.adminDb);

      const recordsCollection = firestore.getCollection('users/user-n3/personalRecords');
      recordsCollection.__setQueryDocs([
        { id: 'r1', data: {} },
        { id: 'r2', data: {} },
      ]);

      await clearAllPersonalRecords('user-n3');

      expect(firestore.batch.delete).toHaveBeenCalledTimes(2);
      expect(firestore.batch.commit).toHaveBeenCalledTimes(1);
    });

    it('getLiftProgressionAnalysis is not cache-wrapped and re-queries on repeated calls', async () => {
      const firestore = createFirestoreMock();
      getAdminDbMock.mockReturnValue(firestore.adminDb);

      const exerciseName = 'Machine Chest Press';
      const normalized = 'machine_chest_press';
      const analysisDoc = firestore.getDoc('users/user-o/liftProgressionAnalyses', normalized);
      analysisDoc.__setData({
        result: { insight: 'good', recommendation: 'keep going' },
        generatedDate: Timestamp.fromDate(new Date('2026-02-10T00:00:00.000Z')),
      });

      await getLiftProgressionAnalysis('user-o', exerciseName);
      await getLiftProgressionAnalysis('user-o', exerciseName);

      expect(analysisDoc.get).toHaveBeenCalledTimes(2);
    });

    it('skips PR recomputation when updateUserProfile has no relevant key changes', async () => {
      const firestore = createFirestoreMock();
      getAdminDbMock.mockReturnValue(firestore.adminDb);

      const userDoc = firestore.getDoc('users', 'user-o2');
      userDoc.__setData(createUserProfileRaw());

      await updateUserProfile('user-o2', { name: 'Updated Name' });

      const collectionCalls = firestore.adminDb.collection.mock.calls.map((call: unknown[]) => call[0]);
      expect(collectionCalls).not.toContain('users/user-o2/personalRecords');
      expect(firestore.batch.commit).not.toHaveBeenCalled();
    });

    it('does not batch update when profile keys changed but no personal records exist', async () => {
      const firestore = createFirestoreMock();
      getAdminDbMock.mockReturnValue(firestore.adminDb);

      const userDoc = firestore.getDoc('users', 'user-o3');
      userDoc.__setData(createUserProfileRaw({ age: 30 }));

      const recordsCollection = firestore.getCollection('users/user-o3/personalRecords');
      recordsCollection.__setQueryDocs([]);

      await updateUserProfile('user-o3', { age: 31 });

      expect(firestore.batch.update).not.toHaveBeenCalled();
      expect(firestore.batch.commit).not.toHaveBeenCalled();
    });

    it('commits empty recompute batch when levels are unchanged', async () => {
      const firestore = createFirestoreMock();
      getAdminDbMock.mockReturnValue(firestore.adminDb);
      getStrengthLevelMock.mockResolvedValue('Beginner');

      const userDoc = firestore.getDoc('users', 'user-o4');
      userDoc.__setData(createUserProfileRaw({ age: 30 }));

      const recordsCollection = firestore.getCollection('users/user-o4/personalRecords');
      recordsCollection.__setQueryDocs([
        {
          id: 'machine_chest_press',
          data: {
            exerciseName: 'Machine Chest Press',
            weight: 200,
            weightUnit: 'lbs',
            date: Timestamp.fromDate(new Date('2026-02-01T00:00:00.000Z')),
            category: 'Upper Body',
            strengthLevel: 'Beginner',
          },
        },
      ]);

      await updateUserProfile('user-o4', { age: 31 });

      expect(firestore.batch.update).not.toHaveBeenCalled();
      expect(firestore.batch.commit).toHaveBeenCalledTimes(1);
    });

    it('serializes date in updateWorkoutLog payload', async () => {
      const firestore = createFirestoreMock();
      getAdminDbMock.mockReturnValue(firestore.adminDb);

      const workoutDoc = firestore.getDoc('users/user-o5/workoutLogs', 'log-1');
      await updateWorkoutLog('user-o5', 'log-1', {
        date: new Date('2026-02-11T00:00:00.000Z'),
        notes: 'updated',
      });

      const payload = workoutDoc.__lastUpdateData as Record<string, unknown>;
      expect(payload.date).toBeInstanceOf(Timestamp);
      expect(payload.notes).toBe('updated');
    });

    it('propagates errors from updateWorkoutLog', async () => {
      const firestore = createFirestoreMock();
      getAdminDbMock.mockReturnValue(firestore.adminDb);

      const workoutDoc = firestore.getDoc('users/user-o6/workoutLogs', 'log-2');
      workoutDoc.__setUpdateError(new Error('update failed'));

      await expect(
        updateWorkoutLog('user-o6', 'log-2', { notes: 'updated' })
      ).rejects.toThrow('update failed');
      expect(loggerErrorMock).toHaveBeenCalled();
    });

    it('deletes workout log documents', async () => {
      const firestore = createFirestoreMock();
      getAdminDbMock.mockReturnValue(firestore.adminDb);

      const workoutDoc = firestore.getDoc('users/user-o7/workoutLogs', 'log-3');
      await deleteWorkoutLog('user-o7', 'log-3');
      expect(workoutDoc.delete).toHaveBeenCalledTimes(1);
    });

    it('propagates errors from deleteWorkoutLog', async () => {
      const firestore = createFirestoreMock();
      getAdminDbMock.mockReturnValue(firestore.adminDb);

      const workoutDoc = firestore.getDoc('users/user-o8/workoutLogs', 'log-4');
      workoutDoc.__setDeleteError(new Error('delete failed'));

      await expect(deleteWorkoutLog('user-o8', 'log-4')).rejects.toThrow('delete failed');
      expect(loggerErrorMock).toHaveBeenCalled();
    });
  });

  describe('batch 3 migration/backfill + counters', () => {
    it('returns weekly plan from new location without fallback work', async () => {
      const firestore = createFirestoreMock();
      getAdminDbMock.mockReturnValue(firestore.adminDb);

      const weeklyDoc = firestore.getDoc('users/user-p0/weeklyPlans', 'current');
      weeklyDoc.__setData({
        plan: 'new-location-plan',
        generatedDate: Timestamp.fromDate(new Date('2026-02-10T00:00:00.000Z')),
        contextUsed: 'ctx',
        userId: 'user-p0',
        weekStartDate: '2026-02-09',
      });

      const result = await getWeeklyPlan('user-p0');
      expect(result?.plan).toBe('new-location-plan');
      expect(weeklyDoc.get).toHaveBeenCalledTimes(1);
    });

    it('returns legacy weekly plan and backfills when enabled', async () => {
      const firestore = createFirestoreMock();
      getAdminDbMock.mockReturnValue(firestore.adminDb);

      const weeklyDoc = firestore.getDoc('users/user-p/weeklyPlans', 'current');
      weeklyDoc.__setData({}, false);

      const userDoc = firestore.getDoc('users', 'user-p');
      userDoc.__setData(
        createUserProfileRaw({
          weeklyPlan: {
            plan: 'legacy plan',
            generatedDate: Timestamp.fromDate(new Date('2026-02-10T00:00:00.000Z')),
            contextUsed: 'legacy context',
            userId: 'user-p',
            weekStartDate: '2026-02-09',
          },
        })
      );

      const result = await getWeeklyPlan('user-p', { enableLazyBackfill: true });

      expect(result?.plan).toBe('legacy plan');
      expect(weeklyDoc.set).toHaveBeenCalledTimes(1);
    });

    it('logs backfill errors and still returns legacy weekly plan', async () => {
      const firestore = createFirestoreMock();
      getAdminDbMock.mockReturnValue(firestore.adminDb);

      const weeklyDoc = firestore.getDoc('users/user-p1/weeklyPlans', 'current');
      weeklyDoc.__setData({}, false);
      weeklyDoc.__setSetError(new Error('weekly set failed'));

      const userDoc = firestore.getDoc('users', 'user-p1');
      userDoc.__setData(
        createUserProfileRaw({
          weeklyPlan: {
            plan: 'legacy plan',
            generatedDate: Timestamp.fromDate(new Date('2026-02-10T00:00:00.000Z')),
            contextUsed: 'legacy context',
            userId: 'user-p1',
            weekStartDate: '2026-02-09',
          },
        })
      );

      const result = await getWeeklyPlan('user-p1', { enableLazyBackfill: true });
      expect(result?.plan).toBe('legacy plan');
      expect(loggerErrorMock).toHaveBeenCalledWith(
        'Failed to backfill weekly plan',
        expect.objectContaining({ userId: 'user-p1' })
      );
    });

    it('returns legacy weekly plan without backfill when disabled', async () => {
      const firestore = createFirestoreMock();
      getAdminDbMock.mockReturnValue(firestore.adminDb);

      const weeklyDoc = firestore.getDoc('users/user-p2/weeklyPlans', 'current');
      weeklyDoc.__setData({}, false);

      const userDoc = firestore.getDoc('users', 'user-p2');
      userDoc.__setData(
        createUserProfileRaw({
          weeklyPlan: {
            plan: 'legacy plan',
            generatedDate: Timestamp.fromDate(new Date('2026-02-10T00:00:00.000Z')),
            contextUsed: 'legacy context',
            userId: 'user-p2',
            weekStartDate: '2026-02-09',
          },
        })
      );

      const result = await getWeeklyPlan('user-p2');
      expect(result?.plan).toBe('legacy plan');
      expect(weeklyDoc.set).not.toHaveBeenCalled();
    });

    it('returns legacy strength analysis and backfills when enabled', async () => {
      const firestore = createFirestoreMock();
      getAdminDbMock.mockReturnValue(firestore.adminDb);

      const analysisDoc = firestore.getDoc('users/user-p3/strengthAnalyses', 'current');
      analysisDoc.__setData({}, false);

      const userDoc = firestore.getDoc('users', 'user-p3');
      userDoc.__setData(
        createUserProfileRaw({
          strengthAnalysis: {
            result: { summary: 'legacy', findings: [] },
            generatedDate: Timestamp.fromDate(new Date('2026-02-10T00:00:00.000Z')),
          },
        })
      );

      const result = await getStrengthAnalysis('user-p3', { enableLazyBackfill: true });
      expect(result?.result).toEqual({ summary: 'legacy', findings: [] });
      expect(analysisDoc.set).toHaveBeenCalledTimes(1);
    });

    it('returns strength analysis from new location', async () => {
      const firestore = createFirestoreMock();
      getAdminDbMock.mockReturnValue(firestore.adminDb);

      const analysisDoc = firestore.getDoc('users/user-p3b/strengthAnalyses', 'current');
      analysisDoc.__setData({
        result: { summary: 'new', findings: [] },
        generatedDate: Timestamp.fromDate(new Date('2026-02-12T00:00:00.000Z')),
      });

      const result = await getStrengthAnalysis('user-p3b');
      expect(result?.result).toEqual({ summary: 'new', findings: [] });
    });

    it('returns legacy goal analysis and logs non-fatal backfill errors', async () => {
      const firestore = createFirestoreMock();
      getAdminDbMock.mockReturnValue(firestore.adminDb);

      const analysisDoc = firestore.getDoc('users/user-p4/goalAnalyses', 'current');
      analysisDoc.__setData({}, false);
      analysisDoc.__setSetError(new Error('set failed'));

      const userDoc = firestore.getDoc('users', 'user-p4');
      userDoc.__setData(
        createUserProfileRaw({
          goalAnalysis: {
            result: { overallSummary: 'legacy', goalInsights: [] },
            generatedDate: Timestamp.fromDate(new Date('2026-02-10T00:00:00.000Z')),
          },
        })
      );

      const result = await getGoalAnalysis('user-p4', { enableLazyBackfill: true });
      expect(result?.result).toEqual({ overallSummary: 'legacy', goalInsights: [] });
      expect(loggerErrorMock).toHaveBeenCalledWith(
        'Failed to backfill goal analysis',
        expect.objectContaining({ userId: 'user-p4' })
      );
    });

    it('returns goal analysis from new location', async () => {
      const firestore = createFirestoreMock();
      getAdminDbMock.mockReturnValue(firestore.adminDb);

      const analysisDoc = firestore.getDoc('users/user-p4b/goalAnalyses', 'current');
      analysisDoc.__setData({
        result: { overallSummary: 'new', goalInsights: [] },
        generatedDate: Timestamp.fromDate(new Date('2026-02-12T00:00:00.000Z')),
      });

      const result = await getGoalAnalysis('user-p4b');
      expect(result?.result).toEqual({ overallSummary: 'new', goalInsights: [] });
    });

    it('returns legacy fitness goals and backfills when enabled', async () => {
      const firestore = createFirestoreMock();
      getAdminDbMock.mockReturnValue(firestore.adminDb);

      const goalsDoc = firestore.getDoc('users/user-p5/goals', 'preferences');
      goalsDoc.__setData({}, false);

      const userDoc = firestore.getDoc('users', 'user-p5');
      userDoc.__setData(
        createUserProfileRaw({
          fitnessGoals: [
            {
              id: 'fg1',
              description: 'Goal',
              achieved: false,
              targetDate: Timestamp.fromDate(new Date('2026-03-01T00:00:00.000Z')),
            },
          ],
        })
      );

      const result = await getFitnessGoals('user-p5', { enableLazyBackfill: true });
      expect(result).toHaveLength(1);
      expect(goalsDoc.set).toHaveBeenCalledTimes(1);
    });

    it('returns fitness goals from new location', async () => {
      const firestore = createFirestoreMock();
      getAdminDbMock.mockReturnValue(firestore.adminDb);

      const goalsDoc = firestore.getDoc('users/user-p5b/goals', 'preferences');
      goalsDoc.__setData({
        goals: [
          {
            id: 'fg1',
            description: 'Goal',
            achieved: false,
            targetDate: Timestamp.fromDate(new Date('2026-03-01T00:00:00.000Z')),
          },
        ],
      });

      const result = await getFitnessGoals('user-p5b');
      expect(result).toHaveLength(1);
      expect(result[0].description).toBe('Goal');
    });

    it('returns legacy lift progression analysis and backfills when enabled', async () => {
      const firestore = createFirestoreMock();
      getAdminDbMock.mockReturnValue(firestore.adminDb);

      const liftDoc = firestore.getDoc('users/user-p6/liftProgressionAnalyses', 'machine_chest_press');
      liftDoc.__setData({}, false);

      const userDoc = firestore.getDoc('users', 'user-p6');
      userDoc.__setData(
        createUserProfileRaw({
          liftProgressionAnalysis: {
            'Machine Chest Press': {
              result: { insight: 'legacy', recommendation: 'keep' },
              generatedDate: Timestamp.fromDate(new Date('2026-02-10T00:00:00.000Z')),
            },
          },
        })
      );

      const result = await getLiftProgressionAnalysis('user-p6', 'Machine Chest Press', {
        enableLazyBackfill: true,
      });
      expect(result?.result).toEqual({ insight: 'legacy', recommendation: 'keep' });
      expect(liftDoc.set).toHaveBeenCalledTimes(1);
    });

    it('throws when lift progression generatedDate is malformed in converter', async () => {
      const firestore = createFirestoreMock();
      getAdminDbMock.mockReturnValue(firestore.adminDb);

      const liftDoc = firestore.getDoc('users/user-p6b/liftProgressionAnalyses', 'machine_chest_press');
      liftDoc.__setData({
        result: { insight: 'bad', recommendation: 'bad' },
        generatedDate: 'not-a-timestamp',
      });

      await expect(
        getLiftProgressionAnalysis('user-p6b', 'Machine Chest Press')
      ).rejects.toThrow('required field "generatedDate" is missing or malformed');
    });

    it('increments same-day usage counters via update branch', async () => {
      const firestore = createFirestoreMock();
      getAdminDbMock.mockReturnValue(firestore.adminDb);

      const today = format(new Date(), 'yyyy-MM-dd');
      const userDoc = firestore.getDoc('users', 'user-q');
      userDoc.__setData(
        createUserProfileRaw({
          aiUsage: {
            goalAnalyses: {
              count: 2,
              date: today,
            },
          },
        })
      );

      const incrementSpy = vi.spyOn(FieldValue, 'increment');

      await incrementUsageCounter('user-q', 'goalAnalyses');

      expect(incrementSpy).toHaveBeenCalledWith(1);
      expect(userDoc.update).toHaveBeenCalledTimes(1);
      expect(userDoc.set).not.toHaveBeenCalled();
    });

    it('initializes usage counter when feature usage is missing', async () => {
      const firestore = createFirestoreMock();
      getAdminDbMock.mockReturnValue(firestore.adminDb);

      const today = format(new Date(), 'yyyy-MM-dd');
      const userDoc = firestore.getDoc('users', 'user-q2');
      userDoc.__setData(createUserProfileRaw({ aiUsage: {} }));

      await incrementUsageCounter('user-q2', 'goalAnalyses');

      expect(userDoc.update).not.toHaveBeenCalled();
      expect(userDoc.set).toHaveBeenCalledWith(
        {
          aiUsage: {
            goalAnalyses: {
              count: 1,
              date: today,
            },
          },
        },
        { merge: true }
      );
    });

    it('resets usage counters with merge set when day changes', async () => {
      const firestore = createFirestoreMock();
      getAdminDbMock.mockReturnValue(firestore.adminDb);

      const today = format(new Date(), 'yyyy-MM-dd');
      const userDoc = firestore.getDoc('users', 'user-r');
      userDoc.__setData(
        createUserProfileRaw({
          aiUsage: {
            goalAnalyses: {
              count: 99,
              date: '2020-01-01',
            },
          },
        })
      );

      await incrementUsageCounter('user-r', 'goalAnalyses');

      expect(userDoc.update).not.toHaveBeenCalled();
      expect(userDoc.set).toHaveBeenCalledWith(
        {
          aiUsage: {
            goalAnalyses: {
              count: 1,
              date: today,
            },
          },
        },
        { merge: true }
      );
    });

    it('recalculates PR levels in updateUserProfile when relevant fields change', async () => {
      const firestore = createFirestoreMock();
      getAdminDbMock.mockReturnValue(firestore.adminDb);
      getStrengthLevelMock.mockResolvedValue('Advanced');

      const userDoc = firestore.getDoc('users', 'user-s');
      userDoc.__setData(createUserProfileRaw({ age: 30 }));

      const recordsCollection = firestore.getCollection('users/user-s/personalRecords');
      recordsCollection.__setQueryDocs([
        {
          id: 'machine_chest_press',
          data: {
            exerciseName: 'Machine Chest Press',
            weight: 200,
            weightUnit: 'lbs',
            date: Timestamp.fromDate(new Date('2026-02-01T00:00:00.000Z')),
            category: 'Upper Body',
            strengthLevel: 'Beginner',
          },
        },
      ]);

      await updateUserProfile('user-s', { age: 31 });

      expect(firestore.batch.update).toHaveBeenCalledTimes(1);
      expect(firestore.batch.commit).toHaveBeenCalledTimes(1);
      expect(getStrengthLevelMock).toHaveBeenCalled();
    });
  });

  describe('save and delete reliability', () => {
    it('saves strength analysis with Timestamp generatedDate', async () => {
      const firestore = createFirestoreMock();
      getAdminDbMock.mockReturnValue(firestore.adminDb);

      await saveStrengthAnalysis('user-v1', {
        result: { summary: 'ok', findings: [] },
        generatedDate: new Date('2026-02-10T00:00:00.000Z'),
      } as never);

      const doc = firestore.getDoc('users/user-v1/strengthAnalyses', 'current');
      const payload = doc.__lastSetData as Record<string, unknown>;
      expect(payload.generatedDate).toBeInstanceOf(Timestamp);
    });

    it('propagates saveStrengthAnalysis errors', async () => {
      const firestore = createFirestoreMock();
      getAdminDbMock.mockReturnValue(firestore.adminDb);

      const doc = firestore.getDoc('users/user-v2/strengthAnalyses', 'current');
      doc.__setSetError(new Error('save strength failed'));

      await expect(
        saveStrengthAnalysis('user-v2', {
          result: { summary: 'ok', findings: [] },
          generatedDate: new Date('2026-02-10T00:00:00.000Z'),
        } as never)
      ).rejects.toThrow('save strength failed');
      expect(loggerErrorMock).toHaveBeenCalled();
    });

    it('deletes strength analysis documents', async () => {
      const firestore = createFirestoreMock();
      getAdminDbMock.mockReturnValue(firestore.adminDb);

      const doc = firestore.getDoc('users/user-v3/strengthAnalyses', 'current');
      await deleteStrengthAnalysis('user-v3');
      expect(doc.delete).toHaveBeenCalledTimes(1);
    });

    it('saves goal analysis with Timestamp generatedDate', async () => {
      const firestore = createFirestoreMock();
      getAdminDbMock.mockReturnValue(firestore.adminDb);

      await saveGoalAnalysis('user-v4', {
        result: { overallSummary: 'ok', goalInsights: [] },
        generatedDate: new Date('2026-02-10T00:00:00.000Z'),
      });

      const doc = firestore.getDoc('users/user-v4/goalAnalyses', 'current');
      const payload = doc.__lastSetData as Record<string, unknown>;
      expect(payload.generatedDate).toBeInstanceOf(Timestamp);
    });

    it('deletes goal analysis documents', async () => {
      const firestore = createFirestoreMock();
      getAdminDbMock.mockReturnValue(firestore.adminDb);

      const doc = firestore.getDoc('users/user-v5/goalAnalyses', 'current');
      await deleteGoalAnalysis('user-v5');
      expect(doc.delete).toHaveBeenCalledTimes(1);
    });

    it('saves fitness goals with Timestamp fields', async () => {
      const firestore = createFirestoreMock();
      getAdminDbMock.mockReturnValue(firestore.adminDb);

      await saveFitnessGoals('user-v6', [
        {
          id: 'g1',
          description: 'Goal',
          achieved: false,
          targetDate: new Date('2026-03-01T00:00:00.000Z'),
          dateAchieved: undefined,
          isPrimary: false,
        },
      ]);

      const doc = firestore.getDoc('users/user-v6/goals', 'preferences');
      const payload = doc.__lastSetData as Record<string, unknown>;
      const goals = payload.goals as Array<Record<string, unknown>>;
      expect(goals[0].targetDate).toBeInstanceOf(Timestamp);
      expect(payload.lastUpdated).toBeInstanceOf(Timestamp);
    });

    it('deletes fitness goals documents', async () => {
      const firestore = createFirestoreMock();
      getAdminDbMock.mockReturnValue(firestore.adminDb);

      const doc = firestore.getDoc('users/user-v7/goals', 'preferences');
      await deleteFitnessGoals('user-v7');
      expect(doc.delete).toHaveBeenCalledTimes(1);
    });

    it('saves lift progression analysis to normalized doc id', async () => {
      const firestore = createFirestoreMock();
      getAdminDbMock.mockReturnValue(firestore.adminDb);

      await saveLiftProgressionAnalysis('user-v8', 'Machine Chest Press', {
        result: { insight: 'ok', recommendation: 'keep' },
        generatedDate: new Date('2026-02-10T00:00:00.000Z'),
      });

      const doc = firestore.getDoc('users/user-v8/liftProgressionAnalyses', 'machine_chest_press');
      const payload = doc.__lastSetData as Record<string, unknown>;
      expect(payload.generatedDate).toBeInstanceOf(Timestamp);
    });

    it('deletes lift progression analysis from normalized doc id', async () => {
      const firestore = createFirestoreMock();
      getAdminDbMock.mockReturnValue(firestore.adminDb);

      const doc = firestore.getDoc('users/user-v9/liftProgressionAnalyses', 'machine_chest_press');
      await deleteLiftProgressionAnalysis('user-v9', 'Machine Chest Press');
      expect(doc.delete).toHaveBeenCalledTimes(1);
    });

    it('deletes weekly plan documents', async () => {
      const firestore = createFirestoreMock();
      getAdminDbMock.mockReturnValue(firestore.adminDb);

      const doc = firestore.getDoc('users/user-v10/weeklyPlans', 'current');
      await deleteWeeklyPlan('user-v10');
      expect(doc.delete).toHaveBeenCalledTimes(1);
    });

    it('propagates deleteWeeklyPlan errors', async () => {
      const firestore = createFirestoreMock();
      getAdminDbMock.mockReturnValue(firestore.adminDb);

      const doc = firestore.getDoc('users/user-v11/weeklyPlans', 'current');
      doc.__setDeleteError(new Error('delete weekly failed'));

      await expect(deleteWeeklyPlan('user-v11')).rejects.toThrow('delete weekly failed');
      expect(loggerErrorMock).toHaveBeenCalled();
    });

    it('propagates deleteGoalAnalysis errors', async () => {
      const firestore = createFirestoreMock();
      getAdminDbMock.mockReturnValue(firestore.adminDb);

      const doc = firestore.getDoc('users/user-v12/goalAnalyses', 'current');
      doc.__setDeleteError(new Error('delete goal failed'));

      await expect(deleteGoalAnalysis('user-v12')).rejects.toThrow('delete goal failed');
      expect(loggerErrorMock).toHaveBeenCalled();
    });

    it('propagates deleteStrengthAnalysis errors', async () => {
      const firestore = createFirestoreMock();
      getAdminDbMock.mockReturnValue(firestore.adminDb);

      const doc = firestore.getDoc('users/user-v13/strengthAnalyses', 'current');
      doc.__setDeleteError(new Error('delete strength failed'));

      await expect(deleteStrengthAnalysis('user-v13')).rejects.toThrow('delete strength failed');
      expect(loggerErrorMock).toHaveBeenCalled();
    });
  });

  describe('basic user profile retrieval', () => {
    it('returns null on profile fetch errors', async () => {
      const firestore = createFirestoreMock();
      getAdminDbMock.mockReturnValue(firestore.adminDb);

      const userDoc = firestore.getDoc('users', 'user-t');
      userDoc.__setGetError(new Error('profile read failed'));

      const result = await getUserProfile('user-t');
      expect(result).toBeNull();
    });

    it('returns null when profile does not exist', async () => {
      const firestore = createFirestoreMock();
      getAdminDbMock.mockReturnValue(firestore.adminDb);

      const userDoc = firestore.getDoc('users', 'user-u');
      userDoc.__setData({}, false);

      const result = await getUserProfile('user-u');
      expect(result).toBeNull();
    });
  });

  describe('type-safe goals fixtures', () => {
    it('accepts typed fitness goals fixture shape', () => {
      const goals: FitnessGoal[] = [
        {
          id: 'goal-typed',
          description: 'Run faster',
          targetDate: new Date('2026-03-01T00:00:00.000Z'),
          achieved: false,
          isPrimary: true,
        },
      ];

      expect(goals[0].description).toBe('Run faster');
    });
  });
});
