import { useMemo } from 'react';
import type { WorkoutLog, PersonalRecord, ExerciseCategory, FitnessGoal } from '@/lib/types';
import { chartConfig } from '@/analysis/chart.config';
import { timeRangeDisplayNames } from '@/analysis/analysis-constants';
import {
  format,
  parse,
  eachDayOfInterval,
  startOfWeek,
  endOfWeek,
  startOfMonth,
  endOfMonth,
  startOfYear,
  endOfYear,
  eachWeekOfInterval,
} from 'date-fns';

interface ChartDataPoint {
  date: string;
  dateLabel: string;
  upperBody: number;
  lowerBody: number;
  cardio: number;
  core: number;
  fullBody: number;
  other: number;
}

interface PeriodSummaryStats {
  workoutDays: number;
  totalWeightLiftedLbs: number;
  totalDistanceMi: number;
  totalCardioDurationMin: number;
  totalCaloriesBurned: number;
  periodLabel: string;
}

interface ChartDataResult {
  workoutFrequencyData: ChartDataPoint[];
  newPrsData: PersonalRecord[];
  achievedGoalsData: (FitnessGoal & { dateAchieved: Date })[];
  categoryRepData: { key: string; name: string; value: number; fill: string }[];
  categoryCalorieData: { key: string; name: string; value: number; fill: string }[];
  periodSummary: PeriodSummaryStats;
}

type ChartDataKey = keyof typeof chartConfig;
type ExerciseCategoryKey = keyof Omit<ChartDataPoint, 'date' | 'dateLabel'>;

const categoryToCamelCase = (category: ExerciseCategory): ExerciseCategoryKey => {
  switch (category) {
    case 'Upper Body': return 'upperBody';
    case 'Lower Body': return 'lowerBody';
    case 'Full Body': return 'fullBody';
    case 'Cardio': return 'cardio';
    case 'Core': return 'core';
    default: return 'other';
  }
};

const getUniqueExerciseCounts = (logs: WorkoutLog[]): Partial<Record<ExerciseCategoryKey, number>> => {
  const uniqueExercises: Partial<Record<ExerciseCategoryKey, Set<string>>> = {};

  logs.forEach((log: WorkoutLog) => {
    log.exercises.forEach((ex) => {
      const camelCaseCategory = categoryToCamelCase(ex.category || 'Other');
      if (!uniqueExercises[camelCaseCategory]) {
        uniqueExercises[camelCaseCategory] = new Set();
      }
      uniqueExercises[camelCaseCategory]!.add(ex.name.trim().toLowerCase());
    });
  });

  const counts: Partial<Record<ExerciseCategoryKey, number>> = {};
  for (const category in uniqueExercises) {
    const catKey = category as ExerciseCategoryKey;
    counts[catKey] = uniqueExercises[catKey]!.size;
  }
  return counts;
};

