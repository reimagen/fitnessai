
"use client";

import { db } from './firebase';
import { collection, addDoc, getDocs, doc, updateDoc, deleteDoc, writeBatch, Timestamp, serverTimestamp, query, orderBy } from 'firebase/firestore';
import type { WorkoutLog, PersonalRecord, UserProfile, FitnessGoal, Exercise } from './types';
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
    toFirestore: (profile: Omit<UserProfile, 'id'>) => {
        return {
            ...profile,
            joinedDate: Timestamp.fromDate(profile.joinedDate),
            fitnessGoals: profile.fitnessGoals.map(goal => ({
                ...goal,
                targetDate: goal.targetDate ? Timestamp.fromDate(goal.targetDate) : undefined,
            }))
        };
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
const getProfileDocRef = async () => {
    const profileCollection = collection(db, 'profiles').withConverter(userProfileConverter);
    const snapshot = await getDocs(profileCollection);
    if (snapshot.empty) {
        // If no profile, create one with the ID 'main-user-profile'
        const newProfile: Omit<UserProfile, 'id'> = {
            name: "New User",
            email: "user@example.com",
            joinedDate: new Date(),
            fitnessGoals: [],
        };
        const newDocRef = doc(profileCollection, "main-user-profile");
        await updateDoc(newDocRef, userProfileConverter.toFirestore(newProfile), { merge: true });
        return newDocRef;
    }
    return snapshot.docs[0].ref;
}

const getUserProfile = async (): Promise<UserProfile> => {
    const profileDocRef = await getProfileDocRef();
    const snapshot = await getDocs(collection(db, 'profiles').withConverter(userProfileConverter));
    return snapshot.docs[0].data();
};

const updateUserProfile = async (profileData: Partial<Omit<UserProfile, 'id'>>) => {
    const profileDocRef = await getProfileDocRef();
    const convertedData = {
        ...profileData,
        joinedDate: profileData.joinedDate ? Timestamp.fromDate(profileData.joinedDate) : undefined,
        fitnessGoals: profileData.fitnessGoals ? profileData.fitnessGoals.map(g => ({...g, targetDate: g.targetDate ? Timestamp.fromDate(g.targetDate) : undefined })) : undefined,
    }
    return updateDoc(profileDocRef, convertedData, { merge: true });
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
    return useMutation({
        mutationFn: updateUserProfile,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['profile'] });
            queryClient.invalidateQueries({ queryKey: ['prs'] }); // Invalidate PRs in case goals were completed
        }
    })
}
