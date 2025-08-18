
"use client";

import React, { useMemo } from 'react';
import type { WorkoutLog, UserProfile } from '@/lib/types';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { startOfWeek, endOfWeek, eachDayOfInterval, format, isToday } from 'date-fns';
import { cn } from '@/lib/utils';
import { Flame, Info } from 'lucide-react';
import { calculateExerciseCalories } from '@/lib/calorie-calculator';

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
  activities: Map<CardioActivity, ActivityStats>; 
};

const normalizeCardioActivity = (exerciseName: string): CardioActivity | null => {
  const name = exerciseName.toLowerCase();
  if (name.includes('run') || name.includes('treadmill')) return 'Run';
  if (name.includes('walk')) return 'Walk';
  if (name.includes('cycle') || name.includes('bike')) return 'Cycle';
  if (name.includes('climbmill')) return 'Climbmill';
  if (name.includes('rowing')) return 'Rowing';
  return null;
};

const getDistanceInMiles = (distance?: number, unit?: string): number => {
    if (!distance) return 0;
    if (unit === 'mi') return distance;
    if (unit === 'km') return distance * 0.621371;
    if (unit === 'ft') return distance * 0.000189394;
    return 0;
};


export function WeeklyCardioTracker({ workoutLogs, userProfile }: WeeklyCardioTrackerProps) {
  const weeklyData = useMemo(() => {
    const today = new Date();
    const weekStart = startOfWeek(today, { weekStartsOn: 0 });
    const weekEnd = endOfWeek(today, { weekStartsOn: 0 });

    const dataMap = new Map<string, DailyCardioData>();

    workoutLogs.forEach(log => {
      if (log.date >= weekStart && log.date <= weekEnd) {
        const dateKey = format(log.date, 'yyyy-MM-dd');

        if (!dataMap.has(dateKey)) {
          dataMap.set(dateKey, { totalCalories: 0, activities: new Map() });
        }
        const dayData = dataMap.get(dateKey)!;

        log.exercises.forEach(ex => {
          if (ex.category === 'Cardio') {
            const activityType = normalizeCardioActivity(ex.name);
            if (!activityType) return;

            const calories = ex.calories || 0;
            const distanceMi = getDistanceInMiles(ex.distance, ex.distanceUnit);
            
            dayData.totalCalories += calories;

            const currentStats = dayData.activities.get(activityType) || { distanceMi: 0 };
            currentStats.distanceMi += distanceMi;
            dayData.activities.set(activityType, currentStats);
          }
        });
      }
    });

    return dataMap;
  }, [workoutLogs]);

  const today = new Date();
  const weekStart = startOfWeek(today, { weekStartsOn: 0 });
  const weekEnd = endOfWeek(today, { weekStartsOn: 0 });
  const daysOfWeek = eachDayOfInterval({ start: weekStart, end: weekEnd });

  const totalWeeklyCalories = Array.from(weeklyData.values()).reduce((sum, day) => sum + day.totalCalories, 0);
  const minGoal = userProfile?.weeklyCardioCalorieGoal || 1200;
  const maxGoal = userProfile?.weeklyCardioStretchCalorieGoal || 1400;
  const progressPercentage = (totalWeeklyCalories / maxGoal) * 100;
  
  const caloriesPerMile = useMemo(() => {
    if (!userProfile) return null; // Guard clause to prevent crash
    const oneMileRun = { name: 'run', category: 'Cardio' as const, distance: 1, distanceUnit: 'mi' as const, sets: 0, reps: 0, weight: 0 };
    return calculateExerciseCalories(oneMileRun, userProfile, workoutLogs);
  }, [userProfile, workoutLogs]);

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
        return `Congrats on hitting your minimum goal! To reach your stretch goal, you only need to burn another ${caloriesToStretch} calories, only a ${milesToStretch} mi run.`;
      }
      return `Congrats on hitting your minimum goal! You only need another ${caloriesToStretch} calories to hit your stretch goal.`;
    }

    if (totalWeeklyCalories >= minGoal * 0.5) {
      const caloriesToMin = Math.round(minGoal - totalWeeklyCalories);
      const milesToMin = caloriesPerMile && caloriesPerMile > 0 ? (caloriesToMin / caloriesPerMile).toFixed(1) : null;
      if (milesToMin) {
        return `You're only ${caloriesToMin} calories away from your minimum goal. Run ${milesToMin} more miles to achieve this goal.`;
      }
       return `You're only ${caloriesToMin} calories away from your minimum goal. Keep pushing!`;
    }
    
    const caloriesRemaining = minGoal - totalWeeklyCalories;
    const milesForMinGoal = caloriesPerMile && caloriesPerMile > 0 ? (caloriesRemaining / caloriesPerMile).toFixed(1) : null;
    
    if (milesForMinGoal && parseFloat(milesForMinGoal) > 0) {
      return `Your minimum goal is to burn ${minGoal} calories. Run ${milesForMinGoal} more miles to achieve this goal.`;
    }
    
    return `Your minimum goal is to burn ${minGoal} calories. Get started to make progress!`;
  };


  return (
    <Card className="shadow-lg">
      <CardHeader>
        <CardTitle className="font-headline text-2xl font-semibold">Weekly Cardio</CardTitle>
        <CardDescription>
          {userProfile ? `To support your cardio health, your weekly target is to burn ${minGoal}-${maxGoal} calories.` : "Set your profile goals to track your weekly cardio."}
        </CardDescription>
      </CardHeader>
      <CardContent>
        {userProfile ? (
          <div className="space-y-4">
            <div className="flex justify-between items-baseline mb-1">
              <span className="font-bold text-primary text-lg">{Math.round(totalWeeklyCalories)} kcal</span>
              <span className="text-sm text-muted-foreground">/ {maxGoal} kcal</span>
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
              <Info className="h-5 w-5 flex-shrink-0"/> 
              <p>{getMotivationalMessage()}</p>
          </div>
        )}

        <div className="grid grid-cols-7 gap-2 md:gap-4 pt-4">
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
                  "rounded-lg border bg-card p-2 md:p-3 shadow-sm flex flex-col h-full min-h-[160px]",
                  isCurrentDay && "border-2 border-primary"
                )}
              >
                <div className="flex flex-col items-center text-center">
                  <p className="text-xs font-medium text-muted-foreground">{format(day, 'E')}</p>
                  <p className="font-bold text-lg">{format(day, 'd')}</p>
                </div>
                <div className="mt-2 flex-grow flex flex-col text-center justify-between">
                  <div className="flex items-center justify-center gap-1 font-bold text-accent h-6">
                    {totalCalories > 0 ? (
                      <>
                        <Flame className="h-4 w-4" />
                        <span>{Math.round(totalCalories)}</span>
                      </>
                    ) : (
                      <span className="text-sm font-medium text-muted-foreground/60">None</span>
                    )}
                  </div>
                  {totalCalories > 0 && (
                    <div className="text-xs text-muted-foreground space-y-1 mt-1 overflow-y-auto">
                      {activities && Array.from(activities.entries()).map(([activity, stats]) => (
                         <p key={activity} className="w-full truncate font-semibold text-foreground">
                            {activity}
                            {stats.distanceMi > 0 && (
                                <span className="font-normal text-muted-foreground"> {stats.distanceMi.toFixed(1)} mi</span>
                            )}
                        </p>
                      ))}
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
