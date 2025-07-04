
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
