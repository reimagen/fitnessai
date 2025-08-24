
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
    clearAllPersonalRecords,
} from '@/app/prs/actions';
import {
    getUserProfile,
    updateUserProfile,
    analyzeLiftProgressionAction,
} from '@/app/profile/actions';
import type { WorkoutLog, PersonalRecord, UserProfile, AnalyzeLiftProgressionInput } from './types';
import { useAuth } from './auth.service';
import { format } from 'date-fns';
import { useToast } from '@/hooks/use-toast';


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

type AddWorkoutPayload = {
  userId: string;
  data: Omit<WorkoutLog, 'id' | 'userId'>;
};

export function useAddWorkoutLog() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: ({ userId, data }: AddWorkoutPayload) => addWorkoutLog(userId, data),
        onSuccess: (_, variables) => {
            queryClient.invalidateQueries({ queryKey: ['workouts', variables.userId] });
        },
    });
}

type UpdateWorkoutPayload = {
  userId: string;
  id: string;
  data: Partial<Omit<WorkoutLog, 'id' | 'userId'>>;
};

export function useUpdateWorkoutLog() {
    const queryClient = useQueryClient();
    return useMutation<void, Error, UpdateWorkoutPayload>({
        mutationFn: ({ userId, id, data }) => updateWorkoutLog(userId, id, data),
        onSuccess: (_, variables) => {
            queryClient.invalidateQueries({ queryKey: ['workouts', variables.userId] });
        },
    });
}

type DeleteWorkoutPayload = {
  userId: string;
  logId: string;
};

export function useDeleteWorkoutLog() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: ({ userId, logId }: DeleteWorkoutPayload) => deleteWorkoutLog(userId, logId),
        onSuccess: (_, variables) => {
            queryClient.invalidateQueries({ queryKey: ['workouts', variables.userId] });
        },
    });
}

export function usePersonalRecords(enabled: boolean = true) {
  const { user } = useAuth();
  return useQuery<PersonalRecord[], Error>({ 
    queryKey: ['prs', user?.uid], 
    queryFn: () => getPersonalRecords(user!.uid),
    enabled: !!user && enabled
  });
}

type AddPersonalRecordsPayload = {
  userId: string;
  records: Omit<PersonalRecord, 'id' | 'userId'>[];
};

export function useAddPersonalRecords() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: ({ userId, records }: AddPersonalRecordsPayload) => addPersonalRecords(userId, records),
        onSuccess: (_, variables) => {
            queryClient.invalidateQueries({ queryKey: ['prs', variables.userId] });
        }
    })
}

type UpdatePersonalRecordPayload = {
  userId: string;
  id: string;
  data: {
    weight?: number;
    date?: Date;
  };
};

export function useUpdatePersonalRecord() {
    const queryClient = useQueryClient();
    return useMutation<void, Error, UpdatePersonalRecordPayload>({
        mutationFn: ({ userId, id, data }) => updatePersonalRecord(userId, id, data),
        onSuccess: (_, variables) => {
            queryClient.invalidateQueries({ queryKey: ['prs', variables.userId] });
        },
    });
}

export function useClearAllPersonalRecords() {
    const queryClient = useQueryClient();
    return useMutation<void, Error, string>({
        mutationFn: (userId: string) => clearAllPersonalRecords(userId),
        onSuccess: (_, userId) => {
            queryClient.invalidateQueries({ queryKey: ['prs', userId] });
        }
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
      refetchOnWindowFocus: true,
      refetchOnMount: true,
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

export function useAnalyzeLiftProgression() {
    const queryClient = useQueryClient();
    const { user } = useAuth();
    const { toast } = useToast();

    return useMutation<void, Error, AnalyzeLiftProgressionInput>({
        mutationFn: (values: AnalyzeLiftProgressionInput) => 
            analyzeLiftProgressionAction(user!.uid, values).then(result => {
                if (!result.success) {
                    throw new Error(result.error || "An unknown error occurred during analysis.");
                }
            }),
        onSuccess: () => {
            toast({ title: "Progression Analysis Complete!", description: "Your AI-powered insights are ready." });
            // This is the key step: invalidate the profile to refetch the new analysis.
            queryClient.invalidateQueries({ queryKey: ['profile', user?.uid] });
        },
        onError: (error) => {
            toast({ title: "Analysis Failed", description: error.message, variant: "destructive" });
        }
    });
}
