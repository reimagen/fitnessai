import { beforeEach, describe, expect, it, vi } from 'vitest';
import { format } from 'date-fns';
import { checkRateLimit, DAILY_LIMIT_REACHED_PREFIX } from './rate-limiting';
import type { UserProfile } from '@/lib/types';

// Mock dependencies
vi.mock('@/lib/firestore-server', () => ({
  getUserProfile: vi.fn(),
}));

vi.mock('@/lib/rate-limit-config', () => ({
  getRateLimit: vi.fn((feature: string) => {
    const limits: Record<string, number> = {
      'prParses': 10,
      'planGenerations': 5,
      'strengthAnalyses': 5,
    };
    return limits[feature] || 1;
  }),
  getFeatureName: vi.fn((feature: string) => {
    const names: Record<string, string> = {
      'prParses': 'parses',
      'planGenerations': 'plans',
      'strengthAnalyses': 'analyses',
    };
    return names[feature] || feature;
  }),
}));

import * as firestoreServer from '@/lib/firestore-server';

function createUserProfile(overrides: Partial<UserProfile> = {}): UserProfile {
  return {
    id: 'user-1',
    name: 'Test User',
    email: 'test@example.com',
    fitnessGoals: [],
    ...overrides,
  };
}

describe('checkRateLimit', () => {
  const today = format(new Date(), 'yyyy-MM-dd');

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('authentication checks', () => {
    it('rejects empty user ID', async () => {
      const result = await checkRateLimit('', 'prParses');

      expect(result.allowed).toBe(false);
      expect(result.error).toBe('User not authenticated.');
      expect(firestoreServer.getUserProfile).not.toHaveBeenCalled();
    });

    it('rejects null user ID', async () => {
      const result = await checkRateLimit(null as unknown as string, 'prParses');

      expect(result.allowed).toBe(false);
      expect(result.error).toBe('User not authenticated.');
    });

    it('rejects undefined user ID', async () => {
      const result = await checkRateLimit(undefined as unknown as string, 'prParses');

      expect(result.allowed).toBe(false);
      expect(result.error).toBe('User not authenticated.');
    });
  });

  describe('rate limit enforcement', () => {
    it('allows request when user has no usage history', async () => {
      vi.mocked(firestoreServer.getUserProfile).mockResolvedValue(createUserProfile({ aiUsage: {} }));

      const result = await checkRateLimit('user-1', 'prParses');

      expect(result.allowed).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it('allows request when user has no usage for this feature', async () => {
      vi.mocked(firestoreServer.getUserProfile).mockResolvedValue(
        createUserProfile({
          aiUsage: {
            strengthAnalyses: { date: today, count: 2 },
          },
        })
      );

      const result = await checkRateLimit('user-1', 'prParses');

      expect(result.allowed).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it('allows request when usage is from previous day', async () => {
      const yesterday = format(new Date(Date.now() - 24 * 60 * 60 * 1000), 'yyyy-MM-dd');

      vi.mocked(firestoreServer.getUserProfile).mockResolvedValue(
        createUserProfile({
          aiUsage: {
            prParses: { date: yesterday, count: 5 },
          },
        })
      );

      const result = await checkRateLimit('user-1', 'prParses');

      expect(result.allowed).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it('allows request when usage is below limit for today', async () => {
      vi.mocked(firestoreServer.getUserProfile).mockResolvedValue(
        createUserProfile({
          aiUsage: {
            prParses: { date: today, count: 3 },
          },
        })
      );

      const result = await checkRateLimit('user-1', 'prParses');

      expect(result.allowed).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it('allows request when usage is below limit for today', async () => {
      vi.mocked(firestoreServer.getUserProfile).mockResolvedValue(
        createUserProfile({
          aiUsage: {
            prParses: { date: today, count: 9 },
          },
        })
      );

      const result = await checkRateLimit('user-1', 'prParses');

      expect(result.allowed).toBe(true);
    });

    it('rejects request when usage exceeds limit for today', async () => {
      vi.mocked(firestoreServer.getUserProfile).mockResolvedValue(
        createUserProfile({
          aiUsage: {
            prParses: { date: today, count: 11 },
          },
        })
      );

      const result = await checkRateLimit('user-1', 'prParses');

      expect(result.allowed).toBe(false);
      expect(result.error).toBeDefined();
    });

    it('rejects with proper error format when limit reached', async () => {
      vi.mocked(firestoreServer.getUserProfile).mockResolvedValue(
        createUserProfile({
          aiUsage: {
            prParses: { date: today, count: 10 },
          },
        })
      );

      const result = await checkRateLimit('user-1', 'prParses');

      expect(result.error).toContain(DAILY_LIMIT_REACHED_PREFIX);
      expect(result.error).toContain('10');
      expect(result.error).toContain('parses');
    });

    it('includes feature name in error message', async () => {
      vi.mocked(firestoreServer.getUserProfile).mockResolvedValue(
        createUserProfile({
          aiUsage: {
            planGenerations: { date: today, count: 5 },
          },
        })
      );

      const result = await checkRateLimit('user-1', 'planGenerations');

      expect(result.error).toContain('plans');
      expect(result.error).toContain('5');
    });
  });

  describe('different features with different limits', () => {
    it('enforces prParses limit of 10', async () => {
      vi.mocked(firestoreServer.getUserProfile).mockResolvedValue(
        createUserProfile({
          aiUsage: {
            prParses: { date: today, count: 10 },
          },
        })
      );

      const result = await checkRateLimit('user-1', 'prParses');
      expect(result.allowed).toBe(false);
    });

    it('enforces planGenerations limit of 5', async () => {
      vi.mocked(firestoreServer.getUserProfile).mockResolvedValue(
        createUserProfile({
          aiUsage: {
            planGenerations: { date: today, count: 5 },
          },
        })
      );

      const result = await checkRateLimit('user-1', 'planGenerations');
      expect(result.allowed).toBe(false);
    });

    it('enforces strengthAnalyses limit of 5', async () => {
      vi.mocked(firestoreServer.getUserProfile).mockResolvedValue(
        createUserProfile({
          aiUsage: {
            strengthAnalyses: { date: today, count: 5 },
          },
        })
      );

      const result = await checkRateLimit('user-1', 'strengthAnalyses');
      expect(result.allowed).toBe(false);
    });

    it('allows one feature at limit while other is below', async () => {
      vi.mocked(firestoreServer.getUserProfile).mockResolvedValue(
        createUserProfile({
          aiUsage: {
            prParses: { date: today, count: 10 },
            planGenerations: { date: today, count: 1 },
          },
        })
      );

      const result1 = await checkRateLimit('user-1', 'prParses');
      expect(result1.allowed).toBe(false);

      const result2 = await checkRateLimit('user-1', 'planGenerations');
      expect(result2.allowed).toBe(true);
    });
  });

  describe('edge cases', () => {
    it('handles missing aiUsage property', async () => {
      vi.mocked(firestoreServer.getUserProfile).mockResolvedValue(createUserProfile());

      const result = await checkRateLimit('user-1', 'prParses');

      expect(result.allowed).toBe(true);
    });

    it('handles null aiUsage', async () => {
      vi.mocked(firestoreServer.getUserProfile).mockResolvedValue(createUserProfile({ aiUsage: null }));

      const result = await checkRateLimit('user-1', 'prParses');

      expect(result.allowed).toBe(true);
    });

    it('handles undefined aiUsage', async () => {
      vi.mocked(firestoreServer.getUserProfile).mockResolvedValue(createUserProfile({ aiUsage: undefined }));

      const result = await checkRateLimit('user-1', 'prParses');

      expect(result.allowed).toBe(true);
    });

    it('handles user profile not found', async () => {
      vi.mocked(firestoreServer.getUserProfile).mockResolvedValue(null);

      const result = await checkRateLimit('user-1', 'prParses');

      expect(result.allowed).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it('handles usage count of 0', async () => {
      vi.mocked(firestoreServer.getUserProfile).mockResolvedValue(
        createUserProfile({
          aiUsage: {
            prParses: { date: today, count: 0 },
          },
        })
      );

      const result = await checkRateLimit('user-1', 'prParses');

      expect(result.allowed).toBe(true);
    });

    it('handles very high usage count', async () => {
      vi.mocked(firestoreServer.getUserProfile).mockResolvedValue(
        createUserProfile({
          aiUsage: {
            prParses: { date: today, count: 999 },
          },
        })
      );

      const result = await checkRateLimit('user-1', 'prParses');

      expect(result.allowed).toBe(false);
      // Error message contains the limit (10), not the current count
      expect(result.error).toContain('10');
    });

    it('handles boundary condition: count = limit - 1', async () => {
      vi.mocked(firestoreServer.getUserProfile).mockResolvedValue(
        createUserProfile({
          aiUsage: {
            prParses: { date: today, count: 9 },
          },
        })
      );

      const result = await checkRateLimit('user-1', 'prParses');

      expect(result.allowed).toBe(true);
    });

    it('handles boundary condition: count = limit', async () => {
      vi.mocked(firestoreServer.getUserProfile).mockResolvedValue(
        createUserProfile({
          aiUsage: {
            prParses: { date: today, count: 10 },
          },
        })
      );

      const result = await checkRateLimit('user-1', 'prParses');

      expect(result.allowed).toBe(false);
    });

    it('handles boundary condition: count = limit + 1', async () => {
      vi.mocked(firestoreServer.getUserProfile).mockResolvedValue(
        createUserProfile({
          aiUsage: {
            prParses: { date: today, count: 11 },
          },
        })
      );

      const result = await checkRateLimit('user-1', 'prParses');

      expect(result.allowed).toBe(false);
    });
  });

  describe('date handling', () => {
    it('correctly identifies today vs past dates', async () => {
      const yesterday = format(new Date(Date.now() - 24 * 60 * 60 * 1000), 'yyyy-MM-dd');

      vi.mocked(firestoreServer.getUserProfile).mockResolvedValue(
        createUserProfile({
          aiUsage: {
            prParses: { date: yesterday, count: 10 },
          },
        })
      );

      const result = await checkRateLimit('user-1', 'prParses');

      // Should be allowed because the usage is from yesterday, not today
      expect(result.allowed).toBe(true);
    });

    it('uses current date for comparison', async () => {
      vi.mocked(firestoreServer.getUserProfile).mockResolvedValue(
        createUserProfile({
          aiUsage: {
            prParses: { date: today, count: 10 },
          },
        })
      );

      const result = await checkRateLimit('user-1', 'prParses');

      // Should be rejected because usage is from today
      expect(result.allowed).toBe(false);
    });
  });
});
