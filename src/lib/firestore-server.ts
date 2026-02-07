
// NOTE: This file does NOT have "use client" and is intended for server-side use.

import { getAdminDb } from './firebase-admin';
import { Timestamp, QueryDocumentSnapshot, FieldValue } from 'firebase-admin/firestore';
import type { WorkoutLog, PersonalRecord, UserProfile, StoredStrengthAnalysis, Exercise, ExerciseCategory, StoredLiftProgressionAnalysis, StrengthLevel, StoredWeeklyPlan, StoredGoalAnalysis, AIUsageStats } from './types';
import { format } from 'date-fns';
import { getStrengthLevel, getNormalizedExerciseName } from './strength-standards.server';
import { cache } from 'react';
import { logger } from '@/lib/logging/logger';
import { redactPII } from '@/lib/logging/data-redactor';

// --- Data Converters ---
// These converters handle the transformation between Firestore's data format (e.g., Timestamps)
// and our application's data format (e.g., JavaScript Date objects).

const workoutLogConverter = {
  toFirestore: (log: Omit<WorkoutLog, 'id' | 'userId'>) => {
    // The userId is part of the path, so it doesn't need to be in the document data.
    const { ...rest } = log;
    return {
      ...rest,
      date: Timestamp.fromDate(log.date),
    };
  },
  fromFirestore: (snapshot: FirebaseFirestore.QueryDocumentSnapshot): WorkoutLog => {
    const data = snapshot.data() || {};
    // The userId is retrieved from the document path, not the data itself.
    const userId = snapshot.ref.parent.parent?.id || '';
    
    const exercises: Exercise[] = Array.isArray(data.exercises)
      ? data.exercises.map((ex: Record<string, unknown>, index: number) => {
          const category =
            typeof ex.category === 'string' ? (ex.category as ExerciseCategory) : 'Other';
          return {
            id: typeof ex.id === 'string' ? ex.id : `${snapshot.id}-${index}`,
            name: typeof ex.name === 'string' ? ex.name : 'Unnamed Exercise',
            sets: Number(ex.sets || 0),
            reps: Number(ex.reps || 0),
            weight: Number(ex.weight || 0),
            weightUnit: ex.weightUnit === 'kg' || ex.weightUnit === 'lbs' ? ex.weightUnit : 'lbs',
            category: category,
            distance: Number(ex.distance || 0),
            distanceUnit:
              ex.distanceUnit === 'mi' || ex.distanceUnit === 'km' || ex.distanceUnit === 'ft' || ex.distanceUnit === 'm'
                ? ex.distanceUnit
                : 'mi',
            duration: Number(ex.duration || 0),
            durationUnit: ex.durationUnit === 'min' || ex.durationUnit === 'hr' || ex.durationUnit === 'sec' ? ex.durationUnit : 'min',
            calories: Number(ex.calories || 0),
            caloriesSource: ex.caloriesSource === 'manual' || ex.caloriesSource === 'estimated' ? ex.caloriesSource : undefined,
          };
        })
      : [];

    return {
      id: snapshot.id,
      userId: userId,
      date: data.date instanceof Timestamp ? data.date.toDate() : new Date(),
      notes: typeof data.notes === 'string' ? data.notes : '',
      exercises: exercises,
    };
  }
};

const personalRecordConverter = {
  toFirestore: (record: Omit<PersonalRecord, 'id' | 'userId'>) => {
    const firestoreData: Record<string, unknown> = { ...record };
    if (record.date) {
      firestoreData.date = Timestamp.fromDate(record.date);
    }
    return firestoreData;
  },
  fromFirestore: (snapshot: FirebaseFirestore.QueryDocumentSnapshot): PersonalRecord => {
    const data = snapshot.data() || {};
    const category = data.category && typeof data.category === 'string' ? data.category as ExerciseCategory : 'Other';
    const userId = snapshot.ref.parent.parent?.id || '';

    const strengthLevel = data.strengthLevel && typeof data.strengthLevel === 'string' 
        ? data.strengthLevel as StrengthLevel 
        : 'N/A';

    return {
      id: snapshot.id,
      userId: userId,
      exerciseName: typeof data.exerciseName === 'string' ? data.exerciseName : 'Unnamed Exercise',
      weight: Number(data.weight || 0),
      weightUnit: data.weightUnit === 'kg' || data.weightUnit === 'lbs' ? data.weightUnit : 'lbs',
      date: data.date instanceof Timestamp ? data.date.toDate() : new Date(),
      category: category,
      strengthLevel: strengthLevel,
    };
  }
};

