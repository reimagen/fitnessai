
"use client";

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { collection, getDocs, query, where } from 'firebase/firestore';
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
import { getWeeklyPlanAction, saveWeeklyPlanAction } from '@/app/plan/actions';
import { analyzeStrengthAction, getLiftStrengthLevelAction, getStrengthAnalysisAction, saveStrengthAnalysisAction } from '@/app/analysis/actions';
import { getGoalAnalysisAction, saveGoalAnalysisAction } from '@/app/profile/actions';
import type { WorkoutLog, PersonalRecord, UserProfile, AnalyzeLiftProgressionInput, StrengthImbalanceInput, AnalyzeFitnessGoalsInput, ExerciseCategory, GetLiftStrengthLevelInput, StrengthLevel, StoredWeeklyPlan, StoredStrengthAnalysis, StoredGoalAnalysis } from './types';
import type { AliasDocument, ExerciseDocument, EquipmentType } from './exercise-types';
import { useAuth } from './auth.service';
import { format, isSameMonth, getWeek, getYear, startOfWeek, endOfWeek, startOfMonth, endOfMonth } from 'date-fns';
import { useToast } from '@/hooks/useToast';
import { db } from './firebase';

const EXERCISE_CATEGORIES: ExerciseCategory[] = [
  'Cardio',
  'Lower Body',
  'Upper Body',
  'Full Body',
  'Core',
  'Other',
];

const EQUIPMENT_TYPES: EquipmentType[] = [
  'machine',
  'barbell',
  'dumbbell',
  'cable',
  'bodyweight',
  'band',
  'kettlebell',
  'other',
];

function toExerciseCategory(value: unknown): ExerciseCategory {
  return EXERCISE_CATEGORIES.includes(value as ExerciseCategory)
    ? (value as ExerciseCategory)
    : 'Other';
}

function toEquipmentType(value: unknown): EquipmentType {
  return EQUIPMENT_TYPES.includes(value as EquipmentType)
    ? (value as EquipmentType)
    : 'other';
}


// --- React Query Hooks ---

export function useWorkouts(forDateRange?: Date | { start: Date, end: Date } | undefined, enabled: boolean = true) {
  const { user } = useAuth();

  let dateKey: string | undefined;
  if (forDateRange) {
    if (forDateRange instanceof Date) {
      dateKey = format(forDateRange, 'yyyy-MM');
    } else {
      // Create a key for the date range object
      dateKey = `since-${format(forDateRange.start, 'yyyy-MM-dd')}`;
    }
  } else {
    dateKey = 'all';
  }

  const queryKey = ['workouts', user?.uid, dateKey];

  // --- Caching Strategy ---
  // - Past Months (History Page): Cache forever (`Infinity`). Data is historical and won't change.
  // - Current Month (History Page): Cache for 1 hour. It's only updated from this page, and mutations invalidate it.
  // - Date Range (AI Context): Cache for 5 minutes.
  // - All Workouts (Analysis Page): Cache for 5 minutes.
  let staleTime: number | undefined = 1000 * 60 * 5; // 5 minute default
  if (forDateRange && forDateRange instanceof Date) {
      staleTime = isSameMonth(forDateRange, new Date()) ? 1000 * 60 * 60 : Infinity; // 1 hour for current month
  }

  return useQuery<WorkoutLog[], Error>({
    queryKey,
    queryFn: () => {
      if (!user) return Promise.resolve([]); // Return empty array if no user
      if (forDateRange && forDateRange instanceof Date) {
        // Calculate month boundaries in local timezone on the client
        const monthStartDate = startOfMonth(forDateRange);
        const monthEndDate = endOfMonth(forDateRange);
        return getWorkoutLogs(user.uid, { startDate: monthStartDate, endDate: monthEndDate });
      } else if (forDateRange && 'start' in forDateRange) {
        return getWorkoutLogs(user.uid, { since: forDateRange.start });
      }
      return getWorkoutLogs(user.uid);
    },
    enabled: !!user && enabled,
    staleTime: staleTime,
  });
}

