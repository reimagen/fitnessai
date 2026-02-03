
"use server";

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
import type { PersonalRecord } from "@/lib/types";
import { checkRateLimit } from "./rate-limiting";
import { formatParsePrError } from "./error-handling";

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
    if (!process.env.GEMINI_API_KEY && !process.env.GOOGLE_API_KEY) {
      const errorMessage = "The Gemini API Key is missing from your environment configuration. Please add either GEMINI_API_KEY or GOOGLE_API_KEY to your .env.local file. You can obtain a key from Google AI Studio.";
      await logger.error("Missing API Key", { ...context, error: errorMessage });
      return { success: false, error: errorMessage };
    }
    
    if (!userId) {
      return { success: false, error: "User not authenticated." };
    }

    if (!values.photoDataUri || !values.photoDataUri.startsWith("data:image/")) {
      return { success: false, error: "Invalid image data provided." };
    }
    
    // Bypass limit check in development environment
    if (process.env.NODE_ENV !== 'development') {
      const { allowed, error } = await checkRateLimit(userId, "prParses");
      if (!allowed) {
        return { success: false, error };
      }
    }

    try {
      const parsedData = await parsePersonalRecords(values);
      
      await incrementUsageCounter(userId, 'prParses');
      // Return the original parsed data so the UI can show what it found.
      // The client-side logic will trigger a refetch of all PRs on success, showing the final state.
      return { success: true, data: parsedData };
    } catch (error) {
      await logger.error("Error processing personal records screenshot", {
        ...context,
        error: String(error),
      });
      return { success: false, error: formatParsePrError(error) };
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
    if (!userId) {
      throw new Error("User not authenticated.");
    }
    return serverAddPersonalRecords(userId, records);
  });
}

export async function updatePersonalRecord(userId: string, id: string, recordData: UpdatePersonalRecordClientData): Promise<void> {
  const context = createRequestContext({
    userId,
    route: "prs/updatePersonalRecord",
    feature: "personalRecords",
  });

  return withServerActionLogging(context, async () => {
    if (!userId) {
      throw new Error("User not authenticated.");
    }
    
    const dataForServer: Partial<Omit<PersonalRecord, 'id' | 'userId'>> = { ...recordData };

    await serverUpdatePersonalRecord(userId, id, dataForServer);
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
