
"use client";

import React, { useMemo } from 'react';
import type { WorkoutLog, UserProfile } from '@/lib/types';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { format, isToday } from 'date-fns';
import { useCurrentWeek } from '@/hooks/useCurrentWeek';
import { DEFAULT_WEEKLY_CARDIO_MIN_GOAL, DEFAULT_WEEKLY_CARDIO_STRETCH_GOAL, CARDIO_RUN_THRESHOLD_MPH, MILES_PER_KM, MILES_PER_FEET } from '@/lib/constants';
import { cn } from '@/lib/utils';
import { Flame, Info } from 'lucide-react';
import { calculateExerciseCalories, calculateWeeklyCardioTarget } from '@/lib/calorie-calculator';

type WeeklyCardioTrackerProps = {
  workoutLogs: WorkoutLog[];
  userProfile?: UserProfile | null;
};

type CardioActivity = 'Run' | 'Walk' | 'Cycle' | 'Climbmill' | 'Rowing';
type ActivityStats = {
  distanceMi: number;
};
type DailyCardioData = {
  totalCalories: number;
  hasEstimatedCalories: boolean;
  activities: Map<CardioActivity, ActivityStats>;
};

const normalizeCardioActivity = (exerciseName: string, distanceMi: number, durationHours: number): CardioActivity | null => {
  const name = exerciseName.toLowerCase();

  // Speed-based categorization for treadmill, elliptical, and ascent trainer
  if (name.includes('treadmill') || name.includes('elliptical') || name.includes('ascent trainer')) {
    if (durationHours > 0) {
      const speedMph = distanceMi / durationHours;
      return speedMph > CARDIO_RUN_THRESHOLD_MPH ? 'Run' : 'Walk';
    }
    return 'Walk'; // Default to Walk if no duration is provided
  }

  if (name.includes('run')) return 'Run';
  if (name.includes('walk')) return 'Walk';
  if (name.includes('cycle') || name.includes('bike')) return 'Cycle';
  if (name.includes('climbmill')) return 'Climbmill';
  if (name.includes('rowing')) return 'Rowing';
  return null;
};

const getDistanceInMiles = (distance?: number, unit?: string): number => {
  if (!distance) return 0;
  if (unit === 'mi') return distance;
  if (unit === 'km') return distance * MILES_PER_KM;
  if (unit === 'ft') return distance * MILES_PER_FEET;
  return 0;
};


