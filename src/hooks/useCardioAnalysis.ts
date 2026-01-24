import { useMemo } from 'react';
import type { WorkoutLog, UserProfile } from '@/lib/types';
import { toTitleCase } from '@/lib/analysis.config';
import { calculateExerciseCalories } from '@/lib/calorie-calculator';
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
}

interface PieChartData {
  name: string;
  value: number;
  fill: string;
}

interface CardioAmountChartPoint {
  dateLabel: string;
  total: number;
  [key: string]: number | string;
}

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

    const cardioExercises = logsForPeriod.flatMap(log =>
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

    const totalCalories = cardioExercises.reduce((sum: number, ex: any) => sum + (ex.calories || 0), 0);

    const statsByActivity = cardioExercises.reduce(
      (acc: Record<string, CardioStats>, ex: any) => {
        if (!acc[ex.name]) {
          acc[ex.name] = { count: 0, totalDistanceMi: 0, totalDurationMin: 0, totalCalories: 0 };
        }
        const stats = acc[ex.name];
        stats.count++;
        stats.totalCalories += ex.calories || 0;

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
      value: Math.round((stats as any).totalCalories),
      fill: `var(--color-${name})`,
    }));

    let calorieSummary = '';
    const weeklyGoal = userProfile?.weeklyCardioCalorieGoal;
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
      const uniqueMonthsWithData = new Set(cardioExercises.map(ex => format(ex.date, 'yyyy-MM'))).size;
      const weeksWithData = uniqueMonthsWithData * 4.345;
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
    let cardioAmountChartData: any[] = [];
    const activities = Array.from(new Set(cardioExercises.map((ex: any) => ex.name)));
    const initialActivityData = Object.fromEntries(activities.map((act: string) => [act, 0]));

    const processAndFinalizeData = (dataMap: Map<string, any>) => {
      const finalizedData = Array.from(dataMap.values());
      finalizedData.forEach((dataPoint: any) => {
        let total = 0;
        activities.forEach((activity: string) => {
          total += dataPoint[activity] || 0;
        });
        dataPoint.total = Math.round(total);
      });
      return finalizedData;
    };

    switch (timeRange) {
      case 'weekly': {
        const weekStart = startOfWeek(today, { weekStartsOn: 0 });
        const weekEnd = endOfWeek(today, { weekStartsOn: 0 });
        const daysInWeek = Array.from({ length: 7 }, (_, i) => {
          const day = new Date(weekStart);
          day.setDate(day.getDate() + i);
          return day;
        });
        const dailyData = new Map<string, any>(
          daysInWeek.map((day: Date) => [
            format(day, 'yyyy-MM-dd'),
            { dateLabel: format(day, 'E'), ...initialActivityData },
          ])
        );

        cardioExercises.forEach((ex: any) => {
          const dateKey = format(ex.date, 'yyyy-MM-dd');
          const dayData = dailyData.get(dateKey);
          if (dayData) {
            dayData[ex.name] = (dayData[ex.name] || 0) + (ex.calories || 0);
          }
        });
        cardioAmountChartData = processAndFinalizeData(dailyData);
        break;
      }
      case 'monthly': {
        const monthStart = startOfMonth(today);
        const monthEnd = endOfMonth(today);
        const weeklyData = new Map<string, any>();

        const weeks = eachWeekOfInterval({ start: monthStart, end: monthEnd }, { weekStartsOn: 0 });

        weeks.forEach((weekStart: Date) => {
          const weekEnd = endOfWeek(weekStart, { weekStartsOn: 0 });
          if (weekStart.getMonth() === monthStart.getMonth() || weekEnd.getMonth() === monthStart.getMonth()) {
            const dateLabel = `${format(weekStart, 'MMM d')}-${format(weekEnd, 'd')}`;
            weeklyData.set(format(weekStart, 'yyyy-MM-dd'), { dateLabel, ...initialActivityData });
          }
        });

        cardioExercises.forEach((ex: any) => {
          const weekStartKey = format(startOfWeek(ex.date, { weekStartsOn: 0 }), 'yyyy-MM-dd');
          const weekData = weeklyData.get(weekStartKey);
          if (weekData) {
            weekData[ex.name] = (weekData[ex.name] || 0) + (ex.calories || 0);
          }
        });
        cardioAmountChartData = processAndFinalizeData(weeklyData);
        break;
      }
      case 'yearly': {
        const monthlyData = new Map<string, any>();
        cardioExercises.forEach((ex: any) => {
          const monthKey = format(ex.date, 'yyyy-MM');
          if (!monthlyData.has(monthKey)) {
            monthlyData.set(monthKey, { dateLabel: format(ex.date, 'MMM'), ...initialActivityData });
          }
          const monthData = monthlyData.get(monthKey);
          monthData[ex.name] = (monthData[ex.name] || 0) + (ex.calories || 0);
        });
        const finalizedData = processAndFinalizeData(monthlyData);
        cardioAmountChartData = finalizedData
          .filter((month: any) => Object.values(month).some((val: any) => typeof val === 'number' && val > 0))
          .sort((a: any, b: any) => {
            const monthOrder = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
            return monthOrder.indexOf(a.dateLabel) - monthOrder.indexOf(b.dateLabel);
          });
        break;
      }
      case 'all-time': {
        const yearlyData = new Map<string, any>();
        cardioExercises.forEach((ex: any) => {
          const yearKey = format(ex.date, 'yyyy');
          if (!yearlyData.has(yearKey)) {
            yearlyData.set(yearKey, { dateLabel: yearKey, ...initialActivityData });
          }
          const yearData = yearlyData.get(yearKey);
          yearData[ex.name] = (yearData[ex.name] || 0) + (ex.calories || 0);
        });
        const finalizedData = processAndFinalizeData(yearlyData);
        cardioAmountChartData = Array.from(finalizedData.entries())
          .sort(([, a]: [any, any], [, b]: [any, any]) => a.dateLabel.localeCompare(b.dateLabel))
          .map(([, data]: [any, any]) => data);
        break;
      }
    }

    return { totalCalories, statsByActivity, pieChartData, calorieSummary, cardioAmountChartData };
  }, [timeRange, logsForPeriod, userProfile, workoutLogs]);
}
