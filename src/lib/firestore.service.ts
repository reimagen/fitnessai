
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
        return {
            ...data,
            id: snapshot.id,
            joinedDate: data.joinedDate.toDate(),
            fitnessGoals: data.fitnessGoals.map((goal: any) => ({
                ...goal,
                targetDate: goal.targetDate ? goal.targetDate.toDate() : undefined,
            }))
        } as UserProfile;
    }
};

// --- Firestore Service Functions ---

// Workout Logs
const workoutLogsCollection = collection(db, 'workoutLogs').withConverter(workoutLogConverter);

const getWorkoutLogs = async (): Promise<WorkoutLog[]> => {
  const q = query(workoutLogsCollection, orderBy('date', 'desc'));
  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => doc.data());
};

const addWorkoutLog = async (log: Omit<WorkoutLog, 'id'>) => {
  return await addDoc(workoutLogsCollection, log);
};

const updateWorkoutLog = async (id: string, log: Partial<WorkoutLog>) => {
  const logDoc = doc(db, 'workoutLogs', id);
  // Convert date back to timestamp if it exists
  const dataToUpdate = log.date ? { ...log, date: Timestamp.fromDate(log.date) } : log;
  return await updateDoc(logDoc, dataToUpdate);
};

const deleteWorkoutLog = async (id: string) => {
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


// User Profile (assuming a single user, single profile document)
const USER_PROFILE_DOC_ID = "main-user-profile";

const getUserProfile = async (): Promise<UserProfile> => {
    const profileCollection = collection(db, 'profiles').withConverter(userProfileConverter);
    const profileDocRef = doc(profileCollection, USER_PROFILE_DOC_ID);
    let snapshot = await getDoc(profileDocRef);

    if (!snapshot.exists()) {
        console.log("No user profile found, creating a new default profile.");
        const defaultProfile: Omit<UserProfile, 'id'> = {
            name: "New User",
            email: "user@example.com",
            joinedDate: new Date(),
            fitnessGoals: [],
            workoutsPerWeek: 3,
            sessionTimeMinutes: 45 as SessionTime,
            experienceLevel: 'intermediate' as ExperienceLevel,
            aiPreferencesNotes: "",
        };
        await setDoc(profileDocRef, defaultProfile);
        snapshot = await getDoc(profileDocRef);

        if (!snapshot.exists()) {
            throw new Error("Failed to create and then fetch the default user profile.");
        }
    }
    
    return snapshot.data();
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

    return await updateDoc(profileDocRef, dataToUpdate);
};

// --- React Query Hooks ---

export function useWorkouts() {
  return useQuery<WorkoutLog[], Error>({ queryKey: ['workouts'], queryFn: getWorkoutLogs });
}

export function useAddWorkout() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: addWorkoutLog,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workouts'] });
    },
  });
}

export function useUpdateWorkout() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string, data: Partial<WorkoutLog>}) => updateWorkoutLog(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workouts'] });
    },
  });
}

export function useDeleteWorkout() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: deleteWorkoutLog,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workouts'] });
    },
  });
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

export function useUserProfile() {
    return useQuery<UserProfile, Error>({ queryKey: ['profile'], queryFn: getUserProfile });
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
