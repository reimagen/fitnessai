export const DAILY_RATE_LIMITS = {
  prParses: {
    limit: 10,
    featureName: 'parses',
    key: 'prParses' as const,
  },
  screenshotParses: {
    limit: 5,
    featureName: 'parses',
    key: 'screenshotParses' as const,
  },
  strengthAnalyses: {
    limit: 5,
    featureName: 'analyses',
    key: 'strengthAnalyses' as const,
  },
  planGenerations: {
    limit: 5,
    featureName: 'plans',
    key: 'planGenerations' as const,
  },
  liftProgressionAnalyses: {
    limit: 20,
    featureName: 'analyses',
    key: 'liftProgressionAnalyses' as const,
  },
  goalAnalyses: {
    limit: 5,
    featureName: 'refinements',
    key: 'goalAnalyses' as const,
  },
} as const;

export type RateLimitFeature = keyof typeof DAILY_RATE_LIMITS;

export function getRateLimit(feature: RateLimitFeature): number {
  return DAILY_RATE_LIMITS[feature].limit;
}

export function getFeatureName(feature: RateLimitFeature): string {
  return DAILY_RATE_LIMITS[feature].featureName;
}
