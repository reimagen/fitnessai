
"use server";

import { parsePersonalRecords, type ParsePersonalRecordsInput, type ParsePersonalRecordsOutput } from "@/ai/flows/personal-record-parser";
import {
  getPersonalRecords as serverGetPersonalRecords,
  addPersonalRecords as serverAddPersonalRecords,
  updatePersonalRecord as serverUpdatePersonalRecord,
  clearAllPersonalRecords as serverClearAllPersonalRecords,
  getUserProfile,
  incrementUsageCounter,
} from "@/lib/firestore-server";
import type { PersonalRecord } from "@/lib/types";
import { format } from "date-fns";

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
    const userProfile = await getUserProfile(userId);
    const today = format(new Date(), 'yyyy-MM-dd');
    const usage = userProfile?.aiUsage?.prParses;

    if (usage && usage.date === today && usage.count >= 10) {
      return { success: false, error: "You have reached your daily limit of 10 PR screenshot parses." };
    }
  }

  try {
    const parsedData = await parsePersonalRecords(values);
    await incrementUsageCounter(userId, 'prParses');
    return { success: true, data: parsedData };
  } catch (error) {
    console.error("Error parsing personal records screenshot:", error);
    let userFriendlyError = "An unknown error occurred while parsing the screenshot. This attempt did not count against your daily limit.";
    if (error instanceof Error) {
        if (error.message.includes('429') || error.message.toLowerCase().includes('quota')) {
            userFriendlyError = "Parsing failed: The request quota for the AI has been exceeded. Please try again later. This attempt did not count against your daily limit.";
        } else if (error.message.includes('503') || error.message.toLowerCase().includes('overloaded') || error.message.toLowerCase().includes('unavailable')) {
            userFriendlyError = "Parsing failed: The AI model is temporarily unavailable. Please try again in a few moments. This attempt did not count against your daily limit.";
        } else {
            userFriendlyError = `Failed to parse screenshot: ${error.message}. This attempt did not count against your daily limit.`;
        }
    }
    return { success: false, error: userFriendlyError };
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

export async function addPersonalRecords(userId: string, records: Omit<PersonalRecord, 'id' | 'userId'>[]): Promise<void> {
  if (!userId) {
    throw new Error("User not authenticated.");
  }
  await serverAddPersonalRecords(userId, records);
}

export async function updatePersonalRecord(userId: string, id: string, recordData: UpdatePersonalRecordClientData): Promise<void> {
  if (!userId) {
    throw new Error("User not authenticated.");
  }
  
  // The server action receives the client data, which now includes a proper Date object.
  // It will pass this directly to the server-side firestore function.
  const dataForServer: Partial<Omit<PersonalRecord, 'id' | 'userId'>> = { ...recordData };

  await serverUpdatePersonalRecord(userId, id, dataForServer);
}

export async function clearAllPersonalRecords(userId: string): Promise<void> {
    if (!userId) {
        throw new Error("User not authenticated.");
    }
    await serverClearAllPersonalRecords(userId);
}
