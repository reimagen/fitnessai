"use client";

import type { WorkoutLog } from "@/lib/types";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { format } from "date-fns";
import { CalendarDays, Dumbbell, Edit3, Trash2 } from "lucide-react";
import { Button } from "../ui/button";

type WorkoutListProps = {
  workoutLogs: WorkoutLog[];
  onEdit?: (logId: string) => void;
  onDelete?: (logId: string) => void;
};

export function WorkoutList({ workoutLogs, onEdit, onDelete }: WorkoutListProps) {
  if (workoutLogs.length === 0) {
    return (
      <Card className="shadow-sm">
        <CardContent className="pt-6">
          <p className="text-center text-muted-foreground">No workouts logged yet. Start logging to see your history!</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Accordion type="single" collapsible className="w-full space-y-4">
      {workoutLogs.map((log) => (
        <AccordionItem value={log.id} key={log.id} className="border rounded-lg shadow-sm bg-card overflow-hidden">
          <AccordionTrigger className="px-6 py-4 hover:no-underline">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between w-full">
              <div className="flex items-center gap-3 mb-2 sm:mb-0">
                <CalendarDays className="h-5 w-5 text-primary" />
                <span className="font-medium text-lg">{format(new Date(log.date), "MMMM d, yyyy")}</span>
              </div>
              <div className="flex items-center gap-4">
                <span className="text-sm text-muted-foreground">
                  {log.exercises.length} exercise{log.exercises.length !== 1 ? 's' : ''}
                </span>
                {onEdit && (
                  <Button variant="ghost" size="icon" onClick={(e) => {e.stopPropagation(); onEdit(log.id)}} className="h-8 w-8">
                    <Edit3 className="h-4 w-4" />
                  </Button>
                )}
                {onDelete && (
                  <Button variant="ghost" size="icon" onClick={(e) => {e.stopPropagation(); onDelete(log.id)}} className="h-8 w-8 text-destructive hover:text-destructive">
                     <Trash2 className="h-4 w-4" />
                  </Button>
                )}
              </div>
            </div>
          </AccordionTrigger>
          <AccordionContent className="px-6 pb-6 pt-0">
            {log.notes && (
              <p className="mb-4 text-sm text-muted-foreground italic">Notes: {log.notes}</p>
            )}
            <ul className="space-y-3">
              {log.exercises.map((exercise) => (
                <li key={exercise.id} className="p-3 bg-secondary/50 rounded-md">
                  <div className="flex items-center gap-2 mb-1">
                    <Dumbbell className="h-4 w-4 text-accent" />
                    <strong className="font-semibold">{exercise.name}</strong>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {exercise.sets} sets &times; {exercise.reps} reps @ {exercise.weight} kg
                  </p>
                </li>
              ))}
            </ul>
          </AccordionContent>
        </AccordionItem>
      ))}
    </Accordion>
  );
}