export function useChartData(
  timeRange: string,
  logsForPeriod: WorkoutLog[],
  prsForPeriod: PersonalRecord[],
  goalsForPeriod: FitnessGoal[]
): ChartDataResult {
  return useMemo(() => {
    const periodLabel = `${timeRangeDisplayNames[timeRange]}'s Summary`;
    const today = new Date();

    let workoutFrequencyData: ChartDataPoint[] = [];

    switch (timeRange) {
      case 'weekly': {
        const weekStart = startOfWeek(today, { weekStartsOn: 0 });
        const weekEnd = endOfWeek(today, { weekStartsOn: 0 });
        const daysInWeek = eachDayOfInterval({ start: weekStart, end: weekEnd });

        workoutFrequencyData = daysInWeek.map((day: Date) => {
          const dateKey = format(day, 'yyyy-MM-dd');
          const logsForDay = logsForPeriod.filter((log: WorkoutLog) => format(log.date, 'yyyy-MM-dd') === dateKey);
          const counts = getUniqueExerciseCounts(logsForDay);
          return {
            date: dateKey,
            dateLabel: format(day, 'E'),
            upperBody: counts.upperBody || 0,
            lowerBody: counts.lowerBody || 0,
            cardio: counts.cardio || 0,
            core: counts.core || 0,
            fullBody: counts.fullBody || 0,
            other: counts.other || 0,
          };
        });
        break;
      }

      case 'monthly': {
        const aggregatedData: { [key: string]: WorkoutLog[] } = {};
        logsForPeriod.forEach((log: WorkoutLog) => {
          const weekStart = startOfWeek(log.date, { weekStartsOn: 0 });
          const dateKey = format(weekStart, 'yyyy-MM-dd');
          if (!aggregatedData[dateKey]) aggregatedData[dateKey] = [];
          aggregatedData[dateKey].push(log);
        });

        workoutFrequencyData = Object.entries(aggregatedData)
          .map(([dateKey, logs]: [string, WorkoutLog[]]) => {
            const weekStart = parse(dateKey, 'yyyy-MM-dd', new Date());
            const weekEnd = endOfWeek(weekStart, { weekStartsOn: 0 });
            const dateLabel = `${format(weekStart, 'MMM d')}-${format(weekEnd, 'd')}`;
            const counts = getUniqueExerciseCounts(logs);
            return {
              date: dateKey,
              dateLabel,
              upperBody: counts.upperBody || 0,
              lowerBody: counts.lowerBody || 0,
              cardio: counts.cardio || 0,
              core: counts.core || 0,
              fullBody: counts.fullBody || 0,
              other: counts.other || 0,
            };
          })
          .sort((a: ChartDataPoint, b: ChartDataPoint) => new Date(a.date).getTime() - new Date(b.date).getTime());
        break;
      }

      case 'yearly': {
        const aggregatedData: { [key: string]: WorkoutLog[] } = {};
        logsForPeriod.forEach((log: WorkoutLog) => {
          const dateKey = format(log.date, 'yyyy-MM');
          if (!aggregatedData[dateKey]) aggregatedData[dateKey] = [];
          aggregatedData[dateKey].push(log);
        });
        workoutFrequencyData = Object.entries(aggregatedData)
          .map(([dateKey, logs]: [string, WorkoutLog[]]) => {
            const dateLabel = format(parse(dateKey, 'yyyy-MM', new Date()), 'MMM');
            const counts = getUniqueExerciseCounts(logs);
            return {
              date: dateKey,
              dateLabel,
              upperBody: counts.upperBody || 0,
              lowerBody: counts.lowerBody || 0,
              cardio: counts.cardio || 0,
              core: counts.core || 0,
              fullBody: counts.fullBody || 0,
              other: counts.other || 0,
            };
          })
          .sort((a: ChartDataPoint, b: ChartDataPoint) =>
            parse(a.date, 'yyyy-MM', new Date()).getTime() - parse(b.date, 'yyyy-MM', new Date()).getTime()
          );
        break;
      }

      case 'all-time': {
        const aggregatedData: { [key: string]: WorkoutLog[] } = {};
        logsForPeriod.forEach((log: WorkoutLog) => {
          const dateKey = format(log.date, 'yyyy');
          if (!aggregatedData[dateKey]) aggregatedData[dateKey] = [];
          aggregatedData[dateKey].push(log);
        });
        workoutFrequencyData = Object.entries(aggregatedData)
          .map(([dateKey, logs]: [string, WorkoutLog[]]) => {
            const counts = getUniqueExerciseCounts(logs);
            return {
              date: dateKey,
              dateLabel: dateKey,
              upperBody: counts.upperBody || 0,
              lowerBody: counts.lowerBody || 0,
              cardio: counts.cardio || 0,
              core: counts.core || 0,
              fullBody: counts.fullBody || 0,
              other: counts.other || 0,
            };
          })
          .sort((a: ChartDataPoint, b: ChartDataPoint) => parseInt(a.date) - parseInt(b.date));
        break;
      }
    }

    const repsByCat: Record<ExerciseCategoryKey, number> = {
      upperBody: 0,
      lowerBody: 0,
      fullBody: 0,
      cardio: 0,
      core: 0,
      other: 0,
    };
    const caloriesByCat: Record<ExerciseCategoryKey, number> = {
      upperBody: 0,
      lowerBody: 0,
      fullBody: 0,
      cardio: 0,
      core: 0,
      other: 0,
    };

    logsForPeriod.forEach((log: WorkoutLog) => {
      log.exercises.forEach((ex) => {
        const camelCaseCategory = categoryToCamelCase(ex.category || 'Other');
        repsByCat[camelCaseCategory] += (ex.reps || 0) * (ex.sets || 0);
        caloriesByCat[camelCaseCategory] += ex.calories || 0;
      });
    });

    const categoryRepData = Object.entries(repsByCat)
      .filter(([, value]: [string, number]) => value > 0)
      .map(([name, value]: [string, number]) => ({
        key: name,
        name: (chartConfig[name as ChartDataKey]?.label || name) as string,
        value,
        fill: `var(--color-${name})`,
      }));

    const categoryCalorieData = Object.entries(caloriesByCat)
      .filter(([, value]: [string, number]) => value > 0)
      .map(([name, value]: [string, number]) => ({
        key: name,
        name: (chartConfig[name as ChartDataKey]?.label || name) as string,
        value,
        fill: `var(--color-${name})`,
      }));

    const uniqueWorkoutDates = new Set<string>();
    let totalWeight = 0,
      totalDistance = 0,
      totalDuration = 0,
      totalCalories = 0;
    logsForPeriod.forEach((log: WorkoutLog) => {
      uniqueWorkoutDates.add(format(log.date, 'yyyy-MM-dd'));
      log.exercises.forEach((ex) => {
        if (ex.weight && ex.sets && ex.reps)
          totalWeight += ex.weight * ex.sets * ex.reps * (ex.weightUnit === 'kg' ? 2.20462 : 1);
        if (ex.category === 'Cardio' && ex.distance) {
          let distMi = 0;
          if (ex.distanceUnit === 'km') distMi = (ex.distance || 0) * 0.621371;
          else if (ex.distanceUnit === 'ft') distMi = (ex.distance || 0) / 5280;
          else if (ex.distanceUnit === 'm') distMi = (ex.distance || 0) / 1609.34;
          else if (ex.distanceUnit === 'mi') distMi = ex.distance || 0;
          totalDistance += distMi;
        }
        if (ex.category === 'Cardio' && ex.duration) {
          let durMin = ex.duration;
          if (ex.durationUnit === 'hr') durMin *= 60;
          else if (ex.durationUnit === 'sec') durMin /= 60;
          totalDuration += durMin;
        }
        totalCalories += ex.calories || 0;
      });
    });

    const periodSummary = {
      workoutDays: uniqueWorkoutDates.size,
      totalWeightLiftedLbs: Math.round(totalWeight),
      totalDistanceMi: Math.round(totalDistance),
      totalCardioDurationMin: Math.round(totalDuration),
      totalCaloriesBurned: Math.round(totalCalories),
      periodLabel: periodLabel,
    };

    return {
      workoutFrequencyData,
      newPrsData: prsForPeriod.sort((a: PersonalRecord, b: PersonalRecord) => b.date.getTime() - a.date.getTime()),
      achievedGoalsData: (goalsForPeriod as (FitnessGoal & { dateAchieved: Date })[]).sort(
        (a: FitnessGoal & { dateAchieved: Date }, b: FitnessGoal & { dateAchieved: Date }) =>
          b.dateAchieved.getTime() - a.dateAchieved.getTime()
      ),
      categoryRepData,
      categoryCalorieData,
      periodSummary,
    };
  }, [timeRange, logsForPeriod, prsForPeriod, goalsForPeriod]);
}
