
// NOTE: This file does NOT have "use client" and is intended for server-side use.

import { db } from './firebase';
import { collection, addDoc, getDocs, doc, updateDoc, deleteDoc, writeBatch, Timestamp, query, orderBy, setDoc, getDoc, where, limit } from 'firebase/firestore';
import type { WorkoutLog, PersonalRecord, UserProfile, StoredStrengthAnalysis, Exercise, ExerciseCategory, StoredLift_progressionAnalysis, StrengthLevel, StoredWeeklyPlan } from './types';
import { startOfMonth, endOfMonth } from 'date-fns';
import { getStrengthLevel } from './strength-standards';

// --- Data Converters ---
// These converters handle the transformation between Firestore's data format (e.g., Timestamps)
// and our application's data format (e.g., JavaScript Date objects).

const workoutLogConverter = {
  toFirestore: (log: Omit<WorkoutLog, 'id'>) => {
    return {
      ...log,
      date: Timestamp.fromDate(log.date),
    };
  },
  fromFirestore: (snapshot: any, options: any): WorkoutLog => {
    const data = snapshot.data(options) || {};
    
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
            distanceUnit: ex.distanceUnit === 'mi' || ex.distanceUnit === 'km' || ex.distanceUnit === 'ft' ? ex.distanceUnit : 'mi',
            duration: Number(ex.duration || 0),
            durationUnit: ex.durationUnit === 'min' || ex.durationUnit === 'hr' || ex.durationUnit === 'sec' ? ex.durationUnit : 'min',
            calories: Number(ex.calories || 0),
          };
        })
      : [];

    return {
      id: snapshot.id,
      date: data.date instanceof Timestamp ? data.date.toDate() : new Date(),
      notes: typeof data.notes === 'string' ? data.notes : '',
      exercises: exercises,
    };
  }
};

