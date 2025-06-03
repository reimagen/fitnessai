"use server";

import { parseWorkoutScreenshot, type ParseWorkoutScreenshotInput, type ParseWorkoutScreenshotOutput } from "@/ai/flows/screenshot-workout-parser";

export async function parseWorkoutScreenshotAction(
  values: ParseWorkoutScreenshotInput
): Promise<{ success: boolean; data?: ParseWorkoutScreenshotOutput; error?: string }> {
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
    // Check if error is an instance of Error to access message property
    const errorMessage = error instanceof Error ? error.message : "An unknown error occurred.";
    return { success: false, error: `Failed to parse screenshot: ${errorMessage}` };
  }
}
