
"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useFieldArray, useForm } from "react-hook-form";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { PlusCircle, Trash2, Loader2 } from "lucide-react";
import type { WorkoutLog, ExerciseCategory, UserProfile } from "@/lib/types";
import { Card } from "@/components/ui/card";
import { useEffect, useState } from "react";
import { startOfDay } from 'date-fns';
import { StepperInput } from "@/components/ui/stepper-input";
import { ExerciseCombobox } from "@/components/ui/exercise-combobox";
import { useExerciseSuggestions } from "@/hooks/useExerciseSuggestions";
import { getExerciseCategory, getNormalizedExerciseName, classifiedExercises } from "@/lib/strength-standards";
import { calculateExerciseCalories } from "@/lib/calorie-calculator";

const CATEGORY_OPTIONS = ['Cardio', 'Lower Body', 'Upper Body', 'Full Body', 'Core', 'Other'] as const;

const exerciseSchema = z.object({
  id: z.string().optional(),
  name: z.string().min(1, "Exercise name is required.").default(""),
  sets: z.coerce.number().min(0).optional().default(0),
  reps: z.coerce.number().min(0).optional().default(0),
  weight: z.coerce.number().min(0).optional().default(0),
  weightUnit: z.enum(['kg', 'lbs']).optional().default('lbs'),
  category: z.enum(CATEGORY_OPTIONS).default("Other"),
  distance: z.coerce.number().min(0).optional().default(0),
  distanceUnit: z.enum(['mi', 'km', 'ft', 'm']).optional().default('mi'),
  duration: z.coerce.number().min(0).optional().default(0),
  durationUnit: z.enum(['min', 'hr', 'sec']).optional().default('min'),
  calories: z.coerce.number().min(0).optional().default(0),
  caloriesSource: z.enum(['manual', 'estimated']).optional(),
});

const workoutLogSchema = z.object({
  date: z.string().refine((val) => !isNaN(Date.parse(val)), { message: "Invalid date" }),
  notes: z.string().optional(),
  exercises: z.array(exerciseSchema).min(1, "Add at least one exercise."),
});

type WorkoutLogFormData = z.infer<typeof workoutLogSchema>;

type WorkoutLogFormProps = {
  onSubmitLog: (data: Omit<WorkoutLog, 'id' | 'userId'>) => void;
  initialData?: WorkoutLog;
  editingLogId?: string | null;
  onCancelEdit?: () => void;
  isSubmitting?: boolean;
  workoutLogs?: WorkoutLog[];
  userProfile?: UserProfile;
};

const defaultExerciseValues: z.infer<typeof exerciseSchema> = {
  name: "",
  sets: 0,
  reps: 0,
  weight: 0,
  weightUnit: "lbs",
  category: "Other",
  distance: 0,
  distanceUnit: "mi",
  duration: 0,
  durationUnit: "min",
  calories: 0,
  caloriesSource: undefined,
};

