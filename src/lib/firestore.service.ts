
"use client";

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
    getWorkoutLogs,
    addWorkoutLog as serverAddWorkoutLog,
    updateWorkoutLog as serverUpdateWorkoutLog,
    deleteWorkoutLog as serverDeleteWorkoutLog,
    getPersonalRecords,
    addPersonalRecords,
    updatePersonalRecord,
    getUserProfile,
    updateUserProfile
} from './firestore-server';
import type { WorkoutLog, PersonalRecord, UserProfile } from './types';


// --- React Query Hooks ---

export function useWorkouts(forMonth?: Date) {
  // The query key now includes the month, so each month's data is cached separately.
  // If no month is provided, it fetches all logs (for context views).
  const queryKey = forMonth 
    ? ['workouts', forMonth.toISOString().slice(0, 7)] // e.g., ['workouts', '2025-07']
    : ['workouts', 'all'];

  return useQuery<WorkoutLog[], Error>({ 
    queryKey: queryKey, 
    queryFn: () => getWorkoutLogs(forMonth) 
  });
}

export function useAddWorkoutLog() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: serverAddWorkoutLog,
        onSuccess: () => {
            // Invalidate all workout queries to ensure any month's view is updated.
            queryClient.invalidateQueries({ queryKey: ['workouts'] });
        },
    });
}

export function useUpdateWorkoutLog() {
    const queryClient = useQueryClient();
    return useMutation<void, Error, { id: string, data: Partial<Omit<WorkoutLog, 'id'>> }>({
        mutationFn: ({ id, data }) => serverUpdateWorkoutLog(id, data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['workouts'] });
        },
    });
}

export function useDeleteWorkoutLog() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: serverDeleteWorkoutLog,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['workouts'] });
        },
    });
}

export function usePersonalRecords() {
  return useQuery<PersonalRecord[], Error>({ queryKey: ['prs'], queryFn: getPersonalRecords });
}

export function useAddPersonalRecords() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: addPersonalRecords,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['prs'] });
        }
    })
}

export function useUpdatePersonalRecord() {
    const queryClient = useQueryClient();
    return useMutation<void, Error, { id: string, data: Partial<Omit<PersonalRecord, 'id'>> }>({
        mutationFn: ({ id, data }) => updatePersonalRecord(id, data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['prs'] });
        },
    });
}

export function useUserProfile() {
    return useQuery<UserProfile, Error>({ queryKey: ['profile'], queryFn: getUserProfile, retry: false });
}

export function useUpdateUserProfile() {
    const queryClient = useQueryClient();
    return useMutation<void, Error, Partial<Omit<UserProfile, 'id'>>>({
        mutationFn: updateUserProfile,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['profile'] });
            queryClient.invalidateQueries({ queryKey: ['prs'] }); // Invalidate PRs in case goals were completed
        }
    })
}
