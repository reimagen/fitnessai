
"use client";

import { Bar, BarChart, CartesianGrid, ResponsiveContainer, XAxis, YAxis, Tooltip, Legend } from 'recharts';
import { ChartConfig, ChartContainer, ChartTooltipContent } from '@/components/ui/chart';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import React, { useState, useEffect } from 'react';
import type { WorkoutLog, AggregatedWorkoutDaySummary, Exercise } from '@/lib/types';
import { generateWorkoutSummaries } from '@/lib/workout-summary';
import { format } from 'date-fns';

const LOCAL_STORAGE_KEY_WORKOUTS = "fitnessAppWorkoutLogs";

// Static data for weight progress - this will be updated later
const weightProgressData = [
  { month: 'Jan', weight: 80 },
  { month: 'Feb', weight: 79 },
  { month: 'Mar', weight: 78.5 },
  { month: 'Apr', weight: 77 },
  { month: 'May', weight: 76 },
  { month: 'Jun', weight: 75.5 },
];

const chartConfig = {
  workouts: {
    label: "Workouts",
    color: "hsl(var(--primary))",
  },
  duration: {
    label: "Duration (min)",
    color: "hsl(var(--accent))",
  },
  weight: {
    label: "Weight (kg)",
    color: "hsl(var(--primary))",
  }
} satisfies ChartConfig;

interface ChartDataPoint {
  dateLabel: string;
  workouts: number;
  duration: number;
}

export default function AnalysisPage() {
  const [timeRange, setTimeRange] = useState('all-time'); // Default to all-time for now
  const [workoutFrequencyData, setWorkoutFrequencyData] = useState<ChartDataPoint[]>([]);
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  useEffect(() => {
    if (isClient) {
      const savedLogsString = localStorage.getItem(LOCAL_STORAGE_KEY_WORKOUTS);
      let chartData: ChartDataPoint[] = [];

      if (savedLogsString) {
        try {
          const parsedLogs: WorkoutLog[] = JSON.parse(savedLogsString).map((log: any) => ({
            ...log,
            date: new Date(log.date), // Ensure date is a Date object
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
          
          const summaries = generateWorkoutSummaries(parsedLogs);
          
          // TODO: Implement filtering based on timeRange state
          // For now, use all summaries, and take the most recent 7 for display if > 7
          const displaySummaries = summaries.sort((a,b) => a.date.getTime() - b.date.getTime()); // Sort oldest to newest for chart
          
          chartData = displaySummaries.map(summary => ({
            dateLabel: format(summary.date, 'MMM d'),
            workouts: summary.totalExercises,
            duration: Math.round(summary.totalDurationMinutes), // Round duration to nearest minute
          }));

        } catch (error) {
          console.error("Error processing workout logs for analysis:", error);
          // chartData will remain empty, showing "No data"
        }
      }
      setWorkoutFrequencyData(chartData);
    }
  }, [isClient, timeRange]);

  return (
    <div className="container mx-auto px-4 py-8">
      <header className="mb-8">
        <h1 className="font-headline text-3xl font-bold text-primary">Your Progress</h1>
        <p className="text-muted-foreground">Visualize your fitness journey and stay motivated.</p>
      </header>

      <div className="mb-6">
        <Select value={timeRange} onValueChange={setTimeRange}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Select time range" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="weekly">Weekly</SelectItem>
            <SelectItem value="monthly">Monthly</SelectItem>
            <SelectItem value="all-time">All Time</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle className="font-headline">Workout Frequency & Duration</CardTitle>
            <CardDescription>
              {workoutFrequencyData.length > 0 
                ? `Based on ${timeRange} data` 
                : "Log some workouts to see your data"}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isClient && workoutFrequencyData.length > 0 ? (
              <ChartContainer config={chartConfig} className="h-[300px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={workoutFrequencyData} margin={{ top: 20, right: 20, left: -10, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false}/>
                    <XAxis dataKey="dateLabel" />
                    <YAxis yAxisId="left" orientation="left" stroke="hsl(var(--primary))" allowDecimals={false} />
                    <YAxis yAxisId="right" orientation="right" stroke="hsl(var(--accent))" allowDecimals={false} />
                    <Tooltip content={<ChartTooltipContent />} />
                    <Legend />
                    <Bar yAxisId="left" dataKey="workouts" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                    <Bar yAxisId="right" dataKey="duration" fill="hsl(var(--accent))" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </ChartContainer>
            ) : (
              <div className="h-[300px] flex items-center justify-center text-muted-foreground">
                <p>{isClient ? "No workout data available for this period." : "Loading chart data..."}</p>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle className="font-headline">Weight Progress</CardTitle>
            <CardDescription>Your weight trend over time (Placeholder)</CardDescription>
          </CardHeader>
          <CardContent>
            <ChartContainer config={chartConfig} className="h-[300px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={weightProgressData} margin={{ top: 20, right: 20, left: -10, bottom: 5 }}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} />
                        <XAxis dataKey="month" />
                        <YAxis />
                        <Tooltip content={<ChartTooltipContent indicator="dot" />} />
                        <Legend />
                        <Bar dataKey="weight" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                    </BarChart>
                </ResponsiveContainer>
            </ChartContainer>
          </CardContent>
        </Card>
        
        <Card className="shadow-lg lg:col-span-2">
          <CardHeader>
            <CardTitle className="font-headline">Exercise Performance (Placeholder)</CardTitle>
            <CardDescription>Track improvements in specific exercises</CardDescription>
          </CardHeader>
          <CardContent className="h-[300px] flex items-center justify-center text-muted-foreground">
            <p>Detailed exercise performance charts coming soon!</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
