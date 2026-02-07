import { describe, expect, it } from 'vitest';
import { DAILY_RATE_LIMITS, getFeatureName, getRateLimit } from './rate-limit-config';

describe('rate limit config', () => {
  it('exposes all expected feature keys', () => {
    expect(Object.keys(DAILY_RATE_LIMITS).sort()).toEqual([
      'goalAnalyses',
      'liftProgressionAnalyses',
      'planGenerations',
      'prParses',
      'screenshotParses',
      'strengthAnalyses',
    ]);
  });

  it('returns configured limit and feature name', () => {
    expect(getRateLimit('prParses')).toBe(10);
    expect(getFeatureName('planGenerations')).toBe('plans');
  });
});