export function WorkoutLogForm({ onSubmitLog, initialData, editingLogId, onCancelEdit, isSubmitting, workoutLogs = [], userProfile }: WorkoutLogFormProps) {
  const suggestions = useExerciseSuggestions(workoutLogs);
  const [autoFocusIndex, setAutoFocusIndex] = useState(0);

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
        exercises: initialData.exercises?.map(ex => {
          const categoryIsValid = ex.category && CATEGORY_OPTIONS.includes(ex.category as ExerciseCategory);
          return {
            id: ex.id,
            name: ex.name || "",
            sets: ex.sets ?? 0,
            reps: ex.reps ?? 0,
            weight: ex.weight ?? 0,
            weightUnit: ex.weightUnit || 'lbs',
            category: categoryIsValid ? ex.category as ExerciseCategory : "Other",
            distance: ex.distance ?? 0,
            distanceUnit: ex.distanceUnit || 'mi',
            duration: ex.duration ?? 0,
            durationUnit: ex.durationUnit || "min",
            calories: ex.calories ?? 0,
            caloriesSource: ex.caloriesSource,
          };
        }) || [defaultExerciseValues],
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
    // Use replace() to hint local timezone parsing, then startOfDay to normalize
    const normalizedDate = startOfDay(new Date(values.date.replace(/-/g, '/')));

    // Normalize exercise names and track calorie source
    const normalizedExercises = values.exercises.map(ex => {
      const normalizedName = getNormalizedExerciseName(ex.name);

      // Determine calorie source and value
      let caloriesSource: 'manual' | 'estimated' = ex.caloriesSource || 'estimated';
      let calories = ex.calories ?? 0;

      if (ex.calories && ex.calories > 0 && !ex.caloriesSource) {
        // User manually entered calories (and no existing source was set)
        caloriesSource = 'manual';
      } else if (!ex.calories || ex.calories === 0) {
        // No manual calories, calculate them if user profile exists
        if (userProfile) {
          const exercise = { name: ex.name, category: ex.category, weight: ex.weight, weightUnit: ex.weightUnit, sets: ex.sets, reps: ex.reps, distance: ex.distance, distanceUnit: ex.distanceUnit, duration: ex.duration, durationUnit: ex.durationUnit } as Parameters<typeof calculateExerciseCalories>[0];
          calories = calculateExerciseCalories(exercise, userProfile, workoutLogs);
          caloriesSource = 'estimated';
        }
      }

      return {
        id: ex.id || Math.random().toString(36).substring(2,9),
        name: normalizedName,
        category: ex.category,
        sets: ex.sets ?? 0,
        reps: ex.reps ?? 0,
        weight: ex.weight ?? 0,
        weightUnit: ex.weightUnit || 'lbs',
        distance: ex.distance ?? 0,
        distanceUnit: ex.distanceUnit || 'mi',
        duration: ex.duration ?? 0,
        durationUnit: ex.durationUnit || 'min',
        calories,
        caloriesSource,
      };
    });

    onSubmitLog({
        date: normalizedDate,
        notes: values.notes,
        exercises: normalizedExercises
    });

    if (!editingLogId) {
        form.reset();
    }
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
                    <Input type="date" className="appearance-none" {...field} />
                </FormControl>
                <FormMessage />
                </FormItem>
            )}
            />
        </div>

        <div>
          <h3 className="mb-3 text-lg font-medium">Exercises</h3>
          {fields.map((field, index) => {
            return (
              <Card key={field.id} className="mb-4 p-4 border rounded-2xl shadow-sm relative">
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
                      <FormItem className="md:col-span-2 lg:col-span-1">
                        <FormLabel>Exercise Name</FormLabel>
                        <FormControl>
                          <ExerciseCombobox
                            value={field.value}
                            onChange={(value) => {
                              field.onChange(value);
                              const mappedCategory = getExerciseCategory(value);
                              const currentCategory = form.getValues(`exercises.${index}.category`);
                              if (mappedCategory && (!currentCategory || currentCategory === "Other")) {
                                form.setValue(`exercises.${index}.category`, mappedCategory, {
                                  shouldDirty: true,
                                  shouldTouch: true,
                                });
                              }
                            }}
                            suggestions={suggestions}
                            classifiedExercises={classifiedExercises}
                            placeholder="e.g., Bench Press"
                            autoFocus={index === autoFocusIndex}
                            name={field.name}
                            inputRef={field.ref}
                          />
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
                        <FormLabel>Category</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select category" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {CATEGORY_OPTIONS.map(option => (
                              <SelectItem key={option} value={option}>{option}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
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
                          <StepperInput {...field} onChange={field.onChange} step={1} />
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
                          <StepperInput {...field} onChange={field.onChange} step={1} />
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
                          <StepperInput {...field} onChange={field.onChange} step={1} />
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
                        <Select onValueChange={field.onChange} value={field.value || "lbs"}>
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
                        <FormLabel>Distance</FormLabel>
                        <FormControl>
                          <StepperInput {...field} onChange={field.onChange} step={0.01} buttonStep={0.25} />
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
                        <Select onValueChange={field.onChange} value={field.value || "mi"}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Unit" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="mi">mi</SelectItem>
                            <SelectItem value="km">km</SelectItem>
                            <SelectItem value="ft">ft</SelectItem>
                            <SelectItem value="m">m</SelectItem>
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
                        <FormLabel>Duration</FormLabel>
                        <FormControl>
                          <StepperInput {...field} onChange={field.onChange} step={1} />
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
                        <Select onValueChange={field.onChange} value={field.value || "min"}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select unit" />
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
                        <FormLabel>Calories</FormLabel>
                        <FormControl>
                          <StepperInput {...field} onChange={field.onChange} step={1} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </Card>
            )
          })}
          <Button
            type="button"
            variant="outline"
            onClick={() => {
              const newIndex = fields.length;
              append(defaultExerciseValues, { shouldFocus: false });
              setAutoFocusIndex(newIndex);
            }}
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
              <FormLabel>Notes</FormLabel>
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
            <Button type="submit" className="w-full" disabled={isSubmitting}>
              {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {editingLogId ? "Update Log" : "Log Workout"}
            </Button>
            {editingLogId && onCancelEdit && (
            <Button type="button" variant="outline" onClick={onCancelEdit} className="w-full" disabled={isSubmitting}>
                Cancel Edit
            </Button>
            )}
        </div>
      </form>
    </Form>
  );
}