const personalRecordConverter = {
  toFirestore: (record: Omit<PersonalRecord, 'id'>) => {
    return {
      ...record,
      date: Timestamp.fromDate(record.date),
    };
  },
  fromFirestore: (snapshot: any, options: any): PersonalRecord => {
    const data = snapshot.data(options) || {};
    const category = data.category && typeof data.category === 'string' ? data.category as ExerciseCategory : 'Other';
    
    // The previous implementation added this field, so we should preserve it on reads.
    const strengthLevel = data.strengthLevel && typeof data.strengthLevel === 'string' 
        ? data.strengthLevel as StrengthLevel 
        : 'N/A';

    return {
      id: snapshot.id,
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
                convertedAnalyses[key] = {
                    ...analysis,
                    generatedDate: Timestamp.fromDate(analysis.generatedDate),
                };
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
    fromFirestore: (snapshot: any, options: any): UserProfile => {
        const data = snapshot.data(options) || {};
        const joinedDate = data.joinedDate instanceof Timestamp ? data.joinedDate.toDate() : new Date();
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
        
        const liftProgressionAnalysis: { [key: string]: StoredLift_progressionAnalysis } = {};
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
            name: data.name || "User",
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

// Workout Logs
const workoutLogsCollection = collection(db, 'workoutLogs').withConverter(workoutLogConverter);

export const getWorkoutLogs = async (forMonth?: Date): Promise<WorkoutLog[]> => {
  let q;
  if (forMonth) {
    const startDate = startOfMonth(forMonth);
    const endDate = endOfMonth(forMonth);
    q = query(
      workoutLogsCollection,
      where('date', '>=', startDate),
      where('date', '<=', endDate),
      orderBy('date', 'desc')
    );
  } else {
    // Default to fetching all logs if no month is specified
    q = query(workoutLogsCollection, orderBy('date', 'desc'));
  }
  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => doc.data());
};


export const addWorkoutLog = async (log: Omit<WorkoutLog, 'id'>) => {
  return await addDoc(workoutLogsCollection, log);
};

export const updateWorkoutLog = async (id: string, log: Partial<Omit<WorkoutLog, 'id'>>) => {
  const logDoc = doc(db, 'workoutLogs', id);
  // Create a mutable copy for the update
  const dataToUpdate: { [key: string]: any } = { ...log };
  // Convert date back to timestamp if it exists in the partial update
  if (log.date) {
    dataToUpdate.date = Timestamp.fromDate(log.date);
  }
  return await updateDoc(logDoc, dataToUpdate);
};

export const deleteWorkoutLog = async (id: string) => {
  const logDoc = doc(db, 'workoutLogs', id);
  return await deleteDoc(logDoc);
};

// Personal Records
const personalRecordsCollection = collection(db, 'personalRecords').withConverter(personalRecordConverter);

export const getPersonalRecords = async (): Promise<PersonalRecord[]> => {
  const q = query(personalRecordsCollection, orderBy('date', 'desc'));
  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => doc.data());
};

export const addPersonalRecords = async (records: Omit<PersonalRecord, 'id'>[]) => {
  const userProfile = await getUserProfile();
  if (!userProfile) {
    throw new Error("User profile not found. Cannot calculate strength levels.");
  }

  const batch = writeBatch(db);
  records.forEach(record => {
    const newDocRef = doc(personalRecordsCollection);
    // Add the calculated strengthLevel to the new record before saving.
    const recordWithLevel: Omit<PersonalRecord, 'id'> = {
      ...record,
      strengthLevel: getStrengthLevel(record as PersonalRecord, userProfile),
    };
    batch.set(newDocRef, recordWithLevel);
  });
  await batch.commit();
};

export const updatePersonalRecord = async (id: string, recordData: Partial<Omit<PersonalRecord, 'id'>>) => {
  const recordDoc = doc(db, 'personalRecords', id);
  
  const dataToUpdate: { [key:string]: any } = { ...recordData };
  if (recordData.date) {
    dataToUpdate.date = Timestamp.fromDate(recordData.date);
  }
  
  return await updateDoc(recordDoc, dataToUpdate);
};


// User Profile (assuming a single user, single profile document)
const USER_PROFILE_DOC_ID = "main-user-profile";

export const getUserProfile = async (): Promise<UserProfile | null> => {
    // Correctly point to the document within the top-level collection
    const profileDocRef = doc(db, 'profiles', USER_PROFILE_DOC_ID).withConverter(userProfileConverter);

    try {
        const docSnap = await getDoc(profileDocRef);
        if (!docSnap.exists()) {
            console.warn("User profile document does not exist at the specified path.");
            return null;
        }
        
        const profileData = docSnap.data();
        
        if(!profileData || !profileData.name) {
            console.warn("Profile document is empty or invalid.");
            return null;
        }

        return profileData;

    } catch (error) {
        console.error("Error fetching user profile:", error);
        return null;
    }
};

export const updateUserProfile = async (profileData: Partial<Omit<UserProfile, 'id'>>) => {
    // Get a reference to the specific document
    const profileDocRef = doc(db, 'profiles', USER_PROFILE_DOC_ID);
    
    // Manually convert date fields for partial updates because we use setDoc with merge
    const dataToUpdate: { [key: string]: any } = { ...profileData };
    
    if (profileData.joinedDate) {
        dataToUpdate.joinedDate = Timestamp.fromDate(profileData.joinedDate);
    }
    if (profileData.fitnessGoals) {
        dataToUpdate.fitnessGoals = profileData.fitnessGoals.map(goal => {
            const newGoal: { [key: string]: any } = { ...goal };
            // Target Date is required, so we can convert it directly.
            newGoal.targetDate = Timestamp.fromDate(goal.targetDate);

            // Date Achieved is optional, so we must handle its absence.
            if (goal.dateAchieved) {
                newGoal.dateAchieved = Timestamp.fromDate(goal.dateAchieved);
            } else {
                // If dateAchieved is not present, delete the key entirely
                // to avoid sending `undefined` to Firestore.
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
    
    // Handle dot notation for nested map updates (like lift progression)
    for (const key in dataToUpdate) {
        if (key.startsWith('liftProgressionAnalysis.') && dataToUpdate[key]?.generatedDate) {
            dataToUpdate[key].generatedDate = Timestamp.fromDate(dataToUpdate[key].generatedDate);
        }
    }

    // --- Recalculate PR Levels if relevant stats change ---
    const relevantKeys: (keyof UserProfile)[] = ['gender', 'age', 'weightValue', 'weightUnit', 'skeletalMuscleMassValue', 'skeletalMuscleMassUnit'];
    const needsRecalculation = relevantKeys.some(key => key in profileData);

    if (needsRecalculation) {
        const allRecords = await getPersonalRecords();
        // The user profile data that will be used for recalculation.
        // We merge the currently stored profile with the incoming changes to get the most up-to-date stats.
        const updatedProfileForCalc = { ...(await getUserProfile()), ...profileData };

        if (allRecords.length > 0 && updatedProfileForCalc) {
            const batch = writeBatch(db);

            // First, find the most recent record for each exercise.
            const mostRecentRecords = new Map<string, PersonalRecord>();
            for (const record of allRecords) {
                const key = record.exerciseName.trim().toLowerCase();
                const existing = mostRecentRecords.get(key);
                if (!existing || record.date > existing.date) {
                    mostRecentRecords.set(key, record);
                }
            }

            // Now, recalculate the level ONLY for these most recent records.
            for (const record of mostRecentRecords.values()) {
                const newLevel = getStrengthLevel(record, updatedProfileForCalc as UserProfile);
                // Only write to the database if the level has actually changed.
                if (newLevel !== record.strengthLevel) {
                    const recordRef = doc(db, 'personalRecords', record.id);
                    batch.update(recordRef, { strengthLevel: newLevel });
                }
            }
            // Commit all the updates in a single batch operation.
            await batch.commit();
        }
    }

    // Use setDoc with merge:true for creating/updating the document.
    return await setDoc(profileDocRef, dataToUpdate, { merge: true });
};
