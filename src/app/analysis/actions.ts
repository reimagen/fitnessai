
'use server';

import { analyzeStrengthImbalances, type StrengthImbalanceInput, type StrengthImbalanceOutput } from "@/ai/flows/strength-imbalance-analyzer";
import { updateUserProfile, incrementUsageCounter } from "@/lib/firestore-server";
import { logger } from "@/lib/logging/logger";
import { createRequestContext } from "@/lib/logging/request-context";
import { withServerActionLogging } from "@/lib/logging/server-action-wrapper";
import { classifyAIError } from "@/lib/logging/error-classifier";
import type { StoredStrengthAnalysis } from "@/lib/types";
import { checkRateLimit } from "@/app/prs/rate-limiting";


export async function analyzeStrengthAction(
  userId: string,
  values: StrengthImbalanceInput
): Promise<{ success: boolean; data?: StrengthImbalanceOutput; error?: string }> {
  const context = createRequestContext({
    userId,
    route: "analysis/analyzeStrengthAction",
    feature: "strengthAnalyses",
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

    // Bypass limit check in development environment
    if (process.env.NODE_ENV !== 'development') {
      const { allowed, error } = await checkRateLimit(userId, "strengthAnalyses");
      if (!allowed) {
        return { success: false, error };
      }
    }

    try {
      const analysisData = await analyzeStrengthImbalances(values);

      const storedAnalysis: StoredStrengthAnalysis = {
        result: analysisData,
        generatedDate: new Date(),
      };

      // After getting analysis, save it to the user's profile in Firestore
      await updateUserProfile(userId, { strengthAnalysis: storedAnalysis });

      // Increment usage counter on success
      await incrementUsageCounter(userId, 'strengthAnalyses');

      return { success: true, data: analysisData };
    } catch (error) {
      const classified = classifyAIError(error);

      await logger.error("Error analyzing strength imbalances", {
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
