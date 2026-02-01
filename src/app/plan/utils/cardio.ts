import { isWithinInterval, startOfWeek, subDays, subWeeks } from "date-fns";
import type { UserProfile, WorkoutLog } from "@/lib/types";
import { calculateRecentWeeklyCardioAverage, resolveWeeklyCardioGoal } from "@/lib/cardio-target-calculator";
import { FOUR_WEEKS } from "@/lib/constants";

export type WeeklyCardioSummary = { label: string; calories: number };

export const calculateWeeklyCardioSummaries = (
  workoutLogs: WorkoutLog[],
  userProfile: UserProfile,
  today = new Date()
) => {
  const recentWeeklyAverage = calculateRecentWeeklyCardioAverage(workoutLogs) ?? undefined;
  const weeklyGoal = resolveWeeklyCardioGoal(userProfile, { recentWeeklyAverage });
  if (!weeklyGoal) return null;

  const startOfThisWeek = startOfWeek(today, { weekStartsOn: 0 });
  const endOfLastCompletedWeek = subDays(startOfThisWeek, 1);

  const summaries: WeeklyCardioSummary[] = [];
  let totalCalories = 0;

  for (let i = 0; i < FOUR_WEEKS; i++) {
    const weekEndDate = subWeeks(endOfLastCompletedWeek, i);
    const weekStartDate = startOfWeek(weekEndDate, { weekStartsOn: 0 });

    const logsThisWeek = workoutLogs.filter((log) =>
      isWithinInterval(log.date, { start: weekStartDate, end: weekEndDate })
    );

    const weeklyTotalCalories = logsThisWeek.reduce((sum, log) => {
      return (
        sum +
        log.exercises
          .filter((ex) => ex.category === "Cardio" && ex.calories)
          .reduce((exSum, ex) => exSum + (ex.calories || 0), 0)
      );
    }, 0);

    totalCalories += weeklyTotalCalories;
    const weekLabel = i === 0 ? "Week 1 (most recent)" : `Week ${i + 1}`;
    summaries.push({ label: weekLabel, calories: weeklyTotalCalories });
  }

  return {
    summaries,
    totalCalories,
    weeklyGoal,
  };
};
