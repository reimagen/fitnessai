
'use server';

import { z } from 'zod';
import { revalidateTag } from 'next/cache';
import { getUserProfile as getUserProfileFromServer, updateUserProfile as updateUserProfileFromServer, incrementUsageCounter} from "@/lib/firestore-server";
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

      const updatePayload = {
        liftProgressionAnalysis: {
          [exerciseKey]: storedAnalysis
        }
      };

      await logger.info("Saving lift progression analysis", {
        ...context,
        exerciseKey,
        updatePayload: JSON.stringify(updatePayload),
      });

      await updateUserProfileFromServer(userId, updatePayload);

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
      
      await incrementUsageCounter(userId, 'goalAnalyses');

      // Save the analysis result to the user's profile
      await updateUserProfileFromServer(userId, { goalAnalysis: storedAnalysis });

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
