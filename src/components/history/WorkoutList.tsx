
"use client";

import type { WorkoutLog, Exercise, ExerciseCategory } from "@/lib/types";
import { Card, CardContent } from "@/components/ui/card";
import { Accordion, AccordionContent, AccordionItem } from "@/components/ui/accordion";
import * as AccordionPrimitive from "@radix-ui/react-accordion";
import { format } from "date-fns";
import { CalendarDays, Edit3, Trash2, ChevronDown } from "lucide-react"; // Added icons
import { Button } from "../ui/button";
import { cn, toTitleCase } from "@/lib/utils";
import React, { useMemo } from "react";
import { Badge } from "../ui/badge";

type WorkoutListProps = {
  workoutLogs: WorkoutLog[];
  onEdit?: (logId: string) => void;
  onDelete?: (logId: string) => void;
};

const FEET_IN_A_MILE = 5280;
const METERS_IN_A_KILOMETER = 1000;

const categoryBadgeVariant = (category: ExerciseCategory): 'default' | 'secondary' | 'destructive' | 'accent' | 'outline' | 'fullBody' | 'other' => {
  switch (category) {
    case 'Upper Body': return 'default';
    case 'Lower Body': return 'destructive';
    case 'Core': return 'accent';
    case 'Cardio': return 'secondary';
    case 'Full Body': return 'fullBody';
    case 'Other': return 'other';
    default: return 'outline';
  }
};

