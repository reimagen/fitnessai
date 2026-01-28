
"use server";

import { parsePersonalRecords, type ParsePersonalRecordsInput, type ParsePersonalRecordsOutput } from "@/ai/flows/personal-record-parser";
import {
  getPersonalRecords as serverGetPersonalRecords,
  addPersonalRecords as serverAddPersonalRecords,
  updatePersonalRecord as serverUpdatePersonalRecord,
  clearAllPersonalRecords as serverClearAllPersonalRecords,
  incrementUsageCounter,
} from "@/lib/firestore-server";
import type { PersonalRecord } from "@/lib/types";
import { checkRateLimit } from "@/lib/rate-limiting";
import { formatParsePrError } from "@/lib/error-handling";

export async function parsePersonalRecordsAction(
  userId: string,
  values: ParsePersonalRecordsInput
): Promise<{ success: boolean; data?: ParsePersonalRecordsOutput; error?: string }> {
  if (!process.env.GEMINI_API_KEY && !process.env.GOOGLE_API_KEY) {
    const errorMessage = "The Gemini API Key is missing from your environment configuration. Please add either GEMINI_API_KEY or GOOGLE_API_KEY to your .env.local file. You can obtain a key from Google AI Studio.";
    console.error("Missing API Key:", errorMessage);
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
    const { allowed, error } = await checkRateLimit(userId, "prParses", 10);
    if (!allowed) {
      return { success: false, error };
    }
  }

  try {
    const parsedData = await parsePersonalRecords(values);
    
    if (parsedData.records.length > 0) {
      // If records were parsed, attempt to add them using the consolidation logic.
      // The serverAddPersonalRecords function will handle duplicates and find the best record.
      const recordsToAdd = parsedData.records.map(rec => ({
          exerciseName: rec.exerciseName,
          weight: rec.weight,
          weightUnit: rec.weightUnit,
          date: new Date(rec.dateString.replace(/-/g, '/')), // Ensure correct date parsing
          category: rec.category,
      }));
      // We call the server action but don't need to block its response here,
      // as the success/error is handled on the client via toast notifications.
      // We can let this run and return the parsed data to the UI immediately.
      serverAddPersonalRecords(userId, recordsToAdd).catch(error => {
          // We can log this server-side error, but the client will show the parsed data.
          // The client-side mutation hook will show a more specific error toast if this fails.
          console.error("Error saving parsed PRs:", error.message);
      });
    }
    
    await incrementUsageCounter(userId, 'prParses');
    // Return the original parsed data so the UI can show what it found.
    // The client-side logic will trigger a refetch of all PRs on success, showing the final state.
    return { success: true, data: parsedData };
  } catch (error) {
    console.error("Error processing personal records screenshot:", error);
    return { success: false, error: formatParsePrError(error) };
  }
}

// --- Server Actions for Personal Records ---

// This type defines what the client can send to the server action. Note 'date' is now a Date object.
type UpdatePersonalRecordClientData = {
  weight?: number;
  date?: Date; 
}

export async function getPersonalRecords(userId: string): Promise<PersonalRecord[]> {
  if (!userId) {
    throw new Error("User not authenticated.");
  }
  return serverGetPersonalRecords(userId);
}

export async function addPersonalRecords(userId: string, records: Omit<PersonalRecord, 'id' | 'userId'>[]): Promise<{ success: boolean; message: string }> {
  if (!userId) {
    throw new Error("User not authenticated.");
  }
  return serverAddPersonalRecords(userId, records);
}

export async function updatePersonalRecord(userId: string, id: string, recordData: UpdatePersonalRecordClientData): Promise<void> {
  if (!userId) {
    throw new Error("User not authenticated.");
  }
  
  const dataForServer: Partial<Omit<PersonalRecord, 'id' | 'userId'>> = { ...recordData };

  await serverUpdatePersonalRecord(userId, id, dataForServer);
}

export async function clearAllPersonalRecords(userId: string): Promise<void> {
    if (!userId) {
        throw new Error("User not authenticated.");
    }
    await serverClearAllPersonalRecords(userId);
}
