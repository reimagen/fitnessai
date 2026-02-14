import { describe, expect, it } from 'vitest';
import { classifyAIError, buildUserErrorMessage } from './error-classifier';

describe('classifyAIError', () => {
  describe('quota_exceeded errors', () => {
    it('classifies 429 status as quota_exceeded', () => {
      const error = new Error('HTTP 429 Too Many Requests');
      const classified = classifyAIError(error);

      expect(classified.category).toBe('quota_exceeded');
      expect(classified.statusCode).toBe(429);
      expect(classified.shouldRetry).toBe(true);
      expect(classified.shouldCountAgainstLimit).toBe(false);
    });

    it('classifies "quota exceeded" message as quota_exceeded', () => {
      const error = new Error('quota exceeded for this API');
      const classified = classifyAIError(error);

      expect(classified.category).toBe('quota_exceeded');
      expect(classified.statusCode).toBe(429);
    });

    it('classifies "rate limit" message as quota_exceeded', () => {
      const error = new Error('Rate limit exceeded');
      const classified = classifyAIError(error);

      expect(classified.category).toBe('quota_exceeded');
    });

    it('classifies "rate_limit" (underscore) as quota_exceeded', () => {
      const error = new Error('rate_limit_exceeded');
      const classified = classifyAIError(error);

      expect(classified.category).toBe('quota_exceeded');
    });

    it('provides user-friendly quota message', () => {
      const error = new Error('quota exceeded');
      const classified = classifyAIError(error);

      expect(classified.userMessage).toBe('Request quota exceeded. Try again later.');
    });
  });

  describe('model_overloaded errors', () => {
    it('classifies 503 status as model_overloaded', () => {
      const error = new Error('HTTP 503 Service Unavailable');
      const classified = classifyAIError(error);

      expect(classified.category).toBe('model_overloaded');
      expect(classified.statusCode).toBe(503);
      expect(classified.shouldRetry).toBe(true);
      expect(classified.shouldCountAgainstLimit).toBe(false);
    });

    it('classifies "overloaded" message as model_overloaded', () => {
      const error = new Error('Model is overloaded');
      const classified = classifyAIError(error);

      expect(classified.category).toBe('model_overloaded');
    });

    it('classifies "unavailable" message as model_overloaded', () => {
      const error = new Error('Service unavailable');
      const classified = classifyAIError(error);

      expect(classified.category).toBe('model_overloaded');
    });

    it('classifies "service_unavailable" as model_overloaded', () => {
      const error = new Error('service_unavailable');
      const classified = classifyAIError(error);

      expect(classified.category).toBe('model_overloaded');
    });

    it('provides user-friendly overload message', () => {
      const error = new Error('503 unavailable');
      const classified = classifyAIError(error);

      expect(classified.userMessage).toBe('AI service temporarily unavailable. Try again in moments.');
    });
  });

  describe('validation_error', () => {
    it('classifies 400 status as validation_error', () => {
      const error = new Error('HTTP 400 Bad Request');
      const classified = classifyAIError(error);

      expect(classified.category).toBe('validation_error');
      expect(classified.statusCode).toBe(400);
      expect(classified.shouldRetry).toBe(false);
      expect(classified.shouldCountAgainstLimit).toBe(true);
    });

    it('classifies "validation" message as validation_error', () => {
      const error = new Error('Validation failed: invalid format');
      const classified = classifyAIError(error);

      expect(classified.category).toBe('validation_error');
    });

    it('classifies "invalid" message as validation_error', () => {
      const error = new Error('Invalid input provided');
      const classified = classifyAIError(error);

      expect(classified.category).toBe('validation_error');
    });

    it('classifies "malformed" message as validation_error', () => {
      const error = new Error('Malformed request');
      const classified = classifyAIError(error);

      expect(classified.category).toBe('validation_error');
    });

    it('classifies "safety" message as validation_error', () => {
      const error = new Error('Request blocked by safety filters');
      const classified = classifyAIError(error);

      expect(classified.category).toBe('validation_error');
    });

    it('classifies "blocked" message as validation_error', () => {
      const error = new Error('Request blocked');
      const classified = classifyAIError(error);

      expect(classified.category).toBe('validation_error');
    });

    it('includes original error message in user message', () => {
      const error = new Error('Validation failed: missing required field');
      const classified = classifyAIError(error);

      expect(classified.userMessage).toContain('missing required field');
    });
  });

  describe('auth_error', () => {
    it('classifies 401 status as auth_error', () => {
      const error = new Error('HTTP 401 Unauthorized');
      const classified = classifyAIError(error);

      expect(classified.category).toBe('auth_error');
      expect(classified.statusCode).toBe(401);
      expect(classified.shouldRetry).toBe(false);
      expect(classified.shouldCountAgainstLimit).toBe(true);
    });

    it('classifies 403 status as auth_error', () => {
      const error = new Error('HTTP 403 Forbidden');
      const classified = classifyAIError(error);

      expect(classified.category).toBe('auth_error');
      expect(classified.statusCode).toBe(401); // Returns 401 for both
    });

    it('classifies "unauthorized" message as auth_error', () => {
      const error = new Error('Unauthorized access');
      const classified = classifyAIError(error);

      expect(classified.category).toBe('auth_error');
    });

    it('classifies "forbidden" message as auth_error', () => {
      const error = new Error('Access forbidden');
      const classified = classifyAIError(error);

      expect(classified.category).toBe('auth_error');
    });

    it('classifies "access denied" as auth_error', () => {
      const error = new Error('Access denied');
      const classified = classifyAIError(error);

      expect(classified.category).toBe('auth_error');
    });

    it('provides auth-specific user message', () => {
      const error = new Error('401 unauthorized');
      const classified = classifyAIError(error);

      expect(classified.userMessage).toBe('Authentication failed. Please sign in again.');
    });
  });

  describe('unknown_error', () => {
    it('classifies unexpected errors as unknown_error', () => {
      const error = new Error('Something went wrong');
      const classified = classifyAIError(error);

      expect(classified.category).toBe('unknown_error');
      expect(classified.statusCode).toBe(500);
      expect(classified.shouldRetry).toBe(false);
      expect(classified.shouldCountAgainstLimit).toBe(true);
    });

    it('handles non-Error objects', () => {
      const error = { message: 'Random object error' };
      const classified = classifyAIError(error);

      expect(classified.category).toBe('unknown_error');
    });

    it('handles string errors', () => {
      const error = 'String error message';
      const classified = classifyAIError(error);

      expect(classified.category).toBe('unknown_error');
    });

    it('handles null/undefined gracefully', () => {
      const classified1 = classifyAIError(null);
      const classified2 = classifyAIError(undefined);

      expect(classified1.category).toBe('unknown_error');
      expect(classified2.category).toBe('unknown_error');
    });

    it('provides generic user message for unknown error', () => {
      const error = new Error('Unexpected error');
      const classified = classifyAIError(error);

      expect(classified.userMessage).toBe('An unexpected error occurred. Please try again.');
    });
  });

  describe('edge cases', () => {
    it('is case-insensitive in pattern matching', () => {
      const error = new Error('QUOTA EXCEEDED');
      const classified = classifyAIError(error);

      expect(classified.category).toBe('quota_exceeded');
    });

    it('handles multiple error indicators (first match wins)', () => {
      // Contains both "quota" and "validation" - quota should win
      const error = new Error('quota exceeded due to validation');
      const classified = classifyAIError(error);

      expect(classified.category).toBe('quota_exceeded');
    });

    it('handles very long error messages', () => {
      const longMessage = 'Error: ' + 'x'.repeat(10000);
      const error = new Error(longMessage);
      const classified = classifyAIError(error);

      expect(classified.category).toBe('unknown_error');
    });
  });
});

