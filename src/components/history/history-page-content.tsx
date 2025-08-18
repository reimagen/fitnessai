
"use client";

import { useState, useEffect, useRef } from "react";
import { useSearchParams } from "next/navigation";
import { ScreenshotParserForm } from "@/components/history/screenshot-parser-form";
import { WorkoutLogForm } from "@/components/history/workout-log-form";
import { WorkoutList } from "@/components/history/workout-list";
import { parseWorkoutScreenshotAction } from "../../app/history/actions";
import type { WorkoutLog, Exercise, ExerciseCategory, UserProfile } from "@/lib/types";
import { calculateExerciseCalories } from "@/lib/calorie-calculator";
import type { ParseWorkoutScreenshotOutput } from "@/ai/flows/screenshot-workout-parser";
import { useWorkouts, useUserProfile, useAddWorkoutLog, useUpdateWorkoutLog, useDeleteWorkoutLog } from "@/lib/firestore.service";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { FileUp, Edit, ImageUp, Loader2, ChevronLeft, ChevronRight } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { format } from 'date-fns/format';
import { startOfDay } from 'date-fns/startOfDay';
import { addMonths } from 'date-fns/addMonths';
import { subMonths } from 'date-fns/subMonths';
import { isSameMonth } from 'date-fns/isSameMonth';

const CATEGORY_OPTIONS: ExerciseCategory[] = ['Cardio', 'Lower Body', 'Upper Body', 'Full Body', 'Core', 'Other'];

export function HistoryPageContent() {
  const { toast } = useToast();
  const searchParams = useSearchParams();
  const initialTabQueryParam = searchParams.get('tab');
  const [isClient, setIsClient(true);
  }, []);

  // Fetching data with React Query, now passing the current month
  const { data: workoutLogs, isLoading: isLoadingWorkouts } = useWorkouts(currentMonth);
  const { data: userProfile } = useUserProfile();
  
  // Mutations defined directly in the component
  const addWorkoutMutation = useAddWorkoutLog();
  const updateWorkoutMutation = useUpdateWorkoutLog();
  const deleteWorkoutMutation = useDeleteWorkoutLog();

  useEffect(() => {
    if (editingLogId && activeTab === 'log' && manualLogCardRef.current) {
      manualLogCardRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }, [editingLogId, activeTab]);

  const goToPreviousMonth = () => setCurrentMonth(subMonths(currentMonth, 1));
  const goToNextMonth = () => setCurrentMonth(addMonths(currentMonth, 1));
  
  const handleManualLogSubmit = (data: Omit { title: "Parsing Error",
        description: "A date was not provided for the parsed log. Cannot save.",
        variant: "destructive",
      });
      return;
    }

    const targetDate = startOfDay(new Date(parsedData.workoutDate.replace(/-/g, '/')));
    
    // We must check against all workouts, not just the current month's view
    // A better implementation would fetch the specific log for that date if needed.
    // For now, this logic is client-side and will depend on what's already loaded, which is a limitation.
    // To make it robust, we'd need a `getWorkoutByDate` function.
    // For now, we'll assume the user is parsing for the current month.
    const existingLog = workoutLogs?.find(
      (log) => format(log.date, 'yyyy-MM-dd') === format(targetDate, 'yyyy-MM-dd')
    );

    const parsedExercises: Exercise[] = parsedData.exercises.map(ex => {
        const exercise: Exercise = {
            id: Math.random().toString(36).substring(2, 9),
            name: ex.name,
            sets: ex.sets ?? 0,
            reps: ex.reps ?? 0,
            weight: ex.weight ?? 0,
            category: ex.category,
            distance: ex.distance ?? 0,
            duration: ex.duration ?? 0,
            calories: ex.calories ?? 0,
        };

        if (exercise.weight > 0) {
            exercise.weightUnit = ex.weightUnit || 'kg';
        }
        if (exercise.distance > 0) {
            exercise.distanceUnit = ex.distanceUnit || 'mi';
        }
        if (exercise.duration > 0) {
            exercise.durationUnit = ex.durationUnit || 'min';
        }
        return exercise;
    });

    if (existingLog) {
      const existingExerciseNames = new Set(existingLog.exercises.map(ex => ex.name.trim().toLowerCase()));
      let addedCount = 0;
      const newExercises = [...existingLog.exercises];

      parsedExercises.forEach(newEx => {
        if (!existingExerciseNames.has(newEx.name.trim().toLowerCase())) {
          newExercises.push(newEx);
          addedCount++;
        }
      });
      
      const updatedLog: Omit {
              toast({ title: "Delete Failed", description: error.message, variant: "destructive" });
          }
    });
  }

  const handleEditLog = (logId: string) => {
    if (!workoutLogs) return;
    const logToEdit = workoutLogs.find(log => log.id === logId);
    if (logToEdit) {
      setEditingLogId(logId);
      setActiveTab('log');
    } else {
      toast({ title: "Error", description: "Could not find log to edit.", variant: "destructive" });
    }
  }

  const handleCancelEdit = () => {
    setEditingLogId(null);
  }

  const handleTabChange = (value: string) => {
    setActiveTab(value);
    if (value !== 'log') {
      setEditingLogId(null);
    }
  }

  if (!isClient) {
    return (
      
        
          
        
      
    );
  }

  const logBeingEdited = editingLogId ? workoutLogs?.find(log => log.id === editingLogId) : undefined;
  const isCurrentMonthInView = isSameMonth(currentMonth, new Date());

  return (
    
      
        
          
            Workout History
          
          Log your sessions and review your past performance.
        
      

      
        
          
            Manual Log
          
            Parse Screenshot
          
        

        
          
            
              
                {editingLogId ? "Edit Workout Log" : "Log New Workout"}
              
                {editingLogId ? "Update the details of your workout session." : "Manually enter the details of your workout session."}
              
            
            
              
                
                  Log New Workout"}</CardTitle>
                  
                    Manually enter the details of your workout session."}
                  
                
                
              
            
          
        

        
          
            
              
                Parse Workout from Screenshot
              
                Upload an image of your workout log and let our AI extract the data.
              
            
            
              
                
              
            
          
        
      

      

          
            
              Logged Workouts
            
            
              
                
                  
                
                {format(currentMonth, 'MMMM yyyy')}
                
                  
                
              
            
          
          
            
              
                
              
            
          
          
            
          
        
      
    
  );
}
