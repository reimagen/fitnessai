import { format, subWeeks } from "date-fns";
import type {
  PersonalRecord,
  StrengthImbalanceOutput,
  UserProfile,
  WorkoutLog,
} from "@/lib/types";
import { getNormalizedExerciseName, getStrengthLevel } from "@/lib/strength-standards";
import { calculateWeeklyCardioSummaries } from "./cardio";
import { FOUR_WEEKS, FT_TO_INCHES, INCH_TO_CM, LBS_TO_KG } from "@/lib/constants";
import { toTitleCase } from "@/lib/utils";

const formatHeight = (userProfile: UserProfile) => {
  if (!userProfile.heightValue || !userProfile.heightUnit) return "Not specified";
  if (userProfile.heightUnit === "cm") return `${userProfile.heightValue.toFixed(1)} cm`;

  const totalInches = userProfile.heightValue / INCH_TO_CM;
  const feet = Math.floor(totalInches / FT_TO_INCHES);
  const inches = Math.round(totalInches % FT_TO_INCHES);
  return `${feet} ft ${inches} in`;
};

const getBestPersonalRecords = (personalRecords: PersonalRecord[]) => {
  const bestRecordsMap = new Map<string, PersonalRecord>();

  personalRecords.forEach((pr) => {
    const key = pr.exerciseName.trim().toLowerCase();
    const existing = bestRecordsMap.get(key);
    const prWeightKg = pr.weightUnit === "lbs" ? pr.weight * LBS_TO_KG : pr.weight;

    if (!existing) {
      bestRecordsMap.set(key, pr);
      return;
    }

    const existingWeightKg =
      existing.weightUnit === "lbs" ? existing.weight * LBS_TO_KG : existing.weight;
    if (prWeightKg > existingWeightKg) {
      bestRecordsMap.set(key, pr);
    }
  });

  return Array.from(bestRecordsMap.values());
};

const buildUserMetricsSection = (userProfile: UserProfile) => [
  "User Profile Context for AI Workout Plan Generation:",
  `User ID: ${userProfile.id}`,
  `Age: ${userProfile.age || "Not specified"}`,
  `Gender: ${userProfile.gender || "Not specified"}`,
  `Height: ${formatHeight(userProfile)}`,
  userProfile.weightValue && userProfile.weightUnit
    ? `Weight: ${userProfile.weightValue} ${userProfile.weightUnit}`
    : "Weight: Not specified",
  userProfile.skeletalMuscleMassValue && userProfile.skeletalMuscleMassUnit
    ? `Skeletal Muscle Mass: ${userProfile.skeletalMuscleMassValue} ${userProfile.skeletalMuscleMassUnit}`
    : "Skeletal Muscle Mass: Not specified",
  userProfile.bodyFatPercentage
    ? `Body Fat Percentage: ${userProfile.bodyFatPercentage.toFixed(1)}%`
    : "Body Fat Percentage: Not specified",
];

const buildGoalsSection = (userProfile: UserProfile) => {
  const lines = ["Fitness Goals:"];
  const activeGoals = (userProfile.fitnessGoals || []).filter((goal) => !goal.achieved);

  if (activeGoals.length === 0) {
    lines.push("- No active goals listed.");
    return lines;
  }

  const primaryGoal = activeGoals.find((goal) => goal.isPrimary);
  if (primaryGoal) {
    lines.push(
      `- Primary Goal: ${primaryGoal.description}${
        primaryGoal.targetDate ? ` (Target: ${format(primaryGoal.targetDate, "yyyy-MM-dd")})` : ""
      }`
    );
  }

  activeGoals
    .filter((goal) => !goal.isPrimary)
    .forEach((goal) => {
      lines.push(
        `- Other Goal: ${goal.description}${
          goal.targetDate ? ` (Target: ${format(goal.targetDate, "yyyy-MM-dd")})` : ""
        }`
      );
    });

  return lines;
};

const buildWorkoutPreferencesSection = (userProfile: UserProfile) => {
  const lines = ["Workout Preferences:"];

  lines.push(`- Workouts Per Week: ${userProfile.workoutsPerWeek || "Not specified"}`);
  lines.push(
    `- Preferred Session Time: ${
      userProfile.sessionTimeMinutes ? `${userProfile.sessionTimeMinutes} minutes` : "Not specified"
    }`
  );
  lines.push(`- Experience Level: ${userProfile.experienceLevel || "Not specified"}`);

  if (userProfile.weeklyCardioCalorieGoal) {
    lines.push(`- Weekly Cardio Goal: ${userProfile.weeklyCardioCalorieGoal.toLocaleString()} kcal`);
  }
  if (userProfile.aiPreferencesNotes) {
    lines.push(`- Additional Notes for AI: ${userProfile.aiPreferencesNotes}`);
  }

  return lines;
};

