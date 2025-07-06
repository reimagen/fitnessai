
export type ExerciseCategory = 'Cardio' | 'Lower Body' | 'Upper Body' | 'Full Body' | 'Core' | 'Other';
export type StrengthLevel = 'Beginner' | 'Intermediate' | 'Advanced' | 'Elite' | 'N/A';

export interface Exercise {
  id: string;
  name: string;
  sets: number;
  reps: number;
  weight: number;
  weightUnit?: 'kg' | 'lbs';
  category?: ExerciseCategory;
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

export interface StoredStrengthAnalysis {
  result: StrengthImbalanceOutput;
  generatedDate: Date;
}

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
  weightValue?: number;
  weightUnit?: 'kg' | 'lbs';
  skeletalMuscleMassValue?: number;
  skeletalMuscleMassUnit?: 'kg' | 'lbs';
  workoutsPerWeek?: number;
  sessionTimeMinutes?: SessionTime;
  experienceLevel?: ExperienceLevel;
  aiPreferencesNotes?: string; 
  strengthAnalysis?: StoredStrengthAnalysis;
}

export interface PersonalRecord {
  id: string;
  exerciseName: string;
  weight: number;
  weightUnit: 'kg' | 'lbs';
  date: Date;
  category?: ExerciseCategory;
}

export interface StrengthImbalanceOutput {
  summary: string;
  findings: {
      imbalanceType: string;
      lift1Name: string;
      lift1Weight: number;
      lift1Unit: "kg" | "lbs";
      lift2Name: string;
      lift2Weight: number;
      lift2Unit: "kg" | "lbs";
      userRatio: string;
      targetRatio: string;
      imbalanceFocus: "Balanced" | "Level Imbalance" | "Ratio Imbalance";
      insight: string;
      recommendation: string;
  }[];
}

export interface AggregatedWorkoutDaySummary {
  date: Date;
  totalExercises: number;
  totalDurationMinutes: number; // Sum of all exercise durations for the day
  totalCaloriesBurned: number; // Sum of all calories burned
  // More detailed summaries can be added later if needed, e.g.,
  // totalSets: number;
  // totalWeightLifted: number; // Could be sum of weight * reps * sets
  // exerciseCategoriesCount: Record<string, number>; // e.g., { "Cardio": 2, "Upper Body": 3 }
}
