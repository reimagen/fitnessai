
"use client";

import { db } from './firebase';
import { collection, addDoc, getDocs, doc, updateDoc, deleteDoc, writeBatch, Timestamp, query, orderBy, setDoc, getDoc } from 'firebase/firestore';
import type { WorkoutLog, PersonalRecord, UserProfile, FitnessGoal, Exercise, SessionTime, ExperienceLevel } from './types';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

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
    const data = snapshot.data(options);
    return {
      ...data,
      id: snapshot.id,
      date: data.date.toDate(),
    } as WorkoutLog;
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
    const data = snapshot.data(options);
    return {
      ...data,
      id: snapshot.id,
      date: data.date.toDate(),
    } as PersonalRecord;
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
        return dataToStore;
    },
    fromFirestore: (snapshot: any, options: any): UserProfile => {
        const data = snapshot.data(options);
        const joinedDate = data.joinedDate ? data.joinedDate.toDate() : new Date();
        const fitnessGoals = data.fitnessGoals ? data.fitnessGoals.map((goal: any) => ({
                ...goal,
                targetDate: goal.targetDate ? goal.targetDate.toDate() : undefined,
            })) : [];

        return {
            ...data,
            id: snapshot.id,
            joinedDate: joinedDate,
            fitnessGoals: fitnessGoals
        } as UserProfile;
    }
};

// --- Firestore Service Functions ---

// Workout Logs
const workoutLogsCollection = collection(db, 'workoutLogs').withConverter(workoutLogConverter);

export const getWorkoutLogs = async (): Promise<WorkoutLog[]> => {
  const q = query(workoutLogsCollection, orderBy('date', 'desc'));
  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => doc.data());
};

export const addWorkoutLog = async (log: Omit<WorkoutLog, 'id'>) => {
  return await addDoc(workoutLogsCollection, log);
};

export const updateWorkoutLog = async (id: string, log: Partial<Omit<WorkoutLog, 'id' | 'date'>> & { date?: Date }) => {
  const logDoc = doc(db, 'workoutLogs', id);
  // Convert date back to timestamp if it exists
  const dataToUpdate = log.date ? { ...log, date: Timestamp.fromDate(log.date) } : log;
  return await updateDoc(logDoc, dataToUpdate);
};

export const deleteWorkoutLog = async (id: string) => {
  const logDoc = doc(db, 'workoutLogs', id);
  return await deleteDoc(logDoc);
};

// Personal Records
const personalRecordsCollection = collection(db, 'personalRecords').withConverter(personalRecordConverter);

const getPersonalRecords = async (): Promise<PersonalRecord[]> => {
  const q = query(personalRecordsCollection, orderBy('date', 'desc'));
  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => doc.data());
};

const addPersonalRecords = async (records: Omit<PersonalRecord, 'id'>[]) => {
  const batch = writeBatch(db);
  records.forEach(record => {
    const newDocRef = doc(personalRecordsCollection);
    batch.set(newDocRef, record);
  });
  await batch.commit();
};

export const updatePersonalRecord = async (id: string, recordData: Partial<Omit<PersonalRecord, 'id'>>) => {
  const recordDoc = doc(db, 'personalRecords', id);
  
  const dataToUpdate: { [key: string]: any } = { ...recordData };
  if (recordData.date) {
    dataToUpdate.date = Timestamp.fromDate(recordData.date);
  }
  
  return await updateDoc(recordDoc, dataToUpdate);
};


// User Profile (assuming a single user, single profile document)
const USER_PROFILE_DOC_ID = "main-user-profile";

const createDefaultProfile = async (): Promise<UserProfile> => {
    const profileDocRef = doc(db, 'profiles', USER_PROFILE_DOC_ID).withConverter(userProfileConverter);
    console.log("Creating a new default user profile.");
    const defaultProfile: Omit<UserProfile, 'id'> = {
        name: "New User",
        email: "user@example.com",
        joinedDate: new Date(),
        fitnessGoals: [],
        workoutsPerWeek: 3,
        sessionTimeMinutes: 45,
        experienceLevel: 'intermediate',
    };
    await setDoc(profileDocRef, defaultProfile);
    const newSnapshot = await getDoc(profileDocRef);
    if (!newSnapshot.exists()) {
         throw new Error("Fatal error: Failed to create and then fetch the user profile.");
    }
    return newSnapshot.data();
};

export const getUserProfile = async (): Promise<UserProfile> => {
    const profileDocRef = doc(db, 'profiles', USER_PROFILE_DOC_ID).withConverter(userProfileConverter);

    try {
        const snapshot = await getDoc(profileDocRef);
        if (!snapshot.exists()) {
            console.warn("No profile found, creating a default one.");
            return createDefaultProfile();
        }
        
        const profileData = snapshot.data(); 
        
        if(!profileData || !profileData.name) {
            console.warn("Profile document is empty or invalid. Recreating.");
            return createDefaultProfile();
        }

        return profileData;

    } catch (error) {
        console.error("Error fetching or parsing profile, creating a default one.", error);
        return createDefaultProfile();
    }
};

const updateUserProfile = async (profileData: Partial<Omit<UserProfile, 'id'>>) => {
    const profileDocRef = doc(db, 'profiles', USER_PROFILE_DOC_ID);
    
    // Manually convert date fields for partial updates
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

    // Use setDoc with merge:true to be safe, it will update or create if not exists.
    return await setDoc(profileDocRef, dataToUpdate, { merge: true });
};

// --- React Query Hooks ---

export function useWorkouts() {
  return useQuery<WorkoutLog[], Error>({ queryKey: ['workouts'], queryFn: getWorkoutLogs });
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
