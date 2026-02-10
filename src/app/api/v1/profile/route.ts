/**
 * Profile API Routes
 * GET /api/v1/profile - Get user profile
 * PUT /api/v1/profile - Update user profile
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import {
  withAuthentication,
  handleApiError,
  createSuccessResponse,
  AuthenticatedRequest,
} from '@/lib/api/middleware';
import {
  getUserProfile,
  updateUserProfile,
} from '@/app/profile/actions';
import { logger } from '@/lib/logging/logger';
import { createRequestContext } from '@/lib/logging/request-context';

const FitnessGoalSchema = z.object({
  id: z.string(),
  description: z.string(),
  targetDate: z.string().datetime(),
  achieved: z.boolean(),
  dateAchieved: z.string().datetime().optional(),
  isPrimary: z.boolean().optional(),
});

const UpdateProfileSchema = z.object({
  name: z.string().optional(),
  email: z.string().email().optional(),
  age: z.number().positive().optional(),
  gender: z.enum(['male', 'female', 'other']).optional(),
  weightValue: z.number().positive().optional(),
  weightUnit: z.enum(['lbs', 'kg']).optional(),
  skeletalMuscleMassValue: z.number().positive().optional(),
  skeletalMuscleMassUnit: z.enum(['lbs', 'kg']).optional(),
  fitnessGoals: z.array(FitnessGoalSchema).optional(),
}).passthrough();

/**
 * GET /api/v1/profile
 * Get current user's profile
 */
export async function GET(request: NextRequest) {
  return withAuthentication(request, async (req: AuthenticatedRequest) => {
    try {
      const profile = await getUserProfile(req.userId);

      if (!profile) {
        return NextResponse.json(
          { error: 'User profile not found' },
          { status: 404 }
        );
      }

      const context = createRequestContext({
        userId: req.userId,
        route: '/api/v1/profile',
        feature: 'profile',
      });

      await logger.info('Retrieved user profile', context);

      return NextResponse.json(
        createSuccessResponse({ profile }),
        { status: 200 }
      );
    } catch (error) {
      return handleApiError(error);
    }
  });
}

/**
 * PUT /api/v1/profile
 * Update user profile
 */
export async function PUT(request: NextRequest) {
  return withAuthentication(request, async (req: AuthenticatedRequest) => {
    try {
      const body = await request.json();

      const validatedBody = UpdateProfileSchema.safeParse(body);
      if (!validatedBody.success) {
        return NextResponse.json(
          { error: `Invalid profile data: ${validatedBody.error.message}` },
          { status: 400 }
        );
      }

      // Transform dates if present in fitnessGoals
      const dataToUpdate = {
        ...validatedBody.data,
        fitnessGoals: validatedBody.data.fitnessGoals?.map(goal => ({
          ...goal,
          targetDate: new Date(goal.targetDate),
          dateAchieved: goal.dateAchieved ? new Date(goal.dateAchieved) : undefined,
        })),
      };

      await updateUserProfile(req.userId, dataToUpdate);

      const context = createRequestContext({
        userId: req.userId,
        route: '/api/v1/profile',
        feature: 'profile',
      });

      await logger.info('Updated user profile', context);

      return NextResponse.json(
        createSuccessResponse({ message: 'Profile updated successfully' }),
        { status: 200 }
      );
    } catch (error) {
      return handleApiError(error);
    }
  });
}
