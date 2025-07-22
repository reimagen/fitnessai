
// NOTE: This file does NOT have "use client" and is intended for server-side use.

import { db } from './firebase';
import { collection, addDoc, getDocs, doc, updateDoc, deleteDoc, writeBatch, Timestamp, query, orderBy, setDoc, getDoc, where } from 'firebase/firestore';
import type { WorkoutLog, PersonalRecord, UserProfile, StoredStrengthAnalysis, Exercise, ExerciseCategory } from './types';
import { startOfMonth, endOfMonth } from 'date-fns';

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

    return {
      id: snapshot.id,
      exerciseName: typeof data.exerciseName === 'string' ? data.exerciseName : 'Unnamed Exercise',
      weight: Number(data.weight || 0),
      weightUnit: data.weightUnit === 'kg' || data.weightUnit === 'lbs' ? data.weightUnit : 'lbs',
      date: data.date instanceof Timestamp ? data.date.toDate() : new Date(),
      category: category,
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
            dataToStore.fitnessGoals = profile.fitnessGoals.map(goal => ({
                ...goal,
                targetDate: goal.targetDate ? Timestamp.fromDate(goal.targetDate) : undefined,
            }));
        }
        if (profile.strengthAnalysis) {
            dataToStore.strengthAnalysis = {
                ...profile.strengthAnalysis,
                generatedDate: Timestamp.fromDate(profile.strengthAnalysis.generatedDate),
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
                targetDate: goal.targetDate instanceof Timestamp ? goal.targetDate.toDate() : undefined,
            })) : [];
        
        const strengthAnalysis = data.strengthAnalysis && data.strengthAnalysis.generatedDate instanceof Timestamp ? {
            ...data.strengthAnalysis,
            generatedDate: data.strengthAnalysis.generatedDate.toDate(),
        } : undefined;

        return {
            id: snapshot.id,
            name: data.name || "User",
            email: data.email || "",
            joinedDate: joinedDate,
            fitnessGoals: fitnessGoals,
            strengthAnalysis: strengthAnalysis,
            age: data.age,
            gender: data.gender,
            heightValue: data.heightValue,
            heightUnit: data.heightUnit,
            weightValue: data.weightValue,
            weightUnit: data.weightUnit,
            skeletalMuscleMassValue: data.skeletalMuscleMassValue,
            skeletalMuscleMassUnit: data.skeletalMuscleMassUnit,
            workoutsPerWeek: data.workoutsPerWeek,
            sessionTimeMinutes: data.sessionTimeMinutes,
            experienceLevel: data.experienceLevel,
            aiPreferencesNotes: data.aiPreferencesNotes,
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
  const batch = writeBatch(db);
  records.forEach(record => {
    const newDocRef = doc(personalRecordsCollection);
    batch.set(newDocRef, record);
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
    const profileDocRef = doc(db, 'profiles', USER_PROFILE_DOC_ID).withConverter(userProfileConverter);

    try {
        const snapshot = await getDoc(profileDocRef);
        if (!snapshot.exists()) {
            console.warn("User profile document not found. For a multi-user app, this is expected until a user signs in and a profile is created for them.");
            return null;
        }
        
        const profileData = snapshot.data(); 
        
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
    const profileDocRef = doc(db, 'profiles', USER_PROFILE_DOC_ID);
    
    // Manually convert date fields for partial updates because we use setDoc with merge
    const dataToUpdate: { [key: string]: any } = { ...profileData };
    
    if (profileData.joinedDate) {
        dataToUpdate.joinedDate = Timestamp.fromDate(profileData.joinedDate);
    }
    if (profileData.fitnessGoals) {
        dataToUpdate.fitnessGoals = profileData.fitnessGoals.map(g => ({
            ...g,
            targetDate: g.targetDate ? Timestamp.fromDate(g.targetDate) : undefined,
        }));
    }
    if (profileData.strengthAnalysis) {
        dataToUpdate.strengthAnalysis = {
            ...profileData.strengthAnalysis,
            generatedDate: Timestamp.fromDate(profileData.strengthAnalysis.generatedDate),
        };
    }

    // Use setDoc with merge:true to be safe, it will update or create if not exists.
    return await setDoc(profileDocRef, dataToUpdate, { merge: true });
};
