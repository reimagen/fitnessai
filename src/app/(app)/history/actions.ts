
"use server";

import { parseWorkoutScreenshot, type ParseWorkoutScreenshotInput, type ParseWorkoutScreenshotOutput } from "@/ai/flows/screenshot-workout-parser";

export async function parseWorkoutScreenshotAction(
  values: ParseWorkoutScreenshotInput
): Promise<{ success: boolean; data?: ParseWorkoutScreenshotOutput; error?: string }> {
  if (!process.env.GEMINI_API_KEY && !process.env.GOOGLE_API_KEY) {
    const errorMessage = "The Gemini API Key is missing from your environment configuration. Please add either GEMINI_API_KEY or GOOGLE_API_KEY to your .env.local file. You can obtain a key from Google AI Studio.";
    console.error("Missing API Key:", errorMessage);
    return { success: false, error: errorMessage };
  }
  
  // Basic validation for data URI can be added here if needed,
  // though the AI flow itself might handle malformed inputs.
  if (!values.photoDataUri || !values.photoDataUri.startsWith("data:image/")) {
    return { success: false, error: "Invalid image data provided." };
  }

  try {
    const parsedData = await parseWorkoutScreenshot(values);
    return { success: true, data: parsedData };
  } catch (error) {
    console.error("Error parsing workout screenshot:", error);
    const userFriendlyError = error instanceof Error ? `Failed to parse screenshot: ${error.message}` : "An unknown error occurred while parsing the screenshot.";
    return { success: false, error: userFriendlyError };
  }
}
