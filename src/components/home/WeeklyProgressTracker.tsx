
"use client";

import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Star } from 'lucide-react';
import type { WorkoutLog, UserProfile } from '@/lib/types';
import { format } from 'date-fns/format';
import { isSameDay } from 'date-fns/isSameDay';
import { isToday } from 'date-fns/isToday';
import { cn } from '@/lib/utils';
import { useCurrentWeek } from '@/hooks/useCurrentWeek';
import { DEFAULT_WORKOUTS_PER_WEEK } from '@/lib/constants';
import React from 'react';

type WeeklyProgressTrackerProps = {
  workoutLogs: WorkoutLog[];
  userProfile?: UserProfile | null;
};

export function WeeklyProgressTracker({ workoutLogs, userProfile }: WeeklyProgressTrackerProps) {
  const workoutGoal = userProfile?.workoutsPerWeek || DEFAULT_WORKOUTS_PER_WEEK;
  const { weekStart, weekEnd, daysOfWeek } = useCurrentWeek();
  const today = new Date();
  
  const completedWorkouts = workoutLogs.filter(log => 
    log.date >= weekStart && log.date <= weekEnd
  );

  const completedThisWeek = new Set(completedWorkouts.map(log => format(log.date, 'yyyy-MM-dd'))).size;

  const getFooterMessage = () => {
    if (!userProfile) {
        return "Set your preferences in your profile to track weekly workout goals.";
    }

    if (completedThisWeek === 0) {
      return "Start your first workout this week to begin tracking progress!";
    }

    const workoutsLeft = workoutGoal - completedThisWeek;

    // Day of the week (Sunday = 0, Saturday = 6)
    const currentDayOfWeek = today.getDay();
    // Days remaining in the week, including today.
    // e.g., on Friday (5), days remaining is 7 - 5 = 2 (Friday, Saturday)
    const daysRemaining = 7 - currentDayOfWeek;

    if (workoutsLeft <= 0) {
      return "Goal achieved! Great job this week!";
    }

    // Check if the goal is still achievable
    if (workoutsLeft > daysRemaining) {
      return "Missed the workout goal this week, try again next week!";
    }

    if (workoutsLeft === 1) {
      return "Just 1 more workout to hit your goal!";
    }

    return `You're ${workoutsLeft} workouts away from your goal. Keep going!`;
  };

  return (
    <Card className="shadow-lg">
      <CardHeader>
        <CardTitle className="font-headline">Weekly Progress</CardTitle>
        <CardDescription>
          {userProfile ? `You've completed ${completedThisWeek} of your ${workoutGoal} workout goal this week.` : "Your weekly workout progress will appear here once you set your goals."}
        </CardDescription>
      </CardHeader>
      <CardContent className="flex justify-around items-center">
        {daysOfWeek.map((day, index) => {
          const isCompleted = completedWorkouts.some(log => isSameDay(day, log.date));
          const isCurrentDay = isToday(day);

          return (
            <div key={index} className="flex flex-col items-center gap-2">
              <span className="text-xs font-medium text-muted-foreground">{format(day, 'E')}</span>
              <div className={cn(
                "w-10 h-10 rounded-full flex items-center justify-center border-2",
                isCompleted 
                  ? "bg-yellow-400 border-yellow-500"
                  : "bg-secondary border-secondary-foreground/10",
                isCurrentDay && "border-primary"
              )}>
                {isCompleted ? (
                  <Star className="h-5 w-5 text-white fill-white" />
                ) : (
                  <span className="text-sm font-bold text-muted-foreground">{format(day, 'd')}</span>
                )}
              </div>
            </div>
          );
        })}
      </CardContent>
      <CardFooter>
        <p className="text-sm text-muted-foreground text-center w-full">{getFooterMessage()}</p>
      </CardFooter>
    </Card>
  );
}