const weeklyPlanConverter = {
  toFirestore: (plan: Omit<StoredWeeklyPlan, 'id'>) => {
    return {
      plan: plan.plan,
      generatedDate: Timestamp.fromDate(plan.generatedDate),
      contextUsed: plan.contextUsed,
      userId: plan.userId,
      weekStartDate: plan.weekStartDate,
    };
  },
  fromFirestore: (snapshot: FirebaseFirestore.QueryDocumentSnapshot): StoredWeeklyPlan => {
    const data = snapshot.data() || {};
    return {
      plan: typeof data.plan === 'string' ? data.plan : '',
      generatedDate: data.generatedDate instanceof Timestamp ? data.generatedDate.toDate() : new Date(),
      contextUsed: typeof data.contextUsed === 'string' ? data.contextUsed : '',
      userId: typeof data.userId === 'string' ? data.userId : '',
      weekStartDate: typeof data.weekStartDate === 'string' ? data.weekStartDate : '',
    };
  }
};

const strengthAnalysisConverter = {
  toFirestore: (analysis: Omit<StoredStrengthAnalysis, 'id'>) => {
    return {
      result: analysis.result,
      generatedDate: Timestamp.fromDate(analysis.generatedDate),
    };
  },
  fromFirestore: (snapshot: FirebaseFirestore.QueryDocumentSnapshot): StoredStrengthAnalysis => {
    const data = snapshot.data() || {};
    return {
      result: data.result || {},
      generatedDate: data.generatedDate instanceof Timestamp ? data.generatedDate.toDate() : new Date(),
    };
  }
};

const goalAnalysisConverter = {
  toFirestore: (analysis: Omit<StoredGoalAnalysis, 'id'>) => {
    return {
      result: analysis.result,
      generatedDate: Timestamp.fromDate(analysis.generatedDate),
    };
  },
  fromFirestore: (snapshot: FirebaseFirestore.QueryDocumentSnapshot): StoredGoalAnalysis => {
    const data = snapshot.data() || {};
    return {
      result: data.result || {},
      generatedDate: data.generatedDate instanceof Timestamp ? data.generatedDate.toDate() : new Date(),
    };
  }
};

