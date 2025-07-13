
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

    const dataMap = new Map<string, { categories: Set<ExerciseCategory>; runningMiles: number }>();

    workoutLogs.forEach(log => {
      if (log.date >= weekStart && log.date <= weekEnd) {
        const dateKey = format(log.date, 'yyyy-MM-dd');
        if (!dataMap.has(dateKey)) {
          dataMap.set(dateKey, { categories: new Set(), runningMiles: 0 });
        }
        const dayData = dataMap.get(dateKey)!;

        log.exercises.forEach(ex => {
          if (ex.category) {
            dayData.categories.add(ex.category);
          }
          
          if (ex.category === 'Cardio' && ex.distance && ex.distance > 0) {
            let distanceInMiles = 0;
            if (ex.distanceUnit === 'mi') distanceInMiles = ex.distance;
            else if (ex.distanceUnit === 'km') distanceInMiles = ex.distance * 0.621371;
            else if (ex.distanceUnit === 'ft') distanceInMiles = ex.distance * 0.000189394;
            
            const exerciseName = ex.name.trim().toLowerCase();
            let isRun = false;

            if (exerciseName.includes('run') || exerciseName.includes('running')) {
              isRun = true;
            } else if (ex.duration && ex.duration > 0 && ex.durationUnit) {
              let durationInHours = 0;
              if (ex.durationUnit === 'hr') durationInHours = ex.duration;
              else if (ex.durationUnit === 'min') durationInHours = ex.duration / 60;
              else if (ex.durationUnit === 'sec') durationInHours = ex.duration / 3600;
              
              if (durationInHours > 0) {
                const paceMph = distanceInMiles / durationInHours;
                if (paceMph >= 4.5) { // Threshold for a run
                  isRun = true;
                }
              }
            }
            if (isRun) {
              dayData.runningMiles += distanceInMiles;
            }
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
            const dayData = dailyData.get(dateKey);
            const categories = dayData?.categories;
            const runningMiles = dayData?.runningMiles || 0;
            const isCurrentDay = isToday(day);

            return (
              <div
                key={dateKey}
                className={cn(
                  "rounded-lg border bg-card p-2 md:p-3 shadow-sm flex flex-col h-full min-h-[140px]",
                  isCurrentDay && "border-2 border-primary"
                )}
              >
                <div className="flex flex-col items-center text-center">
                  <p className="text-xs font-medium text-muted-foreground">{format(day, 'E')}</p>
                  <p className="font-bold text-lg">{format(day, 'd')}</p>
                </div>
                <div className="mt-2 flex-grow space-y-1 overflow-y-auto mb-2">
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
                      <span className="text-muted-foreground">.</span>
                    </div>
                  )}
                </div>
                 {runningMiles > 0 && (
                  <div className="mt-auto pt-2 border-t border-dashed flex items-center justify-center text-xs text-accent">
                    <span className="font-semibold">Ran {runningMiles.toFixed(1)} mi</span>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
