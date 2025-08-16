
"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm, useFieldArray } from "react-hook-form";
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
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { PlusCircle, Trash2, Target, Star } from "lucide-react";
import type { FitnessGoal } from "@/lib/types";
import { useEffect } from "react";
import { format as formatDate, isValid } from "date-fns";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

const goalSchema = z.object({
  description: z.string().min(5, "Goal description must be at least 5 characters."),
  targetDate: z.string().optional(),
  dateAchieved: z.string().optional(),
  achieved: z.boolean().default(false),
  isPrimary: z.boolean().default(false),
});

const goalsFormSchema = z.object({
  goals: z.array(goalSchema),
});

type GoalSetterCardProps = {
  initialGoals: FitnessGoal[];
  onGoalsChange: (updatedGoals: FitnessGoal[]) => void;
};

// Helper to create initial form values from initialGoals prop
const createFormValues = (goalsProp: FitnessGoal[] | undefined) => {
  if (!Array.isArray(goalsProp) || goalsProp.length === 0) return { goals: [] };
  return {
    goals: goalsProp.map(g => {
      const toInputDate = (date: Date | undefined) => {
        if (!date) return "";
        const dateObj = date instanceof Date ? date : new Date(date);
        return isValid(dateObj) ? formatDate(dateObj, 'yyyy-MM-dd') : "";
      };
      
      return {
          description: g.description,
          targetDate: toInputDate(g.targetDate),
          dateAchieved: toInputDate(g.dateAchieved),
          achieved: g.achieved || false,
          isPrimary: g.isPrimary || false,
      };
    }),
  };
};


export function GoalSetterCard({ initialGoals, onGoalsChange }: GoalSetterCardProps) {
  const { toast } = useToast();
  const form = useForm<z.infer<typeof goalsFormSchema>>({
    resolver: zodResolver(goalsFormSchema),
    defaultValues: createFormValues(initialGoals), 
  });

  useEffect(() => {
      form.reset(createFormValues(initialGoals));
  }, [initialGoals, form]); 

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "goals",
  });

  const handleSetPrimary = (selectedIndex: number) => {
    const currentGoals = form.getValues("goals");
    currentGoals.forEach((goal, index) => {
      form.setValue(`goals.${index}.isPrimary`, index === selectedIndex, { shouldDirty: true, shouldTouch: true, shouldValidate: true });
    });
    form.trigger("goals"); 
  };

  function onSubmit(values: z.infer<typeof goalsFormSchema>) {
    const updatedGoals: FitnessGoal[] = values.goals.map((g, index) => {
        const originalGoal = initialGoals?.find((_og, i) => i === index);
        const fromInputDate = (dateStr: string | undefined) => {
           if (!dateStr || dateStr.trim() === "") return undefined;
           // Handle YYYY-MM-DD by replacing dashes to avoid timezone issues
           const date = new Date(dateStr.replace(/-/g, '\/'));
           return isValid(date) ? date : undefined;
        }

        return {
            id: originalGoal?.id || `new-${Date.now()}-${index}`,
            description: g.description,
            targetDate: fromInputDate(g.targetDate),
            dateAchieved: g.achieved ? fromInputDate(g.dateAchieved) : undefined,
            achieved: g.achieved,
            isPrimary: g.isPrimary,
        }
    });
    onGoalsChange(updatedGoals);
  }

  const handleAddNewGoal = () => {
    if (fields.length >= 3) {
      toast({
        title: "Goal Limit Reached",
        description: "You have already set 3 goals, please remove one or edit an existing goal.",
        variant: "destructive",
      });
    } else {
      append({ description: "", achieved: false, targetDate: "", dateAchieved: "", isPrimary: false });
    }
  };

  return (
    <Card className="shadow-lg">
      <CardHeader>
        <CardTitle className="font-headline flex items-center gap-2">
            <Target className="h-6 w-6 text-primary"/>
            Your Fitness Goals
        </CardTitle>
        <CardDescription>Define what you want to achieve: set up to 3 goals.</CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            {fields.map((field, index) => {
              const isCurrentGoalPrimary = form.watch(`goals.${index}.isPrimary`);
              const isAchieved = form.watch(`goals.${index}.achieved`);
              return (
                <Card key={field.id} className="p-4 border rounded-md shadow-sm bg-secondary/30">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name={`goals.${index}.description`}
                      render={({ field }) => (
                        <FormItem className="md:col-span-2">
                          <FormLabel>Goal Description</FormLabel>
                          <FormControl>
                            <Input placeholder="e.g., Build muscle, Lose 5 lbs, Run 5km" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
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
                    {isAchieved && (
                       <FormField
                          control={form.control}
                          name={`goals.${index}.dateAchieved`}
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
                    )}
                  </div>

                  <div className="flex flex-wrap items-center justify-between mt-4 gap-4">
                    <div className="flex items-center gap-4">
                       <Button
                          type="button"
                          variant={isCurrentGoalPrimary ? "default" : "outline"}
                          size="sm"
                          onClick={() => handleSetPrimary(index)}
                          disabled={isCurrentGoalPrimary}
                          className={cn( "whitespace-nowrap", isCurrentGoalPrimary && "disabled:opacity-100" )}
                      >
                          {isCurrentGoalPrimary ? ( <><Star className="mr-2 h-4 w-4 fill-current" /> Primary Goal</> ) : ( "Set as Primary" )}
                      </Button>
                      <FormField
                        control={form.control}
                        name={`goals.${index}.achieved`}
                        render={({ field: checkboxField }) => ( 
                            <FormItem className="flex flex-row items-center space-x-2">
                            <FormControl>
                                <Checkbox
                                checked={checkboxField.value}
                                onCheckedChange={checkboxField.onChange}
                                />
                            </FormControl>
                            <FormLabel className="font-normal !mt-0">Achieved</FormLabel>
                            </FormItem>
                        )}
                        />
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => remove(index)}
                      className="text-destructive hover:bg-destructive/10"
                    >
                      <Trash2 className="mr-1 h-4 w-4" /> Remove Goal
                    </Button>
                  </div>
                </Card>
              );
            })}
            <div className="flex justify-between items-center">
                <Button
                type="button"
                variant="outline"
                onClick={handleAddNewGoal}
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
