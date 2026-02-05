/**
 * PII and sensitive data redaction for logging
 *
 * Removes or masks personally identifiable information before sending
 * logs to Cloud Logging to protect user privacy.
 */

/**
 * Redacts PII from a data object or string
 *
 * Redacts:
 * - Email addresses → [REDACTED_EMAIL]
 * - Phone numbers → [REDACTED_PHONE]
 * - User IDs → [REDACTED_user-xxxxx...] (keeps first 8 chars for tracing)
 * - Auth tokens → [REDACTED_TOKEN]
 * - API keys → [REDACTED_KEY]
 * - URLs with sensitive params → [REDACTED_URL]
 */
export function redactPII(data: unknown): unknown {
  if (!data) return data;

  if (typeof data === 'string') {
    return redactString(data);
  }

  if (Array.isArray(data)) {
    return data.map(item => redactPII(item));
  }

  if (typeof data === 'object') {
    const obj = data as Record<string, unknown>;
    const redacted: Record<string, unknown> = {};

    for (const [key, value] of Object.entries(obj)) {
      // Skip redaction for safe fields
      if (isSafeField(key)) {
        redacted[key] = value;
      } else {
        redacted[key] = redactPII(value);
      }
    }

    return redacted;
  }

  return data;
}

/**
 * Determines if a field name is safe to log without redaction
 */
function isSafeField(fieldName: string): boolean {
  const safeFields = [
    'timestamp',
    'requestId',
    'route',
    'feature',
    'level',
    'message',
    'errorType',
    'statusCode',
    'duration',
    'environment',
    'severity',
    'category',
    'shouldRetry',
    'shouldCountAgainstLimit',
  ];

  return safeFields.includes(fieldName.toLowerCase());
}

/**
 * Redacts sensitive patterns from a string
 */
function redactString(str: string): string {
  if (typeof str !== 'string' || str.length === 0) {
    return str;
  }

  // Redact email addresses
  str = str.replace(/[\w\.-]+@[\w\.-]+\.\w+/g, '[REDACTED_EMAIL]');

  // Redact phone numbers (10+ digits)
  str = str.replace(/\b\d{10,}\b/g, '[REDACTED_PHONE]');

  // Redact common auth tokens and API keys
  str = str.replace(/(["\']?(?:api[_-]?)?key["\']?\s*[:=]\s*)[^\s,}"\')]+/gi, '$1[REDACTED_KEY]');
  str = str.replace(/(["\']?(?:auth|token)["\']?\s*[:=]\s*)[^\s,}"\')]+/gi, '$1[REDACTED_TOKEN]');
  str = str.replace(/Bearer\s+[^\s]+/gi, 'Bearer [REDACTED_TOKEN]');

  // Redact credentials in URLs
  str = str.replace(/https?:\/\/[^:]+:[^@]+@/g, 'https://[REDACTED_CREDENTIALS]@');

  // Redact URLs with sensitive query params
  str = str.replace(/(?:[?&](?:password|token|api[_-]?key|secret|auth)[=][^\s&]+)/gi, '[REDACTED_PARAM]');

  // Redact Firebase user IDs (keep first 8 chars for tracing)
  str = str.replace(/(["\']?userId["\']?\s*[:=]\s*)["\']?([a-zA-Z0-9]+)["\']?/g, (match, prefix, userId) => {
    if (userId.length > 8) {
      return `${prefix}"[REDACTED_${userId.substring(0, 8)}...]"`;
    }
    return match;
  });

  return str;
}

/**
 * Extracts error message without sensitive data
 */
export function redactErrorMessage(error: unknown): string {
  const message = String(error);

  // Only redact sensitive patterns, keep the error message structure
  return redactString(message);
}
