
"use server";

import { parsePersonalRecords, type ParsePersonalRecordsInput, type ParsePersonalRecordsOutput } from "@/ai/flows/personal-record-parser";
import {
  getPersonalRecords as serverGetPersonalRecords,
  addPersonalRecords as serverAddPersonalRecords,
  updatePersonalRecord as serverUpdatePersonalRecord,
} from "@/lib/firestore-server";
import type { PersonalRecord } from "@/lib/types";

export async function parsePersonalRecordsAction(
  values: ParsePersonalRecordsInput
): Promise<{ success: boolean; data?: ParsePersonalRecordsOutput; error?: string }> {
  if (!process.env.GEMINI_API_KEY && !process.env.GOOGLE_API_KEY) {
    const errorMessage = "The Gemini API Key is missing from your environment configuration. Please add either GEMINI_API_KEY or GOOGLE_API_KEY to your .env.local file. You can obtain a key from Google AI Studio.";
    console.error("Missing API Key:", errorMessage);
    return { success: false, error: errorMessage };
  }

  if (!values.photoDataUri || !values.photoDataUri.startsWith("data:image/")) {
    return { success: false, error: "Invalid image data provided." };
  }

  try {
    const parsedData = await parsePersonalRecords(values);
    return { success: true, data: parsedData };
  } catch (error) {
    console.error("Error parsing personal records screenshot:", error);
    let userFriendlyError = "An unknown error occurred while parsing the screenshot.";
    if (error instanceof Error) {
        if (error.message.includes('429') || error.message.toLowerCase().includes('quota')) {
            userFriendlyError = "Parsing failed: The request quota for the AI has been exceeded. Please try again later.";
        } else if (error.message.includes('503') || error.message.toLowerCase().includes('overloaded') || error.message.toLowerCase().includes('unavailable')) {
            userFriendlyError = "Parsing failed: The AI model is temporarily unavailable. Please try again in a few moments.";
        } else {
            userFriendlyError = `Failed to parse screenshot: ${error.message}`;
        }
    }
    return { success: false, error: userFriendlyError };
  }
}

// --- Server Actions for Personal Records ---

export async function getPersonalRecords(): Promise<PersonalRecord[]> {
  return serverGetPersonalRecords();
}

export async function addPersonalRecords(records: Omit<PersonalRecord, 'id'>[]): Promise<void> {
  return serverAddPersonalRecords(records);
}

export async function updatePersonalRecord(id: string, recordData: Partial<Omit<PersonalRecord, 'id'>>): Promise<void> {
  return serverUpdatePersonalRecord(id, recordData);
}
