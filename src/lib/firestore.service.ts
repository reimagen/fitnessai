
"use client";

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
    getWorkoutLogs,
    addWorkoutLog,
    updateWorkoutLog,
    deleteWorkoutLog,
} from '@/app/history/actions';
import {
    getPersonalRecords,
    addPersonalRecords,
    updatePersonalRecord,
} from '@/app/prs/actions';
import { getUserProfile, updateUserProfile } from '@/app/profile/actions';
import type { WorkoutLog, PersonalRecord, UserProfile } from './types';
import { useAuth } from './auth.service';


// --- React Query Hooks ---

export function useWorkouts(forMonth?: Date) {
  const { user } = useAuth();
  // The query key now includes the month and user ID, so each month's data is cached separately per user.
  const queryKey = forMonth 
    ? ['workouts', user?.uid, forMonth.toISOString().slice(0, 7)] // e.g., ['workouts', 'some-uid', '2025-07']
    : ['workouts', user?.uid, 'all'];

  return useQuery<WorkoutLog[], Error>({ 
    queryKey: queryKey, 
    queryFn: () => getWorkoutLogs(user!.uid, forMonth),
    enabled: !!user // Only run the query if the user is logged in
  });
}

export function useAddWorkoutLog() {
    const queryClient = useQueryClient();
    const { user } = useAuth();
    return useMutation({
        mutationFn: (log: Omit<WorkoutLog, 'id' | 'userId'>) => addWorkoutLog(user!.uid, log),
        onSuccess: () => {
            // Invalidate all workout queries for the current user to ensure any month's view is updated.
            queryClient.invalidateQueries({ queryKey: ['workouts', user?.uid] });
        },
    });
}

export function useUpdateWorkoutLog() {
    const queryClient = useQueryClient();
    const { user } = useAuth();
    return useMutation<void, Error, { id: string, data: Partial<Omit<WorkoutLog, 'id' | 'userId'>> }>({
        mutationFn: ({ id, data }) => updateWorkoutLog(user!.uid, id, data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['workouts', user?.uid] });
        },
    });
}

export function useDeleteWorkoutLog() {
    const queryClient = useQueryClient();
    const { user } = useAuth();
    return useMutation({
        mutationFn: (id: string) => deleteWorkoutLog(user!.uid, id),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['workouts', user?.uid] });
        },
    });
}

export function usePersonalRecords() {
  const { user } = useAuth();
  return useQuery<PersonalRecord[], Error>({ 
    queryKey: ['prs', user?.uid], 
    queryFn: () => getPersonalRecords(user!.uid),
    enabled: !!user // Only run the query if the user is logged in
  });
}

export function useAddPersonalRecords() {
    const queryClient = useQueryClient();
    const { user } = useAuth();
    return useMutation({
        mutationFn: (records: Omit<PersonalRecord, 'id' | 'userId'>[]) => addPersonalRecords(user!.uid, records),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['prs', user?.uid] });
        }
    })
}

export function useUpdatePersonalRecord() {
    const queryClient = useQueryClient();
    const { user } = useAuth();
    return useMutation<void, Error, { id: string, data: Partial<Omit<PersonalRecord, 'id' | 'userId'>> }>({
        mutationFn: ({ id, data }) => updatePersonalRecord(user!.uid, id, data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['prs', user?.uid] });
        },
    });
}

export function useUserProfile() {
    const { user } = useAuth();
    return useQuery<UserProfile | null, Error>({ 
      queryKey: ['profile', user?.uid], 
      queryFn: () => getUserProfile(user!.uid),
      enabled: !!user, // Only fetch profile if user is authenticated
      staleTime: 1000 * 60 * 5, // 5 minutes
      refetchOnWindowFocus: false,
    });
}

export function useUpdateUserProfile() {
    const queryClient = useQueryClient();
    const { user } = useAuth();
    return useMutation<void, Error, Partial<Omit<UserProfile, 'id'>>>({
        mutationFn: (data: Partial<Omit<UserProfile, 'id'>>) => updateUserProfile(user!.uid, data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['profile', user?.uid] });
            // Invalidate PRs in case user stats that affect levels have changed
            queryClient.invalidateQueries({ queryKey: ['prs', user?.uid] });
        }
    })
}
