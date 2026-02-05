/**
 * Centralized AI error classification module
 *
 * Categorizes all AI operation errors into consistent categories with
 * standardized user-friendly messages and retry/quota handling guidance.
 */

export interface ClassifiedError {
  category: 'quota_exceeded' | 'model_overloaded' | 'validation_error' | 'auth_error' | 'unknown_error';
  statusCode: number;
  userMessage: string;
  shouldRetry: boolean;
  shouldCountAgainstLimit: boolean;
}

/**
 * Classifies an AI error into standard categories
 *
 * Categories:
 * - quota_exceeded: Rate limits/quota exceeded (429)
 * - model_overloaded: AI service temporarily unavailable (503)
 * - validation_error: Input validation or safety filtering (400)
 * - auth_error: Authentication/authorization failures (401/403)
 * - unknown_error: All other errors (500+)
 *
 * @param error - The caught error object
 * @returns ClassifiedError with category, user message, and retry/quota info
 */
export function classifyAIError(error: unknown): ClassifiedError {
  const errorStr = String(error).toLowerCase();
  const errorMessage = error instanceof Error ? error.message : String(error);

  // Check for quota/rate limit errors (429)
  if (
    errorStr.includes('429') ||
    errorStr.includes('quota') ||
    errorStr.includes('rate limit') ||
    errorStr.includes('rate_limit')
  ) {
    return {
      category: 'quota_exceeded',
      statusCode: 429,
      userMessage: 'Request quota exceeded. Try again later.',
      shouldRetry: true,
      shouldCountAgainstLimit: false,
    };
  }

  // Check for model overload/unavailable errors (503)
  if (
    errorStr.includes('503') ||
    errorStr.includes('overloaded') ||
    errorStr.includes('unavailable') ||
    errorStr.includes('service_unavailable')
  ) {
    return {
      category: 'model_overloaded',
      statusCode: 503,
      userMessage: 'AI service temporarily unavailable. Try again in moments.',
      shouldRetry: true,
      shouldCountAgainstLimit: false,
    };
  }

  // Check for validation/safety errors (400)
  if (
    errorStr.includes('400') ||
    errorStr.includes('validation') ||
    errorStr.includes('invalid') ||
    errorStr.includes('malformed') ||
    errorStr.includes('safety') ||
    errorStr.includes('blocked')
  ) {
    return {
      category: 'validation_error',
      statusCode: 400,
      userMessage: `Validation failed: ${errorMessage}`,
      shouldRetry: false,
      shouldCountAgainstLimit: true,
    };
  }

  // Check for auth errors (401/403)
  if (
    errorStr.includes('401') ||
    errorStr.includes('403') ||
    errorStr.includes('unauthorized') ||
    errorStr.includes('forbidden') ||
    errorStr.includes('access denied')
  ) {
    return {
      category: 'auth_error',
      statusCode: 401,
      userMessage: 'Authentication failed. Please sign in again.',
      shouldRetry: false,
      shouldCountAgainstLimit: true,
    };
  }

  // Default: unknown error
  return {
    category: 'unknown_error',
    statusCode: 500,
    userMessage: 'An unexpected error occurred. Please try again.',
    shouldRetry: false,
    shouldCountAgainstLimit: true,
  };
}

/**
 * Builds a user-friendly error message with context
 *
 * Used to wrap the classifier output with operation-specific messaging
 */
export function buildUserErrorMessage(
  classified: ClassifiedError,
  operationName: string,
  defaultMessage: string = 'An unexpected error occurred.'
): string {
  // For quota/overload errors, use the generic message
  if (classified.category === 'quota_exceeded' || classified.category === 'model_overloaded') {
    return classified.userMessage;
  }

  // For other errors, customize with operation context
  if (classified.category === 'validation_error') {
    return classified.userMessage;
  }

  if (classified.category === 'auth_error') {
    return classified.userMessage;
  }

  // Unknown error: use operation name in message
  return `${operationName} failed: ${classified.userMessage}`;
}
