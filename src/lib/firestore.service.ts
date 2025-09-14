
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
    analyzeGoalsAction,
} from '@/app/profile/actions';
import { analyzeStrengthAction } from '@/app/analysis/actions';
import type { WorkoutLog, PersonalRecord, UserProfile, AnalyzeLiftProgressionInput, StrengthImbalanceInput, AnalyzeFitnessGoalsInput } from './types';
import { useAuth } from './auth.service';
import { format, isSameMonth } from 'date-fns';
import { useToast } from '@/hooks/use-toast';


// --- React Query Hooks ---

export function useWorkouts(forMonth: Date, enabled: boolean = true) {
  const { user } = useAuth();
  const queryKey = ['workouts', user?.uid, format(forMonth, 'yyyy-MM')];

  // For past months, cache "forever". For the current month, refetch in the background.
  const staleTime = isSameMonth(forMonth, new Date()) ? 0 : Infinity;

  return useQuery<WorkoutLog[], Error>({ 
    queryKey, 
    queryFn: () => getWorkoutLogs(user!.uid, { forMonth }),
    enabled: !!user && enabled,
    staleTime: staleTime,
  });
}


type AddWorkoutPayload = {
  userId: string;
  data: Omit<WorkoutLog, 'id' | 'userId'>;
};

export function useAddWorkoutLog() {
    const queryClient = useQueryClient();
    const { user } = useAuth();
    return useMutation({
        mutationFn: ({ userId, data }: AddWorkoutPayload) => addWorkoutLog(userId, data),
        onSuccess: () => {
            // Invalidate all workout queries for this user to be safe
            queryClient.invalidateQueries({ queryKey: ['workouts', user?.uid] });
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
    const { user } = useAuth();
    return useMutation<void, Error, UpdateWorkoutPayload>({
        mutationFn: ({ userId, id, data }) => updateWorkoutLog(userId, id, data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['workouts', user?.uid] });
        },
    });
}

type DeleteWorkoutPayload = {
  userId: string;
  logId: string;
};

export function useDeleteWorkoutLog() {
    const queryClient = useQueryClient();
     const { user } = useAuth();
    return useMutation({
        mutationFn: ({ userId, logId }: DeleteWorkoutPayload) => deleteWorkoutLog(userId, logId),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['workouts', user?.uid] });
        },
    });
}

export function usePersonalRecords(enabled: boolean = true) {
  const { user } = useAuth();
  return useQuery<PersonalRecord[], Error>({ 
    queryKey: ['prs', user?.uid], 
    queryFn: () => getPersonalRecords(user!.uid),
    enabled: !!user && enabled,
    staleTime: 1000 * 60 * 60, // 1 hour
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
        onSuccess: (response, variables) => {
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
      staleTime: 1000 * 60 * 60, // 1 hour. A user's core profile data doesn't change that often.
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
            queryClient.invalidateQueries({ queryKey: ['profile', user?.uid] });
        },
        onError: (error) => {
            const isLimitError = error.message.toLowerCase().includes('limit');
            toast({ 
                title: isLimitError ? "Daily Limit Reached" : "Analysis Failed",
                description: error.message, 
                variant: "destructive" 
            });
        }
    });
}

export function useAnalyzeStrength() {
    const queryClient = useQueryClient();
    const { user } = useAuth();
    const { toast } = useToast();

    return useMutation<void, Error, StrengthImbalanceInput>({
        mutationFn: (values: StrengthImbalanceInput) =>
            analyzeStrengthAction(user!.uid, values).then(result => {
                if (!result.success) {
                    throw new Error(result.error || "An unknown error occurred during strength analysis.");
                }
                return;
            }),
        onSuccess: () => {
            toast({ title: "Strength Analysis Complete!", description: "Your AI-powered insights have been generated." });
            queryClient.invalidateQueries({ queryKey: ['profile', user?.uid] });
        },
        onError: (error) => {
            const isLimitError = error.message.toLowerCase().includes('limit');
            toast({ 
                title: isLimitError ? "Daily Limit Reached" : "Analysis Failed",
                description: error.message, 
                variant: "destructive" 
            });
        },
    });
}

export function useAnalyzeGoals() {
    const queryClient = useQueryClient();
    const { user } = useAuth();
    const { toast } = useToast();

    return useMutation<void, Error, AnalyzeFitnessGoalsInput>({
        mutationFn: (values: AnalyzeFitnessGoalsInput) =>
            analyzeGoalsAction(user!.uid, values).then(result => {
                if (!result.success) {
                    throw new Error(result.error || "An unknown error occurred during goal analysis.");
                }
                return;
            }),
        onSuccess: () => {
            toast({ title: "Goal Analysis Complete!", description: "Your AI-powered feedback is ready." });
            queryClient.invalidateQueries({ queryKey: ['profile', user?.uid] });
        },
        onError: (error) => {
            const isLimitError = error.message.toLowerCase().includes('limit');
            toast({ 
                title: isLimitError ? "Daily Limit Reached" : "Analysis Failed",
                description: error.message, 
                variant: "destructive" 
            });
        },
    });
}
