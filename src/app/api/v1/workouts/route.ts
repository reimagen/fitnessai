/**
 * Workouts API Routes
 * GET /api/v1/workouts - List user's workouts
 * POST /api/v1/workouts - Create new workout
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
  getWorkoutLogs,
  addWorkoutLog,
} from '@/app/history/actions';
import { logger } from '@/lib/logging/logger';
import { createRequestContext } from '@/lib/logging/request-context';

// Validation schemas
const WorkoutQuerySchema = z.object({
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
  since: z.string().datetime().optional(),
});

const ExerciseSchema = z.object({
  id: z.string(),
  name: z.string(),
  sets: z.number().int().nonnegative(),
  reps: z.number().int().nonnegative(),
  weight: z.number().nonnegative(),
  weightUnit: z.enum(['kg', 'lbs']).optional(),
  category: z.enum(['Cardio', 'Lower Body', 'Upper Body', 'Full Body', 'Core', 'Other']).optional(),
  distance: z.number().nonnegative().optional(),
  distanceUnit: z.enum(['mi', 'km', 'ft', 'm']).optional(),
  duration: z.number().nonnegative().optional(),
  durationUnit: z.enum(['min', 'hr', 'sec']).optional(),
  calories: z.number().nonnegative().optional(),
}).passthrough();

const CreateWorkoutSchema = z.object({
  date: z.string().datetime().transform(d => new Date(d)),
  exercises: z.array(ExerciseSchema),
  notes: z.string().optional(),
});

/**
 * GET /api/v1/workouts
 * List user's workouts with optional date filtering
 */
export async function GET(request: NextRequest) {
  return withAuthentication(request, async (req: AuthenticatedRequest) => {
    try {
      const { searchParams } = new URL(request.url);
      const queryData = {
        startDate: searchParams.get('startDate') || undefined,
        endDate: searchParams.get('endDate') || undefined,
        since: searchParams.get('since') || undefined,
      };

      const validatedQuery = WorkoutQuerySchema.safeParse(queryData);
      if (!validatedQuery.success) {
        return NextResponse.json(
          createSuccessResponse({
            error: `Invalid query parameters: ${validatedQuery.error.message}`,
          }),
          { status: 400 }
        );
      }

      const workouts = await getWorkoutLogs(req.userId, {
        startDate: validatedQuery.data.startDate ? new Date(validatedQuery.data.startDate) : undefined,
        endDate: validatedQuery.data.endDate ? new Date(validatedQuery.data.endDate) : undefined,
        since: validatedQuery.data.since ? new Date(validatedQuery.data.since) : undefined,
      });

      const context = createRequestContext({
        userId: req.userId,
        route: '/api/v1/workouts',
        feature: 'workouts',
      });

      await logger.info(`Retrieved ${workouts.length} workouts`, context);

      return NextResponse.json(
        createSuccessResponse({
          workouts,
          count: workouts.length,
        }),
        { status: 200 }
      );
    } catch (error) {
      return handleApiError(error);
    }
  });
}

/**
 * POST /api/v1/workouts
 * Create new workout log
 */
export async function POST(request: NextRequest) {
  return withAuthentication(request, async (req: AuthenticatedRequest) => {
    try {
      const body = await request.json();

      const validatedBody = CreateWorkoutSchema.safeParse(body);
      if (!validatedBody.success) {
        return NextResponse.json(
          createSuccessResponse({
            error: `Invalid workout data: ${validatedBody.error.message}`,
          }),
          { status: 400 }
        );
      }

      const result = await addWorkoutLog(req.userId, validatedBody.data);

      const context = createRequestContext({
        userId: req.userId,
        route: '/api/v1/workouts',
        feature: 'workouts',
      });

      await logger.info(`Created workout ${result.id}`, context);

      return NextResponse.json(
        createSuccessResponse({
          id: result.id,
          message: 'Workout logged successfully',
        }),
        { status: 201 }
      );
    } catch (error) {
      return handleApiError(error);
    }
  });
}
