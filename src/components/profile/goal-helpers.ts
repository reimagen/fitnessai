import { z } from "zod";
import type { FitnessGoal, PersonalRecord, UserProfile, WorkoutLog } from "@/lib/types";
import { format as formatDate, isValid, subMonths } from "date-fns";

export const goalSchema = z.object({
  id: z.string().optional(),
  description: z.string().min(5, "Goal description must be at least 5 characters."),
  targetDate: z.string().min(1, "Target date is required."),
  dateAchieved: z.string().optional(),
  achieved: z.boolean().default(false),
  isPrimary: z.boolean().default(false),
});

export const goalsFormSchema = z.object({
  goals: z.array(goalSchema),
});

export type GoalsFormValues = z.infer<typeof goalsFormSchema>;

// Helper to create initial form values from initialGoals prop
export const createFormValues = (goalsProp: FitnessGoal[] | undefined) => {
  if (!Array.isArray(goalsProp) || goalsProp.length === 0) return { goals: [] };

  const sortedGoals = [...goalsProp].sort((a, b) => {
    // Primary goal always on top
    if (a.isPrimary) return -1;
    if (b.isPrimary) return 1;
    // Active goals before achieved goals
    if (!a.achieved && b.achieved) return -1;
    if (a.achieved && !b.achieved) return 1;
    // Fallback to maintain a stable order (e.g., by date) if needed, but 0 is fine
    return 0;
  });

  return {
    goals: sortedGoals.map(g => {
      const toInputDate = (date: Date | undefined) => {
        if (!date) return "";
        const dateObj = date instanceof Date ? date : new Date(date);
        return isValid(dateObj) ? formatDate(dateObj, "yyyy-MM-dd") : "";
      };

      return {
        id: g.id,
        description: g.description,
        targetDate: toInputDate(g.targetDate),
        dateAchieved: toInputDate(g.dateAchieved),
        achieved: g.achieved || false,
        isPrimary: g.isPrimary || false,
      };
    }),
  };
};

// --- Helper functions for generating performance context ---
const GOAL_TO_PR_MAP: Record<string, string[]> = {
  "pull-up": ["lat pulldown"],
  "bench press": ["bench press", "chest press"],
  squat: ["squat", "leg press"],
  deadlift: ["deadlift"],
  "overhead press": ["overhead press", "shoulder press"],
  "leg press": ["leg press", "squat"],
};

const findBestPrForGoal = (goalDesc: string, records: PersonalRecord[]): string | null => {
  const lowerGoal = goalDesc.toLowerCase();
  for (const keyword in GOAL_TO_PR_MAP) {
    if (lowerGoal.includes(keyword)) {
      const relevantPrs = records.filter(pr => GOAL_TO_PR_MAP[keyword].includes(pr.exerciseName.toLowerCase()));
      if (relevantPrs.length > 0) {
        const bestPr = relevantPrs.reduce((best, current) => {
          const bestWeightKg = best.weightUnit === "lbs" ? best.weight * 0.453592 : best.weight;
          const currentWeightKg = current.weightUnit === "lbs" ? current.weight * 0.453592 : current.weight;
          return currentWeightKg > bestWeightKg ? current : best;
        });
        return `User has a relevant PR for ${bestPr.exerciseName} of ${bestPr.weight} ${bestPr.weightUnit}.`;
      }
    }
  }
  return null;
};

const summarizeWorkoutHistoryForGoal = (goalDesc: string, logs: WorkoutLog[]): string | null => {
  const lowerGoal = goalDesc.toLowerCase();
  // The logs are already pre-filtered for the last 4 weeks.
  const recentLogs = logs;

  if (lowerGoal.includes("run") || lowerGoal.includes("running")) {
    const runs = recentLogs.flatMap(log =>
      log.exercises.filter(ex => ex.category === "Cardio" && ex.name.toLowerCase().includes("run")),
    );
    if (runs.length > 0) {
      const totalDistance = runs.reduce((sum, run) => {
        let distMi = run.distance || 0;
        if (run.distanceUnit === "km") distMi *= 0.621371;
        else if (run.distanceUnit === "ft") distMi *= 0.000189394;
        return sum + distMi;
      }, 0);
      const avgDistance = totalDistance / runs.length;
      const maxDistance = Math.max(
        ...runs.map(run => {
          let distMi = run.distance || 0;
          if (run.distanceUnit === "km") distMi *= 0.621371;
          else if (run.distanceUnit === "ft") distMi *= 0.000189394;
          return distMi;
        }),
      );
      return `Recent Running Summary (last 4 weeks): ${runs.length} sessions, average distance ${avgDistance.toFixed(1)} miles, max distance ${maxDistance.toFixed(1)} miles.`;
    }
  }
  // Add more summaries for other activities like 'cycling', etc. here if needed.
  return null;
};

export const constructUserProfileContext = (
  userProfile: UserProfile,
  recentWorkoutLogs: WorkoutLog[], // Now expects only recent logs
  personalRecords: PersonalRecord[],
): string => {
  let context = "User Profile Context for AI Goal Analysis:\n";
  context += `Age: ${userProfile.age || "Not Provided"}\n`;
  context += `Gender: ${userProfile.gender || "Not Provided"}\n`;
  context += `Weight: ${userProfile.weightValue || "Not Provided"} ${userProfile.weightUnit || ""}\n`.trim() + "\n";
  context += `Experience Level: ${userProfile.experienceLevel || "Not Provided"}\n`;
  if (userProfile.bodyFatPercentage) {
    context += `Body Fat: ${userProfile.bodyFatPercentage.toFixed(1)}%\n`;
  }

  context += "\n--- User's Goals & Performance Data ---\n";
  const activeGoals = (userProfile.fitnessGoals || []).filter(g => !g.achieved);
  if (activeGoals.length > 0) {
    activeGoals.forEach(goal => {
      context += `Goal: ${goal.isPrimary ? "**Primary** " : ""}${goal.description}\n`;
      const relevantPr = findBestPrForGoal(goal.description, personalRecords);
      if (relevantPr) {
        context += `  - Performance Context: ${relevantPr}\n`;
      }
      const historySummary = summarizeWorkoutHistoryForGoal(goal.description, recentWorkoutLogs);
      if (historySummary) {
        context += `  - Performance Context: ${historySummary}\n`;
      }
    });
  } else {
    context += "- No active goals listed.\n";
  }

  const oneMonthAgo = subMonths(new Date(), 1);
  const recentAchievedGoals = (userProfile.fitnessGoals || []).filter(
    g => g.achieved && g.dateAchieved && g.dateAchieved >= oneMonthAgo,
  );

  context += "\n--- Recently Achieved Goals (Last 30 Days) ---\n";
  if (recentAchievedGoals.length > 0) {
    recentAchievedGoals.forEach(goal => {
      context += `- ${goal.description} (Achieved on: ${formatDate(goal.dateAchieved!, "yyyy-MM-dd")})\n`;
    });
  } else {
    context += "- No relevant goals achieved in the last 30 days.\n";
  }

  return context;
};
