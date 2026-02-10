/**
 * Goals API Routes
 * GET /api/v1/goals - Get user's fitness goals
 * POST /api/v1/goals - Save user's fitness goals
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
  getGoalsAction,
  saveGoalsAction,
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

const SaveGoalsSchema = z.array(FitnessGoalSchema);

/**
 * GET /api/v1/goals
 * Get user's fitness goals
 */
export async function GET(request: NextRequest) {
  return withAuthentication(request, async (req: AuthenticatedRequest) => {
    try {
      const response = await getGoalsAction(req.userId);

      if (!response.success) {
        return NextResponse.json(
          { error: response.error || 'Failed to fetch goals' },
          { status: 500 }
        );
      }

      const context = createRequestContext({
        userId: req.userId,
        route: '/api/v1/goals',
        feature: 'goals',
      });

      await logger.info(`Retrieved ${response.data?.length || 0} goals`, context);

      return NextResponse.json(
        createSuccessResponse({
          goals: response.data || [],
          count: response.data?.length || 0,
        }),
        { status: 200 }
      );
    } catch (error) {
      return handleApiError(error);
    }
  });
}

/**
 * POST /api/v1/goals
 * Save user's fitness goals
 */
export async function POST(request: NextRequest) {
  return withAuthentication(request, async (req: AuthenticatedRequest) => {
    try {
      const body = await request.json();

      const validatedBody = SaveGoalsSchema.safeParse(body);
      if (!validatedBody.success) {
        return NextResponse.json(
          { error: `Invalid goals data: ${validatedBody.error.message}` },
          { status: 400 }
        );
      }

      // Transform dates
      const goalsData = validatedBody.data.map(goal => ({
        ...goal,
        targetDate: new Date(goal.targetDate),
        dateAchieved: goal.dateAchieved ? new Date(goal.dateAchieved) : undefined,
      }));

      const response = await saveGoalsAction(req.userId, goalsData);

      if (!response.success) {
        return NextResponse.json(
          { error: response.error || 'Failed to save goals' },
          { status: 500 }
        );
      }

      const context = createRequestContext({
        userId: req.userId,
        route: '/api/v1/goals',
        feature: 'goals',
      });

      await logger.info(`Saved ${validatedBody.data.length} goals`, context);

      return NextResponse.json(
        createSuccessResponse({
          message: 'Goals saved successfully',
          count: validatedBody.data.length,
        }),
        { status: 200 }
      );
    } catch (error) {
      return handleApiError(error);
    }
  });
}
