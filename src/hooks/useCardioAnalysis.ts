import { useMemo } from 'react';
import type { Exercise, WorkoutLog, UserProfile } from '@/lib/types';
import { toTitleCase } from '@/lib/utils';
import { calculateExerciseCalories } from '@/lib/calorie-calculator';
import { calculateRecentWeeklyCardioAverage, resolveWeeklyCardioGoal } from '@/lib/cardio-target-calculator';
import {
  format,
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  differenceInDays,
  differenceInWeeks,
  eachWeekOfInterval,
} from 'date-fns';

interface CardioStats {
  count: number;
  totalDistanceMi: number;
  totalDurationMin: number;
  totalCalories: number;
  hasEstimatedCalories: boolean;
}

interface PieChartData {
  name: string;
  value: number;
  fill: string;
  hasEstimatedCalories?: boolean;
}

interface CardioAmountChartPoint {
  dateLabel: string;
  total: number;
  [key: string]: number | string;
}

type CardioExercise = Exercise & {
  date: Date;
  calories?: number;
  name: string;
};

interface CardioAnalysisResult {
  totalCalories: number;
  statsByActivity: Record<string, CardioStats>;
  pieChartData: PieChartData[];
  calorieSummary: string;
  cardioAmountChartData: CardioAmountChartPoint[];
}

