
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
  targetDate: Date;
  achieved: boolean;
  dateAchieved?: Date;
  isPrimary?: boolean;
}

export type ExperienceLevel = 'beginner' | 'intermediate' | 'advanced';
export type SessionTime = 15 | 30 | 45 | 60;

export interface StoredStrengthAnalysis {
  result: StrengthImbalanceOutput;
  generatedDate: Date;
}

export interface AnalyzeLiftProgressionOutput {
  progressionStatus: "Excellent" | "Good" | "Stagnated" | "Regressing";
  insight: string;
  recommendation: string;
}

export interface StoredLiftProgressionAnalysis {
  result: AnalyzeLiftProgressionOutput;
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
  bodyFatPercentage?: number;
  workoutsPerWeek?: number;
  sessionTimeMinutes?: SessionTime;
  experienceLevel?: ExperienceLevel;
  aiPreferencesNotes?: string; 
  strengthAnalysis?: StoredStrengthAnalysis;
  liftProgressionAnalysis?: {
    [exerciseName: string]: StoredLiftProgressionAnalysis;
  };
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
  totalDurationMinutes: number;
  totalCaloriesBurned: number;
  totalSets: number;
  totalReps: number;
  categories: Record<string, number>;
}
