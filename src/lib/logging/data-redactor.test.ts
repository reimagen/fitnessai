import { describe, expect, it } from 'vitest';
import { redactPII, redactErrorMessage } from './data-redactor';

describe('redactPII - String redaction', () => {
  describe('email addresses', () => {
    it('redacts single email address', () => {
      const result = redactPII('User email: user@example.com');
      expect(result).toContain('[REDACTED_EMAIL]');
      expect(result).not.toContain('user@example.com');
    });

    it('redacts multiple email addresses', () => {
      const result = redactPII('Contact alice@test.com or bob@test.com');
      expect(result).toContain('[REDACTED_EMAIL]');
      expect((result as string).match(/\[REDACTED_EMAIL\]/g)?.length).toBe(2);
    });

    it('handles emails with dots in domain', () => {
      const result = redactPII('Email: user@sub.example.co.uk');
      expect(result).toContain('[REDACTED_EMAIL]');
    });

    it('handles emails with hyphens and underscores', () => {
      const result = redactPII('user_name@test-domain.com');
      expect(result).toContain('[REDACTED_EMAIL]');
    });
  });

  describe('phone numbers', () => {
    it('redacts 10-digit phone numbers', () => {
      const result = redactPII('Phone: 5551234567');
      expect(result).toContain('[REDACTED_PHONE]');
      expect(result).not.toContain('5551234567');
    });

    it('redacts phone numbers longer than 10 digits', () => {
      const result = redactPII('International: 12125551234567');
      expect(result).toContain('[REDACTED_PHONE]');
    });

    it('does not redact fewer than 10 digits', () => {
      const result = redactPII('Code: 123456789');
      expect(result).toContain('123456789');
    });

    it('redacts multiple phone numbers', () => {
      const result = redactPII('Call 5551234567 or 5559876543');
      expect((result as string).match(/\[REDACTED_PHONE\]/g)?.length).toBe(2);
    });
  });

  describe('auth tokens and API keys', () => {
    it('redacts Bearer tokens', () => {
      const result = redactPII('Authorization: Bearer abc123def456');
      expect(result).toContain('[REDACTED_TOKEN]');
      expect(result).not.toContain('abc123def456');
    });

    it('redacts api_key parameter', () => {
      const result = redactPII('api_key=some_secret_key_value_here');
      expect(result).toContain('[REDACTED_KEY]');
    });

    it('redacts apiKey parameter', () => {
      const result = redactPII('apiKey: test_key_abcdef123456');
      expect(result).toContain('[REDACTED_KEY]');
    });

    it('redacts auth token parameter', () => {
      const result = redactPII('auth_token=abc123xyz');
      expect(result).toContain('[REDACTED_TOKEN]');
    });
  });

  describe('URLs with credentials', () => {
    it('redacts URL credentials pattern', () => {
      // The credentials redaction regex matches user:pass@ pattern
      // This test verifies basic credential format is recognized
      const result = redactPII('Connection: https://admin:pass@localhost');
      expect(result).toContain('[REDACTED_CREDENTIALS]');
    });
  });

  describe('URLs with sensitive query params', () => {
    it('redacts password parameter', () => {
      const result = redactPII('https://api.com?password=secret123');
      expect(result).toContain('[REDACTED_PARAM]');
      expect(result).not.toContain('secret123');
    });

    it('redacts token parameter', () => {
      const result = redactPII('https://api.com?token=abc123');
      expect(result).toContain('[REDACTED_PARAM]');
    });

    it('redacts api_key parameter', () => {
      const result = redactPII('https://api.com?api_key=key123');
      expect(result).toContain('[REDACTED_PARAM]');
    });

    it('redacts secret parameter', () => {
      const result = redactPII('https://api.com?secret=xyz');
      expect(result).toContain('[REDACTED_PARAM]');
    });
  });

  describe('Firebase user IDs', () => {
    it('redacts Firebase user IDs with userId prefix (keeps first 8 chars)', () => {
      const result = redactPII('userId: "abc123xyz9abcdefg12345678"');
      expect(result).toContain('[REDACTED_abc123xy');
      expect(result).not.toContain('abc123xyz9abcdefg12345678');
    });

    it('does not redact shorter IDs', () => {
      const result = redactPII('short-id: abc123');
      expect(result).toContain('abc123');
      expect(result).not.toContain('[REDACTED_');
    });
  });

  describe('empty and null handling', () => {
    it('returns null for null input', () => {
      expect(redactPII(null)).toBe(null);
    });

    it('returns undefined for undefined input', () => {
      expect(redactPII(undefined)).toBe(undefined);
    });

    it('returns empty string for empty string', () => {
      expect(redactPII('')).toBe('');
    });

    it('handles empty object', () => {
      const result = redactPII({});
      expect(result).toEqual({});
    });

    it('handles empty array', () => {
      const result = redactPII([]);
      expect(result).toEqual([]);
    });
  });
});

