
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
import { format } from 'date-fns';


// --- React Query Hooks ---

export function useWorkouts(forMonth?: Date, enabled: boolean = true) {
  const { user } = useAuth();
  // The query key now includes the month and user ID, so each month's data is cached separately per user.
  const monthKey = forMonth ? format(forMonth, 'yyyy-MM') : 'all';
  const queryKey = ['workouts', user?.uid, monthKey];

  return useQuery<WorkoutLog[], Error>({ 
    queryKey: queryKey, 
    queryFn: () => getWorkoutLogs(user!.uid, forMonth),
    enabled: !!user && enabled
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

// Define the type for data sent from the client to the mutation.
// The date should now be a Date object to align with the 'create' flow.
type UpdatePersonalRecordClientPayload = {
  id: string;
  data: {
    weight?: number;
    date?: Date;
  };
};

export function useUpdatePersonalRecord() {
    const queryClient = useQueryClient();
    const { user } = useAuth();
    return useMutation<void, Error, UpdatePersonalRecordClientPayload>({
        mutationFn: ({ id, data }) => updatePersonalRecord(user!.uid, id, data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['prs', user?.uid] });
        },
    });
}

export function useUserProfile() {
    const { user } = useAuth();
    return useQuery<{ data: UserProfile | null; notFound: boolean }, Error>({
      queryKey: ['profile', user?.uid], 
      queryFn: async () => {
        const profile = await getUserProfile(user!.uid);
        if (profile === null) {
          // This is a new user, not an error.
          return { data: null, notFound: true as const };
        }
        return { data: profile, notFound: false as const };
      },
      enabled: !!user, // Only fetch profile if user is authenticated
      staleTime: 1000 * 60 * 5, // 5 minutes
      refetchOnWindowFocus: false,
      refetchOnMount: true, // Always refetch when the component mounts
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
