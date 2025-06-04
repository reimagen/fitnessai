
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
      { id: "ex1", name: "Bench Press", sets: 3, reps: 8, weight: 80, weightUnit: "kg", category: "Upper Body", calories: 150 },
      { id: "ex2", name: "Squats", sets: 4, reps: 10, weight: 100, weightUnit: "kg", category: "Lower Body", calories: 200 },
    ],
    notes: "Felt strong today!",
  },
  {
    id: "2",
    date: new Date("2024-07-18"),
    exercises: [
      { id: "ex3", name: "Deadlift", sets: 1, reps: 5, weight: 120, weightUnit: "kg", category: "Full Body" },
      { id: "ex4", name: "Overhead Press", sets: 3, reps: 8, weight: 50, weightUnit: "kg", category: "Upper Body" },
      { id: "ex5", name: "Running", sets: 1, reps: 1, weight: 0, category: "Cardio", distance: 5, distanceUnit: "km", duration: 30, durationUnit: "min", calories: 300 },
    ],
  },
];

const LOCAL_STORAGE_KEY_WORKOUTS = "fitnessAppWorkoutLogs";

export default function HistoryPage() {
  const { toast } = useToast();
  const searchParams = useSearchParams();
  const initialTab = searchParams.get('tab');
  const validTabs = ['log', 'screenshot', 'upload'];
  const defaultTabValue = initialTab && validTabs.includes(initialTab) ? initialTab : 'log';

  const [workoutLogs, setWorkoutLogs] = useState<WorkoutLog[]>([]);
  const [isClient, setIsClient] = useState(false);

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
            date: new Date(log.date), // Ensure date is a Date object
            exercises: log.exercises.map((ex: Exercise) => ({
              ...ex,
              weightUnit: ex.weightUnit || 'kg',
              category: ex.category,
              distance: ex.distance,
              distanceUnit: ex.distanceUnit,
              duration: ex.duration,
              durationUnit: ex.durationUnit,
              calories: ex.calories,
            }))
          }));
          setWorkoutLogs(parsedLogs.sort((a,b) => b.date.getTime() - a.date.getTime()));
        } catch (error) {
          console.error("Error parsing workout logs from localStorage. Data might be corrupted. Initializing with empty logs.", error);
          setWorkoutLogs([]); 
        }
      } else {
        // Only use initialSampleLogs if localStorage is truly empty
        setWorkoutLogs(initialSampleLogs.sort((a,b) => b.date.getTime() - a.date.getTime()));
      }
    }
  }, [isClient]);

  useEffect(() => {
    if (isClient) {
      localStorage.setItem(LOCAL_STORAGE_KEY_WORKOUTS, JSON.stringify(workoutLogs));
    }
  }, [workoutLogs, isClient]);

  const handleManualLogSubmit = (data: Omit<WorkoutLog, 'id'>) => {
    const newLog: WorkoutLog = {
      ...data,
      id: Date.now().toString(),
      exercises: data.exercises.map(ex => ({
        ...ex,
        id: Math.random().toString(36).substring(2,9),
        weightUnit: ex.weightUnit || 'kg'
      }))
    };
    setWorkoutLogs(prevLogs => [newLog, ...prevLogs].sort((a,b) => b.date.getTime() - a.date.getTime()));
    toast({
      title: "Workout Logged!",
      description: `Your workout on ${data.date.toLocaleDateString()} has been saved.`,
      variant: "default",
    });
  };

  const handleParsedData = (parsedData: ParseWorkoutScreenshotOutput) => {
    let logDate = new Date(); // Default to current date
    let notes = "Parsed from screenshot.";

    if (parsedData.workoutDate) {
      const dateParts = parsedData.workoutDate.split('-').map(Number);
      if (dateParts.length === 3) {
        // Create date in local timezone to avoid UTC issues
        logDate = new Date(dateParts[0], dateParts[1] - 1, dateParts[2]);
      } else {
        notes += " Could not parse date from screenshot, used current date.";
      }
    } else {
      notes += " Date not found in screenshot, used current date.";
    }

    const newLog: WorkoutLog = {
      id: Date.now().toString(),
      date: logDate,
      exercises: parsedData.exercises.map(ex => ({
        ...ex,
        id: Math.random().toString(36).substring(2,9),
        weightUnit: ex.weightUnit || 'kg',
      })),
      notes: notes,
    };
    setWorkoutLogs(prevLogs => [newLog, ...prevLogs].sort((a,b) => b.date.getTime() - a.date.getTime()));
     toast({
      title: "Screenshot Parsed!",
      description: `${parsedData.exercises.length} exercises added to your log for ${logDate.toLocaleDateString()}.`,
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
    toast({
      title: "Edit Log (Not Implemented)",
      description: `Feature to edit log ID ${logId} is coming soon.`,
    })
  }


  return (
    <div className="container mx-auto px-4 py-8">
      <header className="mb-8">
        <h1 className="font-headline text-3xl font-bold text-primary">Workout History</h1>
        <p className="text-muted-foreground">Log your sessions and review your past performance.</p>
      </header>

      <Tabs defaultValue={defaultTabValue} className="w-full">
        <TabsList className="grid w-full grid-cols-2 md:grid-cols-3 mb-6">
          <TabsTrigger value="log"><Edit className="mr-2 h-4 w-4 inline-block"/>Manual Log</TabsTrigger>
          <TabsTrigger value="screenshot"><ImageUp className="mr-2 h-4 w-4 inline-block"/>Parse Screenshot</TabsTrigger>
          <TabsTrigger value="upload" className="hidden md:inline-flex"><FileUp className="mr-2 h-4 w-4 inline-block"/>Upload File</TabsTrigger>
        </TabsList>

        <TabsContent value="log">
          <Card className="shadow-lg">
            <CardHeader>
              <CardTitle className="font-headline">Log New Workout</CardTitle>
              <CardDescription>Manually enter the details of your workout session.</CardDescription>
            </CardHeader>
            <CardContent>
              <WorkoutLogForm onSubmitLog={handleManualLogSubmit} />
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

