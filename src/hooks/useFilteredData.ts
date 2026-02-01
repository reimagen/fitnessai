import { useMemo } from 'react';
import type { WorkoutLog, PersonalRecord, FitnessGoal } from '@/lib/types';
import {
  isWithinInterval,
  startOfWeek,
  endOfWeek,
  startOfMonth,
  endOfMonth,
  startOfYear,
  endOfYear,
  type Interval,
} from 'date-fns';

interface FilteredDataResult {
  logsForPeriod: WorkoutLog[];
  prsForPeriod: PersonalRecord[];
  goalsForPeriod: FitnessGoal[];
}

export function useFilteredData(
  timeRange: string,
  workoutLogs: WorkoutLog[] | undefined,
  personalRecords: PersonalRecord[] | undefined,
  fitnessGoals: FitnessGoal[] | undefined
): FilteredDataResult {
  return useMemo(() => {
    const today = new Date();
    let logsForPeriod = workoutLogs || [];
    let prsForPeriod = personalRecords || [];
    let goalsForPeriod = (fitnessGoals || []).filter((g: FitnessGoal) => g.achieved && g.dateAchieved);

    if (timeRange !== 'all-time') {
      let interval: Interval;
      if (timeRange === 'weekly') interval = { start: startOfWeek(today, { weekStartsOn: 0 }), end: endOfWeek(today, { weekStartsOn: 0 }) };
      else if (timeRange === 'monthly') interval = { start: startOfMonth(today), end: endOfMonth(today) };
      else interval = { start: startOfYear(today), end: endOfYear(today) };

      logsForPeriod = (workoutLogs || []).filter((log: WorkoutLog) => isWithinInterval(log.date, interval));

      // Filter PRs by date AND ensure each is an all-time PR for its exercise
      const allPersonalRecords = personalRecords || [];
      prsForPeriod = allPersonalRecords
        .filter((pr: PersonalRecord) => isWithinInterval(pr.date, interval))
        .filter((pr: PersonalRecord) => {
          // Check if this PR is the all-time highest for its exercise
          const prWeightInLbs = pr.weightUnit === 'kg' ? pr.weight * 2.20462 : pr.weight;
          const isAllTimeBest = !allPersonalRecords.some((otherPr: PersonalRecord) => {
            if (otherPr.exerciseName !== pr.exerciseName) return false;
            const otherWeightInLbs = otherPr.weightUnit === 'kg' ? otherPr.weight * 2.20462 : otherPr.weight;
            return otherWeightInLbs > prWeightInLbs;
          });
          return isAllTimeBest;
        });

      goalsForPeriod = goalsForPeriod.filter((g: FitnessGoal) => isWithinInterval(g.dateAchieved!, interval));
    }

    return { logsForPeriod, prsForPeriod, goalsForPeriod };
  }, [timeRange, workoutLogs, personalRecords, fitnessGoals]);
}
