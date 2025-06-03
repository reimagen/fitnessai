
export interface Exercise {
  id: string;
  name: string;
  sets: number;
  reps: number;
  weight: number; // in kg
}

export interface WorkoutLog {
  id: string;
  date: Date;
  exercises: Exercise[];
  notes?: string;
}

export interface FitnessGoal {
  id:string;
  description: string;
  targetDate?: Date;
  achieved: boolean;
  isPrimary?: boolean; // Added for primary goal
}

export interface UserProfile {
  id: string;
  name: string;
  email: string;
  avatarUrl?: string;
  fitnessGoals: FitnessGoal[];
  age?: number;
  gender?: string;
  // Add other relevant profile fields
}

