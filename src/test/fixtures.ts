import type { ClassifiedError } from '@/lib/logging/error-classifier';

export const TEST_USER_ID = 'user-1';
export const UNAUTHENTICATED_USER_ID = '';

export function createClassifiedError(
  overrides: Partial<ClassifiedError> = {}
): ClassifiedError {
  return {
    category: 'unknown_error',
    statusCode: 500,
    userMessage: 'An unexpected error occurred.',
    shouldRetry: false,
    shouldCountAgainstLimit: true,
    ...overrides,
  };
}
