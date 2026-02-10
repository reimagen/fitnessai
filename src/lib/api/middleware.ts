/**
 * API Authentication Middleware
 * Verifies Firebase ID tokens from Authorization headers
 * Used by all API v1 endpoints
 */

import { NextRequest, NextResponse } from 'next/server';
import { getAdminAuth } from '@/lib/firebase-admin';
import { logger } from '@/lib/logging/logger';
import { createRequestContext } from '@/lib/logging/request-context';

export interface AuthenticatedRequest extends NextRequest {
  userId: string;
  email?: string;
}

/**
 * Verify Firebase ID token from Authorization header
 * Throws error if invalid or missing
 */
export async function verifyFirebaseToken(
  request: NextRequest
): Promise<{ uid: string; email?: string }> {
  const authHeader = request.headers.get('authorization');
  const token = authHeader?.replace('Bearer ', '');

  if (!token) {
    throw new AuthenticationError('Missing authorization token');
  }

  try {
    const adminAuth = getAdminAuth();
    const decodedToken = await adminAuth.verifyIdToken(token);

    return {
      uid: decodedToken.uid,
      email: decodedToken.email,
    };
  } catch (error) {
    console.error('Token verification error:', error);
    throw new AuthenticationError('Invalid or expired token');
  }
}

/**
 * Attach user info to request
 * Returns NextRequest with userId property
 */
export async function withAuthentication(
  request: NextRequest,
  handler: (req: AuthenticatedRequest) => Promise<NextResponse>
): Promise<NextResponse> {
  try {
    const { uid } = await verifyFirebaseToken(request);

    // Create authenticated request
    const authRequest = request as AuthenticatedRequest;
    authRequest.userId = uid;

    return await handler(authRequest);
  } catch (error) {
    if (error instanceof AuthenticationError) {
      return NextResponse.json(
        { error: error.message },
        { status: 401 }
      );
    }

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * Validate request has required fields
 */
export function validateRequestBody<T extends Record<string, unknown>>(
  body: unknown,
  requiredFields: (keyof T)[]
): T {
  if (!body || typeof body !== 'object') {
    throw new ValidationError('Request body must be valid JSON');
  }

  const bodyObj = body as Record<string, unknown>;

  for (const field of requiredFields) {
    const fieldStr = String(field);
    if (!(fieldStr in bodyObj) || bodyObj[fieldStr] === undefined || bodyObj[fieldStr] === null) {
      throw new ValidationError(`Missing required field: ${fieldStr}`);
    }
  }

  return body as T;
}

/**
 * Handle API errors with proper status codes
 */
export function handleApiError(error: unknown): NextResponse {
  if (error instanceof ValidationError) {
    return NextResponse.json(
      { error: error.message },
      { status: 400 }
    );
  }

  if (error instanceof AuthenticationError) {
    return NextResponse.json(
      { error: error.message },
      { status: 401 }
    );
  }

  if (error instanceof AuthorizationError) {
    return NextResponse.json(
      { error: error.message },
      { status: 403 }
    );
  }

  if (error instanceof NotFoundError) {
    return NextResponse.json(
      { error: error.message },
      { status: 404 }
    );
  }

  if (error instanceof ConflictError) {
    return NextResponse.json(
      { error: error.message },
      { status: 409 }
    );
  }

  if (error instanceof RateLimitError) {
    return NextResponse.json(
      { error: error.message },
      { status: 429 }
    );
  }

  // Unexpected error
  console.error('Unexpected API error:', error);
  return NextResponse.json(
    { error: 'Internal server error' },
    { status: 500 }
  );
}

/**
 * Custom error classes for API responses
 */
export class APIError extends Error {
  constructor(message: string, public statusCode: number = 500) {
    super(message);
    this.name = 'APIError';
  }
}

export class ValidationError extends APIError {
  constructor(message: string) {
    super(message, 400);
    this.name = 'ValidationError';
  }
}

export class AuthenticationError extends APIError {
  constructor(message: string) {
    super(message, 401);
    this.name = 'AuthenticationError';
  }
}

export class AuthorizationError extends APIError {
  constructor(message: string) {
    super(message, 403);
    this.name = 'AuthorizationError';
  }
}

export class NotFoundError extends APIError {
  constructor(message: string) {
    super(message, 404);
    this.name = 'NotFoundError';
  }
}

export class ConflictError extends APIError {
  constructor(message: string) {
    super(message, 409);
    this.name = 'ConflictError';
  }
}

export class RateLimitError extends APIError {
  constructor(message: string) {
    super(message, 429);
    this.name = 'RateLimitError';
  }
}

/**
 * Standard API response format
 */
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  timestamp: number;
}

export function createSuccessResponse<T>(data: T): ApiResponse<T> {
  return {
    success: true,
    data,
    timestamp: Date.now(),
  };
}

export function createErrorResponse(error: string): ApiResponse<null> {
  return {
    success: false,
    error,
    timestamp: Date.now(),
  };
}

/**
 * Rate limiting helper
 * Returns true if rate limit exceeded
 */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export async function checkRateLimit(
  _key: string,
  _maxRequests: number = 100,
  _windowSeconds: number = 60
): Promise<boolean> {
  // TODO: Implement with Redis or similar
  // For now, always allow
  return false;
}

/**
 * Logging helper for API requests
 */
export async function logApiRequest(
  route: string,
  method: string,
  userId: string,
  statusCode: number
) {
  const context = createRequestContext({
    route,
    feature: 'api',
    userId,
  });

  if (statusCode >= 400) {
    await logger.warn(`API ${method} ${route} returned ${statusCode}`, context);
  } else {
    await logger.info(`API ${method} ${route}`, context);
  }
}