describe('redactPII - Object redaction', () => {
  describe('object handling', () => {
    it('redacts strings within objects', () => {
      const result = redactPII({
        email: 'user@example.com',
        name: 'John',
      }) as Record<string, unknown>;

      expect(result.email).toContain('[REDACTED_EMAIL]');
      expect(result.name).toBe('John');
    });

    it('preserves safe fields without redacting their values', () => {
      const result = redactPII({
        timestamp: '2026-02-13T10:00:00Z',
        message: 'User logged in with user@example.com',
        level: 'info',
      }) as Record<string, unknown>;

      expect(result.timestamp).toBe('2026-02-13T10:00:00Z');
      expect(result.level).toBe('info');
      // Safe fields preserve their original values (including PII)
      expect(result.message).toBe('User logged in with user@example.com');
    });

    it('preserves values in multiple safe fields without redaction', () => {
      const result = redactPII({
        errorMessage: 'Failed with token abc123',
        errorType: 'AuthError',
        statusCode: 401,
      }) as Record<string, unknown>;

      expect(result.errorType).toBe('AuthError');
      expect(result.statusCode).toBe(401);
      // Safe field values are preserved as-is
      expect(result.errorMessage).toBe('Failed with token abc123');
    });

    it('handles nested objects', () => {
      const result = redactPII({
        user: {
          email: 'test@example.com',
          profile: {
            phone: '5551234567',
          },
        },
      }) as Record<string, unknown>;

      const user = result.user as Record<string, unknown>;
      expect((user.email as string)).toContain('[REDACTED_EMAIL]');
      const profile = user.profile as Record<string, unknown>;
      expect((profile.phone as string)).toContain('[REDACTED_PHONE]');
    });

    it('handles deeply nested objects', () => {
      const result = redactPII({
        level1: {
          level2: {
            level3: {
              email: 'deep@example.com',
            },
          },
        },
      }) as Record<string, unknown>;

      const level1 = result.level1 as Record<string, unknown>;
      const level2 = level1.level2 as Record<string, unknown>;
      const level3 = level2.level3 as Record<string, unknown>;
      expect((level3.email as string)).toContain('[REDACTED_EMAIL]');
    });
  });

  describe('array handling', () => {
    it('redacts items in array', () => {
      const result = redactPII(['user@example.com', 'phone: 5551234567']) as unknown[];

      expect(result[0]).toContain('[REDACTED_EMAIL]');
      expect(result[1]).toContain('[REDACTED_PHONE]');
    });

    it('handles array of objects', () => {
      const result = redactPII([
        { email: 'user1@example.com' },
        { email: 'user2@example.com' },
      ]) as Array<Record<string, unknown>>;

      expect(result[0].email).toContain('[REDACTED_EMAIL]');
      expect(result[1].email).toContain('[REDACTED_EMAIL]');
    });

    it('handles mixed array types', () => {
      const result = redactPII([
        'test@example.com',
        123,
        { token: 'abc123' },
        null,
      ]) as unknown[];

      expect(result[0]).toContain('[REDACTED_EMAIL]');
      expect(result[1]).toBe(123);
      expect((result[2] as Record<string, unknown>).token).toBe('abc123'); // 'token' is not a safe field name, but we're checking the behavior
      expect(result[3]).toBe(null);
    });

    it('handles deeply nested arrays', () => {
      const result = redactPII([
        [
          { email: 'user@example.com' },
          [{ phone: '5551234567' }],
        ],
      ]) as unknown[];

      const outer = result[0] as unknown[];
      const firstObj = outer[0] as Record<string, unknown>;
      const nestedArray = outer[1] as unknown[];
      const nestedObj = nestedArray[0] as Record<string, unknown>;
      expect((firstObj.email as string)).toContain('[REDACTED_EMAIL]');
      expect((nestedObj.phone as string)).toContain('[REDACTED_PHONE]');
    });
  });

  describe('complex structures', () => {
    it('handles error-like objects', () => {
      const timestamp = Date.now();
      const result = redactPII({
        message: 'Error: user@example.com failed auth',
        stack: 'at function token=abc123',
        timestamp,
      }) as Record<string, unknown>;

      // "message" is a safe field, so its value is preserved
      expect((result.message as string)).toBe('Error: user@example.com failed auth');
      expect((result.stack as string)).toContain('[REDACTED_TOKEN]');
      expect(typeof result.timestamp).toBe('number');
      expect(result.timestamp).toBe(timestamp);
    });

    it('handles response-like objects', () => {
      const result = redactPII({
        data: {
          user: { email: 'user@example.com' },
        },
        meta: {
          requestId: 'req-123',
          timestamp: '2026-02-13',
        },
      }) as Record<string, unknown>;

      const data = result.data as Record<string, unknown>;
      const user = data.user as Record<string, unknown>;
      expect((user.email as string)).toContain('[REDACTED_EMAIL]');
      const meta = result.meta as Record<string, unknown>;
      expect(meta.requestId).toBe('req-123');
      expect(meta.timestamp).toBe('2026-02-13');
    });

    it('handles API error responses', () => {
      const result = redactPII({
        error: {
          code: 'AUTH_FAILED',
          message: 'Token abc123 invalid',
          userId: { id: 'abc123xyz9abcdefg12345678' }, // Object with id field
        },
        statusCode: 401,
        timestamp: '2026-02-13',
      }) as Record<string, unknown>;

      expect(result.statusCode).toBe(401);
      expect(result.timestamp).toBe('2026-02-13');
      // "message" field value is preserved as-is since it's a safe field
      const error = result.error as Record<string, unknown>;
      expect((error.message as string)).toBe('Token abc123 invalid');
      // userId is not a safe field, so its value (an object) is recursively redacted
      // The 'id' field in the object is not a safe field either
      expect(typeof error.userId).toBe('object');
    });
  });

  describe('field name case insensitivity', () => {
    it('treats field names case-insensitively for safe fields', () => {
      const result = redactPII({
        Timestamp: '2026-02-13',
        MESSAGE: 'test@example.com',
        ErRoRmEsSaGe: 'failed with token abc',
      }) as Record<string, unknown>;

      // All these field names match safe fields (case-insensitive), so values preserved
      expect(result.Timestamp).toBe('2026-02-13');
      expect(result.MESSAGE).toBe('test@example.com');
      expect(result.ErRoRmEsSaGe).toBe('failed with token abc');
    });
  });

  describe('numeric and boolean values', () => {
    it('preserves numbers', () => {
      const result = redactPII({ count: 42, price: 19.99 }) as Record<string, unknown>;
      expect(result.count).toBe(42);
      expect(result.price).toBe(19.99);
    });

    it('preserves booleans', () => {
      const result = redactPII({ active: true, deleted: false }) as Record<string, unknown>;
      expect(result.active).toBe(true);
      expect(result.deleted).toBe(false);
    });

    it('handles zero values', () => {
      const result = redactPII({ count: 0, price: 0 }) as Record<string, unknown>;
      expect(result.count).toBe(0);
      expect(result.price).toBe(0);
    });
  });
});

