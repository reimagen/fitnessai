import { beforeEach, describe, expect, it } from 'vitest';

import {
  INTEGRATION_USER_ID,
  goalAnalysisInput,
  goalsInput,
  liftAnalysisInput,
  prInput,
  strengthAnalysisInput,
  weeklyPlanInput,
  workoutInput,
} from './fixtures';
import { setFailure } from './harness';
import { rateLimitMock, resetIntegrationMocks } from './mocks';

import {
  addWorkoutLog,
  deleteWorkoutLog,
  getWorkoutLogs,
  updateWorkoutLog,
} from '@/app/history/actions';
import {
  addPersonalRecords,
  clearAllPersonalRecords,
  getPersonalRecords,
  updatePersonalRecord,
} from '@/app/prs/actions';
import {
  getGoalAnalysisAction,
  getGoalsAction,
  getLiftProgressionAnalysisAction,
  getUserProfile,
  saveGoalAnalysisAction,
  saveGoalsAction,
  saveLiftProgressionAnalysisAction,
  analyzeGoalsAction,
  analyzeLiftProgressionAction,
} from '@/app/profile/actions';
import {
  analyzeStrengthAction,
  getStrengthAnalysisAction,
  saveStrengthAnalysisAction,
} from '@/app/analysis/actions';
import {
  generateWeeklyWorkoutPlanAction,
  getWeeklyPlanAction,
  saveWeeklyPlanAction,
} from '@/app/plan/actions';

beforeEach(() => {
  resetIntegrationMocks();
});