export const userProfileConverter = {
    toFirestore: (profile: Partial<Omit<UserProfile, 'id'>>) => {
        const dataToStore: Record<string, unknown> = { ...profile };
        if (profile.joinedDate) {
            dataToStore.joinedDate = Timestamp.fromDate(profile.joinedDate);
        }
        if (profile.fitnessGoals) {
            dataToStore.fitnessGoals = profile.fitnessGoals.map(goal => {
                const newGoal: Record<string, unknown> = { ...goal };
                newGoal.targetDate = Timestamp.fromDate(goal.targetDate);
                if (goal.dateAchieved) {
                    newGoal.dateAchieved = Timestamp.fromDate(goal.dateAchieved);
                } else {
                    delete newGoal.dateAchieved;
                }
                return newGoal;
            });
        }
        if (profile.strengthAnalysis) {
            dataToStore.strengthAnalysis = {
                ...profile.strengthAnalysis,
                generatedDate: Timestamp.fromDate(profile.strengthAnalysis.generatedDate),
            };
        }
        if (profile.goalAnalysis) {
            dataToStore.goalAnalysis = {
                ...profile.goalAnalysis,
                generatedDate: Timestamp.fromDate(profile.goalAnalysis.generatedDate),
            };
        }
        if (profile.liftProgressionAnalysis) {
            const convertedAnalyses: Record<string, Record<string, unknown>> = {};
            for (const key in profile.liftProgressionAnalysis) {
                const analysis = profile.liftProgressionAnalysis[key];
                if (analysis && analysis.generatedDate) {
                    convertedAnalyses[key] = {
                        ...analysis,
                        generatedDate: analysis.generatedDate instanceof Timestamp
                            ? analysis.generatedDate
                            : Timestamp.fromDate(analysis.generatedDate),
                    };
                }
            }
            dataToStore.liftProgressionAnalysis = convertedAnalyses;
        }
        if (profile.weeklyPlan) {
            dataToStore.weeklyPlan = {
                ...profile.weeklyPlan,
                generatedDate: Timestamp.fromDate(profile.weeklyPlan.generatedDate),
            };
        }
        return dataToStore;
    },
    fromFirestore: (snapshot: FirebaseFirestore.DocumentSnapshot): UserProfile => {
        const data = snapshot.data() || {};
        const joinedDate = data.joinedDate instanceof Timestamp ? data.joinedDate.toDate() : undefined;
        const fitnessGoals = Array.isArray(data.fitnessGoals)
            ? data.fitnessGoals.map((goal: Record<string, unknown>) => ({
                id: typeof goal.id === 'string' ? goal.id : `goal-${Math.random()}`,
                description: typeof goal.description === 'string' ? goal.description : '',
                achieved: !!goal.achieved,
                isPrimary: !!goal.isPrimary,
                targetDate: goal.targetDate instanceof Timestamp ? goal.targetDate.toDate() : new Date(),
                dateAchieved: goal.dateAchieved instanceof Timestamp ? goal.dateAchieved.toDate() : undefined,
            }))
            : [];
        
        const strengthAnalysis: StoredStrengthAnalysis | undefined = data.strengthAnalysis && data.strengthAnalysis.generatedDate instanceof Timestamp ? {
            ...data.strengthAnalysis,
            generatedDate: data.strengthAnalysis.generatedDate.toDate(),
        } : undefined;

        const goalAnalysis: StoredGoalAnalysis | undefined = data.goalAnalysis && data.goalAnalysis.generatedDate instanceof Timestamp ? {
            ...data.goalAnalysis,
            generatedDate: data.goalAnalysis.generatedDate.toDate(),
        } : undefined;
        
        const liftProgressionAnalysis: { [key: string]: StoredLiftProgressionAnalysis } = {};
        if (data.liftProgressionAnalysis) {
            for (const key in data.liftProgressionAnalysis) {
                const analysis = data.liftProgressionAnalysis[key];
                if (analysis && analysis.generatedDate instanceof Timestamp) {
                    liftProgressionAnalysis[key] = {
                        ...analysis,
                        generatedDate: analysis.generatedDate.toDate(),
                    };
                }
            }
        }

        const weeklyPlan: StoredWeeklyPlan | undefined = data.weeklyPlan && data.weeklyPlan.generatedDate instanceof Timestamp ? {
            ...data.weeklyPlan,
            generatedDate: data.weeklyPlan.generatedDate.toDate(),
        } : undefined;
        
        const aiUsage: AIUsageStats | undefined = data.aiUsage ? {
            goalAnalyses: data.aiUsage.goalAnalyses,
            screenshotParses: data.aiUsage.screenshotParses,
            planGenerations: data.aiUsage.planGenerations,
            prParses: data.aiUsage.prParses,
            strengthAnalyses: data.aiUsage.strengthAnalyses,
            liftProgressionAnalyses: data.aiUsage.liftProgressionAnalyses,
        } : undefined;

        return {
            id: snapshot.id,
            name: data.name || "",
            email: data.email || "",
            avatarUrl: data.avatarUrl,
            joinedDate: joinedDate,
            fitnessGoals: fitnessGoals,
            strengthAnalysis: strengthAnalysis,
            goalAnalysis: goalAnalysis,
            liftProgressionAnalysis: liftProgressionAnalysis,
            weeklyPlan: weeklyPlan,
            age: data.age,
            gender: data.gender,
            heightValue: data.heightValue,
            heightUnit: data.heightUnit,
            weightValue: data.weightValue,
            weightUnit: data.weightUnit,
            skeletalMuscleMassValue: data.skeletalMuscleMassValue,
            skeletalMuscleMassUnit: data.skeletalMuscleMassUnit,
            bodyFatPercentage: data.bodyFatPercentage,
            workoutsPerWeek: data.workoutsPerWeek,
            sessionTimeMinutes: data.sessionTimeMinutes,
            experienceLevel: data.experienceLevel,
            aiPreferencesNotes: data.aiPreferencesNotes,
            weeklyCardioCalorieGoal: data.weeklyCardioCalorieGoal,
            weeklyCardioStretchCalorieGoal: data.weeklyCardioStretchCalorieGoal,
            activityLevel: data.activityLevel,
            weightGoal: data.weightGoal,
            cardioCalculationMethod: data.cardioCalculationMethod,
            aiUsage: aiUsage,
        };
    }
};

// --- Firestore Service Functions ---

