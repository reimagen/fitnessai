
export interface Exercise {
  id: string;
  name: string;
  sets: number;
  reps: number;
  weight: number;
  weightUnit?: 'kg' | 'lbs';
  category?: string;
  distance?: number;
  distanceUnit?: 'mi' | 'km' | 'ft'; // Added 'ft'
  duration?: number;
  durationUnit?: 'min' | 'hr' | 'sec';
  calories?: number;
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
  isPrimary?: boolean;
}

export type ExperienceLevel = 'beginner' | 'intermediate' | 'advanced';
export type SessionTime = 15 | 30 | 45 | 60;


export interface UserProfile {
  id: string;
  name: string;
  email: string;
  avatarUrl?: string;
  joinedDate: Date;
  fitnessGoals: FitnessGoal[];
  age?: number;
  gender?: string;
  heightValue?: number; 
  heightUnit?: 'cm' | 'ft/in'; 
  workoutsPerWeek?: number;
  sessionTimeMinutes?: SessionTime;
  experienceLevel?: ExperienceLevel;
  aiPreferencesNotes?: string; 
}

