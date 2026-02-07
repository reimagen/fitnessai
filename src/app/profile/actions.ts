
'use server';

import { z } from 'zod';
import { revalidateTag } from 'next/cache';
import { getUserProfile as getUserProfileFromServer, updateUserProfile as updateUserProfileFromServer, incrementUsageCounter, getGoalAnalysis, saveGoalAnalysis, getLiftProgressionAnalysis, saveLiftProgressionAnalysis, getFitnessGoals, saveFitnessGoals} from "@/lib/firestore-server";
import { analyzeLiftProgression as analyzeLiftProgressionFlow, type AnalyzeLiftProgressionInput, type AnalyzeLiftProgressionOutput } from "@/ai/flows/lift-progression-analyzer";
import { analyzeFitnessGoals as analyzeFitnessGoalsFlow, type AnalyzeFitnessGoalsInput, type AnalyzeFitnessGoalsOutput } from "@/ai/flows/goal-analyzer";
import { logger } from "@/lib/logging/logger";
import { createRequestContext } from "@/lib/logging/request-context";
import { withServerActionLogging } from "@/lib/logging/server-action-wrapper";
import { classifyAIError } from "@/lib/logging/error-classifier";
import type {
  FitnessGoal,
  UserProfile,
  StoredLiftProgressionAnalysis,
  StoredGoalAnalysis,
} from "@/lib/types";
import { getNormalizedExerciseName } from "@/lib/strength-standards.server";
import { checkRateLimit } from "@/app/prs/rate-limiting";

// Zod schemas for input validation
const FitnessGoalSchema: z.ZodType<FitnessGoal, z.ZodTypeDef, unknown> = z.object({
  id: z.string().min(1, "Goal ID is required"),
  description: z.string().min(1, "Goal description is required"),
  targetDate: z.union([z.date(), z.string().datetime()]).transform(d => new Date(d)),
  achieved: z.boolean(),
  dateAchieved: z.union([z.date(), z.string().datetime()]).transform(d => new Date(d)).optional(),
  isPrimary: z.boolean().optional(),
});

const UpdateUserProfileSchema = z.object({
  name: z.string().optional(),
  email: z.string().email().optional(),
  age: z.number().positive().optional(),
  gender: z.enum(['male', 'female', 'other']).optional(),
  weightValue: z.number().positive().optional(),
  weightUnit: z.enum(['lbs', 'kg']).optional(),
  skeletalMuscleMassValue: z.number().positive().optional(),
  skeletalMuscleMassUnit: z.enum(['lbs', 'kg']).optional(),
  fitnessGoals: z.array(FitnessGoalSchema).optional(),
}).passthrough();

const AnalyzeLiftProgressionInputSchema: z.ZodType<AnalyzeLiftProgressionInput> = z.object({
  exerciseName: z.string().min(1, "Exercise name is required"),
  exerciseHistory: z.array(
    z.object({
      date: z.string().min(1, "Date is required"),
      weight: z.number(),
      sets: z.number(),
      reps: z.number(),
    })
  ),
  userProfile: z.object({
    age: z.number().optional(),
    gender: z.string().optional(),
    heightValue: z.number().optional(),
    heightUnit: z.enum(["cm", "ft/in"]).optional(),
    weightValue: z.number().optional(),
    weightUnit: z.enum(["kg", "lbs"]).optional(),
    skeletalMuscleMassValue: z.number().optional(),
    skeletalMuscleMassUnit: z.enum(["kg", "lbs"]).optional(),
    fitnessGoals: z
      .array(
        z.object({
          description: z.string(),
          isPrimary: z.boolean().optional(),
        })
      )
      .optional(),
  }),
  currentLevel: z.enum(["Beginner", "Intermediate", "Advanced", "Elite", "N/A"]).optional(),
  trendPercentage: z.number().optional(),
  volumeTrendPercentage: z.number().optional(),
});

const AnalyzeFitnessGoalsInputSchema = z.object({
  userProfileContext: z.string().min(1, "User profile context is required"),
});


// Server Actions must be explicitly defined as async functions in this file.
// They then call the server-only logic from other files.

export async function getUserProfile(userId: string): Promise<UserProfile | null> {
  const context = createRequestContext({
    userId,
    route: "profile/getUserProfile",
    feature: "profile",
  });

  return withServerActionLogging(context, async () => {
    if (!userId) {
      throw new Error("User not authenticated.");
    }
    return getUserProfileFromServer(userId);
  });
}

export async function updateUserProfile(userId: string, data: Partial<Omit<UserProfile, 'id'>>): Promise<void> {
  const context = createRequestContext({
    userId,
    route: "profile/updateUserProfile",
    feature: "profile",
  });

  return withServerActionLogging(context, async () => {
    // Validate input schema
    const validatedData = UpdateUserProfileSchema.safeParse(data);
    if (!validatedData.success) {
      throw new Error(`Invalid profile data: ${validatedData.error.message}`);
    }

    if (!userId) {
      throw new Error("User not authenticated.");
    }
    await updateUserProfileFromServer(userId, validatedData.data);

    // Invalidate server-side cache so next request fetches fresh data
    revalidateTag(`user-profile-${userId}`, "max");
  });
}

