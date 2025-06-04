
"use client";

import type { WorkoutLog } from "@/lib/types";
import { Card, CardContent } from "@/components/ui/card";
import { Accordion, AccordionContent, AccordionItem } from "@/components/ui/accordion";
import * as AccordionPrimitive from "@radix-ui/react-accordion";
import { format } from "date-fns";
import { CalendarDays, Dumbbell, Edit3, Trash2, ChevronDown, Activity, Utensils, Route, Timer } from "lucide-react"; // Added icons
import { Button } from "../ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { cn } from "@/lib/utils";
import React, { useState, useEffect } from "react";

type WorkoutListProps = {
  workoutLogs: WorkoutLog[];
  onEdit?: (logId: string) => void;
  onDelete?: (logId: string) => void;
};

const FEET_IN_A_MILE = 5280;

export function WorkoutList({ workoutLogs, onEdit, onDelete }: WorkoutListProps) {
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  if (!isClient) { // Show loading state before client-side rendering is complete
    return (
      <Card className="shadow-sm">
        <CardContent className="pt-6">
          <p className="text-center text-muted-foreground">Loading workout history...</p>
        </CardContent>
      </Card>
    );
  }

  if (workoutLogs.length === 0) {
    return (
      <Card className="shadow-sm">
        <CardContent className="pt-6">
          <p className="text-center text-muted-foreground">No workouts logged yet. Start logging to see your history!</p>
        </CardContent>
      </Card>
    );
  }

  const formatDistanceForDisplay = (distance?: number, unit?: 'mi' | 'km' | 'ft'): string => {
    if (distance === undefined || distance === null || distance <= 0) return "-";
    if (unit === 'ft') {
      const miles = distance / FEET_IN_A_MILE;
      return `${miles.toFixed(2)} mi`;
    }
    return `${distance} ${unit || ''}`.trim();
  };

  const formatCaloriesForDisplay = (calories?: number): string => {
    if (calories === undefined || calories === null || calories <= 0) return "-";
    return `${calories} kcal`;
  }

  return (
    <Accordion type="single" collapsible className="w-full space-y-4">
      {workoutLogs.map((log) => (
        <AccordionItem value={log.id} key={log.id} className="border rounded-lg shadow-sm bg-card overflow-hidden">
          <AccordionPrimitive.Header className="flex items-center justify-between px-6 py-4">
            <AccordionPrimitive.Trigger className={cn(
              "flex flex-1 items-center justify-between p-0 text-left font-medium transition-all hover:underline rounded-sm",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-background focus-visible:ring-offset-2",
              "[&[data-state=open]>svg]:rotate-180"
            )}>
              <div className="flex flex-col sm:flex-row sm:items-center w-full">
                <div className="flex items-center gap-3 mb-2 sm:mb-0">
                  <CalendarDays className="h-5 w-5 text-primary" />
                  <span className="font-medium text-lg">
                    {format(log.date, "MMMM d, yyyy")}
                  </span>
                </div>
                <span className="text-sm text-muted-foreground sm:ml-4">
                  {log.exercises.length} exercise{log.exercises.length !== 1 ? 's' : ''}
                </span>
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
            {log.notes && (
              <p className="mb-4 text-sm text-muted-foreground italic">Notes: {log.notes}</p>
            )}
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[25%]">Exercise</TableHead>
                  <TableHead className="text-left w-[15%]">Category</TableHead>
                  <TableHead className="text-right">Sets</TableHead>
                  <TableHead className="text-right">Reps</TableHead>
                  <TableHead className="text-right">Weight</TableHead>
                  <TableHead className="text-right">Distance</TableHead>
                  <TableHead className="text-right">Duration</TableHead>
                  <TableHead className="text-right">Calories</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {log.exercises.map((exercise) => (
                  <TableRow key={exercise.id}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Dumbbell className="h-4 w-4 text-accent shrink-0" />
                        <span className="font-medium">{exercise.name}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-left">{exercise.category || "-"}</TableCell>
                    <TableCell className="text-right">{exercise.sets > 0 ? exercise.sets : "-"}</TableCell>
                    <TableCell className="text-right">{exercise.reps > 0 ? exercise.reps : "-"}</TableCell>
                    <TableCell className="text-right">
                        {exercise.weight && exercise.weight > 0 ? `${exercise.weight}${exercise.weightUnit || 'kg'}` : "-"}
                    </TableCell>
                    <TableCell className="text-right">
                        {formatDistanceForDisplay(exercise.distance, exercise.distanceUnit)}
                    </TableCell>
                    <TableCell className="text-right">
                        {exercise.duration && exercise.duration > 0 ? `${exercise.duration} ${exercise.durationUnit || ''}`.trim() : "-"}
                    </TableCell>
                    <TableCell className="text-right">{formatCaloriesForDisplay(exercise.calories)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </AccordionContent>
        </AccordionItem>
      ))}
    </Accordion>
  );
}
