/**
 * Client Error Reporting Endpoint
 *
 * Receives error reports from client-side code (error boundaries, event handlers, etc.)
 * and logs them to Cloud Logging for centralized observability.
 *
 * Rate limiting: 10 errors per minute per IP address (via Upstash Redis)
 * Auth: None required (allows unauthenticated users to report errors)
 * Runtime: Node.js (required for Firebase Admin SDK and Redis client)
 */

import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';
import { logger } from '@/lib/logging/logger';
import { redactPII } from '@/lib/logging/data-redactor';
import type { ClientError } from '@/lib/logging/types';

// Must use Node.js runtime for Firebase Admin SDK
export const runtime = 'nodejs';

/**
 * POST /api/client-errors
 *
 * Accepts client error reports and logs them to Cloud Logging.
 *
 * Request body (ClientError):
 * {
 *   "message": "Error message",
 *   "error": "Full error object stringified",
 *   "stack": "Error stack trace (optional)",
 *   "url": "https://app.com/page",
 *   "userId": "optional user id",
 *   "feature": "feature name",
 *   "timestamp": "2026-02-05T..."
 * }
 *
 * Response:
 * - 200: Error logged successfully
 * - 400: Malformed request
 * - 429: Rate limit exceeded (try again after Retry-After seconds)
 * - 500: Server error
 */
export async function POST(req: NextRequest) {
  try {
    // Get client IP for rate limiting
    const ip =
      req.headers.get('x-forwarded-for') ||
      req.headers.get('x-real-ip') ||
      'unknown';

    // Check rate limit (implement local in-memory rate limiting if Redis not available)
    const rateLimitResult = await checkRateLimit(ip);
    if (!rateLimitResult.allowed) {
      return NextResponse.json(
        { error: 'Too many error reports. Please try again later.' },
        {
          status: 429,
          headers: {
            'Retry-After': String(
              Math.ceil((rateLimitResult.retryAfter - Date.now()) / 1000)
            ),
          },
        }
      );
    }

    // Parse request body
    let clientError: ClientError;
    try {
      clientError = await req.json();
    } catch {
      return NextResponse.json(
        { error: 'Invalid request format' },
        { status: 400 }
      );
    }

    // Validate required fields
    if (!clientError.message || !clientError.error) {
      return NextResponse.json(
        { error: 'Missing required fields: message, error' },
        { status: 400 }
      );
    }

    // Redact PII before logging
    const redactedError = {
      message: clientError.message,
      error: clientError.error,
      stack: clientError.stack,
      url: clientError.url,
      feature: clientError.feature,
      timestamp: clientError.timestamp,
      // Note: Don't log userId if present (PII) - it's redacted
      clientIP: ip === 'unknown' ? undefined : '[REDACTED_IP]',
    };

    // Log to Cloud Logging
    const traceHeader = req.headers.get('x-cloud-trace-context');
    await logger.error('Client-side error', redactedError as any, traceHeader);

    return NextResponse.json({ ok: true }, { status: 200 });
  } catch (err) {
    // Log the endpoint failure itself
    await logger.error('Client error endpoint failed', {
      error: String(err),
      route: '/api/client-errors',
    });

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * Simple in-memory rate limiter (fallback if Redis unavailable)
 *
 * Stores IP → timestamps of recent requests
 * Cleans up old entries every minute
 */
const rateLimitStore = new Map<string, number[]>();
const RATE_LIMIT_WINDOW_MS = 60 * 1000; // 1 minute
const RATE_LIMIT_MAX = 10; // max 10 errors per minute

// Cleanup old entries every minute
setInterval(() => {
  const now = Date.now();
  for (const [ip, timestamps] of rateLimitStore.entries()) {
    const recent = timestamps.filter(ts => now - ts < RATE_LIMIT_WINDOW_MS);
    if (recent.length === 0) {
      rateLimitStore.delete(ip);
    } else {
      rateLimitStore.set(ip, recent);
    }
  }
}, RATE_LIMIT_WINDOW_MS);

const useUpstashRateLimit =
  !!process.env.UPSTASH_REDIS_REST_URL && !!process.env.UPSTASH_REDIS_REST_TOKEN;

let upstashLimiter: Ratelimit | null = null;

function getUpstashLimiter(): Ratelimit {
  if (!upstashLimiter) {
    upstashLimiter = new Ratelimit({
      redis: Redis.fromEnv(),
      limiter: Ratelimit.slidingWindow(RATE_LIMIT_MAX, '1 m'),
      analytics: true,
    });
  }
  return upstashLimiter;
}

async function checkRateLimit(ip: string): Promise<{
  allowed: boolean;
  retryAfter: number;
}> {
  if (useUpstashRateLimit) {
    const limiter = getUpstashLimiter();
    const result = await limiter.limit(ip);
    const retryAfter = result.reset;
    return {
      allowed: result.success,
      retryAfter,
    };
  }

  const now = Date.now();
  const timestamps = rateLimitStore.get(ip) || [];

  // Remove timestamps outside the window
  const recent = timestamps.filter(ts => now - ts < RATE_LIMIT_WINDOW_MS);

  if (recent.length < RATE_LIMIT_MAX) {
    // Still under limit
    recent.push(now);
    rateLimitStore.set(ip, recent);
    return { allowed: true, retryAfter: 0 };
  }

  // Over limit
  const oldestRequest = recent[0];
  const retryAfter = oldestRequest + RATE_LIMIT_WINDOW_MS;

  return {
    allowed: false,
    retryAfter,
  };
}
