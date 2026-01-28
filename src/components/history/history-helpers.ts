import type { Exercise, WorkoutLog } from "@/lib/types";
import type { ParseWorkoutScreenshotOutput } from "@/ai/flows/screenshot-workout-parser";
import { startOfDay } from "date-fns/startOfDay";
import { format } from "date-fns/format";
import { getNormalizedExerciseName } from "@/lib/strength-standards";
import { calculateExerciseCalories } from "@/lib/calorie-calculator";
import type { UserProfile } from "@/lib/types";

export const buildParsedExercises = (parsedData: ParseWorkoutScreenshotOutput): Exercise[] => {
  return parsedData.exercises.map((ex) => {
    const exercise: Exercise = {
      id: Math.random().toString(36).substring(2, 9),
      name: getNormalizedExerciseName(ex.name),
      sets: ex.sets ?? 0,
      reps: ex.reps ?? 0,
      weight: ex.weight ?? 0,
      category: ex.category,
      distance: ex.distance ?? 0,
      duration: ex.duration ?? 0,
      calories: ex.calories ?? 0,
    };

    if (exercise.weight > 0) {
      exercise.weightUnit = ex.weightUnit || "kg";
    }
    if ((exercise.distance ?? 0) > 0) {
      exercise.distanceUnit = ex.distanceUnit || "mi";
    }
    if ((exercise.duration ?? 0) > 0) {
      exercise.durationUnit = ex.durationUnit || "min";
    }
    return exercise;
  });
};

export const findExistingLogForDate = (workoutLogs: WorkoutLog[] | undefined, targetDate: Date) => {
  return workoutLogs?.find(
    (log) => format(log.date, "yyyy-MM-dd") === format(targetDate, "yyyy-MM-dd"),
  );
};

export const getParsedTargetDate = (workoutDate: string) => {
  return startOfDay(new Date(workoutDate.replace(/-/g, "/")));
};

export const mergeParsedExercises = (existingLog: WorkoutLog, parsedExercises: Exercise[]) => {
  const existingExerciseNames = new Set(existingLog.exercises.map((ex) => ex.name.trim().toLowerCase()));
  let addedCount = 0;
  const newExercises = [...existingLog.exercises];

  parsedExercises.forEach((newEx) => {
    if (!existingExerciseNames.has(newEx.name.trim().toLowerCase())) {
      newExercises.push(newEx);
      addedCount++;
    }
  });

  const updatedLog: Omit<WorkoutLog, "id" | "userId"> = { ...existingLog, exercises: newExercises };
  return { updatedLog, addedCount };
};

export const buildWorkoutLogPayload = (
  data: Omit<WorkoutLog, "id" | "userId">,
  userProfile: UserProfile | null | undefined,
  workoutLogs: WorkoutLog[] | undefined,
) => {
  return {
    ...data,
    exercises: data.exercises.map((ex) => {
      const calculatedCalories = userProfile ? calculateExerciseCalories(ex, userProfile, workoutLogs || []) : 0;
      return { ...ex, calories: ex.calories && ex.calories > 0 ? ex.calories : calculatedCalories };
    }),
  };
};