export function useExercises(enabled: boolean = true) {
  return useQuery<ExerciseDocument[], Error>({
    queryKey: ['exercises'],
    queryFn: async () => {
      const exercisesQuery = query(
        collection(db, 'exercises'),
        where('isActive', '==', true)
      );
      const snapshot = await getDocs(exercisesQuery);
      return snapshot.docs.map(doc => {
        const data = doc.data();
        const name = typeof data.name === 'string' ? data.name : '';
        const normalizedName =
          typeof data.normalizedName === 'string' ? data.normalizedName : name.toLowerCase();
        const category = toExerciseCategory(data.category);
        const type = data.type === 'cardio' ? 'cardio' : 'strength';
        const strengthStandards =
          typeof data.strengthStandards === 'object' ? data.strengthStandards : undefined;
        return {
          id: doc.id,
          name,
          normalizedName,
          equipment: toEquipmentType(data.equipment),
          category,
          type,
          strengthStandards,
          isActive: data.isActive !== false,
          legacyNames: Array.isArray(data.legacyNames) ? data.legacyNames : undefined,
        };
      });
    },
    enabled,
    staleTime: 1000 * 60 * 60,
  });
}

export function useExerciseAliases(enabled: boolean = true) {
  return useQuery<AliasDocument[], Error>({
    queryKey: ['exercise-aliases'],
    queryFn: async () => {
      const snapshot = await getDocs(collection(db, 'exerciseAliases'));
      return snapshot.docs.map(doc => {
        const data = doc.data();
        return {
          alias: typeof data.alias === 'string' ? data.alias : doc.id,
          canonicalId: typeof data.canonicalId === 'string' ? data.canonicalId : '',
          createdAt: data.createdAt?.toDate ? data.createdAt.toDate() : undefined,
        };
      });
    },
    enabled,
    staleTime: 1000 * 60 * 60,
  });
}

