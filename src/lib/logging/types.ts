/**
 * TypeScript type definitions for logging system
 */

/**
 * Request context information passed through server actions
 */
export interface RequestContext {
  userId: string;
  requestId: string;
  route: string;
  feature: string;
}

/**
 * Metadata passed to logger functions
 */
export interface LogMetadata {
  userId?: string;
  requestId?: string;
  route?: string;
  feature?: string;
  errorType?: string;
  statusCode?: number;
  duration?: number;
  [key: string]: any;
}

/**
 * Client-side error information sent from browser
 */
export interface ClientError {
  message: string;
  error: string;
  stack?: string;
  url: string;
  userId?: string;
  feature?: string;
  timestamp: string;
}

/**
 * Structured log entry sent to Cloud Logging
 */
export interface LogEntry {
  timestamp: string;
  level: 'DEBUG' | 'INFO' | 'WARNING' | 'ERROR' | 'CRITICAL';
  message: string;
  metadata: LogMetadata;
  trace?: string;
}

/**
 * Severity levels for logging
 */
export type LogLevel = 'debug' | 'info' | 'warn' | 'error' | 'fatal';

/**
 * AI error classification categories
 */
export type ErrorCategory =
  | 'quota_exceeded'
  | 'model_overloaded'
  | 'validation_error'
  | 'auth_error'
  | 'unknown_error';

/**
 * Classified error with user message and retry guidance
 */
export interface ClassifiedError {
  category: ErrorCategory;
  statusCode: number;
  userMessage: string;
  shouldRetry: boolean;
  shouldCountAgainstLimit: boolean;
}
