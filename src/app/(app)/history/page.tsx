
"use client";

import { useState, useEffect, useRef } from "react";
import { useSearchParams } from "next/navigation";
import { ScreenshotParserForm } from "@/components/history/screenshot-parser-form";
import { WorkoutLogForm } from "@/components/history/workout-log-form";
import { WorkoutList } from "@/components/history/workout-list";
import { parseWorkoutScreenshotAction } from "./actions";
import type { WorkoutLog, Exercise, ExerciseCategory, UserProfile } from "@/lib/types";
import { calculateExerciseCalories } from "@/lib/calorie-calculator";
import type { ParseWorkoutScreenshotOutput } from "@/ai/flows/screenshot-workout-parser";
import { useWorkouts, useUserProfile, addWorkoutLog, updateWorkoutLog, deleteWorkoutLog } from "@/lib/firestore.service";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { FileUp, Edit, ImageUp, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { format, startOfDay } from "date-fns";
import { useQueryClient, useMutation } from "@tanstack/react-query";

const CATEGORY_OPTIONS: ExerciseCategory[] = ['Cardio', 'Lower Body', 'Upper Body', 'Full Body', 'Core', 'Other'];

export default function HistoryPage() {
  const { toast } = useToast();
  const searchParams = useSearchParams();
  const queryClient = useQueryClient();
  const initialTabQueryParam = searchParams.get('tab');
  const validTabs = ['log', 'screenshot', 'upload'];
  const defaultTabValue = initialTabQueryParam && validTabs.includes(initialTabQueryParam) ? initialTabQueryParam : 'log';

  const [editingLogId, setEditingLogId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<string>(defaultTabValue);
  const manualLogCardRef = useRef<HTMLDivElement>(null);

  // Fetching data with React Query
  const { data: workoutLogs, isLoading: isLoadingWorkouts } = useWorkouts();
  const { data: userProfile } = useUserProfile();
  
  // Mutations defined directly in the component
  const addWorkoutMutation = useMutation({
    mutationFn: addWorkoutLog,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workouts'] });
    },
    onError: (error) => {
      toast({ title: "Save Failed", description: error.message, variant: "destructive" });
    }
  });

  const updateWorkoutMutation = useMutation({
    mutationFn: ({ id, data }: { id: string, data: Partial<Omit<WorkoutLog, 'id' | 'date'>> & { date?: Date }}) => updateWorkoutLog(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workouts'] });
    },
    onError: (error) => {
        toast({ title: "Update Failed", description: error.message, variant: "destructive" });
    }
  });

  const deleteWorkoutMutation = useMutation({
    mutationFn: deleteWorkoutLog,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workouts'] });
      toast({
        title: "Log Deleted",
        description: "The workout log has been removed.",
        variant: "destructive"
      });
    },
    onError: (error) => {
        toast({ title: "Delete Failed", description: error.message, variant: "destructive" });
    }
  });

  useEffect(() => {
    if (editingLogId && activeTab === 'log' && manualLogCardRef.current) {
      manualLogCardRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }, [editingLogId, activeTab]);

  const handleManualLogSubmit = (data: Omit<WorkoutLog, 'id'>) => {
    let weightWarningShown = false;

    const processedExercises = data.exercises.map(ex => {
        let calculatedCalories = ex.calories ?? 0;
        if (
            ex.category === 'Cardio' && 
            (!ex.calories || ex.calories === 0) &&
            userProfile && userProfile.weightValue && userProfile.weightValue > 0
        ) {
            calculatedCalories = calculateExerciseCalories(ex, userProfile, workoutLogs || []);
        } else if (
            ex.category === 'Cardio' && 
            (!ex.calories || ex.calories === 0) &&
            (!userProfile?.weightValue || userProfile.weightValue <= 0) &&
            !weightWarningShown
        ) {
            toast({
                title: "Weight Not Set",
                description: "Set your weight on the Profile page to auto-calculate calories for Cardio.",
                variant: "default",
            });
            weightWarningShown = true;
        }

        return {
            id: ex.id || Math.random().toString(36).substring(2,9),
            name: ex.name,
            category: ex.category, 
            sets: ex.sets ?? 0,
            reps: ex.reps ?? 0,
            weight: ex.weight ?? 0,
            weightUnit: ex.weightUnit || 'kg',
            distance: ex.distance ?? 0,
            distanceUnit: ex.distanceUnit,
            duration: ex.duration ?? 0,
            durationUnit: ex.durationUnit,
            calories: calculatedCalories,
        };
    });

    const finalLogData = { ...data, exercises: processedExercises };

    if (editingLogId) {
      updateWorkoutMutation.mutate(
        { id: editingLogId, data: finalLogData },
        {
          onSuccess: () => {
            toast({
              title: "Workout Updated!",
              description: `Your workout on ${format(data.date, 'MMMM d, yyyy')} has been updated.`,
              variant: "default",
            });
            setEditingLogId(null);
          },
        }
      );
    } else {
      addWorkoutMutation.mutate(finalLogData, {
        onSuccess: () => {
           toast({
            title: "Workout Logged!",
            description: `Your workout on ${format(data.date, 'MMMM d, yyyy')} has been saved.`,
            variant: "default",
          });
        },
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
    
    const existingLog = workoutLogs?.find(
      (log) => format(log.date, 'yyyy-MM-dd') === format(targetDate, 'yyyy-MM-dd')
    );

    const parsedExercises: Exercise[] = parsedData.exercises.map(ex => ({
      id: Math.random().toString(36).substring(2, 9),
      name: ex.name,
      sets: ex.sets ?? 0,
      reps: ex.reps ?? 0,
      weight: ex.weight ?? 0,
      weightUnit: ex.weightUnit || 'kg',
      category: ex.category,
      distance: ex.distance ?? 0,
      distanceUnit: ex.distanceUnit,
      duration: ex.duration ?? 0,
      durationUnit: ex.durationUnit,
      calories: ex.calories ?? 0,
    }));

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
      
      const updatedLog = {
          exercises: newExercises,
          notes: (existingLog.notes ? existingLog.notes + " " : "") + `Updated from screenshot.`
      };

      updateWorkoutMutation.mutate({ id: existingLog.id, data: updatedLog }, {
        onSuccess: () => {
            toast({
                title: "Workout Updated!",
                description: `${addedCount} new exercise(s) added to your log for ${format(targetDate, 'MMMM d, yyyy')}.`,
                variant: "default",
            });
        }
      });

    } else {
      const newLog: Omit<WorkoutLog, 'id'> = {
        date: targetDate,
        exercises: parsedExercises,
        notes: `Parsed from screenshot.`,
      };
      addWorkoutMutation.mutate(newLog, {
          onSuccess: () => {
            toast({
                title: "Screenshot Parsed!",
                description: `${parsedExercises.length} exercises added to a new log for ${format(targetDate, 'MMMM d, yyyy')}.`,
                variant: "default",
            });
          }
      });
    }
  };

  const handleDeleteLog = (logId: string) => {
    deleteWorkoutMutation.mutate(logId);
  }

  const handleEditLog = (logId: string) => {
    const logToEdit = workoutLogs?.find(log => log.id === logId);
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

  const logBeingEdited = editingLogId ? workoutLogs?.find(log => log.id === editingLogId) : undefined;

  return (
    <div className="container mx-auto px-4 py-8">
      <header className="mb-8">
        <h1 className="font-headline text-3xl font-bold text-primary">Workout History</h1>
        <p className="text-muted-foreground">Log your sessions and review your past performance.</p>
      </header>

      <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full">
        <TabsList className="grid w-full grid-cols-2 md:grid-cols-3 mb-6">
          <TabsTrigger value="log"><Edit className="mr-2 h-4 w-4 inline-block"/>Manual Log</TabsTrigger>
          <TabsTrigger value="screenshot"><ImageUp className="mr-2 h-4 w-4 inline-block"/>Parse Screenshot</TabsTrigger>
          <TabsTrigger value="upload" className="hidden md:inline-flex"><FileUp className="mr-2 h-4 w-4 inline-block"/>Upload File</TabsTrigger>
        </TabsList>

        <TabsContent value="log">
          <Card ref={manualLogCardRef} className="shadow-lg">
            <CardHeader>
              <CardTitle className="font-headline">{editingLogId ? "Edit Workout Log" : "Log New Workout"}</CardTitle>
              <CardDescription>{editingLogId ? "Update the details of your workout session." : "Manually enter the details of your workout session."}</CardDescription>
            </CardHeader>
            <CardContent>
              <WorkoutLogForm
                key={editingLogId || 'new'}
                onSubmitLog={handleManualLogSubmit}
                initialData={logBeingEdited}
                editingLogId={editingLogId}
                onCancelEdit={handleCancelEdit}
                isSubmitting={addWorkoutMutation.isPending || updateWorkoutMutation.isPending}
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="screenshot">
          <Card className="shadow-lg">
            <CardHeader>
              <CardTitle className="font-headline">Parse Workout from Screenshot</CardTitle>
              <CardDescription>Upload an image of your workout log and let our AI extract the data.</CardDescription>
            </CardHeader>
            <CardContent>
              <ScreenshotParserForm onParse={parseWorkoutScreenshotAction} onParsedData={handleParsedData} />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="upload">
          <Card className="shadow-lg">
            <CardHeader>
              <CardTitle className="font-headline">Upload Workout File (XLS/CSV)</CardTitle>
              <CardDescription>Import your workout data from a spreadsheet file.</CardDescription>
            </CardHeader>
            <CardContent className="text-center">
              <FileUp className="mx-auto h-12 w-12 text-muted-foreground" />
              <p className="mt-4 text-muted-foreground">
                This feature is coming soon! You'll be able to upload XLS or CSV files.
              </p>
              <Button variant="outline" className="mt-4" disabled>Choose File</Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <section className="mt-12">
        <h2 className="mb-6 font-headline text-2xl font-semibold">Logged Workouts</h2>
        {isLoadingWorkouts ? (
            <Card className="shadow-sm">
                <CardContent className="pt-6 flex justify-center items-center h-40">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </CardContent>
            </Card>
        ) : (
          <WorkoutList workoutLogs={workoutLogs || []} onDelete={handleDeleteLog} onEdit={handleEditLog} />
        )}
      </section>
    </div>
  );
}