export function useCurrentWeekWorkouts(enabled: boolean = true) {
    const { user } = useAuth();
    const today = new Date();

    // Calculate week boundaries in local timezone on the client
    const weekStartDate = startOfWeek(today, { weekStartsOn: 0 }); // Sunday
    const weekEndDate = endOfWeek(today, { weekStartsOn: 0 });     // Saturday

    // Create a dynamic key based on the year and week number (starting on Sunday)
    const weekKey = `${getYear(today)}-W${getWeek(today, { weekStartsOn: 0 })}`;
    const queryKey = ['workouts', user?.uid, weekKey];

    return useQuery<WorkoutLog[], Error>({
        queryKey,
        queryFn: () => getWorkoutLogs(user!.uid, { startDate: weekStartDate, endDate: weekEndDate }),
        enabled: !!user && enabled,
        staleTime: 1000 * 60 * 2, // 2 minutes instead of 1 hour
        gcTime: 1000 * 60 * 10,
        refetchOnMount: 'always',
        refetchOnWindowFocus: false,
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
        onSuccess: (data, variables) => {
            const monthKey = format(variables.data.date, 'yyyy-MM');
            queryClient.invalidateQueries({ queryKey: ['workouts', variables.userId, monthKey] });
            
            // Invalidate the "current week" query using the dynamic key
            const today = new Date();
            const weekKey = `${getYear(today)}-W${getWeek(today, { weekStartsOn: 0 })}`;
            queryClient.invalidateQueries({ queryKey: ['workouts', variables.userId, weekKey] });
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
            const monthKey = variables.data.date ? format(variables.data.date, 'yyyy-MM') : undefined;
            if (monthKey) {
                 queryClient.invalidateQueries({ queryKey: ['workouts', variables.userId, monthKey] });
            } else {
                 // Fallback if date isn't in payload: invalidate all monthly views. Less optimal but safe.
                 queryClient.invalidateQueries({ queryKey: ['workouts', variables.userId] });
            }
             
            // Invalidate the "current week" query using the dynamic key
            const today = new Date();
            const weekKey = `${getYear(today)}-W${getWeek(today, { weekStartsOn: 0 })}`;
            queryClient.invalidateQueries({ queryKey: ['workouts', variables.userId, weekKey] });
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
            // Find the specific log in the cache to get its date for targeted invalidation
            const allCachedWorkouts = queryClient.getQueriesData<WorkoutLog[]>({ queryKey: ['workouts', variables.userId] });
            let logDate: Date | undefined;

            for (const [, cachedData] of allCachedWorkouts) {
                if (cachedData) {
                    const foundLog = cachedData.find(log => log.id === variables.logId);
                    if (foundLog) {
                        logDate = foundLog.date;
                        break;
                    }
                }
            }

            if (logDate) {
                 const monthKey = format(logDate, 'yyyy-MM');
                 queryClient.invalidateQueries({ queryKey: ['workouts', variables.userId, monthKey] });
            } else {
                // Fallback to broader invalidation if the log isn't in the cache
                queryClient.invalidateQueries({ queryKey: ['workouts', variables.userId] });
            }
            
            // Invalidate the "current week" query using the dynamic key
            const today = new Date();
            const weekKey = `${getYear(today)}-W${getWeek(today, { weekStartsOn: 0 })}`;
            queryClient.invalidateQueries({ queryKey: ['workouts', variables.userId, weekKey] });
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

export function useUserProfile(opts?: {
    initialData?: { data: UserProfile | null; notFound: boolean };
}) {
    const { user } = useAuth();
    return useQuery<{ data: UserProfile | null; notFound: boolean }, Error>({
      queryKey: ['profile', user?.uid], 
      queryFn: async () => {
        if (!user) return { data: null, notFound: true };
        const profile = await getUserProfile(user.uid);
        if (profile === null) {
          return { data: null, notFound: true as const };
        }
        return { data: profile, notFound: false as const };
      },
      enabled: !!user,
      initialData: opts?.initialData,
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

    return useMutation<{ success: boolean; data?: unknown }, Error, AnalyzeLiftProgressionInput>({
        mutationFn: async (values: AnalyzeLiftProgressionInput) => {
            const result = await analyzeLiftProgressionAction(user!.uid, values);
            if (!result.success) {
                throw new Error(result.error || "An unknown error occurred during analysis.");
            }
            return result;
        },
        onSuccess: async () => {
            toast({ title: "Progression Analysis Complete!", description: "Your AI-powered insights are ready." });

            // Immediately invalidate the profile cache to force a fresh fetch
            queryClient.invalidateQueries({ queryKey: ['profile', user?.uid] });

            // Wait a moment for the server to be updated, then refetch
            // This ensures we get the latest data from Firebase
            await new Promise(resolve => setTimeout(resolve, 500));
            await queryClient.refetchQueries({
                queryKey: ['profile', user?.uid],
                type: 'active'
            });
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
            queryClient.invalidateQueries({ queryKey: ['strengthAnalysis', user?.uid] });
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
            queryClient.invalidateQueries({ queryKey: ['goalAnalysis', user?.uid] });
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

export function useWeeklyPlan(enabled: boolean = true) {
  const { user } = useAuth();
  return useQuery<StoredWeeklyPlan | null, Error>({
    queryKey: ['weeklyPlan', user?.uid],
    queryFn: async () => {
      if (!user) return null;
      const result = await getWeeklyPlanAction(user.uid);
      if (!result.success) {
        throw new Error(result.error || 'Failed to fetch weekly plan');
      }
      return result.data || null;
    },
    enabled: !!user && enabled,
    staleTime: 1000 * 60 * 60 * 24 * 7, // 7 days
  });
}

export function useSaveWeeklyPlan() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { toast } = useToast();

  return useMutation<void, Error, StoredWeeklyPlan>({
    mutationFn: async (planData: StoredWeeklyPlan) => {
      if (!user) {
        throw new Error('User not authenticated');
      }
      const result = await saveWeeklyPlanAction(user.uid, planData);
      if (!result.success) {
        throw new Error(result.error || 'Failed to save weekly plan');
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['weeklyPlan', user?.uid] });
    },
  });
}

export function useStrengthAnalysis(enabled: boolean = true) {
  const { user } = useAuth();
  return useQuery<StoredStrengthAnalysis | undefined, Error>({
    queryKey: ['strengthAnalysis', user?.uid],
    queryFn: async () => {
      if (!user) return undefined;
      const result = await getStrengthAnalysisAction(user.uid);
      if (!result.success) {
        throw new Error(result.error || 'Failed to fetch strength analysis');
      }
      return result.data;
    },
    enabled: !!user && enabled,
    staleTime: 1000 * 60 * 60 * 24 * 7, // 7 days
  });
}

export function useSaveStrengthAnalysis() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { toast } = useToast();

  return useMutation<void, Error, StoredStrengthAnalysis>({
    mutationFn: async (analysisData: StoredStrengthAnalysis) => {
      if (!user) {
        throw new Error('User not authenticated');
      }
      const result = await saveStrengthAnalysisAction(user.uid, analysisData);
      if (!result.success) {
        throw new Error(result.error || 'Failed to save strength analysis');
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['strengthAnalysis', user?.uid] });
    },
  });
}

export function useGoalAnalysis(enabled: boolean = true) {
  const { user } = useAuth();
  return useQuery<StoredGoalAnalysis | undefined, Error>({
    queryKey: ['goalAnalysis', user?.uid],
    queryFn: async () => {
      if (!user) return undefined;
      const result = await getGoalAnalysisAction(user.uid);
      if (!result.success) {
        throw new Error(result.error || 'Failed to fetch goal analysis');
      }
      return result.data;
    },
    enabled: !!user && enabled,
    staleTime: 1000 * 60 * 60 * 24 * 7, // 7 days
  });
}

export function useSaveGoalAnalysis() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { toast } = useToast();

  return useMutation<void, Error, StoredGoalAnalysis>({
    mutationFn: async (analysisData: StoredGoalAnalysis) => {
      if (!user) {
        throw new Error('User not authenticated');
      }
      const result = await saveGoalAnalysisAction(user.uid, analysisData);
      if (!result.success) {
        throw new Error(result.error || 'Failed to save goal analysis');
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['goalAnalysis', user?.uid] });
    },
  });
}

export function useLiftStrengthLevelFromE1RM(
  params: {
    exerciseName: string;
    weight: number;
    weightUnit: 'kg' | 'lbs';
    userProfile: UserProfile | undefined;
  }
) {
  const { user } = useAuth();

  return useQuery<StrengthLevel, Error>({
    queryKey: [
      'lift-level-from-e1rm',
      user?.uid,
      params.exerciseName,
      params.weight,
      params.weightUnit,
      params.userProfile?.age,
      params.userProfile?.gender,
      params.userProfile?.weightValue,
      params.userProfile?.weightUnit,
      params.userProfile?.skeletalMuscleMassValue,
      params.userProfile?.skeletalMuscleMassUnit,
    ],
    queryFn: async () => {
      if (!user) {
        throw new Error('User not authenticated.');
      }

      const input: GetLiftStrengthLevelInput = {
        exerciseName: params.exerciseName,
        weight: params.weight,
        weightUnit: params.weightUnit,
        userProfile: {
          age: params.userProfile?.age,
          gender: params.userProfile?.gender,
          weightValue: params.userProfile?.weightValue,
          weightUnit: params.userProfile?.weightUnit,
          skeletalMuscleMassValue: params.userProfile?.skeletalMuscleMassValue,
          skeletalMuscleMassUnit: params.userProfile?.skeletalMuscleMassUnit,
        },
      };

      const result = await getLiftStrengthLevelAction(user.uid, input);
      if (!result.success) {
        throw new Error(result.error || 'Could not calculate lift level.');
      }
      return result.data || 'N/A';
    },
    enabled: !!user && !!params.exerciseName && params.weight > 0,
    staleTime: 1000 * 60 * 10,
  });
}
