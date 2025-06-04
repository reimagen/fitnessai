
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
import type { WorkoutLog, Exercise } from "@/lib/types";
import { Card } from "@/components/ui/card";
import { useEffect } from "react";

const exerciseSchema = z.object({
  id: z.string().optional(), // Keep existing ID if editing
  name: z.string().min(1, "Exercise name is required."),
  sets: z.coerce.number().min(0).optional(),
  reps: z.coerce.number().min(0).optional(),
  weight: z.coerce.number().min(0).optional(),
  weightUnit: z.enum(['kg', 'lbs']).optional(),
  category: z.string().optional(), // Stays in schema for data consistency, but no form input
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

type WorkoutLogFormData = z.infer<typeof workoutLogSchema>;

type WorkoutLogFormProps = {
  onSubmitLog: (data: Omit<WorkoutLog, 'id'>) => void;
  initialData?: Omit<WorkoutLog, 'id'>;
  editingLogId?: string | null;
  onCancelEdit?: () => void;
};

const defaultExerciseValues: Omit<Exercise, 'id'> = {
  name: "",
  sets: 0,
  reps: 0,
  weight: 0,
  weightUnit: "kg" as ('kg' | 'lbs'),
  category: "", // Default to empty string, will not be user-editable in this form
  distance: 0,
  distanceUnit: undefined as ('mi' | 'km' | undefined),
  duration: 0,
  durationUnit: undefined as ('min' | 'hr' | 'sec' | undefined),
  calories: 0
};

export function WorkoutLogForm({ onSubmitLog, initialData, editingLogId, onCancelEdit }: WorkoutLogFormProps) {
  const form = useForm<WorkoutLogFormData>({
    resolver: zodResolver(workoutLogSchema),
    defaultValues: { 
      date: new Date().toISOString().split('T')[0],
      notes: "",
      exercises: [defaultExerciseValues],
    }
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "exercises",
  });

  useEffect(() => {
    if (editingLogId && initialData) {
      form.reset({
        date: initialData.date?.toISOString().split('T')[0] || new Date().toISOString().split('T')[0],
        notes: initialData.notes || "",
        exercises: initialData.exercises?.map(ex => ({
          id: ex.id,
          name: ex.name || "",
          sets: ex.sets ?? 0,
          reps: ex.reps ?? 0,
          weight: ex.weight ?? 0,
          weightUnit: ex.weightUnit || 'kg',
          category: ex.category || "", // Keep existing category from data
          distance: ex.distance ?? 0,
          distanceUnit: ex.distanceUnit,
          duration: ex.duration ?? 0,
          durationUnit: ex.durationUnit,
          calories: ex.calories ?? 0,
        })) || [defaultExerciseValues],
      });
    } else if (!editingLogId) { 
      form.reset({
        date: new Date().toISOString().split('T')[0],
        notes: "",
        exercises: [defaultExerciseValues],
      });
    }
  }, [editingLogId, initialData, form]);


  function onSubmit(values: WorkoutLogFormData) {
    onSubmitLog({
        ...values,
        date: new Date(values.date),
        exercises: values.exercises.map(ex => ({
          id: ex.id || Math.random().toString(36).substring(2,9),
          name: ex.name,
          category: ex.category || "", // Will be "" if coming from this form, or populated if AI set it
          sets: ex.sets ?? 0,
          reps: ex.reps ?? 0,
          weight: ex.weight ?? 0,
          weightUnit: ex.weightUnit || 'kg',
          distance: ex.distance ?? 0,
          distanceUnit: ex.distanceUnit,
          duration: ex.duration ?? 0,
          durationUnit: ex.durationUnit,
          calories: ex.calories ?? 0,
        }))
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
                {/* Category Field Removed */}
                <FormField
                  control={form.control}
                  name={`exercises.${index}.sets`}
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Sets</FormLabel>
                      <FormControl>
                        <Input type="number" {...field} onChange={e => field.onChange(e.target.value === '' ? 0 : +e.target.value)} />
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
                        <Input type="number" {...field} onChange={e => field.onChange(e.target.value === '' ? 0 : +e.target.value)} />
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
                        <Input type="number" {...field} onChange={e => field.onChange(e.target.value === '' ? 0 : +e.target.value)} />
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
                      <Select onValueChange={field.onChange} value={field.value || "kg"}>
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
                        <Input type="number" {...field} onChange={e => field.onChange(e.target.value === '' ? 0 : +e.target.value)} />
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
                      <Select onValueChange={field.onChange} value={field.value}>
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
                        <Input type="number" {...field} onChange={e => field.onChange(e.target.value === '' ? 0 : +e.target.value)} />
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
                      <Select onValueChange={field.onChange} value={field.value}>
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
                        <Input type="number" {...field} onChange={e => field.onChange(e.target.value === '' ? 0 : +e.target.value)} />
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
            onClick={() => append(defaultExerciseValues as Exercise)} // Cast needed as defaultExerciseValues might be seen as partial by TS
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
        <div className="flex gap-2">
            <Button type="submit" className="w-full">
            {editingLogId ? "Update Log" : "Log Workout"}
            </Button>
            {editingLogId && onCancelEdit && (
            <Button type="button" variant="outline" onClick={onCancelEdit} className="w-full">
                Cancel Edit
            </Button>
            )}
        </div>
      </form>
    </Form>
  );
}