export function WorkoutList({ workoutLogs, onEdit, onDelete }: WorkoutListProps) {
  const groupedExercisesByLog = useMemo(() => {
    return workoutLogs.map(log => {
      const grouped = log.exercises.reduce((acc, exercise) => {
        const key = toTitleCase(exercise.name);
        if (!acc[key]) {
          acc[key] = {
            category: exercise.category || 'Other',
            totalCalories: 0,
            sets: []
          };
        }
        acc[key].totalCalories += exercise.calories || 0;
        acc[key].sets.push(exercise);
        return acc;
      }, {} as Record<string, { category: string; totalCalories: number; sets: Exercise[] }>);

      const categories = new Set(log.exercises.map(ex => ex.category || 'Other'));

      const totalCalories = log.exercises.reduce((sum, ex) => sum + (ex.calories || 0), 0);
      const uniqueExerciseCount = Object.keys(grouped).length;

      return { ...log, groupedExercises: grouped, categories: Array.from(categories), totalCalories, uniqueExerciseCount };
    });
  }, [workoutLogs]);

  if (workoutLogs.length === 0) {
    return (
      <Card className="shadow-sm">
        <CardContent className="pt-6">
          <p className="text-center text-muted-foreground">No workouts logged yet. Start logging to see your history!</p>
        </CardContent>
      </Card>
    );
  }

  const formatDistanceForDisplay = (distance?: number, unit?: 'mi' | 'km' | 'ft' | 'm'): string => {
    if (distance === undefined || distance === null || distance <= 0) return "-";
    if (unit === 'ft') {
      const miles = distance / FEET_IN_A_MILE;
      return `${miles.toFixed(2)} mi`;
    }
    if (unit === 'm' && distance >= METERS_IN_A_KILOMETER) {
      const km = distance / METERS_IN_A_KILOMETER;
      return `${km.toFixed(2)} km`;
    }
    return `${distance} ${unit || ''}`.trim();
  };

  const formatDurationForDisplay = (duration?: number, unit?: 'min' | 'hr' | 'sec'): string => {
    if (duration === undefined || duration === null || duration <= 0) {
      return "-";
    }

    let totalSeconds = 0;
    switch (unit) {
      case 'hr':
        totalSeconds = duration * 3600;
        break;
      case 'min':
        totalSeconds = duration * 60;
        break;
      case 'sec':
        totalSeconds = duration;
        break;
      default:
        // Fallback for when unit is missing. Assume minutes as it's the form default.
        totalSeconds = duration * 60;
        break;
    }

    if (totalSeconds < 60) {
      return `${totalSeconds}s`;
    }

    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;

    let result = '';
    if (hours > 0) {
      result += `${hours}h `;
    }
    if (minutes > 0) {
      result += `${minutes}m `;
    }
    if (seconds > 0) {
      result += `${seconds}s`;
    }

    return result.trim();
  };

  const MobileGroupedExerciseView = ({ name, data }: { name: string; data: { category: string; totalCalories: number; sets: Exercise[] } }) => {
    const isSingleEntry = data.sets.length === 1;

    if (isSingleEntry) {
      const set = data.sets[0];
      const categoryText = data.category;
      // Show "est." if explicitly marked as estimated, or if calories exist but caloriesSource is undefined
      // (for legacy data or data where source wasn't tracked)
      const isEstimated = set.caloriesSource === 'estimated' ||
                          (set.calories && set.calories > 0 && !set.caloriesSource);
      const caloriesText = set.calories && set.calories > 0 ? ` • ${Math.round(set.calories)} kcal${isEstimated ? ' est.' : ''}` : '';

      const setParts = [
        set.sets > 0 ? `${set.sets} set${set.sets > 1 ? 's' : ''}` : null,
        set.reps > 0 ? `${set.reps} reps` : null,
        set.weight && set.weight > 0 ? `${set.weight} ${set.weightUnit || 'kg'}` : null,
        set.distance && set.distance > 0 ? formatDistanceForDisplay(set.distance, set.distanceUnit) : null,
        set.duration && set.duration > 0 ? formatDurationForDisplay(set.duration, set.durationUnit) : null,
      ].filter(Boolean);

      return (
        <div className="py-3 border-b">
          <p className="font-semibold">
            <span className="text-primary">{name}</span>
            <span className="text-muted-foreground">
              {` • ${categoryText}${caloriesText}`}
            </span>
          </p>
          <p className="text-sm text-muted-foreground mt-1">{setParts.join(' • ')}</p>
        </div>
      );
    }

    // Grouped View for multiple distinct sets
    // Show "est." if any set is explicitly marked as estimated, or if calories exist but source is undefined
    const hasEstimatedCalories = data.sets.some(set =>
      set.caloriesSource === 'estimated' ||
      (set.calories && set.calories > 0 && !set.caloriesSource)
    );
    const headerParts = [
      data.category,
      data.totalCalories > 0 ? `${Math.round(data.totalCalories)} kcal${hasEstimatedCalories ? ' est.' : ''}` : null
    ].filter(Boolean);

    return (
      <div className="py-3 border-b">
        <p className="font-semibold">
          <span className="text-primary">{name}</span>
          {headerParts.length > 0 && <span className="text-muted-foreground">{' • '}{headerParts.join(' • ')}</span>}
        </p>
        <div className="space-y-1 mt-2">
          {data.sets.map((set, index) => {
            const setParts = [
              set.sets > 0 ? `${set.sets} set${set.sets > 1 ? 's' : ''}` : null,
              set.reps > 0 ? `${set.reps} reps` : null,
              set.weight && set.weight > 0 ? `${set.weight} ${set.weightUnit || 'kg'}` : null,
              set.distance && set.distance > 0 ? formatDistanceForDisplay(set.distance, set.distanceUnit) : null,
              set.duration && set.duration > 0 ? formatDurationForDisplay(set.duration, set.durationUnit) : null,
              data.totalCalories === 0 && set.calories && set.calories > 0 ? `${Math.round(set.calories)} kcal` : null
            ].filter(Boolean);

            return (
              <p key={index} className="text-sm text-muted-foreground">
                {setParts.join(' • ')}
              </p>
            )
          })}
        </div>
      </div>
    );
  };

  return (
    <Accordion type="single" collapsible className="w-full space-y-4">
      {groupedExercisesByLog.map((log) => (
        <AccordionItem value={log.id} key={log.id} className="border rounded-lg shadow-sm bg-card overflow-hidden">
          <AccordionPrimitive.Header className="flex items-center justify-between px-6 py-4">
            <AccordionPrimitive.Trigger className={cn(
              "flex flex-1 items-center justify-between p-0 text-left font-medium transition-all hover:underline rounded-sm",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-background focus-visible:ring-offset-2",
              "[&[data-state=open]>svg]:rotate-180"
            )}>
              <div className="flex flex-col sm:flex-row sm:items-center w-full gap-x-4 gap-y-2">
                <div className="flex items-center gap-3">
                  <CalendarDays className="h-5 w-5 text-primary" />
                  <span className="font-medium text-lg whitespace-nowrap">
                    {format(log.date, "MMM d, yyyy")}
                  </span>
                </div>
                <div className="flex items-center gap-1.5 flex-wrap">
                  {log.categories?.map(category => (
                    <Badge key={category} variant={categoryBadgeVariant(category as ExerciseCategory)} className="text-xs">
                      {category}
                    </Badge>
                  ))}
                </div>
              </div>
              <ChevronDown className="h-4 w-4 shrink-0 transition-transform duration-200 ml-2" />
            </AccordionPrimitive.Trigger>

            <div className="flex items-center gap-1 ml-4 shrink-0">
              {onEdit && (
                <Button variant="ghost" size="icon" onClick={() => onEdit(log.id)} className="h-8 w-8">
                  <Edit3 className="h-4 w-4" />
                </Button>
              )}
              {onDelete && (
                <Button variant="ghost" size="icon" onClick={() => onDelete(log.id)} className="h-8 w-8 text-destructive hover:text-destructive">
                  <Trash2 className="h-4 w-4" />
                </Button>
              )}
            </div>
          </AccordionPrimitive.Header>

          <AccordionContent className="px-6 pb-6 pt-0">
            {(log.uniqueExerciseCount && log.uniqueExerciseCount > 1) && (
              <div className="mb-4 text-sm text-muted-foreground">
                <p className="font-semibold">
                  {log.uniqueExerciseCount} exercises • {Math.round(log.totalCalories || 0)} kcal{log.exercises.some(ex => ex.caloriesSource === 'estimated' || (ex.calories && ex.calories > 0 && !ex.caloriesSource)) ? ' est.' : ''}
                </p>
              </div>
            )}
            {log.notes && (
              <div className={cn("text-sm text-muted-foreground", log.uniqueExerciseCount > 1 && "mt-2")}>
                <p className="italic">Notes: {log.notes}</p>
              </div>
            )}
            <div className="space-y-2">
              {Object.entries(log.groupedExercises).map(([name, data]) => (
                <MobileGroupedExerciseView key={name} name={name} data={data} />
              ))}
            </div>
          </AccordionContent>
        </AccordionItem>
      ))}
    </Accordion>
  );
}
