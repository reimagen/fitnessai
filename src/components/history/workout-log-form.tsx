"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useFieldArray, useForm } from "react-hook-form";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { PlusCircle, Trash2 } from "lucide-react";
import type { WorkoutLog, Exercise } from "@/lib/types";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";

const exerciseSchema = z.object({
  name: z.string().min(1, "Exercise name is required."),
  sets: z.coerce.number().min(1, "Sets must be at least 1."),
  reps: z.coerce.number().min(1, "Reps must be at least 1."),
  weight: z.coerce.number().min(0, "Weight cannot be negative."),
});

const workoutLogSchema = z.object({
  date: z.string().refine((val) => !isNaN(Date.parse(val)), { message: "Invalid date" }),
  notes: z.string().optional(),
  exercises: z.array(exerciseSchema).min(1, "Add at least one exercise."),
});

type WorkoutLogFormProps = {
  onSubmitLog: (data: Omit<WorkoutLog, 'id'>) => void; // Assuming ID is generated server-side or later
  initialData?: Partial<Omit<WorkoutLog, 'id'>>;
};

export function WorkoutLogForm({ onSubmitLog, initialData }: WorkoutLogFormProps) {
  const form = useForm<z.infer<typeof workoutLogSchema>>({
    resolver: zodResolver(workoutLogSchema),
    defaultValues: {
      date: initialData?.date?.toISOString().split('T')[0] || new Date().toISOString().split('T')[0],
      notes: initialData?.notes || "",
      exercises: initialData?.exercises || [{ name: "", sets: 3, reps: 10, weight: 0 }],
    },
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "exercises",
  });

  function onSubmit(values: z.infer<typeof workoutLogSchema>) {
    onSubmitLog({
        ...values,
        date: new Date(values.date)
    });
    form.reset(); // Optionally reset form
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <FormField
            control={form.control}
            name="date"
            render={({ field }) => (
                <FormItem>
                <FormLabel>Date</FormLabel>
                <FormControl>
                    <Input type="date" {...field} />
                </FormControl>
                <FormMessage />
                </FormItem>
            )}
            />
        </div>

        <div>
          <h3 className="mb-3 text-lg font-medium">Exercises</h3>
          {fields.map((field, index) => (
            <Card key={field.id} className="mb-4 p-4 border rounded-md shadow-sm relative">
              <div className="grid grid-cols-2 gap-x-4 gap-y-2 md:grid-cols-4">
                <FormField
                  control={form.control}
                  name={`exercises.${index}.name`}
                  render={({ field }) => (
                    <FormItem className="col-span-2 md:col-span-4">
                      <FormLabel>Exercise Name</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g., Bench Press" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name={`exercises.${index}.sets`}
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Sets</FormLabel>
                      <FormControl>
                        <Input type="number" placeholder="3" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name={`exercises.${index}.reps`}
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Reps</FormLabel>
                      <FormControl>
                        <Input type="number" placeholder="10" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name={`exercises.${index}.weight`}
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Weight (kg)</FormLabel>
                      <FormControl>
                        <Input type="number" placeholder="50" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={() => remove(index)}
                className="absolute right-2 top-2 text-destructive hover:bg-destructive/10"
                aria-label="Remove exercise"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </Card>
          ))}
          <Button
            type="button"
            variant="outline"
            onClick={() => append({ name: "", sets: 3, reps: 10, weight: 0 })}
            className="mt-2"
          >
            <PlusCircle className="mr-2 h-4 w-4" /> Add Exercise
          </Button>
        </div>

        <FormField
          control={form.control}
          name="notes"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Notes (Optional)</FormLabel>
              <FormControl>
                <Textarea
                  placeholder="Any comments about your workout?"
                  {...field}
                  className="min-h-[80px]"
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <Button type="submit" className="w-full">Log Workout</Button>
      </form>
    </Form>
  );
}