export const getWorkoutLogs = async (userId: string, options?: { startDate?: Date; endDate?: Date; since?: Date }): Promise<WorkoutLog[]> => {
  const adminDb = getAdminDb();
  const workoutLogsCollection = adminDb.collection(`users/${userId}/workoutLogs`).withConverter(workoutLogConverter) as FirebaseFirestore.CollectionReference<WorkoutLog>;
  let q: FirebaseFirestore.Query<WorkoutLog>;

  const baseQuery = workoutLogsCollection;

  if (options?.startDate && options?.endDate) {
    q = baseQuery
      .where('date', '>=', options.startDate)
      .where('date', '<=', options.endDate)
      .orderBy('date', 'desc');
  } else if (options?.since) {
    q = baseQuery
      .where('date', '>=', options.since)
      .orderBy('date', 'desc');
  }
  else {
    // Default to fetching all logs if no specific range is given
    q = baseQuery.orderBy('date', 'desc');
  }
  
  try {
    const snapshot = await q.get();
    return snapshot.docs.map(doc => doc.data());
  } catch (error: unknown) {
    if (error && typeof error === 'object' && 'code' in error && (error as { code?: number }).code === 5 && 'details' in error && typeof (error as { details?: string }).details === 'string' && (error as { details?: string }).details?.includes('requires an index')) {
        await logger.warn(
          'Firestore index missing for workoutLogs query. Returning empty list.',
          redactPII({
            route: 'firestore/getWorkoutLogs',
            feature: 'workoutLogs',
            userId,
            error: (error as { details?: string }).details,
          }) as Record<string, unknown>
        );
        return [];
    }
    if (error && typeof error === 'object' && ('code' in error || 'details' in error)) {
      const code = (error as { code?: number }).code;
      const details = (error as { details?: string }).details;
      if (code === 7 || (details && details.includes('Permission denied'))) {
        await logger.warn(
          'Firestore permission error for workoutLogs. Returning empty list.',
          redactPII({
            route: 'firestore/getWorkoutLogs',
            feature: 'workoutLogs',
            userId,
            error: details,
          }) as Record<string, unknown>
        );
        return [];
      }
    }
    await logger.error(
      'Error fetching workout logs.',
      redactPII({
        route: 'firestore/getWorkoutLogs',
        feature: 'workoutLogs',
        userId,
        error: String(error),
      }) as Record<string, unknown>
    );
    throw error;
  }
};


export const addWorkoutLog = async (userId: string, log: Omit<WorkoutLog, 'id' | 'userId'>) => {
  try {
    const adminDb = getAdminDb();
    const workoutLogsCollection = adminDb.collection(`users/${userId}/workoutLogs`).withConverter(workoutLogConverter);
    const docRef = await workoutLogsCollection.add(log);
    return { id: docRef.id };
  } catch (error) {
    await logger.error(
      'Error adding workout log.',
      redactPII({
        route: 'firestore/addWorkoutLog',
        feature: 'workoutLogs',
        userId,
        error: String(error),
      }) as Record<string, unknown>
    );
    throw error;
  }
};

export const updateWorkoutLog = async (userId: string, id: string, log: Partial<Omit<WorkoutLog, 'id' | 'userId'>>) => {
  try {
    const adminDb = getAdminDb();
    const logDoc = adminDb.collection(`users/${userId}/workoutLogs`).doc(id);

    const dataToUpdate: Record<string, unknown> = { ...log };
    if (log.date) {
      dataToUpdate.date = Timestamp.fromDate(log.date);
    }
    await logDoc.update(dataToUpdate);
  } catch (error) {
    await logger.error(
      'Error updating workout log.',
      redactPII({
        route: 'firestore/updateWorkoutLog',
        feature: 'workoutLogs',
        userId,
        workoutLogId: id,
        error: String(error),
      }) as Record<string, unknown>
    );
    throw error;
  }
};

export const deleteWorkoutLog = async (userId: string, id: string): Promise<void> => {
  try {
    const adminDb = getAdminDb();
    const logDoc = adminDb.collection(`users/${userId}/workoutLogs`).doc(id);
    await logDoc.delete();
  } catch (error) {
    await logger.error(
      'Error deleting workout log.',
      redactPII({
        route: 'firestore/deleteWorkoutLog',
        feature: 'workoutLogs',
        userId,
        workoutLogId: id,
        error: String(error),
      }) as Record<string, unknown>
    );
    throw error;
  }
};

// Personal Records
export const getPersonalRecords = cache(async (userId: string): Promise<PersonalRecord[]> => {
  try {
    const adminDb = getAdminDb();
    const personalRecordsCollection = adminDb.collection(`users/${userId}/personalRecords`).withConverter(personalRecordConverter) as FirebaseFirestore.CollectionReference<PersonalRecord>;
    // No ordering needed as we just want all records for client-side processing
    const snapshot = await personalRecordsCollection.get();
    return snapshot.docs.map(doc => doc.data());
  } catch (error) {
    await logger.error(
      'Error fetching personal records.',
      redactPII({
        route: 'firestore/getPersonalRecords',
        feature: 'personalRecords',
        userId,
        error: String(error),
      }) as Record<string, unknown>
    );
    throw error;
  }
});

