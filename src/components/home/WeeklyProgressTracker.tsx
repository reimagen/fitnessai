
"use client";

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Star } from 'lucide-react';
import type { WorkoutLog, UserProfile } from '@/lib/types';
import { startOfWeek, endOfWeek, eachDayOfInterval, format, isSameDay, isToday, parseISO } from 'date-fns';
import { cn } from '@/lib/utils';

const LOCAL_STORAGE_KEY_WORKOUTS = "fitnessAppWorkoutLogs";
const LOCAL_STORAGE_KEY_PROFILE = "fitnessAppUserProfile";

export function WeeklyProgressTracker() {
  const [completedWorkouts, setCompletedWorkouts] = useState<Date[]>([]);
  const [workoutGoal, setWorkoutGoal] = useState<number>(3); // Default goal
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  useEffect(() => {
    if (isClient) {
      // Load user profile to get workout goal
      const profileString = localStorage.getItem(LOCAL_STORAGE_KEY_PROFILE);
      if (profileString) {
        try {
          const profile: UserProfile = JSON.parse(profileString);
          if (profile.workoutsPerWeek) {
            setWorkoutGoal(profile.workoutsPerWeek);
          }
        } catch (e) {
          console.error("Failed to parse user profile for tracker", e);
        }
      }

      // Load workout logs to find completed days
      const logsString = localStorage.getItem(LOCAL_STORAGE_KEY_WORKOUTS);
      if (logsString) {
        try {
          const logs: WorkoutLog[] = JSON.parse(logsString).map((log: any) => ({
              ...log,
              date: parseISO(log.date),
          }));
          const completedDates = logs.map(log => log.date);
          setCompletedWorkouts(completedDates);
        } catch (e) {
          console.error("Failed to parse workout logs for tracker", e);
        }
      }
    }
  }, [isClient]);

  const today = new Date();
  const weekStart = startOfWeek(today, { weekStartsOn: 0 }); // Sunday
  const weekEnd = endOfWeek(today, { weekStartsOn: 0 }); // Saturday
  const daysOfWeek = eachDayOfInterval({ start: weekStart, end: weekEnd });

  const completedThisWeek = daysOfWeek.filter(day => 
    completedWorkouts.some(completedDay => isSameDay(day, completedDay))
  ).length;

  const getFooterMessage = () => {
    const workoutsLeft = workoutGoal - completedThisWeek;
    if (workoutsLeft <= 0) {
      return "Goal achieved! Great job this week!";
    }
    if (workoutsLeft === 1) {
      return "Just 1 more workout to hit your goal!";
    }
    return `You're ${workoutsLeft} workouts away from your goal. Keep going!`;
  };

  if (!isClient) {
    // Skeleton loader or placeholder
    return (
      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle className="font-headline">Weekly Progress</CardTitle>
          <CardDescription>Loading your progress...</CardDescription>
        </CardHeader>
        <CardContent className="h-24 animate-pulse rounded-md bg-muted"></CardContent>
      </Card>
    );
  }

  return (
    <Card className="shadow-lg">
      <CardHeader>
        <CardTitle className="font-headline">Weekly Progress</CardTitle>
        <CardDescription>
          You've completed {completedThisWeek} of your {workoutGoal} workout goal this week.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex justify-around items-center">
        {daysOfWeek.map((day, index) => {
          const isCompleted = completedWorkouts.some(completedDay => isSameDay(day, completedDay));
          const isCurrentDay = isToday(day);

          return (
            <div key={index} className="flex flex-col items-center gap-2">
              <span className="text-xs font-medium text-muted-foreground">{format(day, 'E')}</span>
              <div className={cn(
                "w-10 h-10 rounded-full flex items-center justify-center border-2",
                isCompleted 
                  ? "bg-accent/20 border-accent" 
                  : "bg-secondary border-secondary-foreground/10",
                isCurrentDay && "border-primary"
              )}>
                {isCompleted ? (
                  <Star className="h-5 w-5 text-accent fill-accent" />
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
