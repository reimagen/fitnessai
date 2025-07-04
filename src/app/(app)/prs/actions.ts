
"use server";

import { parsePersonalRecords, type ParsePersonalRecordsInput, type ParsePersonalRecordsOutput } from "@/ai/flows/personal-record-parser";

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
        if (error.message.includes("503") || error.message.toLowerCase().includes("overloaded")) {
            userFriendlyError = "The AI model is temporarily unavailable. Please try again in a few moments.";
        } else {
            userFriendlyError = `Failed to parse screenshot: ${error.message}`;
        }
    }
    return { success: false, error: userFriendlyError };
  }
}
