"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm, useFieldArray } from "react-hook-form";
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
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { PlusCircle, Trash2, Target } from "lucide-react";
import type { FitnessGoal } from "@/lib/types";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";

const goalSchema = z.object({
  description: z.string().min(5, "Goal description must be at least 5 characters."),
  targetDate: z.string().optional(), // Keep as string for date input, convert on submit
  achieved: z.boolean().default(false),
});

const goalsFormSchema = z.object({
  goals: z.array(goalSchema),
});

// Mock initial goals
const mockInitialGoals: FitnessGoal[] = [
  { id: "goal1", description: "Lose 5kg by end of August", achieved: false, targetDate: new Date("2024-08-31") },
  { id: "goal2", description: "Run a 10k marathon", achieved: false, targetDate: new Date("2024-12-31") },
  { id: "goal3", description: "Workout 4 times a week", achieved: true },
];


export function GoalSetterCard() {
  const { toast } = useToast();
  // Initialize state with mock data. In a real app, this would come from a store or API.
  const [userGoals, setUserGoals] = useState<FitnessGoal[]>(mockInitialGoals);

  const form = useForm<z.infer<typeof goalsFormSchema>>({
    resolver: zodResolver(goalsFormSchema),
    defaultValues: {
      goals: userGoals.map(g => ({
        description: g.description,
        targetDate: g.targetDate ? g.targetDate.toISOString().split("T")[0] : "",
        achieved: g.achieved,
      })),
    },
  });

  const { fields, append, remove, update } = useFieldArray({
    control: form.control,
    name: "goals",
  });

  function onSubmit(values: z.infer<typeof goalsFormSchema>) {
    // In a real app, you would send this to your backend to save.
    const updatedGoals: FitnessGoal[] = values.goals.map((g, index) => ({
        id: userGoals[index]?.id || `new-${Date.now()}-${index}`, // Preserve existing IDs or generate new ones
        description: g.description,
        targetDate: g.targetDate ? new Date(g.targetDate) : undefined,
        achieved: g.achieved
    }));
    setUserGoals(updatedGoals); // Update local state for demo
    console.log("Updated goals:", updatedGoals);
    toast({
        title: "Goals Updated!",
        description: "Your fitness goals have been saved.",
    });
  }

  return (
    <Card className="shadow-lg">
      <CardHeader>
        <CardTitle className="font-headline flex items-center gap-2">
            <Target className="h-6 w-6 text-primary"/>
            Your Fitness Goals
        </CardTitle>
        <CardDescription>Define what you want to achieve and track your progress.</CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            {fields.map((field, index) => (
              <Card key={field.id} className="p-4 border rounded-md shadow-sm bg-secondary/30">
                <FormField
                  control={form.control}
                  name={`goals.${index}.description`}
                  render={({ field }) => (
                    <FormItem className="mb-2">
                      <FormLabel>Goal Description</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g., Run 5km without stopping" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <div className="grid grid-cols-2 gap-4">
                    <FormField
                    control={form.control}
                    name={`goals.${index}.targetDate`}
                    render={({ field }) => (
                        <FormItem>
                        <FormLabel>Target Date (Optional)</FormLabel>
                        <FormControl>
                            <Input type="date" {...field} />
                        </FormControl>
                        <FormMessage />
                        </FormItem>
                    )}
                    />
                    <FormField
                    control={form.control}
                    name={`goals.${index}.achieved`}
                    render={({ field }) => (
                        <FormItem className="flex flex-row items-end space-x-2 pb-2">
                        <FormControl>
                            <Checkbox
                            checked={field.value}
                            onCheckedChange={field.onChange}
                            />
                        </FormControl>
                        <FormLabel className="font-normal">Achieved</FormLabel>
                        <FormMessage />
                        </FormItem>
                    )}
                    />
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => remove(index)}
                  className="mt-2 text-destructive hover:bg-destructive/10"
                >
                  <Trash2 className="mr-1 h-4 w-4" /> Remove Goal
                </Button>
              </Card>
            ))}
            <div className="flex justify-between items-center">
                <Button
                type="button"
                variant="outline"
                onClick={() => append({ description: "", achieved: false, targetDate: "" })}
                >
                <PlusCircle className="mr-2 h-4 w-4" /> Add New Goal
                </Button>
                <Button type="submit" className="bg-primary hover:bg-primary/90">Save Goals</Button>
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
