
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

export function useWorkouts(forDateRange?: Date | { start: Date, end: Date }, enabled: boolean = true) {
  const { user } = useAuth();
  
  let dateKey: string | undefined;
  if (forDateRange) {
    if (forDateRange instanceof Date) {
      dateKey = format(forDateRange, 'yyyy-MM');
    } else {
      dateKey = `${format(forDateRange.start, 'yyyy-MM-dd')}-to-${format(forDateRange.end, 'yyyy-MM-dd')}`;
    }
  }

  const queryKey = ['workouts', user?.uid, dateKey || 'all'];

  // --- Caching Strategy ---
  // - Past Months (History Page): Cache forever (`Infinity`). Data is historical and won't change.
  // - Current Month (History Page): `staleTime: 0`. Always show cached data instantly, but trigger a background refetch to ensure it's up-to-date.
  // - Current Week (Home Page): Handled by `useCurrentWeekWorkouts`.
  // - All Workouts (Analysis/Profile Pages): Cache for 5 minutes. A reasonable balance for pages that need a full but not necessarily real-time overview.
  let staleTime: number | undefined = 1000 * 60 * 5; // 5 minute default for "all"
  if (forDateRange && forDateRange instanceof Date) {
      staleTime = isSameMonth(forDateRange, new Date()) ? 0 : Infinity;
  }

  return useQuery<WorkoutLog[], Error>({ 
    queryKey, 
    queryFn: () => {
      if (forDateRange && forDateRange instanceof Date) {
        return getWorkoutLogs(user!.uid, { forMonth: forDateRange });
      } else if (forDateRange) { // This handles the { start, end } case for AI context
        return getWorkoutLogs(user!.uid, { since: forDateRange.start });
      }
      return getWorkoutLogs(user!.uid);
    },
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
        // The home page doesn't need to be real-time. An hour is fine.
        // It gets invalidated manually after logging a workout anyway.
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
          return { data: null, notFound: true as const };
        }
        return { data: profile, notFound: false as const };
      },
      enabled: !!user,
      // Custom logic to handle new user caching issue
      staleTime: 1000 * 60 * 60, // 1 hour for existing users
      refetchOnMount: (query) => {
        const data = query.state.data as { data: UserProfile | null; notFound: boolean } | undefined;
        // If the last fetch resulted in "not found", always refetch on mount to avoid race condition.
        if (data?.notFound) {
            return true;
        }
        // Use default behavior for existing users (respect staleTime)
        return 'always';
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
