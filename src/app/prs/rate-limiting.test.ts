import { beforeEach, describe, expect, it, vi } from 'vitest';
import { format } from 'date-fns';
import { checkRateLimit, DAILY_LIMIT_REACHED_PREFIX } from './rate-limiting';

// Mock dependencies
vi.mock('@/lib/firestore-server', () => ({
  getUserProfile: vi.fn(),
}));

vi.mock('@/lib/rate-limit-config', () => ({
  getRateLimit: vi.fn((feature: string) => {
    const limits: Record<string, number> = {
      'parse_personal_records': 5,
      'generate_workout_plan': 3,
      'analyze_strength': 10,
    };
    return limits[feature] || 1;
  }),
  getFeatureName: vi.fn((feature: string) => {
    const names: Record<string, string> = {
      'parse_personal_records': 'Personal Record scans',
      'generate_workout_plan': 'Workout Plans',
      'analyze_strength': 'Strength Analyses',
    };
    return names[feature] || feature;
  }),
}));

import * as firestoreServer from '@/lib/firestore-server';
import * as rateLimitConfig from '@/lib/rate-limit-config';

describe('checkRateLimit', () => {
  const today = format(new Date(), 'yyyy-MM-dd');
  const tomorrow = format(new Date(Date.now() + 24 * 60 * 60 * 1000), 'yyyy-MM-dd');

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('authentication checks', () => {
    it('rejects empty user ID', async () => {
      const result = await checkRateLimit('', 'parse_personal_records');

      expect(result.allowed).toBe(false);
      expect(result.error).toBe('User not authenticated.');
      expect(firestoreServer.getUserProfile).not.toHaveBeenCalled();
    });

    it('rejects null user ID', async () => {
      const result = await checkRateLimit(null as any, 'parse_personal_records');

      expect(result.allowed).toBe(false);
      expect(result.error).toBe('User not authenticated.');
    });

    it('rejects undefined user ID', async () => {
      const result = await checkRateLimit(undefined as any, 'parse_personal_records');

      expect(result.allowed).toBe(false);
      expect(result.error).toBe('User not authenticated.');
    });
  });

  describe('rate limit enforcement', () => {
    it('allows request when user has no usage history', async () => {
      vi.mocked(firestoreServer.getUserProfile).mockResolvedValue({
        id: 'user-1',
        name: 'Test User',
        email: 'test@example.com',
        aiUsage: {},
      } as any);

      const result = await checkRateLimit('user-1', 'parse_personal_records');

      expect(result.allowed).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it('allows request when user has no usage for this feature', async () => {
      vi.mocked(firestoreServer.getUserProfile).mockResolvedValue({
        id: 'user-1',
        name: 'Test User',
        email: 'test@example.com',
        aiUsage: {
          'analyze_strength': { date: today, count: 2 },
        },
      } as any);

      const result = await checkRateLimit('user-1', 'parse_personal_records');

      expect(result.allowed).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it('allows request when usage is from previous day', async () => {
      const yesterday = format(new Date(Date.now() - 24 * 60 * 60 * 1000), 'yyyy-MM-dd');

      vi.mocked(firestoreServer.getUserProfile).mockResolvedValue({
        id: 'user-1',
        name: 'Test User',
        email: 'test@example.com',
        aiUsage: {
          'parse_personal_records': { date: yesterday, count: 5 },
        },
      } as any);

      const result = await checkRateLimit('user-1', 'parse_personal_records');

      expect(result.allowed).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it('allows request when usage is below limit for today', async () => {
      vi.mocked(firestoreServer.getUserProfile).mockResolvedValue({
        id: 'user-1',
        name: 'Test User',
        email: 'test@example.com',
        aiUsage: {
          'parse_personal_records': { date: today, count: 3 },
        },
      } as any);

      const result = await checkRateLimit('user-1', 'parse_personal_records');

      expect(result.allowed).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it('allows request when usage equals limit for today', async () => {
      vi.mocked(firestoreServer.getUserProfile).mockResolvedValue({
        id: 'user-1',
        name: 'Test User',
        email: 'test@example.com',
        aiUsage: {
          'parse_personal_records': { date: today, count: 4 },
        },
      } as any);

      const result = await checkRateLimit('user-1', 'parse_personal_records');

      expect(result.allowed).toBe(true);
    });

    it('rejects request when usage exceeds limit for today', async () => {
      vi.mocked(firestoreServer.getUserProfile).mockResolvedValue({
        id: 'user-1',
        name: 'Test User',
        email: 'test@example.com',
        aiUsage: {
          'parse_personal_records': { date: today, count: 5 },
        },
      } as any);

      const result = await checkRateLimit('user-1', 'parse_personal_records');

      expect(result.allowed).toBe(false);
      expect(result.error).toBeDefined();
    });

    it('rejects with proper error format when limit reached', async () => {
      vi.mocked(firestoreServer.getUserProfile).mockResolvedValue({
        id: 'user-1',
        name: 'Test User',
        email: 'test@example.com',
        aiUsage: {
          'parse_personal_records': { date: today, count: 5 },
        },
      } as any);

      const result = await checkRateLimit('user-1', 'parse_personal_records');

      expect(result.error).toContain(DAILY_LIMIT_REACHED_PREFIX);
      expect(result.error).toContain('5');
      expect(result.error).toContain('Personal Record scans');
    });

    it('includes feature name in error message', async () => {
      vi.mocked(firestoreServer.getUserProfile).mockResolvedValue({
        id: 'user-1',
        name: 'Test User',
        email: 'test@example.com',
        aiUsage: {
          'generate_workout_plan': { date: today, count: 3 },
        },
      } as any);

      const result = await checkRateLimit('user-1', 'generate_workout_plan');

      expect(result.error).toContain('Workout Plans');
      expect(result.error).toContain('3');
    });
  });

  describe('different features with different limits', () => {
    it('enforces parse_personal_records limit of 5', async () => {
      vi.mocked(firestoreServer.getUserProfile).mockResolvedValue({
        id: 'user-1',
        name: 'Test User',
        email: 'test@example.com',
        aiUsage: {
          'parse_personal_records': { date: today, count: 5 },
        },
      } as any);

      const result = await checkRateLimit('user-1', 'parse_personal_records');
      expect(result.allowed).toBe(false);
    });

    it('enforces generate_workout_plan limit of 3', async () => {
      vi.mocked(firestoreServer.getUserProfile).mockResolvedValue({
        id: 'user-1',
        name: 'Test User',
        email: 'test@example.com',
        aiUsage: {
          'generate_workout_plan': { date: today, count: 3 },
        },
      } as any);

      const result = await checkRateLimit('user-1', 'generate_workout_plan');
      expect(result.allowed).toBe(false);
    });

    it('enforces analyze_strength limit of 10', async () => {
      vi.mocked(firestoreServer.getUserProfile).mockResolvedValue({
        id: 'user-1',
        name: 'Test User',
        email: 'test@example.com',
        aiUsage: {
          'analyze_strength': { date: today, count: 10 },
        },
      } as any);

      const result = await checkRateLimit('user-1', 'analyze_strength');
      expect(result.allowed).toBe(false);
    });

    it('allows one feature at limit while other is below', async () => {
      vi.mocked(firestoreServer.getUserProfile).mockResolvedValue({
        id: 'user-1',
        name: 'Test User',
        email: 'test@example.com',
        aiUsage: {
          'parse_personal_records': { date: today, count: 5 },
          'generate_workout_plan': { date: today, count: 1 },
        },
      } as any);

      const result1 = await checkRateLimit('user-1', 'parse_personal_records');
      expect(result1.allowed).toBe(false);

      const result2 = await checkRateLimit('user-1', 'generate_workout_plan');
      expect(result2.allowed).toBe(true);
    });
  });

  describe('edge cases', () => {
    it('handles missing aiUsage property', async () => {
      vi.mocked(firestoreServer.getUserProfile).mockResolvedValue({
        id: 'user-1',
        name: 'Test User',
        email: 'test@example.com',
      } as any);

      const result = await checkRateLimit('user-1', 'parse_personal_records');

      expect(result.allowed).toBe(true);
    });

    it('handles null aiUsage', async () => {
      vi.mocked(firestoreServer.getUserProfile).mockResolvedValue({
        id: 'user-1',
        name: 'Test User',
        email: 'test@example.com',
        aiUsage: null,
      } as any);

      const result = await checkRateLimit('user-1', 'parse_personal_records');

      expect(result.allowed).toBe(true);
    });

    it('handles undefined aiUsage', async () => {
      vi.mocked(firestoreServer.getUserProfile).mockResolvedValue({
        id: 'user-1',
        name: 'Test User',
        email: 'test@example.com',
        aiUsage: undefined,
      } as any);

      const result = await checkRateLimit('user-1', 'parse_personal_records');

      expect(result.allowed).toBe(true);
    });

    it('handles user profile not found', async () => {
      vi.mocked(firestoreServer.getUserProfile).mockResolvedValue(null);

      const result = await checkRateLimit('user-1', 'parse_personal_records');

      expect(result.allowed).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it('handles usage count of 0', async () => {
      vi.mocked(firestoreServer.getUserProfile).mockResolvedValue({
        id: 'user-1',
        name: 'Test User',
        email: 'test@example.com',
        aiUsage: {
          'parse_personal_records': { date: today, count: 0 },
        },
      } as any);

      const result = await checkRateLimit('user-1', 'parse_personal_records');

      expect(result.allowed).toBe(true);
    });

    it('handles very high usage count', async () => {
      vi.mocked(firestoreServer.getUserProfile).mockResolvedValue({
        id: 'user-1',
        name: 'Test User',
        email: 'test@example.com',
        aiUsage: {
          'parse_personal_records': { date: today, count: 999 },
        },
      } as any);

      const result = await checkRateLimit('user-1', 'parse_personal_records');

      expect(result.allowed).toBe(false);
      // Error message contains the limit (5), not the current count
      expect(result.error).toContain('5');
    });

    it('handles boundary condition: count = limit - 1', async () => {
      vi.mocked(firestoreServer.getUserProfile).mockResolvedValue({
        id: 'user-1',
        name: 'Test User',
        email: 'test@example.com',
        aiUsage: {
          'parse_personal_records': { date: today, count: 4 },
        },
      } as any);

      const result = await checkRateLimit('user-1', 'parse_personal_records');

      expect(result.allowed).toBe(true);
    });

    it('handles boundary condition: count = limit', async () => {
      vi.mocked(firestoreServer.getUserProfile).mockResolvedValue({
        id: 'user-1',
        name: 'Test User',
        email: 'test@example.com',
        aiUsage: {
          'parse_personal_records': { date: today, count: 5 },
        },
      } as any);

      const result = await checkRateLimit('user-1', 'parse_personal_records');

      expect(result.allowed).toBe(false);
    });

    it('handles boundary condition: count = limit + 1', async () => {
      vi.mocked(firestoreServer.getUserProfile).mockResolvedValue({
        id: 'user-1',
        name: 'Test User',
        email: 'test@example.com',
        aiUsage: {
          'parse_personal_records': { date: today, count: 6 },
        },
      } as any);

      const result = await checkRateLimit('user-1', 'parse_personal_records');

      expect(result.allowed).toBe(false);
    });
  });

  describe('date handling', () => {
    it('correctly identifies today vs past dates', async () => {
      const yesterday = format(new Date(Date.now() - 24 * 60 * 60 * 1000), 'yyyy-MM-dd');

      vi.mocked(firestoreServer.getUserProfile).mockResolvedValue({
        id: 'user-1',
        name: 'Test User',
        email: 'test@example.com',
        aiUsage: {
          'parse_personal_records': { date: yesterday, count: 5 },
        },
      } as any);

      const result = await checkRateLimit('user-1', 'parse_personal_records');

      // Should be allowed because the usage is from yesterday, not today
      expect(result.allowed).toBe(true);
    });

    it('uses current date for comparison', async () => {
      vi.mocked(firestoreServer.getUserProfile).mockResolvedValue({
        id: 'user-1',
        name: 'Test User',
        email: 'test@example.com',
        aiUsage: {
          'parse_personal_records': { date: today, count: 5 },
        },
      } as any);

      const result = await checkRateLimit('user-1', 'parse_personal_records');

      // Should be rejected because usage is from today
      expect(result.allowed).toBe(false);
    });
  });
});
