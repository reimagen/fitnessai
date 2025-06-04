
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { PlusCircle, Trash2 } from "lucide-react";
import type { WorkoutLog } from "@/lib/types"; // WorkoutLog already includes Exercise type
import { Card } from "@/components/ui/card";

const exerciseSchema = z.object({
  name: z.string().min(1, "Exercise name is required."),
  sets: z.coerce.number().min(0).optional(), // Optional, could be 0 for cardio
  reps: z.coerce.number().min(0).optional(), // Optional
  weight: z.coerce.number().min(0).optional(),
  weightUnit: z.enum(['kg', 'lbs']).optional(),
  category: z.string().optional(),
  distance: z.coerce.number().min(0).optional(),
  distanceUnit: z.enum(['mi', 'km']).optional(),
  duration: z.coerce.number().min(0).optional(),
  durationUnit: z.enum(['min', 'hr', 'sec']).optional(),
  calories: z.coerce.number().min(0).optional(),
});

const workoutLogSchema = z.object({
  date: z.string().refine((val) => !isNaN(Date.parse(val)), { message: "Invalid date" }),
  notes: z.string().optional(),
  exercises: z.array(exerciseSchema).min(1, "Add at least one exercise."),
});

type WorkoutLogFormProps = {
  onSubmitLog: (data: Omit<WorkoutLog, 'id'>) => void;
  initialData?: Partial<Omit<WorkoutLog, 'id'>>;
};

const defaultExerciseValues = { 
  name: "", 
  sets: 3, 
  reps: 10, 
  weight: 0, 
  weightUnit: "kg" as ('kg' | 'lbs'), // Cast for type safety
  category: "", 
  distance: undefined, 
  distanceUnit: undefined as ('mi' | 'km' | undefined), 
  duration: undefined, 
  durationUnit: undefined as ('min' | 'hr' | 'sec' | undefined), 
  calories: undefined 
};

export function WorkoutLogForm({ onSubmitLog, initialData }: WorkoutLogFormProps) {
  const form = useForm<z.infer<typeof workoutLogSchema>>({
    resolver: zodResolver(workoutLogSchema),
    defaultValues: {
      date: initialData?.date?.toISOString().split('T')[0] || new Date().toISOString().split('T')[0],
      notes: initialData?.notes || "",
      exercises: initialData?.exercises?.map(ex => ({...defaultExerciseValues, ...ex})) || [defaultExerciseValues],
    },
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "exercises",
  });

  function onSubmit(values: z.infer<typeof workoutLogSchema>) {
    onSubmitLog({
        ...values,
        date: new Date(values.date),
        exercises: values.exercises.map(ex => ({
          ...ex,
          sets: ex.sets ?? 0, // Default to 0 if undefined
          reps: ex.reps ?? 0,
          weight: ex.weight ?? 0,
        }))
    });
    form.reset({
        date: new Date().toISOString().split('T')[0],
        notes: "",
        exercises: [defaultExerciseValues]
    }); 
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
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <FormField
                  control={form.control}
                  name={`exercises.${index}.name`}
                  render={({ field }) => (
                    <FormItem className="md:col-span-2 lg:col-span-3">
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
                  name={`exercises.${index}.category`}
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Category (Optional)</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g., Upper Body" {...field} />
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
                        <Input type="number" placeholder="3" {...field} onChange={e => field.onChange(e.target.value === '' ? undefined : +e.target.value)} />
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
                        <Input type="number" placeholder="10" {...field} onChange={e => field.onChange(e.target.value === '' ? undefined : +e.target.value)} />
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
                      <FormLabel>Weight</FormLabel>
                      <FormControl>
                        <Input type="number" placeholder="50" {...field} onChange={e => field.onChange(e.target.value === '' ? undefined : +e.target.value)} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name={`exercises.${index}.weightUnit`}
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Weight Unit</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value || "kg"}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Unit" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="kg">kg</SelectItem>
                          <SelectItem value="lbs">lbs</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name={`exercises.${index}.distance`}
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Distance (Optional)</FormLabel>
                      <FormControl>
                        <Input type="number" placeholder="5" {...field} onChange={e => field.onChange(e.target.value === '' ? undefined : +e.target.value)} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                 <FormField
                  control={form.control}
                  name={`exercises.${index}.distanceUnit`}
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Distance Unit</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Unit" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="mi">mi</SelectItem>
                          <SelectItem value="km">km</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name={`exercises.${index}.duration`}
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Duration (Optional)</FormLabel>
                      <FormControl>
                        <Input type="number" placeholder="30" {...field} onChange={e => field.onChange(e.target.value === '' ? undefined : +e.target.value)} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name={`exercises.${index}.durationUnit`}
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Duration Unit</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Unit" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="sec">sec</SelectItem>
                          <SelectItem value="min">min</SelectItem>
                          <SelectItem value="hr">hr</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name={`exercises.${index}.calories`}
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Calories (Optional)</FormLabel>
                      <FormControl>
                        <Input type="number" placeholder="150" {...field} onChange={e => field.onChange(e.target.value === '' ? undefined : +e.target.value)} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </Card>
          ))}
          <Button
            type="button"
            variant="outline"
            onClick={() => append(defaultExerciseValues)}
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
