
"use client";

import React, { useState, useEffect } from 'react';
import type { WorkoutLog, ExerciseCategory } from '@/lib/types';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { startOfWeek, endOfWeek, eachDayOfInterval, format, isSameDay, isToday, parseISO } from 'date-fns';
import { cn } from '@/lib/utils';

const LOCAL_STORAGE_KEY_WORKOUTS = "fitnessAppWorkoutLogs";

const categoryStyles: Record<ExerciseCategory, React.CSSProperties> = {
  'Upper Body': { backgroundColor: 'hsl(var(--chart-1))', color: 'hsl(var(--chart-1-foreground))' },
  'Lower Body': { backgroundColor: 'hsl(var(--chart-2))', color: 'hsl(var(--chart-2-foreground))' },
  'Cardio':     { backgroundColor: 'hsl(var(--chart-3))', color: 'hsl(var(--chart-3-foreground))' },
  'Core':       { backgroundColor: 'hsl(var(--chart-4))', color: 'hsl(var(--chart-4-foreground))' },
  'Full Body':  { backgroundColor: 'hsl(var(--chart-6))', color: 'hsl(var(--chart-6-foreground))' },
  'Other':      { backgroundColor: 'hsl(var(--chart-5))', color: 'hsl(var(--chart-5-foreground))' },
};

export function RecentHistory() {
  const [dailyCategories, setDailyCategories] = useState<Map<string, Set<ExerciseCategory>>>(new Map());
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  useEffect(() => {
    if (isClient) {
      const logsString = localStorage.getItem(LOCAL_STORAGE_KEY_WORKOUTS);
      if (logsString) {
        try {
          const logs: WorkoutLog[] = JSON.parse(logsString).map((log: any) => ({
            ...log,
            date: parseISO(log.date),
          }));

          const today = new Date();
          const weekStart = startOfWeek(today, { weekStartsOn: 0 });
          const weekEnd = endOfWeek(today, { weekStartsOn: 0 });

          const categoriesMap = new Map<string, Set<ExerciseCategory>>();

          logs.forEach(log => {
            const logDate = log.date instanceof Date ? log.date : parseISO(log.date);
            if (logDate >= weekStart && logDate <= weekEnd) {
              const dateKey = format(logDate, 'yyyy-MM-dd');
              if (!categoriesMap.has(dateKey)) {
                categoriesMap.set(dateKey, new Set());
              }
              const categoriesSet = categoriesMap.get(dateKey)!;
              log.exercises.forEach(ex => {
                if (ex.category) {
                  categoriesSet.add(ex.category);
                }
              });
            }
          });
          setDailyCategories(categoriesMap);
        } catch (e) {
          console.error("Failed to parse workout logs for recent history", e);
        }
      }
    }
  }, [isClient]);

  const today = new Date();
  const weekStart = startOfWeek(today, { weekStartsOn: 0 });
  const weekEnd = endOfWeek(today, { weekStartsOn: 0 });
  const daysOfWeek = eachDayOfInterval({ start: weekStart, end: weekEnd });
  
  if (!isClient) {
    return (
      <Card className="mt-12 shadow-lg animate-pulse">
        <CardHeader>
          <div className="h-6 w-3/4 rounded-md bg-muted"></div>
          <div className="h-4 w-1/2 rounded-md bg-muted"></div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-7 gap-2 md:gap-4">
            {Array.from({ length: 7 }).map((_, index) => (
              <div key={index} className="h-32 rounded-lg bg-muted"></div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="mt-12 shadow-lg">
      <CardHeader>
        <CardTitle className="font-headline text-2xl font-semibold">Daily Exercises By Category</CardTitle>
        <CardDescription>A summary of your completed workout categories.</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-7 gap-2 md:gap-4">
          {daysOfWeek.map(day => {
            const dateKey = format(day, 'yyyy-MM-dd');
            const categories = dailyCategories.get(dateKey);
            const isCurrentDay = isToday(day);

            return (
              <div
                key={dateKey}
                className={cn(
                  "rounded-lg border bg-card p-2 md:p-3 shadow-sm flex flex-col h-full min-h-[120px]",
                  isCurrentDay && "border-2 border-primary"
                )}
              >
                <div className="flex flex-col items-center text-center">
                  <p className="text-xs font-medium text-muted-foreground">{format(day, 'E')}</p>
                  <p className="font-bold text-lg">{format(day, 'd')}</p>
                </div>
                <div className="mt-2 flex-grow space-y-1 overflow-y-auto">
                  {categories && categories.size > 0 ? (
                    Array.from(categories).map(category => (
                      <span
                        key={category}
                        className={'block w-full text-center text-xs font-medium p-1 rounded-md truncate'}
                        style={categoryStyles[category] || categoryStyles['Other']}
                      >
                        {category}
                      </span>
                    ))
                  ) : (
                    <div className="flex items-center justify-center h-full">
                      <span className="text-muted-foreground">·</span>
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