export const addPersonalRecords = async (userId: string, records: Omit<PersonalRecord, 'id' | 'userId'>[]): Promise<{ success: boolean; message: string }> => {
    const adminDb = getAdminDb();
    const userProfile = await getUserProfile(userId);
    if (!userProfile) {
        throw new Error("User profile not found. Cannot calculate strength levels.");
    }
    
    const personalRecordsCollection = adminDb.collection(`users/${userId}/personalRecords`);
    const LBS_TO_KG = 0.453592;
    let recordsAddedOrUpdated = 0;
    let recordsNotImproved = 0;

    for (const newRecord of records) {
        const normalizedName = await getNormalizedExerciseName(newRecord.exerciseName);
        if (!normalizedName) continue;

        const newRecordWeightInKg = newRecord.weightUnit === 'lbs' ? newRecord.weight * LBS_TO_KG : newRecord.weight;

        // Find existing record by normalized name (the document ID)
        const existingDocRef = personalRecordsCollection.doc(normalizedName);
        const existingDocSnapshot = await existingDocRef.get();

        let bestExistingWeightInKg = -1;
        if (existingDocSnapshot.exists) {
            const existingData = personalRecordConverter.fromFirestore(existingDocSnapshot as QueryDocumentSnapshot<Omit<PersonalRecord, 'id'>>);
            bestExistingWeightInKg = existingData.weightUnit === 'lbs' ? existingData.weight * LBS_TO_KG : existingData.weight;
        }

        // Only save if new record is better than existing
        if (newRecordWeightInKg > bestExistingWeightInKg) {
            recordsAddedOrUpdated++;

            const recordWithLevel: Omit<PersonalRecord, 'id' | 'userId'> = {
                ...newRecord,
                strengthLevel: await getStrengthLevel({ ...newRecord, userId } as PersonalRecord, userProfile),
            };

            await existingDocRef.set(personalRecordConverter.toFirestore(recordWithLevel));
        } else {
            recordsNotImproved++;
        }
    }

    if (recordsAddedOrUpdated > 0) {
        const notImprovedMessage = recordsNotImproved > 0 ? ` ${recordsNotImproved} record(s) were not an improvement.` : '';
        return { success: true, message: `Successfully added or updated ${recordsAddedOrUpdated} personal record(s).${notImprovedMessage}` };
    } else {
        throw new Error("No new personal records to add. The submitted records were not better than your existing PRs.");
    }
};

export const updatePersonalRecord = async (userId: string, id: string, recordData: Partial<Omit<PersonalRecord, 'id' | 'userId'>>): Promise<void> => {
  const adminDb = getAdminDb();
  // 'id' is now the normalized exercise name
  const recordDocRef = adminDb.collection(`users/${userId}/personalRecords`).doc(id);
  const userProfile = await getUserProfile(userId);
  if (!userProfile) {
    throw new Error("User profile not found, cannot update strength level.");
  }

  const docSnapshot = await recordDocRef.get();
  if (!docSnapshot.exists) {
    throw new Error("Record not found.");
  }
  const currentData = personalRecordConverter.fromFirestore(docSnapshot as QueryDocumentSnapshot<Omit<PersonalRecord, 'id'>>);
  
  const updatedDataForCalc = { ...currentData, ...recordData };
  
  const newLevel = await getStrengthLevel(updatedDataForCalc, userProfile);
  
  const dataToUpdate: Record<string, unknown> = { ...recordData, strengthLevel: newLevel };
  if (recordData.date) {
    dataToUpdate.date = Timestamp.fromDate(recordData.date);
  }

  await recordDocRef.update(dataToUpdate);
};


export const clearAllPersonalRecords = async (userId: string): Promise<void> => {
    const adminDb = getAdminDb();
    const collectionRef = adminDb.collection(`users/${userId}/personalRecords`);
    const snapshot = await collectionRef.get();

    if (snapshot.empty) {
        return;
    }

    const batch = adminDb.batch();
    snapshot.docs.forEach(doc => {
        batch.delete(doc.ref);
    });

    await batch.commit();
};

// Weekly Plans
export const getWeeklyPlan = cache(async (userId: string, options?: { enableLazyBackfill?: boolean }): Promise<StoredWeeklyPlan | null> => {
  try {
    const adminDb = getAdminDb();

    // Try new location first
    const planDocRef = adminDb
      .collection(`users/${userId}/weeklyPlans`)
      .doc('current')
      .withConverter(weeklyPlanConverter) as FirebaseFirestore.DocumentReference<StoredWeeklyPlan>;

    const planSnap = await planDocRef.get();

    if (planSnap.exists) {
      return planSnap.data() || null;
    }

    // Fallback to old location (user profile document)
    await logger.info('Weekly plan not found in subcollection, checking legacy location', {
      route: 'firestore/getWeeklyPlan',
      feature: 'weeklyPlans',
      userId,
    });

    const userProfile = await getUserProfile(userId);
    const legacyPlan = userProfile?.weeklyPlan;

    if (!legacyPlan) {
      return null;
    }

    // Lazy backfill if enabled
    if (options?.enableLazyBackfill) {
      await logger.info('Performing lazy backfill migration for weekly plan', {
        route: 'firestore/getWeeklyPlan',
        feature: 'weeklyPlans',
        userId,
      });

      try {
        await saveWeeklyPlan(userId, legacyPlan);
      } catch (backfillError) {
        await logger.error('Failed to backfill weekly plan', {
          route: 'firestore/getWeeklyPlan',
          feature: 'weeklyPlans',
          userId,
          error: String(backfillError),
        });
        // Don't throw - still return the legacy data
      }
    }

    return legacyPlan;
  } catch (error) {
    await logger.error('Error fetching weekly plan', {
      route: 'firestore/getWeeklyPlan',
      feature: 'weeklyPlans',
      userId,
      error: String(error),
    });
    throw error;
  }
});

