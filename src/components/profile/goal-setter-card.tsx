
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
import { PlusCircle, Trash2, Target, Star, Edit2, Save, XCircle } from "lucide-react";
import type { FitnessGoal } from "@/lib/types";
import { useEffect, useState } from "react";
import { format as formatDate, isValid } from "date-fns";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";


const goalSchema = z.object({
  id: z.string().optional(),
  description: z.string().min(5, "Goal description must be at least 5 characters."),
  targetDate: z.string().min(1, "Target date is required."),
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
  
  const sortedGoals = [...goalsProp].sort((a, b) => {
    // Primary goal always on top
    if (a.isPrimary) return -1;
    if (b.isPrimary) return 1;
    // Active goals before achieved goals
    if (!a.achieved && b.achieved) return -1;
    if (a.achieved && !b.achieved) return 1;
    // Fallback to maintain a stable order (e.g., by date) if needed, but 0 is fine
    return 0;
  });

  return {
    goals: sortedGoals.map(g => {
      const toInputDate = (date: Date | undefined) => {
        if (!date) return "";
        const dateObj = date instanceof Date ? date : new Date(date);
        return isValid(dateObj) ? formatDate(dateObj, 'yyyy-MM-dd') : "";
      };
      
      return {
          id: g.id,
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
  const [isEditing, setIsEditing] = useState(false);
  
  const form = useForm<z.infer<typeof goalsFormSchema>>({
    resolver: zodResolver(goalsFormSchema),
    defaultValues: createFormValues(initialGoals), 
  });

  useEffect(() => {
      form.reset(createFormValues(initialGoals));
  }, [initialGoals, form]); 

  const { fields, append, remove, insert } = useFieldArray({
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
    const updatedGoals: FitnessGoal[] = values.goals.map((g) => {
        const originalGoal = initialGoals?.find((og) => og.id === g.id);
        const fromInputDate = (dateStr: string | undefined) => {
           if (!dateStr || dateStr.trim() === "") return undefined;
           // Handle YYYY-MM-DD by replacing dashes to avoid timezone issues
           const date = new Date(dateStr.replace(/-/g, '\/'));
           return isValid(date) ? date : undefined;
        }

        return {
            id: originalGoal?.id || g.id || `new-${Date.now()}`,
            description: g.description,
            targetDate: fromInputDate(g.targetDate)!,
            dateAchieved: g.achieved ? (fromInputDate(g.dateAchieved) || new Date()) : undefined,
            achieved: g.achieved,
            isPrimary: g.isPrimary,
        }
    });
    onGoalsChange(updatedGoals);
    setIsEditing(false);
  }

  const handleAddNewGoal = () => {
    const currentGoals = form.getValues("goals");
    const activeGoals = currentGoals.filter(goal => !goal.achieved);

    if (activeGoals.length >= 3) {
      toast({
        title: "Active Goal Limit Reached",
        description: "You can only have up to 3 active goals. Complete or remove one to add another.",
        variant: "destructive",
      });
      return;
    }

    const newGoal = { id: `new-${Date.now()}`, description: "", achieved: false, targetDate: "", dateAchieved: "", isPrimary: false };
    
    // Find the index of the first achieved goal.
    const firstAchievedIndex = fields.findIndex(field => field.achieved);

    if (firstAchievedIndex !== -1) {
      // If there's an achieved goal, insert the new goal before it.
      insert(firstAchievedIndex, newGoal);
    } else {
      // Otherwise, just append to the end.
      append(newGoal);
    }
  };

  const handleCancel = () => {
    form.reset(createFormValues(initialGoals));
    setIsEditing(false);
  };

  const activeFields = fields.map((field, index) => ({ field, index })).filter(({ field }) => !field.achieved);
  const achievedFields = fields.map((field, index) => ({ field, index })).filter(({ field }) => field.achieved);

  return (
    <Card className="shadow-lg">
      <CardHeader className="flex flex-row items-start justify-between pb-4">
        <div>
            <CardTitle className="font-headline flex items-center gap-2">
                <Target className="h-6 w-6 text-primary"/>
                Your Fitness Goals
            </CardTitle>
            <CardDescription>Define what you want to achieve: set up to 3 active goals.</CardDescription>
        </div>
        {isEditing ? (
          <div className="flex gap-2">
            <Button variant="outline" size="icon" onClick={handleCancel} aria-label="Cancel edit">
              <XCircle className="h-5 w-5" />
            </Button>
            <Button size="icon" onClick={form.handleSubmit(onSubmit)} aria-label="Save goals">
              <Save className="h-5 w-5" />
            </Button>
          </div>
        ) : (
          <Button variant="ghost" size="icon" onClick={() => setIsEditing(true)} aria-label="Edit goals">
            <Edit2 className="h-5 w-5" />
          </Button>
        )}
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            
            {/* Active Goals */}
            {activeFields.length > 0 ? activeFields.map(({ field, index }) => {
              const isCurrentGoalPrimary = form.watch(`goals.${index}.isPrimary`);
              const isAchieved = form.watch(`goals.${index}.achieved`);
              return (
                <Card key={field.id} className="p-4 border rounded-md shadow-sm bg-secondary/30">
                  {isEditing ? (
                    <>
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
                              <FormLabel>Target Date</FormLabel>
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
                    </>
                  ) : (
                    <div className="text-sm">
                      <div className="flex justify-between items-start">
                         <p className="font-semibold text-primary">{field.isPrimary && <Star className="inline-block h-4 w-4 mr-2 fill-yellow-400 text-yellow-500" />} {field.description}</p>
                      </div>
                      <p className="text-muted-foreground mt-1">Target: {field.targetDate ? formatDate(new Date(field.targetDate.replace(/-/g, '/')), 'MMMM d, yyyy') : 'Not set'}</p>
                    </div>
                  )}
                </Card>
              );
            }) : (
                 <p className="text-sm text-center text-muted-foreground py-4">No active goals set. Add a new goal to get started!</p>
            )}

            {/* Achieved Goals Accordion */}
            {achievedFields.length > 0 && (
              <Accordion type="single" collapsible className="w-full">
                <AccordionItem value="achieved-goals" className="border rounded-md px-4 bg-secondary/30">
                  <AccordionTrigger className="hover:no-underline">
                    <div className="flex items-center gap-2">
                       <Star className="h-5 w-5 text-yellow-500 fill-yellow-400" />
                       <span className="font-semibold">View {achievedFields.length} Completed Goal{achievedFields.length > 1 ? 's' : ''}</span>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent className="pt-2">
                    <div className="space-y-3">
                    {achievedFields.map(({ field }) => (
                      <div key={field.id} className="flex items-center justify-between p-3 rounded-md bg-background/50 border">
                        <div className="flex flex-col">
                          <p className="font-medium text-foreground">{field.description}</p>
                          <p className="text-xs text-muted-foreground">
                            Target: {field.targetDate ? formatDate(new Date(field.targetDate.replace(/-/g, '/')), 'MMM d, yyyy') : 'N/A'}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            Achieved on: {field.dateAchieved ? formatDate(new Date(field.dateAchieved.replace(/-/g, '/')), 'MMM d, yyyy') : 'N/A'}
                          </p>
                        </div>
                      </div>
                    ))}
                    </div>
                  </AccordionContent>
                </AccordionItem>
              </Accordion>
            )}
            
            <div className="pt-4 flex justify-between items-center">
              <Button
                type="button"
                variant="outline"
                onClick={handleAddNewGoal}
              >
                <PlusCircle className="mr-2 h-4 w-4" /> Add New Goal
              </Button>
              {isEditing && (
                 <Button type="submit" className="bg-primary hover:bg-primary/90">Save Goals</Button>
              )}
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
