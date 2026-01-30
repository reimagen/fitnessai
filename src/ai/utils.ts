/**
 * Utilities for handling AI model fallback logic with proper error handling and logging.
 */

import { FALLBACK_ERROR_PATTERNS, AI_MODELS } from '@/ai/config';

interface FallbackOptions {
  flowName: string;
  userId?: string;
}

/**
 * Determines if an error should trigger a fallback to the fallback model.
 * Filters out non-retryable errors (validation, auth) to avoid wasting quota.
 */
export function shouldRetryWithFallback(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error);
  const lowerMessage = message.toLowerCase();

  // Non-retryable errors - don't fallback
  const nonRetryablePatterns = [
    'validation',
    'invalid',
    'malformed',
    'unauthorized',
    'forbidden',
    'auth',
    'api_key',
    'not found',
    'access denied',
    'safety',
    'blocked',
  ];

  if (nonRetryablePatterns.some(pattern => lowerMessage.includes(pattern))) {
    return false;
  }

  // Retryable errors - trigger fallback
  return FALLBACK_ERROR_PATTERNS.some(
    pattern => message.includes(pattern) || lowerMessage.includes(pattern)
  );
}

/**
 * Logs a fallback attempt with structured context.
 */
function logFallbackAttempt(flowName: string, primaryError: unknown, userId?: string): void {
  const errorMsg = primaryError instanceof Error ? primaryError.message : String(primaryError);
  console.warn(
    `[FallbackAttempt] Flow: ${flowName}${userId ? `, UserId: ${userId}` : ''} | Primary model failed: ${errorMsg} | Attempting fallback model: ${AI_MODELS.FALLBACK}`
  );
}

/**
 * Logs successful fallback execution.
 */
function logFallbackSuccess(flowName: string, userId?: string): void {
  console.log(
    `[FallbackSuccess] Flow: ${flowName}${userId ? `, UserId: ${userId}` : ''} | Fallback model succeeded`
  );
}

/**
 * Logs fallback failure (both models failed).
 */
function logFallbackFailure(
  flowName: string,
  primaryError: unknown,
  fallbackError: unknown,
  userId?: string
): void {
  const primaryMsg = primaryError instanceof Error ? primaryError.message : String(primaryError);
  const fallbackMsg = fallbackError instanceof Error ? fallbackError.message : String(fallbackError);
  console.error(
    `[FallbackFailure] Flow: ${flowName}${userId ? `, UserId: ${userId}` : ''} | Primary: ${primaryMsg} | Fallback: ${fallbackMsg}`
  );
}

/**
 * Executes a prompt with automatic fallback handling.
 * Wraps the primary model call and transparently falls back if needed.
 *
 * @param promptFn - The prompt function to execute
 * @param input - The input to pass to the prompt
 * @param options - Configuration options including flowName and optional userId
 * @returns The output from the prompt (either primary or fallback model)
 * @throws User-friendly error if both models fail
 */
export async function executePromptWithFallback<TInput, TOutput>(
  promptFn: (input: TInput, config?: { model?: string }) => Promise<{ output: TOutput }>,
  input: TInput,
  options: FallbackOptions
): Promise<TOutput> {
  try {
    // Try primary model
    const result = await promptFn(input);
    return result.output;
  } catch (primaryError) {
    // Check if error is retryable
    if (!shouldRetryWithFallback(primaryError)) {
      // Non-retryable error - throw immediately without wasting fallback quota
      throw primaryError;
    }

    // Log the fallback attempt
    logFallbackAttempt(options.flowName, primaryError, options.userId);

    try {
      // Try fallback model
      const result = await promptFn(input, { model: AI_MODELS.FALLBACK });
      logFallbackSuccess(options.flowName, options.userId);
      return result.output;
    } catch (fallbackError) {
      // Both models failed
      logFallbackFailure(options.flowName, primaryError, fallbackError, options.userId);
      throw new Error('AI service temporarily unavailable. Please try again in a moment.');
    }
  }
}
