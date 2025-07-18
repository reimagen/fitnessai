
"use client";

import React, { useMemo } from 'react';
import type { WorkoutLog } from '@/lib/types';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { startOfWeek, endOfWeek, eachDayOfInterval, format, isToday } from 'date-fns';
import { cn } from '@/lib/utils';
import { Flame, Route } from 'lucide-react';

type WeeklyCardioTrackerProps = {
  workoutLogs: WorkoutLog[];
};

type CardioActivity = 'Run' | 'Walk' | 'Cycle' | 'Climb';
type ActivityStats = {
  distanceMi: number;
};
type DailyCardioData = {
  totalCalories: number;
  activities: Map<CardioActivity, ActivityStats>; 
};

const normalizeCardioActivity = (exerciseName: string): CardioActivity | null => {
  const name = exerciseName.toLowerCase();
  // Prioritize "run" to avoid "walking" matching first
  if (name.includes('run') || name.includes('treadmill')) return 'Run';
  if (name.includes('walk')) return 'Walk';
  if (name.includes('cycle') || name.includes('bike')) return 'Cycle';
  if (name.includes('climb')) return 'Climb';
  return null;
};

const getDistanceInMiles = (distance?: number, unit?: string): number => {
    if (!distance) return 0;
    if (unit === 'mi') return distance;
    if (unit === 'km') return distance * 0.621371;
    if (unit === 'ft') return distance * 0.000189394;
    return 0; // Default if unit is unknown or missing
};


export function WeeklyCardioTracker({ workoutLogs }: WeeklyCardioTrackerProps) {
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
            if (!activityType) return; // Skip if it's not a recognized cardio type

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
  const minGoal = 1200;
  const maxGoal = 1400;
  const progressPercentage = (totalWeeklyCalories / maxGoal) * 100;

  return (
    <Card className="shadow-lg">
      <CardHeader>
        <CardTitle className="font-headline text-2xl font-semibold">Weekly Cardio</CardTitle>
        <CardDescription>
          Your goal is to burn 1200-1400 calories from cardio each week.
        </CardDescription>
      </CardHeader>
      <CardContent>
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
                  <div className="mt-2 flex-grow flex flex-col text-center">
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
                      <div className="text-xs text-muted-foreground space-y-1 mt-1 flex-grow overflow-y-auto">
                        {activities && Array.from(activities.entries()).map(([activity, stats]) => (
                           <p key={activity} className="w-full truncate">
                              <span className="font-semibold text-foreground">{activity}</span>
                              {stats.distanceMi > 0 && (
                                  <span> {stats.distanceMi.toFixed(1)} mi</span>
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
        </div>
      </CardContent>
      <CardFooter>
        <p className="text-sm text-muted-foreground text-center w-full">
          {totalWeeklyCalories >= minGoal 
            ? "You've hit your minimum cardio goal for the week. Great work!" 
            : `Only ${Math.round(minGoal - totalWeeklyCalories)} calories to go to reach your minimum goal.`}
        </p>
      </CardFooter>
    </Card>
  );
}
