
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

export function useWorkouts() {
  return useQuery<WorkoutLog[], Error>({ queryKey: ['workouts'], queryFn: getWorkoutLogs });
}

export function useAddWorkoutLog() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: serverAddWorkoutLog,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['workouts'] });
        },
    });
}

export function useUpdateWorkoutLog() {
    const queryClient = useQueryClient();
    return useMutation<void, Error, { id: string, data: Omit<WorkoutLog, 'id'> }>({
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
