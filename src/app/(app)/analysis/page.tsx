
"use client";

import { Bar, BarChart, CartesianGrid, ResponsiveContainer, XAxis, YAxis, Tooltip, Legend, PieChart, Pie, Cell } from 'recharts';
import { ChartConfig, ChartContainer, ChartTooltipContent, ChartLegendContent } from '@/components/ui/chart';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import React, { useState, useEffect } from 'react';
import type { WorkoutLog, Exercise } from '@/lib/types';
import { generateWorkoutSummaries } from '@/lib/workout-summary';
import { format } from 'date-fns';
import { TrendingUp } from 'lucide-react'; // Added TrendingUp icon

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
  },
  'Upper Body': { label: "Upper Body", color: "hsl(var(--chart-1))" },
  'Lower Body': { label: "Lower Body", color: "hsl(var(--chart-2))" },
  'Cardio': { label: "Cardio", color: "hsl(var(--chart-3))" },
  'Core': { label: "Core", color: "hsl(var(--chart-4))" },
  'Other': { label: "Other", color: "hsl(var(--chart-5))" }, // Updated color for 'Other'
} satisfies ChartConfig;

interface ChartDataPoint {
  dateLabel: string;
  workouts: number;
  duration: number;
}

interface CategoryRepDataPoint {
  name: string;
  value: number;
  fill: string;
}

interface YearToDateSummaryStats {
  workoutDays: number;
  totalWeightLiftedLbs: number;
  totalCardioDurationMin: number;
  totalCaloriesBurned: number;
  currentYear: number;
}