export async function analyzeLiftProgressionAction(
  userId: string,
  values: AnalyzeLiftProgressionInput
): Promise<{ success: boolean; data?: AnalyzeLiftProgressionOutput; error?: string }> {
  const context = createRequestContext({
    userId,
    route: "profile/analyzeLiftProgressionAction",
    feature: "liftProgressionAnalyses",
  });

  return withServerActionLogging(context, async () => {
    // Validate input schema
    const validatedInput = AnalyzeLiftProgressionInputSchema.safeParse(values);
    if (!validatedInput.success) {
      return { success: false, error: `Invalid input: ${validatedInput.error.message}` };
    }

    if (!process.env.GEMINI_API_KEY && !process.env.GOOGLE_API_KEY) {
      const errorMessage = "The Gemini API Key is missing from your environment configuration. Please add either GEMINI_API_KEY or GOOGLE_API_KEY to your .env.local file. You can obtain a key from Google AI Studio.";
      await logger.error("Missing API Key", { ...context, error: errorMessage });
      return { success: false, error: errorMessage };
    }
    if (!userId) {
      return { success: false, error: "User not authenticated." };
    }

    // Bypass limit check in development environment
    if (process.env.NODE_ENV !== 'development') {
      const { allowed, error } = await checkRateLimit(userId, "liftProgressionAnalyses");
      if (!allowed) {
        return { success: false, error };
      }
    }

    try {
      const analysisData = await analyzeLiftProgressionFlow(validatedInput.data);

      const storedAnalysis: StoredLiftProgressionAnalysis = {
        result: analysisData,
        generatedDate: new Date(),
      };

      const exerciseKey = await getNormalizedExerciseName(values.exerciseName);

      // Save analysis to subcollection
      await saveLiftProgressionAnalysis(userId, exerciseKey, storedAnalysis);

      await logger.info("Lift progression analysis saved successfully", {
        ...context,
        exerciseKey,
      });

      // Increment usage counter on success
      await incrementUsageCounter(userId, 'liftProgressionAnalyses');

      // Invalidate server-side cache
      revalidateTag(`user-profile-${userId}`, "max");

      return { success: true, data: analysisData };
    } catch (error) {
      const classified = classifyAIError(error);
      await logger.error("Error analyzing lift progression", {
        ...context,
        errorType: classified.category,
        statusCode: classified.statusCode,
      });

      // Don't count against limit if it's a service error
      if (!classified.shouldCountAgainstLimit) {
        await logger.info("Skipping usage counter increment due to service error", {
          ...context,
          errorType: classified.category,
        });
      }

      return { success: false, error: classified.userMessage };
    }
  });
}


export async function analyzeGoalsAction(
  userId: string,
  values: AnalyzeFitnessGoalsInput
): Promise<{ success: boolean; data?: AnalyzeFitnessGoalsOutput; error?: string }> {
  const context = createRequestContext({
    userId,
    route: "profile/analyzeGoalsAction",
    feature: "goalAnalyses",
  });

  return withServerActionLogging(context, async () => {
    // Validate input schema
    const validatedInput = AnalyzeFitnessGoalsInputSchema.safeParse(values);
    if (!validatedInput.success) {
      return { success: false, error: `Invalid input: ${validatedInput.error.message}` };
    }

    if (!process.env.GEMINI_API_KEY && !process.env.GOOGLE_API_KEY) {
      const errorMessage = "The Gemini API Key is missing from your environment configuration. Please add either GEMINI_API_KEY or GOOGLE_API_KEY to your .env.local file. You can obtain a key from Google AI Studio.";
      await logger.error("Missing API Key", { ...context, error: errorMessage });
      return { success: false, error: errorMessage };
    }
    if (!userId) {
      return { success: false, error: "User not authenticated." };
    }

    // Bypass limit check in development environment
    if (process.env.NODE_ENV !== 'development') {
      const { allowed, error } = await checkRateLimit(userId, "goalAnalyses");
      if (!allowed) {
        return { success: false, error };
      }
    }

    try {
      const analysisData = await analyzeFitnessGoalsFlow(validatedInput.data);

      const storedAnalysis: StoredGoalAnalysis = {
        result: analysisData,
        generatedDate: new Date(),
      };

      // Save analysis to subcollection
      await saveGoalAnalysis(userId, storedAnalysis);

      await incrementUsageCounter(userId, 'goalAnalyses');

      // Invalidate server-side cache
      revalidateTag(`user-profile-${userId}`, "max");

      return { success: true, data: analysisData };
    } catch (error) {
      const classified = classifyAIError(error);
      await logger.error("Error analyzing fitness goals", {
        ...context,
        errorType: classified.category,
        statusCode: classified.statusCode,
      });

      // Don't count against limit if it's a service error
      if (!classified.shouldCountAgainstLimit) {
        await logger.info("Skipping usage counter increment due to service error", {
          ...context,
          errorType: classified.category,
        });
      }

      return { success: false, error: classified.userMessage };
    }
  });
}

