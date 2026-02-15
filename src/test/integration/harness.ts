import type {
  AIUsageStats,
  FitnessGoal,
  PersonalRecord,
  StoredGoalAnalysis,
  StoredLiftProgressionAnalysis,
  StoredStrengthAnalysis,
  StoredWeeklyPlan,
  UserProfile,
  WorkoutLog,
} from '@/lib/types';

type UsageFeature = keyof AIUsageStats;

type UserState = {
  profile: UserProfile;
  workouts: Map<string, WorkoutLog>;
  prs: Map<string, PersonalRecord>;
  weeklyPlan?: StoredWeeklyPlan;
  strengthAnalysis?: StoredStrengthAnalysis;
  goalAnalysis?: StoredGoalAnalysis;
  liftAnalyses: Map<string, StoredLiftProgressionAnalysis>;
  goals: FitnessGoal[];
};

const users = new Map<string, UserState>();
const failures = new Map<string, Error>();
let workoutIdSeq = 1;

function normalizeExerciseName(name: string): string {
  return name.toLowerCase().replace(/\s+/g, '_');
}

function todayISO(): string {
  return new Date().toISOString().slice(0, 10);
}

function defaultProfile(userId: string): UserProfile {
  return {
    id: userId,
    name: 'Test User',
    email: 'test@example.com',
    fitnessGoals: [],
    aiUsage: {},
  };
}

function requireUser(userId: string): UserState {
  if (!userId) throw new Error('User not authenticated.');
  const existing = users.get(userId);
  if (existing) return existing;
  const created: UserState = {
    profile: defaultProfile(userId),
    workouts: new Map(),
    prs: new Map(),
    liftAnalyses: new Map(),
    goals: [],
  };
  users.set(userId, created);
  return created;
}

function failIf(op: string): void {
  const err = failures.get(op);
  if (err) throw err;
}

export function resetHarness(): void {
  users.clear();
  failures.clear();
  workoutIdSeq = 1;
}

export function setFailure(op: string, error: Error | null): void {
  if (error) failures.set(op, error);
  else failures.delete(op);
}

export function getSnapshot(userId: string): UserState {
  return requireUser(userId);
}

export async function getWorkoutLogs(
  userId: string,
  options?: { startDate?: Date; endDate?: Date; since?: Date }
): Promise<WorkoutLog[]> {
  failIf('getWorkoutLogs');
  const state = requireUser(userId);
  let rows = Array.from(state.workouts.values());

  if (options?.startDate && options?.endDate) {
    rows = rows.filter(log => log.date >= options.startDate! && log.date <= options.endDate!);
  } else if (options?.since) {
    rows = rows.filter(log => log.date >= options.since!);
  }

  rows.sort((a, b) => b.date.getTime() - a.date.getTime());
  return rows;
}

export async function addWorkoutLog(
  userId: string,
  log: Omit<WorkoutLog, 'id' | 'userId'>
): Promise<{ id: string }> {
  failIf('addWorkoutLog');
  const state = requireUser(userId);
  const id = `log-${workoutIdSeq++}`;
  state.workouts.set(id, { ...log, id, userId });
  return { id };
}

export async function updateWorkoutLog(
  userId: string,
  id: string,
  patch: Partial<Omit<WorkoutLog, 'id' | 'userId'>>
): Promise<void> {
  failIf('updateWorkoutLog');
  const state = requireUser(userId);
  const current = state.workouts.get(id);
  if (!current) throw new Error('Workout log not found');
  state.workouts.set(id, { ...current, ...patch });
}

export async function deleteWorkoutLog(userId: string, id: string): Promise<void> {
  failIf('deleteWorkoutLog');
  const state = requireUser(userId);
  state.workouts.delete(id);
}

export async function getPersonalRecords(userId: string): Promise<PersonalRecord[]> {
  failIf('getPersonalRecords');
  const state = requireUser(userId);
  return Array.from(state.prs.values());
}

export async function addPersonalRecords(
  userId: string,
  records: Omit<PersonalRecord, 'id' | 'userId'>[]
): Promise<{ success: boolean; message: string }> {
  failIf('addPersonalRecords');
  const state = requireUser(userId);

  for (const record of records) {
    const id = normalizeExerciseName(record.exerciseName);
    const existing = state.prs.get(id);
    if (!existing || record.weight > existing.weight) {
      state.prs.set(id, {
        ...record,
        id,
        userId,
        strengthLevel: 'Intermediate',
      });
    }
  }

  return { success: true, message: 'added' };
}

export async function updatePersonalRecord(
  userId: string,
  id: string,
  patch: Partial<Omit<PersonalRecord, 'id' | 'userId'>>
): Promise<void> {
  failIf('updatePersonalRecord');
  const state = requireUser(userId);
  const current = state.prs.get(id);
  if (!current) throw new Error('Record not found.');
  state.prs.set(id, {
    ...current,
    ...patch,
    strengthLevel: 'Intermediate',
  });
}

