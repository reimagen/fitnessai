
"use client";

import { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { ScreenshotParserForm } from "@/components/history/screenshot-parser-form";
import { WorkoutLogForm } from "@/components/history/workout-log-form";
import { WorkoutList } from "@/components/history/workout-list";
import { parseWorkoutScreenshotAction } from "./actions";
import type { WorkoutLog, Exercise } from "@/lib/types";
import type { ParseWorkoutScreenshotOutput } from "@/ai/flows/screenshot-workout-parser";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { FileUp, Edit, ImageUp } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const initialSampleLogs: WorkoutLog[] = [
  {
    id: "1",
    date: new Date("2024-07-20"),
    exercises: [
      { id: "ex1", name: "Bench Press", sets: 3, reps: 8, weight: 80, weightUnit: "kg", category: "Upper Body", calories: 150, distance: 0, duration: 0 },
      { id: "ex2", name: "Squats", sets: 4, reps: 10, weight: 100, weightUnit: "kg", category: "Lower Body", calories: 200, distance: 0, duration: 0 },
    ],
    notes: "Felt strong today!",
  },
  {
    id: "2",
    date: new Date("2024-07-18"),
    exercises: [
      { id: "ex3", name: "Deadlift", sets: 1, reps: 5, weight: 120, weightUnit: "kg", category: "Full Body", distance: 0, duration: 0, calories: 0 },
      { id: "ex4", name: "Overhead Press", sets: 3, reps: 8, weight: 50, weightUnit: "kg", category: "Upper Body", distance: 0, duration: 0, calories: 0 },
      { id: "ex5", name: "Running", sets: 1, reps: 1, weight: 0, category: "Cardio", distance: 5, distanceUnit: "km", duration: 30, durationUnit: "min", calories: 300 },
    ],
  },
];

const LOCAL_STORAGE_KEY_WORKOUTS = "fitnessAppWorkoutLogs";

export default function HistoryPage() {
  const { toast } = useToast();
  const searchParams = useSearchParams();
  const initialTabQueryParam = searchParams.get('tab');
  const validTabs = ['log', 'screenshot', 'upload'];
  const defaultTabValue = initialTabQueryParam && validTabs.includes(initialTabQueryParam) ? initialTabQueryParam : 'log';

  const [workoutLogs, setWorkoutLogs] = useState<WorkoutLog[]>([]);
  const [isClient, setIsClient] = useState(false);
  const [editingLogId, setEditingLogId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<string>(defaultTabValue);

  useEffect(() => {
    setIsClient(true);
  }, []);

  useEffect(() => {
    if (isClient) {
      const savedLogsString = localStorage.getItem(LOCAL_STORAGE_KEY_WORKOUTS);
      if (savedLogsString) {
        try {
          const parsedLogs: WorkoutLog[] = JSON.parse(savedLogsString).map((log: any) => ({
            ...log,
            date: new Date(log.date),
            exercises: log.exercises.map((ex: any) => ({ 
              id: ex.id || Math.random().toString(36).substring(2,9),
              name: ex.name,
              sets: ex.sets ?? 0,
              reps: ex.reps ?? 0,
              weight: ex.weight ?? 0,
              weightUnit: ex.weightUnit || 'kg',
              category: ex.category || '',
              distance: ex.distance ?? 0,
              distanceUnit: ex.distanceUnit,
              duration: ex.duration ?? 0,
              durationUnit: ex.durationUnit,
              calories: ex.calories ?? 0,
            }))
          }));
          setWorkoutLogs(parsedLogs.sort((a,b) => b.date.getTime() - a.date.getTime()));
        } catch (error) {
          console.error("Error parsing workout logs from localStorage. Initializing with empty logs.", error);
          setWorkoutLogs([]); // Safer fallback
        }
      } else {
         const logsWithDefaults = initialSampleLogs.map(log => ({
            ...log,
            exercises: log.exercises.map(ex => ({
                ...ex,
                category: ex.category || '',
                distance: ex.distance ?? 0,
                duration: ex.duration ?? 0,
                calories: ex.calories ?? 0,
            }))
         }));
        setWorkoutLogs(logsWithDefaults.sort((a,b) => b.date.getTime() - a.date.getTime()));
      }
    }
  }, [isClient]);

  useEffect(() => {
    if (isClient) {
      localStorage.setItem(LOCAL_STORAGE_KEY_WORKOUTS, JSON.stringify(workoutLogs));
    }
  }, [workoutLogs, isClient]);

  const handleManualLogSubmit = (data: Omit<WorkoutLog, 'id'> & { exercises: Array<Omit<Exercise, 'id'> & {id?: string}>}) => {
    const processedExercises = data.exercises.map(ex => ({
        id: ex.id || Math.random().toString(36).substring(2,9),
        name: ex.name,
        category: ex.category || "", 
        sets: ex.sets ?? 0,
        reps: ex.reps ?? 0,
        weight: ex.weight ?? 0,
        weightUnit: ex.weightUnit || 'kg',
        distance: ex.distance ?? 0,
        distanceUnit: ex.distanceUnit,
        duration: ex.duration ?? 0,
        durationUnit: ex.durationUnit,
        calories: ex.calories ?? 0,
    }));

    if (editingLogId) {
      const updatedLogs = workoutLogs.map(log => {
        if (log.id === editingLogId) {
          return {
            ...log,
            ...data, 
            exercises: processedExercises
          };
        }
        return log;
      });
      setWorkoutLogs(updatedLogs.sort((a,b) => b.date.getTime() - a.date.getTime()));
      toast({
        title: "Workout Updated!",
        description: `Your workout on ${data.date.toLocaleDateString()} has been updated.`,
        variant: "default",
      });
      setEditingLogId(null);
    } else {
      const newLog: WorkoutLog = {
        id: Date.now().toString(),
        date: data.date,
        notes: data.notes,
        exercises: processedExercises
      };
      setWorkoutLogs(prevLogs => [newLog, ...prevLogs].sort((a,b) => b.date.getTime() - a.date.getTime()));
      toast({
        title: "Workout Logged!",
        description: `Your workout on ${data.date.toLocaleDateString()} has been saved.`,
        variant: "default",
      });
    }
  };

  const handleParsedData = (parsedData: ParseWorkoutScreenshotOutput) => {
    let logDate = new Date(); // This will be today's date
    logDate.setHours(0,0,0,0); // Normalize to start of day
    let notes = "Parsed from screenshot.";
    const currentYear = new Date().getFullYear();
    let toastDescription = `${parsedData.exercises.length} exercises added.`;

    if (parsedData.workoutDate) {
      const dateParts = parsedData.workoutDate.split('-').map(Number);
      if (dateParts.length === 3) {
        const aiYear = dateParts[0];
        const aiMonth = dateParts[1]; // 1-indexed month from AI
        const aiDay = dateParts[2];
        
        logDate = new Date(currentYear, aiMonth - 1, aiDay, 0,0,0,0); // Use current year, AI's month & day
        
        if (aiYear !== currentYear) {
            notes += ` Original year ${aiYear} from screenshot was updated to current year ${currentYear}.`;
        }
      } else {
        notes += " Could not fully parse date from screenshot; used current date (year overridden).";
      }
      toastDescription = `${parsedData.exercises.length} exercises added to your log for ${logDate.toLocaleDateString()}.`;
    } else {
      notes += " Date not found in screenshot; used current date.";
      toastDescription = `${parsedData.exercises.length} exercises added to a new log for today. You can edit this log to change its date and manually merge exercises with an existing day's workout.`;
    }


    const newLog: WorkoutLog = {
      id: Date.now().toString(),
      date: logDate,
      exercises: parsedData.exercises.map(ex => ({
        id: Math.random().toString(36).substring(2,9),
        name: ex.name,
        sets: ex.sets ?? 0,
        reps: ex.reps ?? 0,
        weight: ex.weight ?? 0,
        weightUnit: ex.weightUnit || 'kg',
        category: ex.category || "",
        distance: ex.distance ?? 0,
        distanceUnit: ex.distanceUnit,
        duration: ex.duration ?? 0,
        durationUnit: ex.durationUnit,
        calories: ex.calories ?? 0,
      })),
      notes: notes,
    };
    setWorkoutLogs(prevLogs => [newLog, ...prevLogs].sort((a,b) => b.date.getTime() - a.date.getTime()));
     toast({
      title: "Screenshot Parsed!",
      description: toastDescription,
      variant: "default",
    });
  };

  const handleDeleteLog = (logId: string) => {
    setWorkoutLogs(prevLogs => prevLogs.filter(log => log.id !== logId));
    toast({
      title: "Log Deleted",
      description: "The workout log has been removed.",
      variant: "destructive"
    })
  }

  const handleEditLog = (logId: string) => {
    const logToEdit = workoutLogs.find(log => log.id === logId);
    if (logToEdit) {
      setEditingLogId(logId);
      setActiveTab('log');
    } else {
      toast({
        title: "Error",
        description: "Could not find log to edit.",
        variant: "destructive"
      })
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

  const logBeingEdited = editingLogId ? workoutLogs.find(log => log.id === editingLogId) : undefined;

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
          <Card className="shadow-lg">
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
        {isClient ? (
          <WorkoutList workoutLogs={workoutLogs} onDelete={handleDeleteLog} onEdit={handleEditLog} />
        ) : (
          <Card className="shadow-sm">
            <CardContent className="pt-6">
              <p className="text-center text-muted-foreground">Loading workout history...</p>
            </CardContent>
          </Card>
        )}
      </section>
    </div>
  );
}