describe('cross-feature integration (minimum risk matrix)', () => {
  describe('history write/read consistency', () => {
    it('addWorkoutLog is observable through getWorkoutLogs', async () => {
      const created = await addWorkoutLog(INTEGRATION_USER_ID, workoutInput());

      const logs = await getWorkoutLogs(INTEGRATION_USER_ID);
      expect(logs).toHaveLength(1);
      expect(logs[0].id).toBe(created.id);
      expect(logs[0].notes).toBe('Integration workout');
    });

    it('updateWorkoutLog is observable through getWorkoutLogs', async () => {
      const created = await addWorkoutLog(INTEGRATION_USER_ID, workoutInput());
      await updateWorkoutLog(INTEGRATION_USER_ID, created.id, { notes: 'Updated notes' });

      const logs = await getWorkoutLogs(INTEGRATION_USER_ID);
      expect(logs[0].notes).toBe('Updated notes');
    });

    it('deleteWorkoutLog is observable through getWorkoutLogs', async () => {
      const created = await addWorkoutLog(INTEGRATION_USER_ID, workoutInput());
      await deleteWorkoutLog(INTEGRATION_USER_ID, created.id);

      const logs = await getWorkoutLogs(INTEGRATION_USER_ID);
      expect(logs).toHaveLength(0);
    });
  });

  describe('pr write/read consistency', () => {
    it('addPersonalRecords is observable through getPersonalRecords', async () => {
      await addPersonalRecords(INTEGRATION_USER_ID, [prInput()]);

      const prs = await getPersonalRecords(INTEGRATION_USER_ID);
      expect(prs).toHaveLength(1);
      expect(prs[0].exerciseName).toBe('Machine Chest Press');
      expect(prs[0].strengthLevel).toBe('Intermediate');
    });

    it('updatePersonalRecord is observable through getPersonalRecords', async () => {
      await addPersonalRecords(INTEGRATION_USER_ID, [prInput()]);
      await updatePersonalRecord(INTEGRATION_USER_ID, 'machine_chest_press', {
        weight: 130,
      });

      const prs = await getPersonalRecords(INTEGRATION_USER_ID);
      expect(prs[0].weight).toBe(130);
      expect(prs[0].strengthLevel).toBe('Intermediate');
    });

    it('clearAllPersonalRecords is observable through getPersonalRecords', async () => {
      await addPersonalRecords(INTEGRATION_USER_ID, [prInput()]);
      await clearAllPersonalRecords(INTEGRATION_USER_ID);

      const prs = await getPersonalRecords(INTEGRATION_USER_ID);
      expect(prs).toHaveLength(0);
    });
  });

  describe('save/get action pairs', () => {
    it('saveGoalsAction is observable through getGoalsAction', async () => {
      const goals = goalsInput();
      await saveGoalsAction(INTEGRATION_USER_ID, goals);

      const result = await getGoalsAction(INTEGRATION_USER_ID);
      expect(result.success).toBe(true);
      expect(result.data).toHaveLength(1);
      expect(result.data?.[0].description).toBe(goals[0].description);
    });

    it('saveGoalAnalysisAction is observable through getGoalAnalysisAction', async () => {
      const analysis = goalAnalysisInput();
      await saveGoalAnalysisAction(INTEGRATION_USER_ID, analysis);

      const result = await getGoalAnalysisAction(INTEGRATION_USER_ID);
      expect(result.success).toBe(true);
      expect(result.data?.result.overallSummary).toBe(analysis.result.overallSummary);
    });

    it('saveLiftProgressionAnalysisAction is observable through getLiftProgressionAnalysisAction', async () => {
      const analysis = liftAnalysisInput();
      await saveLiftProgressionAnalysisAction(
        INTEGRATION_USER_ID,
        'Machine Chest Press',
        analysis
      );

      const result = await getLiftProgressionAnalysisAction(
        INTEGRATION_USER_ID,
        'Machine Chest Press'
      );
      expect(result.success).toBe(true);
      expect(result.data?.result.insight).toBe(analysis.result.insight);
    });

    it('saveStrengthAnalysisAction is observable through getStrengthAnalysisAction', async () => {
      const analysis = strengthAnalysisInput();
      await saveStrengthAnalysisAction(INTEGRATION_USER_ID, analysis);

      const result = await getStrengthAnalysisAction(INTEGRATION_USER_ID);
      expect(result.success).toBe(true);
      expect(result.data?.result.summary).toBe(analysis.result.summary);
    });

    it('saveWeeklyPlanAction is observable through getWeeklyPlanAction', async () => {
      const plan = weeklyPlanInput(INTEGRATION_USER_ID);
      await saveWeeklyPlanAction(INTEGRATION_USER_ID, plan);

      const result = await getWeeklyPlanAction(INTEGRATION_USER_ID);
      expect(result.success).toBe(true);
      expect(result.data?.plan).toBe(plan.plan);
    });
  });

  describe('cross-feature side effects', () => {
    it('analyzeStrengthAction increments strength usage counter', async () => {
      const result = await analyzeStrengthAction(INTEGRATION_USER_ID, {
        userProfile: {},
        clientSideFindings: [],
      });

      expect(result.success).toBe(true);
      const profile = await getUserProfile(INTEGRATION_USER_ID);
      expect(profile?.aiUsage?.strengthAnalyses?.count).toBe(1);
    });

    it('analyzeGoalsAction saves data and increments goal usage counter', async () => {
      const result = await analyzeGoalsAction(INTEGRATION_USER_ID, {
        userProfileContext: 'Profile context',
      });

      expect(result.success).toBe(true);
      const saved = await getGoalAnalysisAction(INTEGRATION_USER_ID);
      expect(saved.success).toBe(true);
      expect(saved.data).toBeDefined();

      const profile = await getUserProfile(INTEGRATION_USER_ID);
      expect(profile?.aiUsage?.goalAnalyses?.count).toBe(1);
    });

    it('analyzeLiftProgressionAction saves normalized key data and increments usage', async () => {
      const result = await analyzeLiftProgressionAction(INTEGRATION_USER_ID, {
        exerciseName: 'Machine Chest Press',
        exerciseHistory: [
          {
            date: '2026-02-01',
            weight: 120,
            sets: 3,
            reps: 8,
          },
        ],
        userProfile: {},
      });

      expect(result.success).toBe(true);
      const saved = await getLiftProgressionAnalysisAction(
        INTEGRATION_USER_ID,
        'machine_chest_press'
      );
      expect(saved.success).toBe(true);
      expect(saved.data).toBeDefined();

      const profile = await getUserProfile(INTEGRATION_USER_ID);
      expect(profile?.aiUsage?.liftProgressionAnalyses?.count).toBe(1);
    });

    it('generateWeeklyWorkoutPlanAction increments plan usage counter', async () => {
      const result = await generateWeeklyWorkoutPlanAction({
        userId: INTEGRATION_USER_ID,
        userProfileContext: 'Profile context',
        weekStartDate: '2026-02-09',
      });

      expect(result.success).toBe(true);
      const profile = await getUserProfile(INTEGRATION_USER_ID);
      expect(profile?.aiUsage?.planGenerations?.count).toBe(1);
    });
  });

  describe('boundary error recovery', () => {
    it('saveGoalAnalysis failure surfaces through saveGoalAnalysisAction', async () => {
      setFailure('saveGoalAnalysis', new Error('save goal analysis failed'));

      const result = await saveGoalAnalysisAction(INTEGRATION_USER_ID, goalAnalysisInput());
      expect(result.success).toBe(false);
      expect(result.error).toContain('save goal analysis failed');

      setFailure('saveGoalAnalysis', null);
      const after = await getGoalAnalysisAction(INTEGRATION_USER_ID);
      expect(after.data).toBeUndefined();
    });

    it('getStrengthAnalysis failure surfaces through getStrengthAnalysisAction', async () => {
      setFailure('getStrengthAnalysis', new Error('get strength failed'));

      const result = await getStrengthAnalysisAction(INTEGRATION_USER_ID);
      expect(result.success).toBe(false);
      expect(result.error).toContain('get strength failed');
    });

    it('rate-limit blocked plan generation does not increment usage counter', async () => {
      rateLimitMock.mockResolvedValue({ allowed: false, error: 'Daily limit reached.' });

      const result = await generateWeeklyWorkoutPlanAction({
        userId: INTEGRATION_USER_ID,
        userProfileContext: 'Profile context',
      });

      expect(result.success).toBe(false);
      expect(result.error).toBe('Daily limit reached.');
      const profile = await getUserProfile(INTEGRATION_USER_ID);
      expect(profile?.aiUsage?.planGenerations).toBeUndefined();
    });

    it('saveWeeklyPlanAction failure does not persist plan or update usage counters', async () => {
      setFailure('saveWeeklyPlan', new Error('save weekly plan failed'));

      const result = await saveWeeklyPlanAction(
        INTEGRATION_USER_ID,
        weeklyPlanInput(INTEGRATION_USER_ID)
      );
      expect(result.success).toBe(false);
      expect(result.error).toContain('save weekly plan failed');

      setFailure('saveWeeklyPlan', null);
      const plan = await getWeeklyPlanAction(INTEGRATION_USER_ID);
      expect(plan.success).toBe(true);
      expect(plan.data).toBeUndefined();

      const profile = await getUserProfile(INTEGRATION_USER_ID);
      expect(profile?.aiUsage?.planGenerations).toBeUndefined();
    });

    it('failed updatePersonalRecord does not leave partial state', async () => {
      await addPersonalRecords(INTEGRATION_USER_ID, [prInput()]);
      setFailure('updatePersonalRecord', new Error('pr update failed'));

      await expect(
        updatePersonalRecord(INTEGRATION_USER_ID, 'machine_chest_press', { weight: 145 })
      ).rejects.toThrow('pr update failed');

      setFailure('updatePersonalRecord', null);
      const records = await getPersonalRecords(INTEGRATION_USER_ID);
      expect(records).toHaveLength(1);
      expect(records[0].weight).toBe(120);
    });

    it('failed saveGoalsAction preserves last known good goal state', async () => {
      const initialGoals = goalsInput();
      await saveGoalsAction(INTEGRATION_USER_ID, initialGoals);

      setFailure('saveFitnessGoals', new Error('save goals failed'));
      const failedSave = await saveGoalsAction(INTEGRATION_USER_ID, [
        {
          ...initialGoals[0],
          description: 'New description should not persist',
        },
      ]);
      expect(failedSave.success).toBe(false);
      expect(failedSave.error).toContain('save goals failed');

      setFailure('saveFitnessGoals', null);
      const after = await getGoalsAction(INTEGRATION_USER_ID);
      expect(after.success).toBe(true);
      expect(after.data).toHaveLength(1);
      expect(after.data?.[0].description).toBe(initialGoals[0].description);
    });
  });

  describe('validation integration', () => {
    it('invalid saveGoalsAction payload returns validation error and does not persist', async () => {
      const invalidGoals = [
        {
          id: 'goal-1',
          description: 'Invalid target date payload',
          targetDate: 'not-a-date',
          achieved: false,
        },
      ] as unknown as ReturnType<typeof goalsInput>;

      const result = await saveGoalsAction(INTEGRATION_USER_ID, invalidGoals);
      expect(result.success).toBe(false);
      expect(result.error).toContain('Invalid goals data');

      const after = await getGoalsAction(INTEGRATION_USER_ID);
      expect(after.success).toBe(true);
      expect(after.data).toHaveLength(0);
    });

    it('invalid saveWeeklyPlanAction payload returns validation error and does not persist', async () => {
      const invalidPlan = {
        ...weeklyPlanInput(INTEGRATION_USER_ID),
        plan: '',
      };

      const result = await saveWeeklyPlanAction(INTEGRATION_USER_ID, invalidPlan);
      expect(result.success).toBe(false);
      expect(result.error).toContain('Invalid plan data');

      const after = await getWeeklyPlanAction(INTEGRATION_USER_ID);
      expect(after.success).toBe(true);
      expect(after.data).toBeUndefined();
    });

    it('invalid updateWorkoutLog input throws and leaves existing log unchanged', async () => {
      const created = await addWorkoutLog(INTEGRATION_USER_ID, workoutInput());

      await expect(
        updateWorkoutLog(INTEGRATION_USER_ID, created.id, {
          exercises: [
            {
              id: 'ex-1',
              name: 'Machine Chest Press',
              sets: -1,
              reps: 8,
              weight: 120,
            },
          ],
        })
      ).rejects.toThrow('Invalid workout log');

      const logs = await getWorkoutLogs(INTEGRATION_USER_ID);
      expect(logs).toHaveLength(1);
      expect(logs[0].notes).toBe('Integration workout');
      expect(logs[0].exercises[0].sets).toBe(3);
    });
  });
});
