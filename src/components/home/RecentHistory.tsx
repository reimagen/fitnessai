
"use client";

import React, { useMemo } from 'react';
import type { WorkoutLog, ExerciseCategory } from '@/lib/types';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { startOfWeek, endOfWeek, eachDayOfInterval, format, isSameDay, isToday } from 'date-fns';
import { cn } from '@/lib/utils';
import { Route } from 'lucide-react';

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
  const dailyData = useMemo(() => {
    const today = new Date();
    const weekStart = startOfWeek(today, { weekStartsOn: 0 });
    const weekEnd = endOfWeek(today, { weekStartsOn: 0 });

    const dataMap = new Map<string, { categories: Set<ExerciseCategory> }>();

    // Filter logs to only include the current week before processing
    const logsThisWeek = workoutLogs.filter(log => log.date >= weekStart && log.date <= weekEnd);

    logsThisWeek.forEach(log => {
      const dateKey = format(log.date, 'yyyy-MM-dd');
      if (!dataMap.has(dateKey)) {
        dataMap.set(dateKey, { categories: new Set() });
      }
      const dayData = dataMap.get(dateKey)!;

      log.exercises.forEach(ex => {
        if (ex.category) {
          dayData.categories.add(ex.category);
        }
      });
    });
    return dataMap;
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
        <div className="grid grid-cols-1 md:grid-cols-7 gap-2">
          {daysOfWeek.map(day => {
            const dateKey = format(day, 'yyyy-MM-dd');
            const dayData = dailyData.get(dateKey);
            const categories = dayData?.categories;
            const isCurrentDay = isToday(day);

            return (
              <div
                key={dateKey}
                className={cn(
                  "rounded-lg border bg-card p-2 shadow-sm flex flex-row items-center md:flex-col md:p-3 md:min-h-[140px]",
                  isCurrentDay && "border-2 border-primary"
                )}
              >
                <div className="flex flex-col items-center text-center p-2">
                  <p className="text-xs font-medium text-muted-foreground">{format(day, 'E')}</p>
                  <p className="font-bold text-lg">{format(day, 'd')}</p>
                </div>
                
                <div className="h-full w-px bg-border mx-2 md:h-px md:w-full md:my-2 md:mx-0"></div>

                <div className="flex-grow flex flex-wrap gap-1.5 items-center justify-center md:space-y-1 md:mt-2 pb-2 md:pb-0">
                  {categories && categories.size > 0 ? (
                    Array.from(categories).map(category => (
                      <span
                        key={category}
                        className={'w-full md:w-full text-center text-xs font-medium p-1 rounded-full truncate'}
                        style={categoryStyles[category] || categoryStyles['Other']}
                      >
                        {category}
                      </span>
                    ))
                  ) : (
                    <div className="flex items-center justify-center h-full w-full">
                      <span className="text-sm font-medium text-muted-foreground/60">None</span>
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
