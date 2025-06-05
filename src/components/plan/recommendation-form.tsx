
"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
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
import type { WorkoutRecommendationInput, WorkoutRecommendationOutput } from "@/ai/flows/workout-recommendation";
import { useState, useEffect } from "react";
import { Loader2 } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import MarkdownRenderer from '@/components/shared/MarkdownRenderer';

const formSchema = z.object({
  fitnessGoals: z.string().min(10, {
    message: "Please describe your fitness goals in at least 10 characters.",
  }),
  workoutHistory: z.string().min(10, {
    message: "Please describe your workout history in at least 10 characters.",
  }),
  personalStats: z.string().min(10, {
    message: "Please provide your personal stats (age, gender, weight, height, etc.) in at least 10 characters.",
  }),
});

type FormDataForPlan = {
  fitnessGoals: string;
  workoutHistory: string;
  personalStats: string;
};

type RecommendationFormProps = {
  onRecommendation: (data: WorkoutRecommendationInput) => Promise<{ success: boolean; data?: WorkoutRecommendationOutput; error?: string | object }>;
  initialFormData?: FormDataForPlan;
};

const LOCAL_STORAGE_AI_PLAN_KEY = "fitnessAppAiPlan";

export function RecommendationForm({ onRecommendation, initialFormData }: RecommendationFormProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [recommendationResult, setRecommendationResult] = useState<WorkoutRecommendationOutput | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: initialFormData || {
      fitnessGoals: "",
      workoutHistory: "",
      personalStats: "",
    },
  });

  useEffect(() => {
    if (initialFormData) {
      form.reset(initialFormData);
    }
  }, [initialFormData, form]);

  useEffect(() => {
    if (isClient) {
      const savedPlanString = localStorage.getItem(LOCAL_STORAGE_AI_PLAN_KEY);
      if (savedPlanString) {
        try {
          const savedPlan: WorkoutRecommendationOutput = JSON.parse(savedPlanString);
          setRecommendationResult(savedPlan);
        } catch (e) {
          console.error("Error parsing saved AI plan from localStorage", e);
          localStorage.removeItem(LOCAL_STORAGE_AI_PLAN_KEY); // Clear invalid data
        }
      }
    }
  }, [isClient]);

  async function onSubmit(values: z.infer<typeof formSchema>) {
    setIsLoading(true);
    setError(null);
    // Do not clear recommendationResult here, so the old plan remains visible during loading
    // setRecommendationResult(null); 
    const result = await onRecommendation(values);
    if (result.success && result.data) {
      setRecommendationResult(result.data);
      if (isClient) {
        localStorage.setItem(LOCAL_STORAGE_AI_PLAN_KEY, JSON.stringify(result.data));
      }
    } else {
      if (typeof result.error === 'string') {
        setError(result.error);
      } else {
        setError("An unexpected error occurred.");
        console.error(result.error);
      }
      // Clear previous plan from display if new generation fails
      setRecommendationResult(null);
      if (isClient) {
        localStorage.removeItem(LOCAL_STORAGE_AI_PLAN_KEY);
      }
    }
    setIsLoading(false);
  }

  return (
    <>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          <FormField
            control={form.control}
            name="fitnessGoals"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Fitness Goals</FormLabel>
                <FormControl>
                  <Textarea
                    placeholder="e.g., Lose 10kg, run a 5k, gain muscle mass"
                    {...field}
                    className="min-h-[100px]"
                  />
                </FormControl>
                <FormDescription>
                  What do you want to achieve?
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="workoutHistory"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Workout History</FormLabel>
                <FormControl>
                  <Textarea
                    placeholder="e.g., Beginner, 3x/week gym for 6 months, enjoy running"
                    {...field}
                    className="min-h-[100px]"
                  />
                </FormControl>
                <FormDescription>
                  Tell us about your past and current activity.
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="personalStats"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Personal Stats</FormLabel>
                <FormControl>
                  <Textarea
                    placeholder="e.g., 30 y/o male, 80kg, 175cm, no major injuries"
                    {...field}
                    className="min-h-[100px]"
                  />
                </FormControl>
                <FormDescription>
                  Include age, gender, weight, height, and any relevant medical conditions.
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
          <Button type="submit" disabled={isLoading} className="w-full bg-accent hover:bg-accent/90 text-accent-foreground">
            {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : "Get My AI Plan"}
          </Button>
        </form>
      </Form>

      {error && (
        <Card className="mt-6 border-destructive bg-destructive/10">
          <CardHeader>
            <CardTitle className="text-destructive">Error</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-destructive">{error}</p>
          </CardContent>
        </Card>
      )}

      {isClient && recommendationResult && recommendationResult.workoutRecommendation && (
        <Card className="mt-6 shadow-lg">
          <CardHeader>
            <CardTitle className="font-headline text-primary">Your AI-Generated Workout Plan</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-sm">
              <MarkdownRenderer text={recommendationResult.workoutRecommendation} />
            </div>
          </CardContent>
        </Card>
      )}
    </>
  );
}
