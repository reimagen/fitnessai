/**
 * Centralized configuration for AI models, error patterns, and safety settings.
 * This file is the single source of truth for model names and fallback behavior.
 */

export const AI_MODELS = {
  PRIMARY: 'googleai/gemini-2.5-flash-lite',
  FALLBACK: 'googleai/gemini-2.5-flash',
} as const;

export const FALLBACK_ERROR_PATTERNS = [
  '503',
  'overloaded',
  'unavailable',
  '429',
  'quota',
  'resource exhausted',
  'resource_exhausted',
] as const;

export const DEFAULT_SAFETY_SETTINGS = [
  { category: 'HARM_CATEGORY_DANGEROUS_CONTENT', threshold: 'BLOCK_ONLY_HIGH' as const },
  { category: 'HARM_CATEGORY_HATE_SPEECH', threshold: 'BLOCK_ONLY_HIGH' as const },
  { category: 'HARM_CATEGORY_HARASSMENT', threshold: 'BLOCK_ONLY_HIGH' as const },
  { category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT', threshold: 'BLOCK_ONLY_HIGH' as const },
] as const;