export function WeeklyCardioTracker({ workoutLogs, userProfile }: WeeklyCardioTrackerProps) {
  const { weekStart, weekEnd, daysOfWeek } = useCurrentWeek();

  const weeklyData = useMemo(() => {
    const dataMap = new Map<string, DailyCardioData>();

    workoutLogs.forEach(log => {
      if (log.date >= weekStart && log.date <= weekEnd) {
        const dateKey = format(log.date, 'yyyy-MM-dd');

        if (!dataMap.has(dateKey)) {
          dataMap.set(dateKey, { totalCalories: 0, hasEstimatedCalories: false, activities: new Map() });
        }
        const dayData = dataMap.get(dateKey)!;

        log.exercises.forEach(ex => {
          if (ex.category === 'Cardio') {
            const distanceMi = getDistanceInMiles(ex.distance, ex.distanceUnit);
            let durationHours = 0;
            if (ex.duration) {
              if (ex.durationUnit === 'min') durationHours = ex.duration / 60;
              else if (ex.durationUnit === 'sec') durationHours = ex.duration / 3600;
              else if (ex.durationUnit === 'hr') durationHours = ex.duration;
            }

            const activityType = normalizeCardioActivity(ex.name, distanceMi, durationHours);
            if (!activityType) return;

            const calories = ex.calories || 0;

            dayData.totalCalories += calories;
            if (ex.caloriesSource === 'estimated' || (ex.calories && ex.calories > 0 && !ex.caloriesSource)) {
              dayData.hasEstimatedCalories = true;
            }

            const currentStats = dayData.activities.get(activityType) || { distanceMi: 0 };
            currentStats.distanceMi += distanceMi;
            dayData.activities.set(activityType, currentStats);
          }
        });
      }
    });

    return dataMap;
  }, [workoutLogs, weekStart, weekEnd]);

  const totalWeeklyCalories = Array.from(weeklyData.values()).reduce((sum, day) => sum + day.totalCalories, 0);
  const hasEstimatedInWeek = Array.from(weeklyData.values()).some(day => day.hasEstimatedCalories);

  // Determine goals based on cardio goal mode
  let minGoal: number;
  let maxGoal: number;

  if (userProfile?.cardioGoalMode === 'auto') {
    const calculatedTargets = calculateWeeklyCardioTarget(userProfile);
    minGoal = calculatedTargets?.baseTarget || DEFAULT_WEEKLY_CARDIO_MIN_GOAL;
    maxGoal = calculatedTargets?.stretchTarget || DEFAULT_WEEKLY_CARDIO_STRETCH_GOAL;
  } else {
    minGoal = userProfile?.weeklyCardioCalorieGoal || DEFAULT_WEEKLY_CARDIO_MIN_GOAL;
    maxGoal = userProfile?.weeklyCardioStretchCalorieGoal || DEFAULT_WEEKLY_CARDIO_STRETCH_GOAL;
  }
  const progressPercentage = (totalWeeklyCalories / maxGoal) * 100;

  const caloriesPerMile = useMemo(() => {
    if (!userProfile) return null;
    const oneMileRun = { name: 'run', category: 'Cardio' as const, distance: 1, distanceUnit: 'mi' as const, sets: 0, reps: 0, weight: 0 };
    // Pass an empty array for workoutLogs to prevent iterating through history and use default pace.
    return calculateExerciseCalories(oneMileRun, userProfile, []);
  }, [userProfile]);

  const getMotivationalMessage = () => {
    if (!userProfile) { // Guard clause for when profile doesn't exist
      return "Set your weight and weekly goals in your profile to enable personalized cardio tracking.";
    }

    if (totalWeeklyCalories >= maxGoal) {
      return "You've crushed your stretch goal! Amazing work this week.";
    }

    if (totalWeeklyCalories >= minGoal) {
      const caloriesToStretch = Math.round(maxGoal - totalWeeklyCalories);
      const milesToStretch = caloriesPerMile && caloriesPerMile > 0 ? (caloriesToStretch / caloriesPerMile).toFixed(1) : null;
      if (milesToStretch) {
        return `Congrats on hitting your minimum goal! To reach your stretch goal, you only need to burn another ${caloriesToStretch.toLocaleString()} calories, only a ${milesToStretch} mi run.`;
      }
      return `Congrats on hitting your minimum goal! You only need another ${caloriesToStretch.toLocaleString()} calories to hit your stretch goal.`;
    }

    if (totalWeeklyCalories >= minGoal * 0.5) {
      const caloriesToMin = Math.round(minGoal - totalWeeklyCalories);
      const milesToMin = caloriesPerMile && caloriesPerMile > 0 ? (caloriesToMin / caloriesPerMile).toFixed(1) : null;
      if (milesToMin) {
        return `You're only ${caloriesToMin.toLocaleString()} calories away from your minimum goal. Run ${milesToMin} more miles to achieve this goal.`;
      }
      return `You're only ${caloriesToMin.toLocaleString()} calories away from your minimum goal. Keep pushing!`;
    }

    const caloriesRemaining = minGoal - totalWeeklyCalories;
    const milesForMinGoal = caloriesPerMile && caloriesPerMile > 0 ? (caloriesRemaining / caloriesPerMile).toFixed(1) : null;

    if (milesForMinGoal && parseFloat(milesForMinGoal) > 0) {
      return `Your minimum goal is to burn ${minGoal.toLocaleString()} calories. Run ${milesForMinGoal} more miles to achieve this goal.`;
    }

    return `Your minimum goal is to burn ${minGoal.toLocaleString()} calories. Get started to make progress!`;
  };


  return (
    <Card className="shadow-lg">
      <CardHeader>
        <CardTitle className="font-headline text-2xl font-semibold">Weekly Cardio</CardTitle>
        <CardDescription className="flex flex-col gap-2">
          <div>
            {userProfile
              ? `${userProfile.cardioGoalMode === 'auto' ? 'Auto-calculated based on CDC guidelines for your weight.' : 'Custom targets.'} Weekly goal: ${minGoal.toLocaleString()}-${maxGoal.toLocaleString()} calories.`
              : "Set your profile goals to track your weekly cardio."}
          </div>
          {userProfile?.cardioCalculationMethod === 'auto' && (
            <div className="inline-flex w-fit">
              <span className="text-xs px-2 py-1 rounded-full bg-amber-100 text-amber-700 font-medium">
                ✨ Simplified Auto-Calculated
              </span>
            </div>
          )}
        </CardDescription>
      </CardHeader>
      <CardContent>
        {userProfile ? (
          <div className="space-y-4">
            <div className="flex justify-between items-baseline mb-1">
              <span className="font-bold text-primary text-lg">{Math.round(totalWeeklyCalories).toLocaleString()} kcal{hasEstimatedInWeek ? ' est.' : ''}</span>
              <span className="text-sm text-muted-foreground">/ {maxGoal.toLocaleString()} kcal</span>
            </div>
            <div className="relative h-4 w-full">
              <Progress value={progressPercentage} className="h-full" />
              <div
                className="absolute top-0 h-full w-1 bg-muted-foreground/50"
                style={{ left: `${(minGoal / maxGoal) * 100}%` }}
                title={`Minimum goal: ${minGoal} kcal`}
              ></div>
            </div>
            <p className="text-sm text-muted-foreground text-center w-full pt-2">
              {getMotivationalMessage()}
            </p>
          </div>
        ) : (
          <div className="flex items-center gap-2 p-4 rounded-md border border-yellow-500 bg-yellow-500/10 text-yellow-700 text-sm">
            <Info className="h-5 w-5 flex-shrink-0" />
            <p>{getMotivationalMessage()}</p>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-7 gap-4 pt-4">
          {daysOfWeek.map(day => {
            const dateKey = format(day, 'yyyy-MM-dd');
            const dayData = weeklyData.get(dateKey);
            const totalCalories = dayData?.totalCalories || 0;
            const activities = dayData?.activities;
            const isCurrentDay = isToday(day);

            return (
              <div
                key={dateKey}
                className={cn(
                  "rounded-lg border bg-card p-2 shadow-sm flex flex-row items-center md:flex-col md:items-stretch md:p-3 md:min-h-[160px]",
                  isCurrentDay && "border-2 border-primary"
                )}
              >
                <div className="flex flex-col items-center justify-center text-center p-2 pr-4 md:p-0">
                  <p className="text-xs font-medium text-muted-foreground">{format(day, 'E')}</p>
                  <p className="font-bold text-lg">{format(day, 'd')}</p>
                </div>

                <div className="h-full w-px bg-border mx-2 md:h-px md:w-full md:my-2 md:mx-0"></div>

                <div className="flex-grow flex items-center md:flex-col md:items-stretch md:justify-center text-center">
                  {totalCalories > 0 && activities ? (
                    <div className="grid grid-cols-2 items-center flex-grow w-full md:grid-cols-1">
                      <div className="flex items-center justify-center font-bold text-accent md:h-8 md:mb-2">
                        <div className="flex items-center gap-1">
                          <Flame className="h-4 w-4" />
                          <span>{Math.round(totalCalories)} kcal{dayData.hasEstimatedCalories ? ' est.' : ''}</span>
                        </div>
                      </div>
                      <div className="flex-grow flex flex-col items-start md:items-center justify-center text-xs text-muted-foreground space-y-1 w-full overflow-hidden pl-2 md:pl-0">
                        {Array.from(activities.entries()).map(([activity, stats]) => (
                          <p key={activity} className="w-full text-left md:text-center truncate font-semibold text-foreground">
                            {activity}
                            {stats.distanceMi > 0 && (
                              <span className="font-normal text-muted-foreground"> {stats.distanceMi.toFixed(1)} mi</span>
                            )}
                          </p>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 items-center flex-grow w-full md:grid-cols-1">
                      <div className="flex items-center justify-center text-sm font-medium text-muted-foreground/60 md:h-8 md:mb-2">
                        None
                      </div>
                      {/* Empty div to maintain the two-column structure on mobile */}
                      <div className="hidden md:block"></div>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