describe('redactErrorMessage', () => {
  it('redacts email from error message', () => {
    const result = redactErrorMessage(new Error('Failed to send email to user@example.com'));
    expect(result).toContain('[REDACTED_EMAIL]');
    expect(result).not.toContain('user@example.com');
  });

  it('redacts phone from error message', () => {
    const result = redactErrorMessage(new Error('Phone validation failed: 5551234567'));
    expect(result).toContain('[REDACTED_PHONE]');
  });

  it('redacts URLs with query params containing sensitive data', () => {
    const result = redactErrorMessage(new Error('Error: api_key=secret123'));
    expect(result).toContain('[REDACTED_KEY]');
  });

  it('handles string errors', () => {
    const result = redactErrorMessage('Error: Password reset for user@example.com');
    expect(result).toContain('[REDACTED_EMAIL]');
  });

  it('preserves error message structure', () => {
    const result = redactErrorMessage(
      new Error('Database error: user@example.com not found')
    );
    expect(result).toContain('Database error:');
    expect(result).toContain('not found');
    expect(result).toContain('[REDACTED_EMAIL]');
  });

  it('handles null/undefined', () => {
    expect(redactErrorMessage(null)).toContain('null');
    expect(redactErrorMessage(undefined)).toContain('undefined');
  });
});
