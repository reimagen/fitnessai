
"use server";

import { z } from "zod";
import { parsePersonalRecords, type ParsePersonalRecordsInput, type ParsePersonalRecordsOutput } from "@/ai/flows/personal-record-parser";
import {
  getPersonalRecords as serverGetPersonalRecords,
  addPersonalRecords as serverAddPersonalRecords,
  updatePersonalRecord as serverUpdatePersonalRecord,
  clearAllPersonalRecords as serverClearAllPersonalRecords,
  incrementUsageCounter,
} from "@/lib/firestore-server";
import { logger } from "@/lib/logging/logger";
import { createRequestContext } from "@/lib/logging/request-context";
import { withServerActionLogging } from "@/lib/logging/server-action-wrapper";
import { classifyAIError } from "@/lib/logging/error-classifier";
import type { ExerciseCategory, PersonalRecord } from "@/lib/types";
import { checkRateLimit } from "./rate-limiting";

// Zod schemas for input validation
const ParsePersonalRecordsInputSchema = z.object({
  photoDataUri: z.string().regex(/^data:image\//, "Photo must be a valid data URI"),
});

const ExerciseCategorySchema = z.enum([
  "Cardio",
  "Lower Body",
  "Upper Body",
  "Full Body",
  "Core",
  "Other",
] as const satisfies readonly ExerciseCategory[]);

const AddPersonalRecordsSchema = z.array(z.object({
  exerciseName: z.string().min(1, "Exercise name is required"),
  weight: z.number().positive("Weight must be positive"),
  weightUnit: z.enum(["lbs", "kg"]),
  date: z.union([z.date(), z.string().datetime()]).transform(d => new Date(d)),
  category: ExerciseCategorySchema.optional(),
}));

const UpdatePersonalRecordSchema = z.object({
  weight: z.number().positive("Weight must be positive").optional(),
  date: z.union([z.date(), z.string().datetime()]).transform(d => new Date(d)).optional(),
});

export async function parsePersonalRecordsAction(
  userId: string,
  values: ParsePersonalRecordsInput
): Promise<{ success: boolean; data?: ParsePersonalRecordsOutput; error?: string }> {
  const context = createRequestContext({
    userId,
    route: "prs/parsePersonalRecordsAction",
    feature: "prParses",
  });

  return withServerActionLogging(context, async () => {
    // Validate input schema
    const validatedInput = ParsePersonalRecordsInputSchema.safeParse(values);
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
      const { allowed, error } = await checkRateLimit(userId, "prParses");
      if (!allowed) {
        return { success: false, error };
      }
    }

    try {
      const parsedData = await parsePersonalRecords(validatedInput.data);

      await incrementUsageCounter(userId, 'prParses');
      // Return the original parsed data so the UI can show what it found.
      // The client-side logic will trigger a refetch of all PRs on success, showing the final state.
      return { success: true, data: parsedData };
    } catch (error) {
      const classified = classifyAIError(error);

      await logger.error("Error processing personal records screenshot", {
        ...context,
        errorType: classified.category,
        statusCode: classified.statusCode,
      });

      // Only increment counter if this counts against the limit
      if (classified.shouldCountAgainstLimit) {
        // Note: For non-retryable errors, we increment. For quota/overload, we don't.
      }

      return { success: false, error: classified.userMessage };
    }
  });
}

// --- Server Actions for Personal Records ---

// This type defines what the client can send to the server action. Note 'date' is now a Date object.
type UpdatePersonalRecordClientData = {
  weight?: number;
  date?: Date; 
}

export async function getPersonalRecords(userId: string): Promise<PersonalRecord[]> {
  const context = createRequestContext({
    userId,
    route: "prs/getPersonalRecords",
    feature: "personalRecords",
  });

  return withServerActionLogging(context, async () => {
    if (!userId) {
      throw new Error("User not authenticated.");
    }
    return serverGetPersonalRecords(userId);
  });
}

export async function addPersonalRecords(userId: string, records: Omit<PersonalRecord, 'id' | 'userId'>[]): Promise<{ success: boolean; message: string }> {
  const context = createRequestContext({
    userId,
    route: "prs/addPersonalRecords",
    feature: "personalRecords",
  });

  return withServerActionLogging(context, async () => {
    // Validate input schema
    const validatedRecords = AddPersonalRecordsSchema.safeParse(records);
    if (!validatedRecords.success) {
      throw new Error(`Invalid records: ${validatedRecords.error.message}`);
    }

    if (!userId) {
      throw new Error("User not authenticated.");
    }
    return serverAddPersonalRecords(userId, validatedRecords.data);
  });
}

export async function updatePersonalRecord(userId: string, id: string, recordData: UpdatePersonalRecordClientData): Promise<void> {
  const context = createRequestContext({
    userId,
    route: "prs/updatePersonalRecord",
    feature: "personalRecords",
  });

  return withServerActionLogging(context, async () => {
    // Validate input schema
    const validatedData = UpdatePersonalRecordSchema.safeParse(recordData);
    if (!validatedData.success) {
      throw new Error(`Invalid record data: ${validatedData.error.message}`);
    }

    if (!userId) {
      throw new Error("User not authenticated.");
    }

    await serverUpdatePersonalRecord(userId, id, validatedData.data);
  });
}

export async function clearAllPersonalRecords(userId: string): Promise<void> {
  const context = createRequestContext({
    userId,
    route: "prs/clearAllPersonalRecords",
    feature: "personalRecords",
  });

  return withServerActionLogging(context, async () => {
    if (!userId) {
      throw new Error("User not authenticated.");
    }
    await serverClearAllPersonalRecords(userId);
  });
}