const buildWorkoutHistorySection = (workoutLogs: WorkoutLog[]) => {
  const lines = ["Workout History Summary:"];
  const today = new Date();
  const fourWeeksAgo = subWeeks(today, FOUR_WEEKS);
  const recentLogs = workoutLogs.filter((log) => log.date >= fourWeeksAgo);

  if (recentLogs.length === 0) {
    lines.push(`- No workout history logged in the last ${FOUR_WEEKS} weeks.`);
    return lines;
  }

  lines.push(`- Logged ${recentLogs.length} workouts in the last ${FOUR_WEEKS} weeks.`);

  const exerciseCounts: Record<string, number> = {};
  recentLogs.forEach((log) => {
    log.exercises.forEach((ex) => {
      const normalizedName = getNormalizedExerciseName(ex.name);
      if (normalizedName) {
        exerciseCounts[normalizedName] = (exerciseCounts[normalizedName] || 0) + 1;
      }
    });
  });

  const sortedExercises = Object.entries(exerciseCounts).sort((a, b) => b[1] - a[1]);
  if (sortedExercises.length > 0) {
    const exerciseSummary = sortedExercises
      .map(([name, count]) => `${toTitleCase(name)} (${count}x)`)
      .join(", ");
    lines.push(`- Frequency per Exercise: ${exerciseSummary}`);
  } else {
    lines.push("- No specific exercises found in recent history.");
  }

  return lines;
};

const buildCardioSummarySection = (workoutLogs: WorkoutLog[], userProfile: UserProfile) => {
  const cardioSummary = calculateWeeklyCardioSummaries(workoutLogs, userProfile);
  if (!cardioSummary) return [];

  const lines = [
    "Weekly Cardio Summary (Last 4 Fully Completed Weeks):",
    `- Weekly Goal: ${cardioSummary.weeklyGoal.toLocaleString()} kcal`,
  ];

  if (cardioSummary.totalCalories > 0) {
    lines.push(
      ...cardioSummary.summaries.map(
        (summary) => `${summary.label}: ${Math.round(summary.calories).toLocaleString()} kcal`
      )
    );
  } else {
    lines.push("No cardio logged in the last 4 completed weeks.");
  }

  return lines;
};

const buildStrengthAnalysisSection = (strengthAnalysis?: StrengthImbalanceOutput) => {
  const lines = ["Strength Balance Analysis Summary:"];

  if (!strengthAnalysis) {
    lines.push("- No strength analysis has been performed yet.");
    return lines;
  }

  lines.push(`- Overall Summary: ${strengthAnalysis.summary}`);
  if (strengthAnalysis.findings.length > 0) {
    strengthAnalysis.findings.forEach((finding) => {
      lines.push(
        `- Finding: ${finding.imbalanceType} (${finding.imbalanceFocus}). Recommendation: ${finding.recommendation}`
      );
    });
  } else {
    lines.push("- No specific imbalances found. Your strength appears well-balanced.");
  }

  return lines;
};

const buildPersonalRecordsSection = (personalRecords: PersonalRecord[], userProfile: UserProfile) => {
  const lines = ["Personal Records & Strength Levels:"];

  if (personalRecords.length === 0) {
    lines.push("- No personal records logged yet.");
    return lines;
  }

  const bestRecords = getBestPersonalRecords(personalRecords);
  if (bestRecords.length === 0) {
    lines.push("- No personal records with weight logged yet.");
    return lines;
  }

  bestRecords.forEach((pr) => {
    const level = getStrengthLevel(pr, userProfile);
    lines.push(`- ${pr.exerciseName}: ${pr.weight} ${pr.weightUnit} (Level: ${level})`);
  });

  return lines;
};

const appendSection = (lines: string[], section: string[]) => {
  if (section.length === 0) return;
  if (lines.length > 0) lines.push("");
  lines.push(...section);
};

export const constructUserProfileContext = (
  userProfile: UserProfile | null,
  workoutLogs: WorkoutLog[],
  personalRecords: PersonalRecord[],
  strengthAnalysis: StrengthImbalanceOutput | undefined
) => {
  if (!userProfile) return null;

  const lines: string[] = [];

  appendSection(lines, buildUserMetricsSection(userProfile));
  appendSection(lines, buildGoalsSection(userProfile));
  appendSection(lines, buildWorkoutPreferencesSection(userProfile));
  appendSection(lines, buildWorkoutHistorySection(workoutLogs));
  appendSection(lines, buildCardioSummarySection(workoutLogs, userProfile));
  appendSection(lines, buildStrengthAnalysisSection(strengthAnalysis));
  appendSection(lines, buildPersonalRecordsSection(personalRecords, userProfile));

  return lines.join("\n");
};