export const saveWeeklyPlan = async (userId: string, planData: StoredWeeklyPlan): Promise<void> => {
  try {
    const adminDb = getAdminDb();
    const planDocRef = adminDb.collection(`users/${userId}/weeklyPlans`).doc('current');

    // Truncate contextUsed to first 500 characters to reduce document size
    const truncatedContext = planData.contextUsed.length > 500
      ? planData.contextUsed.substring(0, 500) + '...[truncated]'
      : planData.contextUsed;

    const dataToStore = {
      plan: planData.plan,
      generatedDate: Timestamp.fromDate(planData.generatedDate),
      contextUsed: truncatedContext,
      userId: planData.userId,
      weekStartDate: planData.weekStartDate,
    };

    await planDocRef.set(dataToStore);

    await logger.info('Weekly plan saved to subcollection', {
      route: 'firestore/saveWeeklyPlan',
      feature: 'weeklyPlans',
      userId,
      contextLength: truncatedContext.length,
    });
  } catch (error) {
    await logger.error('Error saving weekly plan', {
      route: 'firestore/saveWeeklyPlan',
      feature: 'weeklyPlans',
      userId,
      error: String(error),
    });
    throw error;
  }
};

export const deleteWeeklyPlan = async (userId: string): Promise<void> => {
  try {
    const adminDb = getAdminDb();
    const planDocRef = adminDb.collection(`users/${userId}/weeklyPlans`).doc('current');
    await planDocRef.delete();

    await logger.info('Weekly plan deleted from subcollection', {
      route: 'firestore/deleteWeeklyPlan',
      feature: 'weeklyPlans',
      userId,
    });
  } catch (error) {
    await logger.error('Error deleting weekly plan', {
      route: 'firestore/deleteWeeklyPlan',
      feature: 'weeklyPlans',
      userId,
      error: String(error),
    });
    throw error;
  }
};

// Strength Analysis
export const getStrengthAnalysis = cache(async (userId: string, options?: { enableLazyBackfill?: boolean }): Promise<StoredStrengthAnalysis | null> => {
  try {
    const adminDb = getAdminDb();

    // Try new location first
    const analysisDocRef = adminDb
      .collection(`users/${userId}/strengthAnalyses`)
      .doc('current')
      .withConverter(strengthAnalysisConverter) as FirebaseFirestore.DocumentReference<StoredStrengthAnalysis>;

    const analysisSnap = await analysisDocRef.get();

    if (analysisSnap.exists) {
      return analysisSnap.data() || null;
    }

    // Fallback to old location (user profile document)
    await logger.info('Strength analysis not found in subcollection, checking legacy location', {
      route: 'firestore/getStrengthAnalysis',
      feature: 'strengthAnalyses',
      userId,
    });

    const userProfile = await getUserProfile(userId);
    const legacyAnalysis = userProfile?.strengthAnalysis;

    if (!legacyAnalysis) {
      return null;
    }

    // Lazy backfill if enabled
    if (options?.enableLazyBackfill) {
      await logger.info('Performing lazy backfill migration for strength analysis', {
        route: 'firestore/getStrengthAnalysis',
        feature: 'strengthAnalyses',
        userId,
      });

      try {
        await saveStrengthAnalysis(userId, legacyAnalysis);
      } catch (backfillError) {
        await logger.error('Failed to backfill strength analysis', {
          route: 'firestore/getStrengthAnalysis',
          feature: 'strengthAnalyses',
          userId,
          error: String(backfillError),
        });
        // Don't throw - still return the legacy data
      }
    }

    return legacyAnalysis;
  } catch (error) {
    await logger.error('Error fetching strength analysis', {
      route: 'firestore/getStrengthAnalysis',
      feature: 'strengthAnalyses',
      userId,
      error: String(error),
    });
    throw error;
  }
});

export const saveStrengthAnalysis = async (userId: string, analysisData: StoredStrengthAnalysis): Promise<void> => {
  try {
    const adminDb = getAdminDb();
    const analysisDocRef = adminDb.collection(`users/${userId}/strengthAnalyses`).doc('current');

    const dataToStore = {
      result: analysisData.result,
      generatedDate: Timestamp.fromDate(analysisData.generatedDate),
    };

    await analysisDocRef.set(dataToStore);

    await logger.info('Strength analysis saved to subcollection', {
      route: 'firestore/saveStrengthAnalysis',
      feature: 'strengthAnalyses',
      userId,
    });
  } catch (error) {
    await logger.error('Error saving strength analysis', {
      route: 'firestore/saveStrengthAnalysis',
      feature: 'strengthAnalyses',
      userId,
      error: String(error),
    });
    throw error;
  }
};