export default function AnalysisPage() {
  const [timeRange, setTimeRange] = useState('all-time');
  const [workoutFrequencyData, setWorkoutFrequencyData] = useState<ChartDataPoint[]>([]);
  const [categoryRepData, setCategoryRepData] = useState<CategoryRepDataPoint[]>([]);
  const [yearToDateSummary, setYearToDateSummary] = useState<YearToDateSummaryStats | null>(null);
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  useEffect(() => {
    if (isClient) {
      const savedLogsString = localStorage.getItem(LOCAL_STORAGE_KEY_WORKOUTS);
      let parsedLogs: WorkoutLog[] = [];
      let frequencyChartData: ChartDataPoint[] = [];
      let repPieChartData: CategoryRepDataPoint[] = [];

      const currentYear = new Date().getFullYear();
      let ytdWorkoutDays = 0;
      let ytdTotalWeightLiftedLbs = 0;
      let ytdTotalCardioDurationMin = 0;
      let ytdTotalCaloriesBurned = 0;
      const uniqueWorkoutDatesThisYear = new Set<string>();

      if (savedLogsString) {
        try {
          parsedLogs = JSON.parse(savedLogsString).map((log: any) => ({
            ...log,
            date: new Date(log.date),
            exercises: log.exercises.map((ex: any) => ({ 
              id: ex.id || Math.random().toString(36).substring(2,9),
              name: ex.name,
              sets: ex.sets ?? 0,
              reps: ex.reps ?? 0,
              weight: ex.weight ?? 0,
              weightUnit: ex.weightUnit || 'kg',
              category: ex.category || 'Other',
              distance: ex.distance ?? 0,
              distanceUnit: ex.distanceUnit,
              duration: ex.duration ?? 0,
              durationUnit: ex.durationUnit,
              calories: ex.calories ?? 0,
            }))
          }));
          
          const summaries = generateWorkoutSummaries(parsedLogs);
          const displaySummaries = summaries.sort((a,b) => a.date.getTime() - b.date.getTime());
          
          frequencyChartData = displaySummaries.map(summary => ({
            dateLabel: format(summary.date, 'MMM d'),
            workouts: summary.totalExercises,
            duration: Math.round(summary.totalDurationMinutes),
          }));

          const repsByCat: Record<string, number> = {
            'Upper Body': 0, 'Lower Body': 0, 'Cardio': 0, 'Core': 0, 'Other': 0,
          };

          parsedLogs.forEach(log => {
            const logDate = new Date(log.date);
            if (logDate.getFullYear() === currentYear) {
              uniqueWorkoutDatesThisYear.add(format(logDate, 'yyyy-MM-dd'));

              log.exercises.forEach(ex => {
                // YTD Weight Lifted
                if (ex.weight && ex.sets && ex.reps && ex.weight > 0 && ex.sets > 0 && ex.reps > 0) {
                    let volume = ex.weight * ex.sets * ex.reps;
                    if (ex.weightUnit === 'kg') {
                        volume *= 2.20462; // Convert kg to lbs
                    }
                    ytdTotalWeightLiftedLbs += volume;
                }

                // YTD Cardio Duration
                if (ex.category === 'Cardio' && ex.duration && ex.duration > 0) {
                    let durationInMin = 0;
                    switch (ex.durationUnit) {
                        case 'sec': durationInMin = ex.duration / 60; break;
                        case 'hr': durationInMin = ex.duration * 60; break;
                        case 'min': default: durationInMin = ex.duration; break;
                    }
                    ytdTotalCardioDurationMin += durationInMin;
                }
                // YTD Calories Burned
                ytdTotalCaloriesBurned += (ex.calories || 0);
              });
            }

            // Reps by category (all time for pie chart)
            log.exercises.forEach(ex => {
              const reps = ex.reps || 0;
              if (ex.category === 'Upper Body') repsByCat['Upper Body'] += reps;
              else if (ex.category === 'Lower Body') repsByCat['Lower Body'] += reps;
              else if (ex.category === 'Cardio') repsByCat['Cardio'] += reps;
              else if (ex.category === 'Core') repsByCat['Core'] += reps;
              else repsByCat['Other'] += reps; // Includes "Full Body" and uncategorized
            });
          });
          
          ytdWorkoutDays = uniqueWorkoutDatesThisYear.size;
          setYearToDateSummary({
            workoutDays: ytdWorkoutDays,
            totalWeightLiftedLbs: Math.round(ytdTotalWeightLiftedLbs),
            totalCardioDurationMin: Math.round(ytdTotalCardioDurationMin),
            totalCaloriesBurned: Math.round(ytdTotalCaloriesBurned),
            currentYear,
          });
          
          const pieChartColors: Record<string, string> = {
            'Upper Body': chartConfig['Upper Body'].color!,
            'Lower Body': chartConfig['Lower Body'].color!,
            'Cardio': chartConfig['Cardio'].color!,
            'Core': chartConfig['Core'].color!,
            'Other': chartConfig['Other'].color!,
          };

          repPieChartData = Object.entries(repsByCat)
            .filter(([, value]) => value > 0)
            .map(([name, value]) => ({ name, value, fill: pieChartColors[name] || 'hsl(var(--muted))' })); // Fallback to muted for any unexpected category

        } catch (error) {
          console.error("Error processing workout logs for analysis:", error);
           setYearToDateSummary({ workoutDays: 0, totalWeightLiftedLbs: 0, totalCardioDurationMin: 0, totalCaloriesBurned: 0, currentYear });
        }
      } else {
        // No logs, set YTD to zeros
        setYearToDateSummary({ workoutDays: 0, totalWeightLiftedLbs: 0, totalCardioDurationMin: 0, totalCaloriesBurned: 0, currentYear });
      }
      setWorkoutFrequencyData(frequencyChartData);
      setCategoryRepData(repPieChartData);
    }
  }, [isClient, timeRange]); // timeRange might not be needed for YTD, but keep for chart consistency

  const RADIAN = Math.PI / 180;
  const renderCustomizedLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percent, name, value }: any) => {
    if (percent < 0.05 && categoryRepData.length > 3) return null; // Hide small labels if too many slices
    const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
    const x = cx + (radius + (categoryRepData.length > 4 ? 15 : 10)) * Math.cos(-midAngle * RADIAN); // Adjust label distance based on slice count
    const y = cy + (radius + (categoryRepData.length > 4 ? 15 : 10)) * Math.sin(-midAngle * RADIAN);

    return (
      <text x={x} y={y} fill="hsl(var(--foreground))" textAnchor={x > cx ? 'start' : 'end'} dominantBaseline="central" className="text-xs">
        {`${name} (${value})`}
      </text>
    );
  };

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

      {isClient && yearToDateSummary && (
        <Card className="shadow-lg mb-6 bg-secondary/30">
          <CardHeader>
            <CardTitle className="font-headline flex items-center gap-2 text-xl">
              <TrendingUp className="h-6 w-6 text-primary" />
              Year to Date ({yearToDateSummary.currentYear}) Summary
            </CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-2 gap-y-6 gap-x-4 md:grid-cols-4 text-center py-6">
            <div>
              <p className="text-3xl font-bold text-accent">{yearToDateSummary.workoutDays.toLocaleString()}</p>
              <p className="text-sm text-muted-foreground mt-1">Workout Days</p>
            </div>
            <div>
              <p className="text-3xl font-bold text-accent">{yearToDateSummary.totalWeightLiftedLbs.toLocaleString()}</p>
              <p className="text-sm text-muted-foreground mt-1">Weight Lifted (lbs)</p>
            </div>
            <div>
              <p className="text-3xl font-bold text-accent">{yearToDateSummary.totalCardioDurationMin.toLocaleString()}</p>
              <p className="text-sm text-muted-foreground mt-1">Cardio Duration (min)</p>
            </div>
            <div>
              <p className="text-3xl font-bold text-accent">{yearToDateSummary.totalCaloriesBurned.toLocaleString()}</p>
              <p className="text-sm text-muted-foreground mt-1">Calories Burned</p>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle className="font-headline">Workout Frequency & Duration</CardTitle>
            <CardDescription>
              {workoutFrequencyData.length > 0 ? `Based on ${timeRange} data` : "Log some workouts to see your data"}
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
            <CardTitle className="font-headline">Reps by Category</CardTitle>
            <CardDescription>Total repetitions distribution (all time)</CardDescription>
          </CardHeader>
          <CardContent>
            {isClient && categoryRepData.length > 0 ? (
              <ChartContainer config={chartConfig} className="h-[300px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
                    <Pie data={categoryRepData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} labelLine={false} label={renderCustomizedLabel}>
                      {categoryRepData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.fill} stroke={entry.fill} />
                      ))}
                    </Pie>
                    <Tooltip content={<ChartTooltipContent hideIndicator />} />
                    <Legend content={<ChartLegendContent nameKey="name"/>} wrapperStyle={{paddingTop: "20px"}}/>
                  </PieChart>
                </ResponsiveContainer>
              </ChartContainer>
            ) : (
              <div className="h-[300px] flex items-center justify-center text-muted-foreground">
                <p>{isClient ? "No repetition data available." : "Loading chart data..."}</p>
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

