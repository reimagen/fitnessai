
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
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { FileUp, Edit, ImageUp, Loader2, ChevronLeft, ChevronRight } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { format } from 'date-fns/format';
import { startOfDay } from 'date-fns/startOfDay';
import { addMonths } from 'date-fns/addMonths';
import { subMonths } from 'date-fns/subMonths';
import { isSameMonth } from 'date-fns/isSameMonth';
import { ErrorState } from "../shared/ErrorState";
import { cn } from "@/lib/utils";


const CATEGORY_OPTIONS: ExerciseCategory[] = ['Cardio', 'Lower Body', 'Upper Body', 'Full Body', 'Core', 'Other'];

export function HistoryPageContent() {
  const { toast } = useToast();
  const searchParams = useSearchParams();
  const [isClient, setIsClient] = useState(false);
  const [editingLogId, setEditingLogId] = useState<string | null>(null);
  const [currentMonth, setCurrentMonth] = useState(new Date());
  
  // State to control which form is visible, defaults to 'manual'
  const [activeForm, setActiveForm] = useState<'manual' | 'parse' | 'none'>('none');

  useEffect(() => {
    setIsClient(true);
    // If there's an edit in progress, ensure the manual log form is visible
    if (editingLogId) {
      setActiveForm('manual');
    }
  }, [editingLogId]);

  const { 
    data: profileResult, 
    isLoading: isLoadingProfile, 
    isError: isErrorProfile 
  } = useUserProfile();
  const userProfile = profileResult?.data;
  const isNewUser = profileResult?.notFound === true;

  // Fetching data with React Query, now passing the current month
  // This hook is now enabled only when the profile has loaded and is confirmed to exist for an existing user.
  const { 
    data: workoutLogs, 
    isLoading: isLoadingWorkouts, 
    isError: isErrorWorkouts 
  } = useWorkouts(currentMonth, !isLoadingProfile && !isNewUser);
  
  // Mutations defined directly in the component
  const addWorkoutMutation = useAddWorkoutLog();
  const updateWorkoutMutation = useUpdateWorkoutLog();
  const deleteWorkoutMutation = useDeleteWorkoutLog();

  const goToPreviousMonth = () => setCurrentMonth(subMonths(currentMonth, 1));
  const goToNextMonth = () => setCurrentMonth(addMonths(currentMonth, 1));
  
  const handleManualLogSubmit = (data: Omit<WorkoutLog, 'id'>) => {
    const finalData = {
        ...data,
        exercises: data.exercises.map(ex => {
            const calculatedCalories = userProfile ? calculateExerciseCalories(ex, userProfile, workoutLogs || []) : 0;
            return { ...ex, calories: ex.calories && ex.calories > 0 ? ex.calories : calculatedCalories };
        })
    };

    if (editingLogId) {
      updateWorkoutMutation.mutate({ id: editingLogId, data: finalData }, {
        onSuccess: () => {
          toast({ title: "Log Updated!", description: "Your workout has been successfully updated." });
          setEditingLogId(null);
          setActiveForm('none'); // Hide form on success
        },
        onError: (error) => {
          toast({ title: "Update Failed", description: error.message, variant: "destructive" });
        }
      });
    } else {
      addWorkoutMutation.mutate(finalData, {
        onSuccess: () => {
          toast({ title: "Workout Logged!", description: "Your new workout session has been saved." });
           setActiveForm('none'); // Hide form on success
        },
        onError: (error) => {
          toast({ title: "Save Failed", description: error.message, variant: "destructive" });
        }
      });
    }
  };

  const handleParsedData = (parsedData: ParseWorkoutScreenshotOutput) => {
    if (!parsedData.workoutDate) {
      toast({
        title: "Parsing Error",
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
      
      const updatedLog: Omit<WorkoutLog, 'id'> = { ...existingLog, exercises: newExercises };
      updateWorkoutMutation.mutate({ id: existingLog.id, data: updatedLog }, {
        onSuccess: () => {
          toast({ title: "Log Updated", description: `Merged parsed data, adding ${addedCount} new exercise(s).` });
          setActiveForm('none'); // Hide form on success
        },
        onError: (error) => {
          toast({ title: "Update Failed", description: error.message, variant: "destructive" });
        }
      });
    } else {
      const newLog: Omit<WorkoutLog, 'id'> = {
        date: targetDate,
        exercises: parsedExercises,
      };
      addWorkoutMutation.mutate(newLog, {
        onSuccess: () => {
          toast({ title: "Log Created", description: "Successfully created a new log from the screenshot." });
          setActiveForm('none'); // Hide form on success
        },
        onError: (error) => {
          toast({ title: "Save Failed", description: error.message, variant: "destructive" });
        }
      });
    }
  };
  
  const handleDeleteLog = (logId: string) => {
    deleteWorkoutMutation.mutate(logId, {
          onSuccess: () => {
              toast({ title: "Log Deleted", description: "The workout log has been removed.", variant: "destructive" });
          },
          onError: (error) => {
              toast({ title: "Delete Failed", description: error.message, variant: "destructive" });
          }
    });
  }

  const handleEditLog = (logId: string) => {
    if (!workoutLogs) return;
    const logToEdit = workoutLogs.find(log => log.id === logId);
    if (logToEdit) {
      setEditingLogId(logId);
      setActiveForm('manual');
      // Scroll to top to see the form
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } else {
      toast({ title: "Error", description: "Could not find log to edit.", variant: "destructive" });
    }
  }

  const handleCancelEdit = () => {
    setEditingLogId(null);
    setActiveForm('none');
  }

  const handleTabChange = (value: 'manual' | 'parse') => {
    setEditingLogId(null); // Clear any edits when switching forms
    setActiveForm(value);
  };


  if (!isClient) {
    return (
      <div className="container mx-auto px-4 py-8 flex justify-center items-center h-full">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
      </div>
    );
  }

  const logBeingEdited = editingLogId ? workoutLogs?.find(log => log.id === editingLogId) : undefined;
  const isCurrentMonthInView = isSameMonth(currentMonth, new Date());

  const renderWorkoutContent = () => {
    // State 1: Handle profile loading (highest priority)
    if (isLoadingProfile) {
      return (
        <div className="flex justify-center items-center h-40">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      );
    }

    // State 2: Handle profile fetch error
    if (isErrorProfile) {
        return <ErrorState message="Could not load your user profile. Please try refreshing." />;
    }

    // State 3: Handle new user case (profile loaded, but document not found)
    // This correctly short-circuits before the workout query can run and fail.
    if (isNewUser) {
        return (
            <WorkoutList 
              workoutLogs={[]} 
              onEdit={handleEditLog}
              onDelete={handleDeleteLog}
            />
        );
    }
    
    // --- Logic for existing users only from this point on ---

    // State 4: Handle workout data loading for existing user
    if (isLoadingWorkouts) {
      return (
        <div className="flex justify-center items-center h-40">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      );
    }

    // State 5: Handle workout fetch error for existing user
    if (isErrorWorkouts) {
      return <ErrorState message="Could not load workout history. Please try refreshing." />;
    }

    // State 6: Success state for existing user (with or without logs)
    return (
      <WorkoutList 
        workoutLogs={workoutLogs || []} 
        onEdit={handleEditLog}
        onDelete={handleDeleteLog}
      />
    );
  };

  return (
    <div className="container mx-auto px-4 py-8 space-y-8">
      <header className="mb-8">
        <h1 className="font-headline text-3xl font-bold text-primary">
          Workout History
        </h1>
        <p className="text-muted-foreground">
          Log your sessions and review your past performance.
        </p>
      </header>

      {/* Show selection cards ONLY if no form is active */}
       {activeForm === 'none' && (
         <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card className="shadow-lg hover:shadow-xl transition-shadow cursor-pointer" onClick={() => handleTabChange('manual')}>
              <CardHeader>
                <CardTitle className="font-headline flex items-center gap-2">
                  <Edit className="h-6 w-6 text-primary" />
                  Log Workout Manually
                </CardTitle>
                <CardDescription>
                  Enter the details of your workout session exercise by exercise.
                </CardDescription>
              </CardHeader>
            </Card>
             <Card className="shadow-lg hover:shadow-xl transition-shadow cursor-pointer" onClick={() => handleTabChange('parse')}>
              <CardHeader>
                <CardTitle className="font-headline flex items-center gap-2">
                  <ImageUp className="h-6 w-6 text-primary" />
                  Parse from Screenshot
                </CardTitle>
                <CardDescription>
                  Upload an image of your workout log and let our AI do the work.
                </CardDescription>
              </CardHeader>
            </Card>
         </div>
       )}

      {/* Manual Log Form Card */}
      <div className={cn(activeForm === 'manual' ? "block" : "hidden")}>
        <Card className="shadow-lg">
           <CardHeader>
            <CardTitle className="font-headline flex items-center gap-2">
              <Edit className="h-6 w-6 text-primary" />
              {editingLogId ? "Edit Workout Log" : "Log New Workout"}
            </CardTitle>
            <CardDescription>
              {editingLogId ? "Update the details of your workout session." : "Manually enter the details of your workout session."}
            </CardDescription>
          </CardHeader>
          <CardContent>
             <WorkoutLogForm 
                onSubmitLog={handleManualLogSubmit}
                initialData={logBeingEdited}
                editingLogId={editingLogId}
                onCancelEdit={handleCancelEdit}
                isSubmitting={addWorkoutMutation.isPending || updateWorkoutMutation.isPending}
              />
          </CardContent>
        </Card>
      </div>
      
      {/* Screenshot Parser Card */}
      <div className={cn(activeForm === 'parse' ? "block" : "hidden")}>
        <Card className="shadow-lg">
           <CardHeader>
            <CardTitle className="font-headline flex items-center gap-2">
              <ImageUp className="h-6 w-6 text-primary" />
              Parse Workout from Screenshot
            </CardTitle>
            <CardDescription>
              Upload an image of your workout log and let our AI extract the data.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ScreenshotParserForm
              onParse={parseWorkoutScreenshotAction}
              onParsedData={handleParsedData}
            />
          </CardContent>
        </Card>
      </div>

      <Card className="shadow-lg">
          <CardHeader>
            <CardTitle className="font-headline">Logged Workouts</CardTitle>
            <div className="flex justify-between items-center">
              <CardDescription>Review your workout history for {format(currentMonth, 'MMMM yyyy')}.</CardDescription>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="icon" onClick={goToPreviousMonth}>
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <Button variant="outline" size="icon" onClick={goToNextMonth} disabled={isCurrentMonthInView}>
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {renderWorkoutContent()}
          </CardContent>
        </Card>
    </div>
  );
}