export const deleteStrengthAnalysis = async (userId: string): Promise<void> => {
  try {
    const adminDb = getAdminDb();
    const analysisDocRef = adminDb.collection(`users/${userId}/strengthAnalyses`).doc('current');
    await analysisDocRef.delete();

    await logger.info('Strength analysis deleted from subcollection', {
      route: 'firestore/deleteStrengthAnalysis',
      feature: 'strengthAnalyses',
      userId,
    });
  } catch (error) {
    await logger.error('Error deleting strength analysis', {
      route: 'firestore/deleteStrengthAnalysis',
      feature: 'strengthAnalyses',
      userId,
      error: String(error),
    });
    throw error;
  }
};

// Goal Analysis
export const getGoalAnalysis = cache(async (userId: string, options?: { enableLazyBackfill?: boolean }): Promise<StoredGoalAnalysis | null> => {
  try {
    const adminDb = getAdminDb();

    const analysisDocRef = adminDb
      .collection(`users/${userId}/goalAnalyses`)
      .doc('current')
      .withConverter(goalAnalysisConverter) as FirebaseFirestore.DocumentReference<StoredGoalAnalysis>;

    const analysisSnap = await analysisDocRef.get();

    if (analysisSnap.exists) {
      return analysisSnap.data() || null;
    }

    await logger.info('Goal analysis not found in subcollection, checking legacy location', {
      route: 'firestore/getGoalAnalysis',
      feature: 'goalAnalyses',
      userId,
    });

    const userProfile = await getUserProfile(userId);
    const legacyAnalysis = userProfile?.goalAnalysis;

    if (!legacyAnalysis) {
      return null;
    }

    if (options?.enableLazyBackfill) {
      await logger.info('Performing lazy backfill migration for goal analysis', {
        route: 'firestore/getGoalAnalysis',
        feature: 'goalAnalyses',
        userId,
      });

      try {
        await saveGoalAnalysis(userId, legacyAnalysis);
      } catch (backfillError) {
        await logger.error('Failed to backfill goal analysis', {
          route: 'firestore/getGoalAnalysis',
          feature: 'goalAnalyses',
          userId,
          error: String(backfillError),
        });
      }
    }

    return legacyAnalysis;
  } catch (error) {
    await logger.error('Error fetching goal analysis', {
      route: 'firestore/getGoalAnalysis',
      feature: 'goalAnalyses',
      userId,
      error: String(error),
    });
    throw error;
  }
});

export const saveGoalAnalysis = async (userId: string, analysisData: StoredGoalAnalysis): Promise<void> => {
  try {
    const adminDb = getAdminDb();
    const analysisDocRef = adminDb.collection(`users/${userId}/goalAnalyses`).doc('current');

    const dataToStore = {
      result: analysisData.result,
      generatedDate: Timestamp.fromDate(analysisData.generatedDate),
    };

    await analysisDocRef.set(dataToStore);

    await logger.info('Goal analysis saved to subcollection', {
      route: 'firestore/saveGoalAnalysis',
      feature: 'goalAnalyses',
      userId,
    });
  } catch (error) {
    await logger.error('Error saving goal analysis', {
      route: 'firestore/saveGoalAnalysis',
      feature: 'goalAnalyses',
      userId,
      error: String(error),
    });
    throw error;
  }
};

export const deleteGoalAnalysis = async (userId: string): Promise<void> => {
  try {
    const adminDb = getAdminDb();
    const analysisDocRef = adminDb.collection(`users/${userId}/goalAnalyses`).doc('current');
    await analysisDocRef.delete();

    await logger.info('Goal analysis deleted from subcollection', {
      route: 'firestore/deleteGoalAnalysis',
      feature: 'goalAnalyses',
      userId,
    });
  } catch (error) {
    await logger.error('Error deleting goal analysis', {
      route: 'firestore/deleteGoalAnalysis',
      feature: 'goalAnalyses',
      userId,
      error: String(error),
    });
    throw error;
  }
};

// User Profile
export const getUserProfile = async (userId: string): Promise<UserProfile | null> => {
    const adminDb = getAdminDb();
    const profileDocRef = adminDb.collection('users').doc(userId).withConverter(userProfileConverter) as FirebaseFirestore.DocumentReference<UserProfile>;

    try {
        const docSnap = await profileDocRef.get();
        if (!docSnap.exists) {
            return null;
        }
        return docSnap.data() || null;
    } catch (error) {
        console.error("Error fetching user profile:", error);
        return null;
    }
};

