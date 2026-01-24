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
      prsForPeriod = (personalRecords || []).filter((pr: PersonalRecord) => isWithinInterval(pr.date, interval));
      goalsForPeriod = goalsForPeriod.filter((g: FitnessGoal) => isWithinInterval(g.dateAchieved!, interval));
    }

    return { logsForPeriod, prsForPeriod, goalsForPeriod };
  }, [timeRange, workoutLogs, personalRecords, fitnessGoals]);
}
