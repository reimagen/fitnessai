
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
import { format as formatDate } from "date-fns";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

const goalSchema = z.object({
  description: z.string().min(5, "Goal description must be at least 5 characters."),
  targetDate: z.string().optional()
    .refine(val => {
      if (!val || val.trim() === "") return true; // Empty is allowed
      const date = new Date(val);
      return !isNaN(date.getTime()) && val.length >= 8 && (val.includes('/') || val.includes('-'));
    }, {
      message: "Invalid date. Please use MM/DD/YYYY or similar format.",
    }),
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
      let displayDateString = "";
      if (g.targetDate) {
          const dateObj = g.targetDate instanceof Date ? g.targetDate : new Date(g.targetDate);
          if (!isNaN(dateObj.getTime())) {
              displayDateString = formatDate(dateObj, 'MM/dd/yyyy');
          }
      }
      return {
          description: g.description,
          targetDate: displayDateString,
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

        return {
            id: originalGoal?.id || `new-${Date.now()}-${index}`,
            description: g.description,
            targetDate: g.targetDate && g.targetDate.trim() !== "" ? new Date(g.targetDate) : undefined,
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
      append({ description: "", achieved: false, targetDate: "", isPrimary: false });
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
              return (
                <Card key={field.id} className="p-4 border rounded-md shadow-sm bg-secondary/30">
                  <FormField
                    control={form.control}
                    name={`goals.${index}.description`}
                    render={({ field }) => (
                      <FormItem className="mb-2">
                        <FormLabel>Goal Description</FormLabel>
                        <FormControl>
                          <Input placeholder="e.g., Build muscle, Lose 5 lbs, Run 5km without stopping" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
                      <FormField
                      control={form.control}
                      name={`goals.${index}.targetDate`}
                      render={({ field }) => (
                          <FormItem>
                          <FormLabel>Target Date (Optional)</FormLabel>
                          <FormControl>
                              <Input type="text" placeholder="MM/DD/YYYY" {...field} />
                          </FormControl>
                          <FormMessage />
                          </FormItem>
                      )}
                      />
                      <Button
                          type="button"
                          variant={isCurrentGoalPrimary ? "default" : "outline"}
                          size="sm"
                          onClick={() => handleSetPrimary(index)}
                          disabled={isCurrentGoalPrimary}
                          className={cn(
                            "w-full md:w-auto whitespace-nowrap",
                            isCurrentGoalPrimary && "disabled:opacity-100"
                          )}
                      >
                          {isCurrentGoalPrimary ? (
                              <>
                                  <Star className="mr-2 h-4 w-4 fill-current" /> Primary Goal
                              </>
                          ) : (
                             "Set as Primary"
                          )}
                      </Button>
                      <FormField
                      control={form.control}
                      name={`goals.${index}.achieved`}
                      render={({ field: checkboxField }) => ( 
                          <FormItem className="flex flex-row items-center space-x-2 pb-1 justify-self-start md:justify-self-end">
                          <FormControl>
                              <Checkbox
                              checked={checkboxField.value}
                              onCheckedChange={checkboxField.onChange}
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
                    className="mt-3 text-destructive hover:bg-destructive/10"
                  >
                    <Trash2 className="mr-1 h-4 w-4" /> Remove Goal
                  </Button>
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