export const updateUserProfile = async (userId: string, profileData: Partial<Omit<UserProfile, 'id'>>) => {
    const adminDb = getAdminDb();
    const profileDocRef = adminDb.collection('users').doc(userId);
    
    const dataToUpdate: Record<string, unknown> = { ...profileData };
    
    if ('joinedDate' in profileData && profileData.joinedDate) {
        dataToUpdate.joinedDate = Timestamp.fromDate(profileData.joinedDate);
    }

    if (profileData.fitnessGoals) {
        dataToUpdate.fitnessGoals = profileData.fitnessGoals.map(goal => {
            const newGoal: Record<string, unknown> = { ...goal };
            newGoal.targetDate = Timestamp.fromDate(goal.targetDate);
            if (goal.dateAchieved) {
                newGoal.dateAchieved = Timestamp.fromDate(goal.dateAchieved);
            } else {
                delete newGoal.dateAchieved;
            }
            return newGoal;
        });
    }
    if (profileData.strengthAnalysis) {
        dataToUpdate.strengthAnalysis = {
            ...profileData.strengthAnalysis,
            generatedDate: Timestamp.fromDate(profileData.strengthAnalysis.generatedDate),
        };
    }
    if (profileData.goalAnalysis) {
        dataToUpdate.goalAnalysis = {
            ...profileData.goalAnalysis,
            generatedDate: Timestamp.fromDate(profileData.goalAnalysis.generatedDate),
        };
    }
    if (profileData.liftProgressionAnalysis) {
        const convertedAnalyses: Record<string, Record<string, unknown>> = {};
        for (const key in profileData.liftProgressionAnalysis) {
            const analysis = profileData.liftProgressionAnalysis[key];
            if (analysis && analysis.generatedDate) {
                convertedAnalyses[key] = {
                    ...analysis,
                    generatedDate: analysis.generatedDate instanceof Timestamp
                        ? analysis.generatedDate
                        : Timestamp.fromDate(analysis.generatedDate),
                };
            }
        }
        dataToUpdate.liftProgressionAnalysis = convertedAnalyses;
    }
    if (profileData.weeklyPlan) {
        dataToUpdate.weeklyPlan = {
            ...profileData.weeklyPlan,
            generatedDate: Timestamp.fromDate(profileData.weeklyPlan.generatedDate),
        };
    }

    await profileDocRef.set(dataToUpdate, { merge: true });

    const relevantKeys: (keyof UserProfile)[] = ['gender', 'age', 'weightValue', 'weightUnit', 'skeletalMuscleMassValue', 'skeletalMuscleMassUnit'];
    const needsRecalculation = relevantKeys.some(key => key in profileData);

    if (needsRecalculation) {
        const personalRecordsCollection = adminDb.collection(`users/${userId}/personalRecords`);
        const recordsCountSnapshot = await personalRecordsCollection.limit(1).get();

        if (!recordsCountSnapshot.empty) {
            const allRecords = await getPersonalRecords(userId);
            const updatedProfile = await getUserProfile(userId); 

            if (allRecords.length > 0 && updatedProfile) {
                const batch = adminDb.batch();
                for (const record of allRecords) {
                    const newLevel = await getStrengthLevel(record, updatedProfile);
                    if (newLevel !== record.strengthLevel) {
                        const recordRef = personalRecordsCollection.doc(record.id);
                        batch.update(recordRef, { strengthLevel: newLevel });
                    }
                }
                await batch.commit();
            }
        }
    }
};

/**
 * Atomically increments an AI usage counter for a specific user and feature.
 * This is safe against race conditions.
 * @param userId The ID of the user.
 * @param feature The key of the feature to increment (e.g., 'goalAnalyses').
 */
export async function incrementUsageCounter(userId: string, feature: keyof AIUsageStats): Promise<void> {
  const adminDb = getAdminDb();
  const profileDocRef = adminDb.collection('users').doc(userId);
  const today = format(new Date(), 'yyyy-MM-dd');

  const userProfile = await getUserProfile(userId);
  const currentUsage = userProfile?.aiUsage?.[feature];
  
  if (currentUsage && currentUsage.date === today) {
      // If the date is today, atomically increment the count.
      await profileDocRef.update({
          [`aiUsage.${feature}.count`]: FieldValue.increment(1)
      });
  } else {
      // If it's a new day or the field doesn't exist, reset it using dot notation.
      // This ensures we only update the specific feature's counter without overwriting others.
      await profileDocRef.set({
          aiUsage: {
              [feature]: {
                  count: 1,
                  date: today
              }
          }
      }, { merge: true });
  }
}
