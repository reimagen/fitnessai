import type { FitnessGoal } from "@/lib/types";
import { isPast, startOfToday } from "date-fns";

/**
 * Filters goals that have lapsed (targetDate is in the past and not achieved)
 */
export function getLapsedGoals(goals: FitnessGoal[]): FitnessGoal[] {
  if (!Array.isArray(goals)) {
    return [];
  }

  const today = startOfToday();

  return goals.filter((goal) => {
    // Skip if no target date
    if (!goal.targetDate) {
      return false;
    }

    // Skip if already achieved
    if (goal.achieved) {
      return false;
    }

    // Check if target date is in the past
    const targetDate = goal.targetDate instanceof Date ? goal.targetDate : new Date(goal.targetDate);
    return isPast(targetDate) && targetDate < today;
  });
}

/**
 * Sorts goals by urgency (oldest deadline first)
 */
export function sortGoalsByUrgency(goals: FitnessGoal[]): FitnessGoal[] {
  return [...goals].sort((a, b) => {
    const dateA = a.targetDate instanceof Date ? a.targetDate : new Date(a.targetDate);
    const dateB = b.targetDate instanceof Date ? b.targetDate : new Date(b.targetDate);
    return dateA.getTime() - dateB.getTime();
  });
}
