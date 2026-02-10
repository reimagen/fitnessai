/**
 * Individual Workout API Routes
 * GET /api/v1/workouts/:id - Get specific workout
 * PUT /api/v1/workouts/:id - Update workout
 * DELETE /api/v1/workouts/:id - Delete workout
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
  updateWorkoutLog,
  deleteWorkoutLog,
  getWorkoutLogs,
} from '@/app/history/actions';
import { logger } from '@/lib/logging/logger';
import { createRequestContext } from '@/lib/logging/request-context';

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

const UpdateWorkoutSchema = z.object({
  date: z.string().datetime().optional(),
  exercises: z.array(ExerciseSchema).optional(),
  notes: z.string().optional(),
});

/**
 * GET /api/v1/workouts/:id
 * Get specific workout
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return withAuthentication(request, async (req: AuthenticatedRequest) => {
    try {
      const { id } = await params;

      const workouts = await getWorkoutLogs(req.userId);
      const workout = workouts.find(w => w.id === id);

      if (!workout) {
        return NextResponse.json(
          { error: 'Workout not found' },
          { status: 404 }
        );
      }

      return NextResponse.json(
        createSuccessResponse({ workout }),
        { status: 200 }
      );
    } catch (error) {
      return handleApiError(error);
    }
  });
}

/**
 * PUT /api/v1/workouts/:id
 * Update workout
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return withAuthentication(request, async (req: AuthenticatedRequest) => {
    try {
      const { id } = await params;
      const body = await request.json();

      const validatedBody = UpdateWorkoutSchema.safeParse(body);
      if (!validatedBody.success) {
        return NextResponse.json(
          { error: `Invalid workout data: ${validatedBody.error.message}` },
          { status: 400 }
        );
      }

      const updateData = {
        date: validatedBody.data.date ? new Date(validatedBody.data.date) : undefined,
        exercises: validatedBody.data.exercises,
        notes: validatedBody.data.notes,
      };

      await updateWorkoutLog(req.userId, id, updateData);

      const context = createRequestContext({
        userId: req.userId,
        route: `/api/v1/workouts/${id}`,
        feature: 'workouts',
      });

      await logger.info(`Updated workout ${id}`, context);

      return NextResponse.json(
        createSuccessResponse({ message: 'Workout updated successfully' }),
        { status: 200 }
      );
    } catch (error) {
      return handleApiError(error);
    }
  });
}

/**
 * DELETE /api/v1/workouts/:id
 * Delete workout
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return withAuthentication(request, async (req: AuthenticatedRequest) => {
    try {
      const { id } = await params;

      await deleteWorkoutLog(req.userId, id);

      const context = createRequestContext({
        userId: req.userId,
        route: `/api/v1/workouts/${id}`,
        feature: 'workouts',
      });

      await logger.info(`Deleted workout ${id}`, context);

      return NextResponse.json(
        createSuccessResponse({ message: 'Workout deleted successfully' }),
        { status: 200 }
      );
    } catch (error) {
      return handleApiError(error);
    }
  });
}
