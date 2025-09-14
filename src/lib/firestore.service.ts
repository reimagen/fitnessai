
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

export function useWorkouts(forMonth?: Date, enabled: boolean = true) {
  const { user } = useAuth();
  // If forMonth is provided, create a specific key for that month. Otherwise, a general key.
  const queryKey = ['workouts', user?.uid, forMonth ? format(forMonth, 'yyyy-MM') : 'all'];

  // For past months, cache "forever". For the current month, cache for 1 hour. For all data, cache for 1 hour.
  let staleTime = 1000 * 60 * 60; // 1 hour default
  if (forMonth && !isSameMonth(forMonth, new Date())) {
    staleTime = Infinity;
  }

  return useQuery<WorkoutLog[], Error>({ 
    queryKey, 
    queryFn: () => getWorkoutLogs(user!.uid, { forMonth }),
    enabled: !!user && enabled,
    staleTime: staleTime,
  });
}

export function useCurrentWeekWorkouts(enabled: boolean = true) {
    const { user } = useAuth();
    const queryKey = ['workouts', user?.uid, 'currentWeek'];
    
    return useQuery<WorkoutLog[], Error>({
        queryKey,
        queryFn: () => getWorkoutLogs(user!.uid, { forCurrentWeek: true }),
        enabled: !!user && enabled,
        staleTime: 1000 * 60 * 60, // 1 hour cache
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
    staleTime: 1000 * 60 * 60 * 24, // 24 hours
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
          return { data: null, notFound: true as const };
        }
        return { data: profile, notFound: false as const };
      },
      enabled: !!user,
      staleTime: 1000 * 60 * 60, // 1 hour. A user's core profile data doesn't change that often.
      // Custom logic to handle new user caching issue
      refetchOnMount: (query) => {
        const data = query.state.data as { data: UserProfile | null; notFound: boolean } | undefined;
        // If the last fetch resulted in "not found", always refetch on mount.
        // Otherwise, respect the staleTime.
        if (data?.notFound) {
            return true;
        }
        return 'always'; // default behavior
      }
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
