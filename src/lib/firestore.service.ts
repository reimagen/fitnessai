
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
    const profileDocRef = doc(db, 'profiles', USER_PROFILE_DOC_ID).withConverter(userProfileConverter);
    let snapshot = await getDoc(profileDocRef);
    const existingData = snapshot.data();

    // Check if the profile doesn't exist OR if it's the generic "New User" profile from a previous error.
    // This ensures we overwrite the bad data one time to restore the user's correct profile.
    if (!snapshot.exists() || (existingData && existingData.name === 'New User')) {
        console.log("No valid user profile found, creating/overwriting with correct user data.");
        
        const correctProfile: Omit<UserProfile, 'id'> = {
            name: "Lisa Gu",
            email: "user@example.com",
            joinedDate: new Date("2025-06-01T00:00:00Z"),
            age: 36,
            gender: "Female",
            heightValue: 162.56, // 5ft 4in converted to cm for storage
            heightUnit: 'ft/in', // User's preferred display unit
            weightValue: undefined,
            weightUnit: 'lbs',
            workoutsPerWeek: 5,
            sessionTimeMinutes: 60 as SessionTime,
            experienceLevel: 'intermediate' as ExperienceLevel,
            aiPreferencesNotes: "Equipment available: my gym has eGYM machines, free weights, a pull-up bar, and pull up bands I currently have a right wrist sprain and need to reduce stress on push exercises, but pull is ok.",
            fitnessGoals: [
              {
                id: 'goal-1',
                description: 'Do a pull-up',
                targetDate: new Date('2025-12-31T00:00:00Z'),
                achieved: false,
                isPrimary: true,
              },
              {
                id: 'goal-2',
                description: 'Increase my run endurance from 3.5mi to 5mi',
                targetDate: new Date('2025-12-31T00:00:00Z'),
                achieved: false,
                isPrimary: false,
              },
              {
                id: 'goal-3',
                description: 'Build Muscle',
                targetDate: undefined,
                achieved: false,
                isPrimary: false,
              },
            ],
        };
        
        await setDoc(profileDocRef, correctProfile);
        snapshot = await getDoc(profileDocRef); // Re-fetch the newly set data

        if (!snapshot.exists()) {
            throw new Error("Fatal error: Failed to create and then fetch the user profile.");
        }
    }
    
    return snapshot.data() as UserProfile;
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