describe('buildUserErrorMessage', () => {
  it('uses generic message for quota_exceeded', () => {
    const classified = classifyAIError(new Error('429'));
    const message = buildUserErrorMessage(classified, 'parseWorkout');

    expect(message).toBe('Request quota exceeded. Try again later.');
  });

  it('uses generic message for model_overloaded', () => {
    const classified = classifyAIError(new Error('503'));
    const message = buildUserErrorMessage(classified, 'generatePlan');

    expect(message).toBe('AI service temporarily unavailable. Try again in moments.');
  });

  it('uses classified message for validation_error', () => {
    const classified = classifyAIError(new Error('validation failed'));
    const message = buildUserErrorMessage(classified, 'parsePR');

    expect(message).toContain('Validation failed');
  });

  it('uses classified message for auth_error', () => {
    const classified = classifyAIError(new Error('401'));
    const message = buildUserErrorMessage(classified, 'analyzeStrength');

    expect(message).toBe('Authentication failed. Please sign in again.');
  });

  it('includes operation name in unknown_error message', () => {
    const classified = classifyAIError(new Error('random error'));
    const message = buildUserErrorMessage(classified, 'parseWorkout');

    expect(message).toContain('parseWorkout');
    expect(message).toContain('failed');
  });

  it('handles various operation names', () => {
    const classified = classifyAIError(new Error('unexpected'));

    const msg1 = buildUserErrorMessage(classified, 'calculateStrength');
    expect(msg1).toContain('calculateStrength');

    const msg2 = buildUserErrorMessage(classified, 'generateWorkoutPlan');
    expect(msg2).toContain('generateWorkoutPlan');
  });
});
