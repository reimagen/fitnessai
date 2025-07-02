
"use client";

import React, { useMemo } from 'react';
import type { WorkoutLog, ExerciseCategory } from '@/lib/types';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { startOfWeek, endOfWeek, eachDayOfInterval, format, isSameDay, isToday } from 'date-fns';
import { cn } from '@/lib/utils';

const categoryStyles: Record<ExerciseCategory, React.CSSProperties> = {
  'Upper Body': { backgroundColor: 'hsl(var(--chart-1))', color: 'hsl(var(--chart-1-foreground))' },
  'Full Body':  { backgroundColor: 'hsl(var(--chart-2))', color: 'hsl(var(--chart-2-foreground))' },
  'Lower Body': { backgroundColor: 'hsl(var(--chart-3))', color: 'hsl(var(--chart-3-foreground))' },
  'Cardio':     { backgroundColor: 'hsl(var(--chart-4))', color: 'hsl(var(--chart-4-foreground))' },
  'Core':       { backgroundColor: 'hsl(var(--chart-5))', color: 'hsl(var(--chart-5-foreground))' },
  'Other':      { backgroundColor: 'hsl(var(--chart-6))', color: 'hsl(var(--chart-6-foreground))' },
};

type RecentHistoryProps = {
  workoutLogs: WorkoutLog[];
};

export function RecentHistory({ workoutLogs }: RecentHistoryProps) {
  const dailyCategories = useMemo(() => {
    const today = new Date();
    const weekStart = startOfWeek(today, { weekStartsOn: 0 });
    const weekEnd = endOfWeek(today, { weekStartsOn: 0 });

    const categoriesMap = new Map<string, Set<ExerciseCategory>>();

    workoutLogs.forEach(log => {
      if (log.date >= weekStart && log.date <= weekEnd) {
        const dateKey = format(log.date, 'yyyy-MM-dd');
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
    return categoriesMap;
  }, [workoutLogs]);

  const today = new Date();
  const weekStart = startOfWeek(today, { weekStartsOn: 0 });
  const weekEnd = endOfWeek(today, { weekStartsOn: 0 });
  const daysOfWeek = eachDayOfInterval({ start: weekStart, end: weekEnd });

  return (
    <Card className="shadow-lg">
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
                        className={'block w-full text-center text-xs font-medium p-1 rounded-full truncate'}
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
