// NOTE: This file does NOT have "use client" and is intended for server-side use.

import { adminDb } from './firebase-admin';
import { Timestamp, DocumentSnapshot, QueryDocumentSnapshot } from 'firebase-admin/firestore';
import type { WorkoutLog, PersonalRecord, UserProfile, StoredStrengthAnalysis, Exercise, ExerciseCategory, StoredLiftProgressionAnalysis, StrengthLevel, StoredWeeklyPlan } from './types';
import { startOfMonth, endOfMonth } from 'date-fns';
import { getStrengthLevel } from './strength-standards';
import { cache } from 'react';

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
      ? data.exercises.map((ex: any, index: number) => {
          const category = ex.category && typeof ex.category === 'string' ? ex.category as ExerciseCategory : 'Other';
          return {
            id: ex.id || `${snapshot.id}-${index}`,
            name: typeof ex.name === 'string' ? ex.name : 'Unnamed Exercise',
            sets: Number(ex.sets || 0),
            reps: Number(ex.reps || 0),
            weight: Number(ex.weight || 0),
            weightUnit: ex.weightUnit === 'kg' || ex.weightUnit === 'lbs' ? ex.weightUnit : 'lbs',
            category: category,
            distance: Number(ex.distance || 0),
            distanceUnit: ex.distanceUnit === 'mi' || ex.distanceUnit === 'km' || ex.distanceUnit === 'ft' || ex.distanceUnit === 'm' ? ex.distanceUnit : 'mi',
            duration: Number(ex.duration || 0),
            durationUnit: ex.durationUnit === 'min' || ex.durationUnit === 'hr' || ex.durationUnit === 'sec' ? ex.durationUnit : 'min',
            calories: Number(ex.calories || 0),
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
    return {
      ...record,
      date: Timestamp.fromDate(record.date),
    };
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

const userProfileConverter = {
    toFirestore: (profile: Partial<Omit<UserProfile, 'id'>>) => {
        const dataToStore: { [key: string]: any } = { ...profile };
        if (profile.joinedDate) {
            dataToStore.joinedDate = Timestamp.fromDate(profile.joinedDate);
        }
        if (profile.fitnessGoals) {
            dataToStore.fitnessGoals = profile.fitnessGoals.map(goal => {
                const newGoal: { [key: string]: any } = { ...goal };
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
        if (profile.liftProgressionAnalysis) {
            const convertedAnalyses: { [key: string]: any } = {};
            for (const key in profile.liftProgressionAnalysis) {
                const analysis = profile.liftProgressionAnalysis[key];
                if (analysis && analysis.generatedDate) {
                    convertedAnalyses[key] = {
                        ...analysis,
                        generatedDate: Timestamp.fromDate(analysis.generatedDate),
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
        const fitnessGoals = Array.isArray(data.fitnessGoals) ? data.fitnessGoals.map((goal: any) => ({
                id: goal.id || `goal-${Math.random()}`,
                description: goal.description || '',
                achieved: !!goal.achieved,
                isPrimary: !!goal.isPrimary,
                targetDate: goal.targetDate instanceof Timestamp ? goal.targetDate.toDate() : new Date(),
                dateAchieved: goal.dateAchieved instanceof Timestamp ? goal.dateAchieved.toDate() : undefined,
            })) : [];
        
        const strengthAnalysis: StoredStrengthAnalysis | undefined = data.strengthAnalysis && data.strengthAnalysis.generatedDate instanceof Timestamp ? {
            ...data.strengthAnalysis,
            generatedDate: data.strengthAnalysis.generatedDate.toDate(),
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

        return {
            id: snapshot.id,
            name: data.name || "",
            email: data.email || "",
            joinedDate: joinedDate,
            fitnessGoals: fitnessGoals,
            strengthAnalysis: strengthAnalysis,
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
        };
    }
};

// --- Firestore Service Functions ---

export const getWorkoutLogs = async (userId: string, forMonth?: Date): Promise<WorkoutLog[]> => {
  const workoutLogsCollection = adminDb.collection(`users/${userId}/workoutLogs`).withConverter(workoutLogConverter) as FirebaseFirestore.CollectionReference<WorkoutLog>;
  let q: FirebaseFirestore.Query<WorkoutLog>;
  
  const baseQuery = workoutLogsCollection;

  if (forMonth) {
    const startDate = startOfMonth(forMonth);
    const endDate = endOfMonth(forMonth);
    q = baseQuery
      .where('date', '>=', startDate)
      .where('date', '<=', endDate)
      .orderBy('date', 'desc');
  } else {
    q = baseQuery.orderBy('date', 'desc');
  }
  
  try {
    const snapshot = await q.get();
    return snapshot.docs.map(doc => doc.data());
  } catch (error: any) {
    if (error.code === 5 && error.details?.includes('requires an index')) {
        console.warn(`Firestore index missing for workoutLogs query for user ${userId}. Returning empty list. Please create the required index in the Firebase console.`);
        return [];
    }
    if (error.code === 7 || (error.details && error.details.includes('Permission denied'))) {
      console.log(`Gracefully handling Firestore permission error for user ${userId}. Returning empty log list.`);
      return [];
    }
    console.error("Error fetching workout logs:", error);
    throw error;
  }
};


export const addWorkoutLog = async (userId: string, log: Omit<WorkoutLog, 'id' | 'userId'>) => {
    const workoutLogsCollection = adminDb.collection(`users/${userId}/workoutLogs`).withConverter(workoutLogConverter);
    const docRef = await workoutLogsCollection.add(log);
    return { id: docRef.id };
};

export const updateWorkoutLog = async (userId: string, id: string, log: Partial<Omit<WorkoutLog, 'id' | 'userId'>>) => {
  const logDoc = adminDb.collection(`users/${userId}/workoutLogs`).doc(id);

  const dataToUpdate: { [key: string]: any } = { ...log };
  if (log.date) {
    dataToUpdate.date = Timestamp.fromDate(log.date);
  }
  await logDoc.update(dataToUpdate);
};

export const deleteWorkoutLog = async (userId: string, id: string): Promise<void> => {
  const logDoc = adminDb.collection(`users/${userId}/workoutLogs`).doc(id);
  await logDoc.delete();
};

// Personal Records
export const getPersonalRecords = cache(async (userId: string): Promise<PersonalRecord[]> => {
  const personalRecordsCollection = adminDb.collection(`users/${userId}/personalRecords`).withConverter(personalRecordConverter) as FirebaseFirestore.CollectionReference<PersonalRecord>;
  const q = personalRecordsCollection.orderBy('exerciseName', 'asc');
  const snapshot = await q.get();
  // Using the converter ensures that the id and userId are correctly populated.
  return snapshot.docs.map(doc => doc.data());
});

export const addPersonalRecords = async (userId: string, records: Omit<PersonalRecord, 'id' | 'userId'>[]) => {
  const personalRecordsCollection = adminDb.collection(`users/${userId}/personalRecords`).withConverter(personalRecordConverter);
  const userProfile = await getUserProfile(userId);
  if (!userProfile) {
    throw new Error("User profile not found. Cannot calculate strength levels.");
  }

  const batch = adminDb.batch();
  records.forEach(record => {
    const newDocRef = personalRecordsCollection.doc();
    const recordWithLevel: Omit<PersonalRecord, 'id' | 'userId'> = {
      ...record,
      strengthLevel: getStrengthLevel({ ...record, userId } as PersonalRecord, userProfile),
    };
    batch.set(newDocRef, recordWithLevel);
  });
  await batch.commit();
};

export const updatePersonalRecord = async (userId: string, id: string, recordData: Partial<Omit<PersonalRecord, 'id' | 'userId'>>): Promise<void> => {
  const recordDoc = adminDb.collection(`users/${userId}/personalRecords`).doc(id);
  
  const currentRecordSnapshot = await recordDoc.withConverter(personalRecordConverter).get() as DocumentSnapshot<PersonalRecord>;
  const currentRecordData = currentRecordSnapshot.data();

  if (!currentRecordData) {
    throw new Error("Document not found.");
  }
  
  // Start with the new data.
  const dataToUpdate: { [key:string]: any } = { ...recordData };
  let dateForCalc: Date = currentRecordData.date;
  
  // If a new Date object is provided, convert it to a Firestore Timestamp.
  // This is now aligned with the 'add' logic.
  if (recordData.date) {
    dataToUpdate.date = Timestamp.fromDate(recordData.date);
    dateForCalc = recordData.date;
  }

  // Construct a full PR object for the strength level calculation, ensuring all required fields are present.
  const updatedRecordForCalc: PersonalRecord = {
      ...currentRecordData, // Start with the existing full record
      ...recordData,         // Apply the updates
      date: dateForCalc,        // Use the correct date object
  };
  
  const userProfile = await getUserProfile(userId);
  if (userProfile) {
      dataToUpdate.strengthLevel = getStrengthLevel(updatedRecordForCalc, userProfile);
  }

  await recordDoc.update(dataToUpdate);
};

export const clearAllPersonalRecords = async (userId: string): Promise<void> => {
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


// User Profile
export const getUserProfile = async (userId: string): Promise<UserProfile | null> => {
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
    const profileDocRef = adminDb.collection('users').doc(userId);
    
    const dataToUpdate: { [key: string]: any } = { ...profileData };
    
    if ('joinedDate' in profileData && profileData.joinedDate) {
        dataToUpdate.joinedDate = Timestamp.fromDate(profileData.joinedDate);
    }

    if (profileData.fitnessGoals) {
        dataToUpdate.fitnessGoals = profileData.fitnessGoals.map(goal => {
            const newGoal: { [key: string]: any } = { ...goal };
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
    if (profileData.weeklyPlan) {
        dataToUpdate.weeklyPlan = {
            ...profileData.weeklyPlan,
            generatedDate: Timestamp.fromDate(profileData.weeklyPlan.generatedDate),
        };
    }
    
    for (const key in dataToUpdate) {
        if (key.startsWith('liftProgressionAnalysis.') && dataToUpdate[key]?.generatedDate) {
            dataToUpdate[key].generatedDate = Timestamp.fromDate(dataToUpdate[key].generatedDate);
        }
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
                    const newLevel = getStrengthLevel(record, updatedProfile);
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
