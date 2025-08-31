
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
  distanceUnit?: 'mi' | 'km' | 'ft' | 'm'; // Added 'm'
  duration?: number;
  durationUnit?: 'min' | 'hr' | 'sec';
  calories?: number;
}

export interface WorkoutLog {
  id: string;
  userId: string;
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

export interface AnalyzeFitnessGoalsInput {
  userProfile: {
      age?: number;
      gender?: 'Male' | 'Female';
      weightValue?: number;
      weightUnit?: 'kg' | 'lbs';
      bodyFatPercentage?: number;
      experienceLevel?: 'beginner' | 'intermediate' | 'advanced';
      fitnessGoals: {
          description: string;
          isPrimary?: boolean;
      }[];
  };
}

export interface AnalyzeFitnessGoalsOutput {
    overallSummary: string;
    goalInsights: {
        originalGoalDescription: string;
        isConflicting: boolean;
        isVague: boolean;
        suggestedGoal: string;
        analysis: string;
        suggestedTimelineInDays?: number;
    }[];
}

export interface StoredGoalAnalysis {
  result: AnalyzeFitnessGoalsOutput;
  generatedDate: Date;
}


export interface StrengthImbalanceInput {
  clientSideFindings: {
      imbalanceType: string;
      lift1Name: string;
      lift1Weight: number;
      lift1Unit: "kg" | "lbs";
      lift1Level: StrengthLevel;
      lift2Name: string;
      lift2Weight: number;
      lift2Unit: "kg" | "lbs";
      lift2Level: StrengthLevel;
      userRatio: string;
      targetRatio: string;
      imbalanceFocus: "Balanced" | "Level Imbalance" | "Ratio Imbalance";
  }[];
  userProfile: {
      age?: number;
      gender?: string;
      weightValue?: number;
      weightUnit?: 'kg' | 'lbs';
      skeletalMuscleMassValue?: number;
      skeletalMuscleMassUnit?: 'kg' | 'lbs';
      fitnessGoals?: {
          description: string;
          isPrimary?: boolean;
      }[];
  };
}


export interface AnalyzeLiftProgressionInput {
  exerciseName: string;
  exerciseHistory: {
    date: string;
    weight: number;
    sets: number;
    reps: number;
  }[];
  userProfile: {
    age?: number;
    gender?: string;
    heightValue?: number;
    heightUnit?: 'cm' | 'ft/in';
    weightValue?: number;
    weightUnit?: 'kg' | 'lbs';
    skeletalMuscleMassValue?: number;
    skeletalMuscleMassUnit?: 'kg' | 'lbs';
    fitnessGoals?: {
      description: string;
      isPrimary?: boolean;
    }[];
  };
  currentLevel?: StrengthLevel;
  trendPercentage?: number;
  volumeTrendPercentage?: number;
}


export interface AnalyzeLiftProgressionOutput {
  insight: string;
  recommendation: string;
}

export interface StoredLiftProgressionAnalysis {
  result: AnalyzeLiftProgressionOutput;
  generatedDate: Date;
}

export interface StoredWeeklyPlan {
  plan: string;
  generatedDate: Date;
  contextUsed: string;
  userId: string;
  weekStartDate: string;
}

export interface AIUsageStats {
    goalAnalyses?: {
      count: number;
      date: string; // YYYY-MM-DD
    };
    screenshotParses?: {
      count: number;
      date: string; // YYYY-MM-DD
    };
    planGenerations?: {
        count: number;
        date: string; // YYYY-MM-DD
    };
    prParses?: {
        count: number;
        date: string; // YYYY-MM-DD
    };
    strengthAnalyses?: {
        count: number;
        date: string; // YYYY-MM-DD
    };
}

export interface UserProfile {
  id: string;
  name: string;
  email: string;
  avatarUrl?: string;
  joinedDate?: Date;
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
  goalAnalysis?: StoredGoalAnalysis;
  liftProgressionAnalysis?: {
    [exerciseName: string]: StoredLiftProgressionAnalysis;
  };
  weeklyPlan?: StoredWeeklyPlan;
  weeklyCardioCalorieGoal?: number;
  weeklyCardioStretchCalorieGoal?: number;
  aiUsage?: AIUsageStats;
}

export interface PersonalRecord {
  id: string;
  userId: string;
  exerciseName: string;
  weight: number;
  weightUnit: 'kg' | 'lbs';
  date: Date;
  category?: ExerciseCategory;
  strengthLevel?: StrengthLevel;
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