export function useCardioAnalysis(
  timeRange: string,
  workoutLogs: WorkoutLog[] | undefined,
  userProfile: UserProfile | undefined,
  logsForPeriod: WorkoutLog[]
): CardioAnalysisResult {
  return useMemo(() => {
    if (!userProfile) {
      return {
        totalCalories: 0,
        statsByActivity: {},
        pieChartData: [],
        calorieSummary: '',
        cardioAmountChartData: [],
      };
    }

    const today = new Date();

    const cardioExercises: CardioExercise[] = logsForPeriod.flatMap(log =>
      log.exercises
        .filter(ex => ex.category === 'Cardio')
        .map(ex => {
          let name = toTitleCase(ex.name);
          const exNameLower = ex.name.toLowerCase();

          // Speed-based categorization for treadmill, elliptical, and ascent trainer
          if (exNameLower.includes('treadmill') || exNameLower.includes('elliptical') || exNameLower.includes('ascent trainer')) {
            const distanceMi = ex.distanceUnit === 'km' ? (ex.distance || 0) * 0.621371 : ex.distance || 0;

            let durationHr = 0;
            if (ex.duration) {
              if (ex.durationUnit === 'min') durationHr = ex.duration / 60;
              else if (ex.durationUnit === 'sec') durationHr = ex.duration / 3600;
              else if (ex.durationUnit === 'hr') durationHr = ex.duration;
            }

            if (durationHr > 0) {
              const speedMph = distanceMi / durationHr;
              name = speedMph > 4.0 ? 'Running' : 'Walking';
            } else {
              name = 'Walking';
            }
          } else if (exNameLower.includes('run')) name = 'Running';
          else if (exNameLower.includes('walk')) name = 'Walking';
          else if (exNameLower.includes('cycle') || exNameLower.includes('bike')) name = 'Cycling';
          else if (exNameLower.includes('climbmill') || exNameLower.includes('stairmaster')) name = 'Climbmill';
          else if (exNameLower.includes('rowing')) name = 'Rowing';
          else if (exNameLower.includes('swim')) name = 'Swimming';

          const calculatedCalories = calculateExerciseCalories(ex, userProfile, workoutLogs || []);

          return {
            ...ex,
            date: log.date,
            name,
            calories: ex.calories && ex.calories > 0 ? ex.calories : calculatedCalories,
          };
        })
    );

    const totalCalories = cardioExercises.reduce((sum, ex) => sum + (ex.calories || 0), 0);

    const statsByActivity = cardioExercises.reduce(
      (acc: Record<string, CardioStats>, ex) => {
        if (!acc[ex.name]) {
          acc[ex.name] = { count: 0, totalDistanceMi: 0, totalDurationMin: 0, totalCalories: 0, hasEstimatedCalories: false };
        }
        const stats = acc[ex.name];
        stats.count++;
        stats.totalCalories += ex.calories || 0;

        // Track if any exercise in this activity has estimated calories
        if (ex.caloriesSource === 'estimated' || (ex.calories && ex.calories > 0 && !ex.caloriesSource)) {
          stats.hasEstimatedCalories = true;
        }

        let distanceMi = 0;
        if (ex.distance) {
          if (ex.distanceUnit === 'km') distanceMi = ex.distance * 0.621371;
          else if (ex.distanceUnit === 'ft') distanceMi = ex.distance * 0.000189394;
          else if (ex.distanceUnit === 'mi') distanceMi = ex.distance;
        }
        stats.totalDistanceMi += distanceMi;

        let durationMin = 0;
        if (ex.duration) {
          if (ex.durationUnit === 'hr') durationMin = ex.duration * 60;
          else if (ex.durationUnit === 'sec') durationMin = ex.duration / 60;
          else if (ex.durationUnit === 'min') durationMin = ex.duration;
        }
        stats.totalDurationMin += durationMin;

        return acc;
      },
      {} as Record<string, CardioStats>
    );

    const pieChartData = Object.entries(statsByActivity).map(([name, stats]) => ({
      name: `${name} `,
      value: Math.round(stats.totalCalories),
      fill: `var(--color-${name})`,
      hasEstimatedCalories: stats.hasEstimatedCalories,
    }));

    let calorieSummary = '';
    const recentWeeklyAverage = workoutLogs
      ? calculateRecentWeeklyCardioAverage(workoutLogs) ?? undefined
      : undefined;
    const weeklyGoal = resolveWeeklyCardioGoal(userProfile, { recentWeeklyAverage });
    let weeklyAverage = 0;

    if (timeRange === 'weekly') {
      weeklyAverage = totalCalories;
      calorieSummary = `This week you've burned a total of ${Math.round(totalCalories).toLocaleString()} cardio calories.`;
    } else if (timeRange === 'monthly') {
      const start = startOfMonth(new Date());
      const end = endOfMonth(new Date());
      const daysSoFar = differenceInDays(new Date(Math.min(today.getTime(), end.getTime())), start) + 1;
      const weeksSoFar = Math.max(1, daysSoFar / 7);
      weeklyAverage = weeksSoFar > 0 ? totalCalories / weeksSoFar : 0;
      calorieSummary = `This month you've burned ${Math.round(totalCalories).toLocaleString()} cardio calories, averaging ${Math.round(weeklyAverage).toLocaleString()}/week.`;
    } else if (timeRange === 'yearly') {
      const yearStart = new Date(today.getFullYear(), 0, 1); // Jan 1 of current year
      const weeksWithData = Math.max(1, differenceInWeeks(today, yearStart) + 1);
      weeklyAverage = weeksWithData > 0 ? totalCalories / weeksWithData : 0;
      calorieSummary = `This year you've burned ${Math.round(totalCalories).toLocaleString()} cardio calories, averaging ${Math.round(weeklyAverage).toLocaleString()}/week.`;
    } else {
      const firstLogDate =
        workoutLogs && workoutLogs.length > 0
          ? workoutLogs.reduce((earliest: WorkoutLog, log: WorkoutLog) =>
              log.date < earliest.date ? log : earliest
            ).date
          : new Date();
      const numWeeks = differenceInWeeks(new Date(), firstLogDate) || 1;
      weeklyAverage = numWeeks > 0 ? totalCalories / numWeeks : 0;
      calorieSummary = `You've burned ${Math.round(totalCalories).toLocaleString()} cardio calories in total, averaging ${Math.round(weeklyAverage).toLocaleString()}/week.`;
    }

    if (weeklyGoal && weeklyGoal > 0) {
      const percentageAchieved = (weeklyAverage / weeklyGoal) * 100;
      calorieSummary += ` Your weekly calorie target is ${weeklyGoal.toLocaleString()}.`;

      if (percentageAchieved >= 100) {
        const surplus = weeklyAverage - weeklyGoal;
        calorieSummary += ` You are beating your goal by ${Math.round(surplus).toLocaleString()} calories (${Math.round(percentageAchieved - 100)}% over).`;
      } else if (percentageAchieved >= 50) {
        const percentageRemaining = 100 - percentageAchieved;
        calorieSummary += ` You are only ${Math.round(percentageRemaining)}% away from your goal.`;
      } else {
        calorieSummary += ` You are at ${Math.round(percentageAchieved)}% of your goal, keep going!`;
      }
    }

    // --- Cardio Amount Bar Chart Data ---
    let cardioAmountChartData: CardioAmountChartPoint[] = [];
    const activities = Array.from(new Set(cardioExercises.map(ex => ex.name)));
    const initialActivityData = { total: 0, ...Object.fromEntries(activities.map((act: string) => [act, 0])) };

    const processAndFinalizeData = (dataMap: Map<string, CardioAmountChartPoint>) => {
      const finalizedData = Array.from(dataMap.values());
      finalizedData.forEach(dataPoint => {
        let total = 0;
        activities.forEach((activity: string) => {
          const value = dataPoint[activity];
          total += typeof value === 'number' ? value : 0;
        });
        dataPoint.total = Math.round(total);
      });
      return finalizedData;
    };

    switch (timeRange) {
      case 'weekly': {
        const weekStart = startOfWeek(today, { weekStartsOn: 0 });
        const daysInWeek = Array.from({ length: 7 }, (_, i) => {
          const day = new Date(weekStart);
          day.setDate(day.getDate() + i);
          return day;
        });
        const dailyData = new Map<string, CardioAmountChartPoint>(
          daysInWeek.map((day: Date) => [
            format(day, 'yyyy-MM-dd'),
            { dateLabel: format(day, 'E'), ...initialActivityData },
          ])
        );

        cardioExercises.forEach(ex => {
          const dateKey = format(ex.date, 'yyyy-MM-dd');
          const dayData = dailyData.get(dateKey);
          if (dayData) {
            const existingValue = Number(dayData[ex.name] ?? 0);
            dayData[ex.name] = existingValue + (ex.calories || 0);
          }
        });
        cardioAmountChartData = processAndFinalizeData(dailyData);
        break;
      }
      case 'monthly': {
        const monthStart = startOfMonth(today);
        const monthEnd = endOfMonth(today);
        const weeklyData = new Map<string, CardioAmountChartPoint>();

        const weeks = eachWeekOfInterval({ start: monthStart, end: monthEnd }, { weekStartsOn: 0 });

        weeks.forEach((weekStart: Date) => {
          const weekEnd = endOfWeek(weekStart, { weekStartsOn: 0 });
          if (weekStart.getMonth() === monthStart.getMonth() || weekEnd.getMonth() === monthStart.getMonth()) {
            const dateLabel = `${format(weekStart, 'MMM d')}-${format(weekEnd, 'd')}`;
            weeklyData.set(format(weekStart, 'yyyy-MM-dd'), { dateLabel, ...initialActivityData });
          }
        });

        cardioExercises.forEach(ex => {
          const weekStartKey = format(startOfWeek(ex.date, { weekStartsOn: 0 }), 'yyyy-MM-dd');
          const weekData = weeklyData.get(weekStartKey);
          if (weekData) {
            const existingValue = Number(weekData[ex.name] ?? 0);
            weekData[ex.name] = existingValue + (ex.calories || 0);
          }
        });
        cardioAmountChartData = processAndFinalizeData(weeklyData);
        break;
      }
      case 'yearly': {
        const monthlyData = new Map<string, CardioAmountChartPoint>();
        cardioExercises.forEach(ex => {
          const monthKey = format(ex.date, 'yyyy-MM');
          if (!monthlyData.has(monthKey)) {
            monthlyData.set(monthKey, { dateLabel: format(ex.date, 'MMM'), ...initialActivityData });
          }
          const monthData = monthlyData.get(monthKey);
          if (monthData) {
            const existingValue = Number(monthData[ex.name] ?? 0);
            monthData[ex.name] = existingValue + (ex.calories || 0);
          }
        });
        const finalizedData = processAndFinalizeData(monthlyData);
        cardioAmountChartData = finalizedData
          .filter(month => Object.values(month).some(val => typeof val === 'number' && val > 0))
          .sort((a, b) => {
            const monthOrder = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
            return monthOrder.indexOf(String(a.dateLabel)) - monthOrder.indexOf(String(b.dateLabel));
          });
        break;
      }
      case 'all-time': {
        const yearlyData = new Map<string, CardioAmountChartPoint>();
        cardioExercises.forEach(ex => {
          const yearKey = format(ex.date, 'yyyy');
          if (!yearlyData.has(yearKey)) {
            yearlyData.set(yearKey, { dateLabel: yearKey, ...initialActivityData });
          }
          const yearData = yearlyData.get(yearKey);
          if (yearData) {
            const existingValue = Number(yearData[ex.name] ?? 0);
            yearData[ex.name] = existingValue + (ex.calories || 0);
          }
        });
        const finalizedData = processAndFinalizeData(yearlyData);
        cardioAmountChartData = finalizedData.sort((a, b) =>
          String(a.dateLabel).localeCompare(String(b.dateLabel))
        );
        break;
      }
    }

    return { totalCalories, statsByActivity, pieChartData, calorieSummary, cardioAmountChartData };
  }, [timeRange, logsForPeriod, userProfile, workoutLogs]);
}