const SaveGoalAnalysisSchema = z.object({
  result: z.any(),
  generatedDate: z.union([z.date(), z.string().datetime()]).transform(d => new Date(d)),
});

export async function getGoalAnalysisAction(
  userId: string
): Promise<{ success: boolean; data?: StoredGoalAnalysis; error?: string }> {
  const context = createRequestContext({
    userId,
    route: "profile/getGoalAnalysisAction",
    feature: "goalAnalyses",
  });

  return withServerActionLogging(context, async () => {
    if (!userId) {
      return { success: false, error: "User not authenticated." };
    }

    try {
      const analysis = await getGoalAnalysis(userId, { enableLazyBackfill: true });
      return { success: true, data: analysis || undefined };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "Failed to fetch goal analysis"
      };
    }
  });
}

export async function saveGoalAnalysisAction(
  userId: string,
  analysisData: StoredGoalAnalysis
): Promise<{ success: boolean; error?: string }> {
  const context = createRequestContext({
    userId,
    route: "profile/saveGoalAnalysisAction",
    feature: "goalAnalyses",
  });

  return withServerActionLogging(context, async () => {
    const validatedData = SaveGoalAnalysisSchema.safeParse(analysisData);
    if (!validatedData.success) {
      return {
        success: false,
        error: `Invalid analysis data: ${validatedData.error.message}`
      };
    }

    if (!userId) {
      return { success: false, error: "User not authenticated." };
    }

    try {
      await saveGoalAnalysis(userId, validatedData.data as StoredGoalAnalysis);
      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "Failed to save goal analysis"
      };
    }
  });
}

const SaveLiftProgressionAnalysisSchema = z.object({
  result: z.any(),
  generatedDate: z.union([z.date(), z.string().datetime()]).transform(d => new Date(d)),
});

export async function getLiftProgressionAnalysisAction(
  userId: string,
  exerciseName: string
): Promise<{ success: boolean; data?: StoredLiftProgressionAnalysis; error?: string }> {
  const context = createRequestContext({
    userId,
    route: "profile/getLiftProgressionAnalysisAction",
    feature: "liftProgressionAnalyses",
  });

  return withServerActionLogging(context, async () => {
    if (!userId) {
      return { success: false, error: "User not authenticated." };
    }

    try {
      const analysis = await getLiftProgressionAnalysis(userId, exerciseName, { enableLazyBackfill: true });
      return { success: true, data: analysis || undefined };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "Failed to fetch lift progression analysis"
      };
    }
  });
}

export async function saveLiftProgressionAnalysisAction(
  userId: string,
  exerciseName: string,
  analysisData: StoredLiftProgressionAnalysis
): Promise<{ success: boolean; error?: string }> {
  const context = createRequestContext({
    userId,
    route: "profile/saveLiftProgressionAnalysisAction",
    feature: "liftProgressionAnalyses",
  });

  return withServerActionLogging(context, async () => {
    const validatedData = SaveLiftProgressionAnalysisSchema.safeParse(analysisData);
    if (!validatedData.success) {
      return {
        success: false,
        error: `Invalid analysis data: ${validatedData.error.message}`
      };
    }

    if (!userId) {
      return { success: false, error: "User not authenticated." };
    }

    try {
      await saveLiftProgressionAnalysis(userId, exerciseName, validatedData.data as StoredLiftProgressionAnalysis);
      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "Failed to save lift progression analysis"
      };
    }
  });
}

const SaveGoalsSchema = z.array(z.object({
  id: z.string(),
  description: z.string(),
  targetDate: z.union([z.date(), z.string().datetime()]).transform(d => new Date(d)),
  achieved: z.boolean(),
  dateAchieved: z.union([z.date(), z.string().datetime(), z.null(), z.undefined()]).transform(d => d ? new Date(d) : undefined).optional(),
  isPrimary: z.boolean().optional(),
}));

export async function getGoalsAction(
  userId: string
): Promise<{ success: boolean; data?: FitnessGoal[]; error?: string }> {
  const context = createRequestContext({
    userId,
    route: "profile/getGoalsAction",
    feature: "goals",
  });

  return withServerActionLogging(context, async () => {
    if (!userId) {
      return { success: false, error: "User not authenticated." };
    }

    try {
      const goals = await getFitnessGoals(userId, { enableLazyBackfill: true });
      return { success: true, data: goals };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "Failed to fetch goals"
      };
    }
  });
}

export async function saveGoalsAction(
  userId: string,
  goalsData: FitnessGoal[]
): Promise<{ success: boolean; error?: string }> {
  const context = createRequestContext({
    userId,
    route: "profile/saveGoalsAction",
    feature: "goals",
  });

  return withServerActionLogging(context, async () => {
    const validatedData = SaveGoalsSchema.safeParse(goalsData);
    if (!validatedData.success) {
      return {
        success: false,
        error: `Invalid goals data: ${validatedData.error.message}`
      };
    }

    if (!userId) {
      return { success: false, error: "User not authenticated." };
    }

    try {
      await saveFitnessGoals(userId, validatedData.data);
      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "Failed to save goals"
      };
    }
  });
}
