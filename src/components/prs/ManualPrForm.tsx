
"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { PlusCircle, Loader2 } from "lucide-react";
import type { PersonalRecord } from "@/lib/types";
import { startOfDay } from 'date-fns';
import { classifiedExercises, getExerciseCategory } from "@/lib/strength-standards";
import { PR_EXERCISES_TO_HIDE } from "@/lib/constants";
import { toTitleCase } from "@/lib/utils";
import { StepperInput } from "../ui/stepper-input";

const manualPrSchema = z.object({
  exerciseName: z.string().min(1, "Please select an exercise."),
  weight: z.coerce.number().min(1, "Weight must be greater than 0."),
  weightUnit: z.enum(['kg', 'lbs']).default('lbs'),
  date: z.string().refine((val) => !isNaN(Date.parse(val)), { message: "Invalid date" }),
});

type ManualPrFormData = z.infer<typeof manualPrSchema>;

type ManualPrFormProps = {
  onAdd: (data: Omit<PersonalRecord, 'id' | 'userId'>) => void;
  isSubmitting?: boolean;
};

// Filter the exercise list to hide aliases from the dropdown
const exercisesForDropdown = classifiedExercises.filter(exercise => !PR_EXERCISES_TO_HIDE.includes(exercise));

export function ManualPrForm({ onAdd, isSubmitting }: ManualPrFormProps) {
  const form = useForm<ManualPrFormData>({
    resolver: zodResolver(manualPrSchema),
    defaultValues: { 
      exerciseName: "",
      weight: 0,
      weightUnit: 'lbs',
      date: new Date().toISOString().split('T')[0],
    }
  });

  function onSubmit(values: ManualPrFormData) {
    const category = getExerciseCategory(values.exerciseName);
    const selectedDate = startOfDay(new Date(values.date.replace(/-/g, '/')));

    onAdd({
      exerciseName: values.exerciseName,
      weight: values.weight,
      weightUnit: values.weightUnit,
      date: selectedDate,
      category: category || 'Other',
    });
    form.reset();
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="exerciseName"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Exercise</FormLabel>
              <Select onValueChange={field.onChange} value={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a classifiable exercise" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {exercisesForDropdown.map(exercise => (
                    <SelectItem key={exercise} value={exercise}>{toTitleCase(exercise)}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="grid grid-cols-2 gap-4">
            <FormField
            control={form.control}
            name="weight"
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
                name="weightUnit"
                render={({ field }) => (
                <FormItem>
                    <FormLabel>Unit</FormLabel>
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
        </div>

        <FormField
          control={form.control}
          name="date"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Date Achieved</FormLabel>
              <FormControl>
                <Input type="date" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        
        <Button type="submit" className="w-full" disabled={isSubmitting}>
            {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <PlusCircle className="mr-2 h-4 w-4" />}
            Add Record
        </Button>
      </form>
    </Form>
  );
}