export async function clearAllPersonalRecords(userId: string): Promise<void> {
  failIf('clearAllPersonalRecords');
  const state = requireUser(userId);
  state.prs.clear();
}

export async function getWeeklyPlan(
  userId: string,
  options?: { enableLazyBackfill?: boolean }
): Promise<StoredWeeklyPlan | null> {
  void options;
  failIf('getWeeklyPlan');
  const state = requireUser(userId);
  return state.weeklyPlan || null;
}

export async function saveWeeklyPlan(userId: string, plan: StoredWeeklyPlan): Promise<void> {
  failIf('saveWeeklyPlan');
  const state = requireUser(userId);
  state.weeklyPlan = { ...plan };
}

export async function getStrengthAnalysis(
  userId: string,
  options?: { enableLazyBackfill?: boolean }
): Promise<StoredStrengthAnalysis | null> {
  void options;
  failIf('getStrengthAnalysis');
  const state = requireUser(userId);
  return state.strengthAnalysis || null;
}

export async function saveStrengthAnalysis(
  userId: string,
  analysis: StoredStrengthAnalysis
): Promise<void> {
  failIf('saveStrengthAnalysis');
  const state = requireUser(userId);
  state.strengthAnalysis = { ...analysis };
}

export async function getGoalAnalysis(
  userId: string,
  options?: { enableLazyBackfill?: boolean }
): Promise<StoredGoalAnalysis | null> {
  void options;
  failIf('getGoalAnalysis');
  const state = requireUser(userId);
  return state.goalAnalysis || null;
}

export async function saveGoalAnalysis(
  userId: string,
  analysis: StoredGoalAnalysis
): Promise<void> {
  failIf('saveGoalAnalysis');
  const state = requireUser(userId);
  state.goalAnalysis = { ...analysis };
}

export async function getLiftProgressionAnalysis(
  userId: string,
  exerciseName: string,
  options?: { enableLazyBackfill?: boolean }
): Promise<StoredLiftProgressionAnalysis | null> {
  void options;
  failIf('getLiftProgressionAnalysis');
  const state = requireUser(userId);
  return state.liftAnalyses.get(exerciseName) || state.liftAnalyses.get(normalizeExerciseName(exerciseName)) || null;
}

export async function saveLiftProgressionAnalysis(
  userId: string,
  exerciseName: string,
  analysis: StoredLiftProgressionAnalysis
): Promise<void> {
  failIf('saveLiftProgressionAnalysis');
  const state = requireUser(userId);
  state.liftAnalyses.set(exerciseName, { ...analysis });
}

export async function getFitnessGoals(
  userId: string,
  options?: { enableLazyBackfill?: boolean }
): Promise<FitnessGoal[]> {
  void options;
  failIf('getFitnessGoals');
  const state = requireUser(userId);
  return [...state.goals];
}

export async function saveFitnessGoals(userId: string, goals: FitnessGoal[]): Promise<void> {
  failIf('saveFitnessGoals');
  const state = requireUser(userId);
  state.goals = [...goals];
  state.profile.fitnessGoals = [...goals];
}

export async function getUserProfile(userId: string): Promise<UserProfile | null> {
  failIf('getUserProfile');
  const state = requireUser(userId);
  return { ...state.profile };
}

export async function updateUserProfile(
  userId: string,
  patch: Partial<Omit<UserProfile, 'id'>>
): Promise<void> {
  failIf('updateUserProfile');
  const state = requireUser(userId);
  state.profile = { ...state.profile, ...patch, id: userId };

  if (patch.fitnessGoals) {
    state.goals = [...patch.fitnessGoals];
  }

  if (
    'gender' in patch ||
    'age' in patch ||
    'weightValue' in patch ||
    'weightUnit' in patch ||
    'skeletalMuscleMassValue' in patch ||
    'skeletalMuscleMassUnit' in patch
  ) {
    const updated = Array.from(state.prs.values()).map(pr => ({
      ...pr,
      strengthLevel: 'Intermediate' as const,
    }));
    state.prs.clear();
    updated.forEach(pr => state.prs.set(pr.id, pr));
  }
}

export async function incrementUsageCounter(userId: string, feature: UsageFeature): Promise<void> {
  failIf('incrementUsageCounter');
  const state = requireUser(userId);
  const today = todayISO();

  const usage = state.profile.aiUsage || {};
  const current = usage[feature];

  if (current && current.date === today) {
    usage[feature] = { count: current.count + 1, date: today };
  } else {
    usage[feature] = { count: 1, date: today };
  }

  state.profile.aiUsage = usage;
}
