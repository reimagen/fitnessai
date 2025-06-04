
"use client";

import { Bar, BarChart, CartesianGrid, ResponsiveContainer, XAxis, YAxis, Tooltip, Legend, PieChart, Pie, Cell } from 'recharts';
import { ChartConfig, ChartContainer, ChartTooltipContent, ChartLegendContent } from '@/components/ui/chart';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import React, { useState, useEffect } from 'react';
import type { WorkoutLog, Exercise } from '@/lib/types';
import { generateWorkoutSummaries } from '@/lib/workout-summary';
import { format, parseISO, startOfWeek, endOfWeek, startOfMonth, endOfMonth, isWithinInterval } from 'date-fns';
import { TrendingUp } from 'lucide-react'; 

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
  'Other': { label: "Other", color: "hsl(var(--chart-5))" },
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
            date: log.date ? parseISO(log.date) : new Date(), // Ensure date is parsed
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

          // --- Data for Workout Frequency Chart (filtered by timeRange) ---
          let logsForFrequencyChart = parsedLogs;
          const today = new Date();
          if (timeRange === 'weekly') {
            const startOfCurrentWeek = startOfWeek(today, { weekStartsOn: 0 }); // 0 for Sunday
            const endOfCurrentWeek = endOfWeek(today, { weekStartsOn: 0 });
            logsForFrequencyChart = parsedLogs.filter(log => 
              isWithinInterval(log.date, { start: startOfCurrentWeek, end: endOfCurrentWeek })
            );
          } else if (timeRange === 'monthly') {
            const startOfCurrentMonth = startOfMonth(today);
            const endOfCurrentMonth = endOfMonth(today);
            logsForFrequencyChart = parsedLogs.filter(log =>
              isWithinInterval(log.date, { start: startOfCurrentMonth, end: endOfCurrentMonth })
            );
          }
          // For 'all-time', logsForFrequencyChart remains as parsedLogs

          const frequencySummaries = generateWorkoutSummaries(logsForFrequencyChart);
          const displayFrequencySummaries = frequencySummaries.sort((a,b) => a.date.getTime() - b.date.getTime());
          
          const newWorkoutFrequencyData = displayFrequencySummaries.map(summary => ({
            dateLabel: format(summary.date, 'MMM d'),
            workouts: summary.totalExercises,
            duration: Math.round(summary.totalDurationMinutes),
          }));
          setWorkoutFrequencyData(newWorkoutFrequencyData);


          // --- Data for Category Rep Pie Chart (always all-time) ---
          const repsByCat: Record<string, number> = {
            'Upper Body': 0, 'Lower Body': 0, 'Cardio': 0, 'Core': 0, 'Other': 0,
          };
          parsedLogs.forEach(log => { // Use full parsedLogs for pie chart
            log.exercises.forEach(ex => {
              const reps = ex.reps || 0;
              if (ex.category === 'Upper Body') repsByCat['Upper Body'] += reps;
              else if (ex.category === 'Lower Body') repsByCat['Lower Body'] += reps;
              else if (ex.category === 'Cardio') repsByCat['Cardio'] += reps; // Cardio reps might be 0, but we sum them
              else if (ex.category === 'Core') repsByCat['Core'] += reps;
              else repsByCat['Other'] += reps; 
            });
          });
          const pieChartColors: Record<string, string> = {
            'Upper Body': chartConfig['Upper Body'].color!,
            'Lower Body': chartConfig['Lower Body'].color!,
            'Cardio': chartConfig['Cardio'].color!,
            'Core': chartConfig['Core'].color!,
            'Other': chartConfig['Other'].color!,
          };
          const newCategoryRepData = Object.entries(repsByCat)
            .filter(([, value]) => value > 0)
            .map(([name, value]) => ({ name, value, fill: pieChartColors[name] || 'hsl(var(--muted))' }));
          setCategoryRepData(newCategoryRepData);
          

          // --- Data for Year-to-Date Summary (always current year) ---
          parsedLogs.forEach(log => {
            const logDate = new Date(log.date); // log.date is already a Date object
            if (logDate.getFullYear() === currentYear) {
              uniqueWorkoutDatesThisYear.add(format(logDate, 'yyyy-MM-dd'));

              log.exercises.forEach(ex => {
                if (ex.weight && ex.sets && ex.reps && ex.weight > 0 && ex.sets > 0 && ex.reps > 0) {
                    let volume = ex.weight * ex.sets * ex.reps;
                    if (ex.weightUnit === 'kg') {
                        volume *= 2.20462; 
                    }
                    ytdTotalWeightLiftedLbs += volume;
                }
                if (ex.category === 'Cardio' && ex.duration && ex.duration > 0) {
                    let durationInMin = 0;
                    switch (ex.durationUnit) {
                        case 'sec': durationInMin = ex.duration / 60; break;
                        case 'hr': durationInMin = ex.duration * 60; break;
                        case 'min': default: durationInMin = ex.duration; break;
                    }
                    ytdTotalCardioDurationMin += durationInMin;
                }
                ytdTotalCaloriesBurned += (ex.calories || 0);
              });
            }
          });
          ytdWorkoutDays = uniqueWorkoutDatesThisYear.size;
          setYearToDateSummary({
            workoutDays: ytdWorkoutDays,
            totalWeightLiftedLbs: Math.round(ytdTotalWeightLiftedLbs),
            totalCardioDurationMin: Math.round(ytdTotalCardioDurationMin),
            totalCaloriesBurned: Math.round(ytdTotalCaloriesBurned),
            currentYear,
          });
          
        } catch (error) {
          console.error("Error processing workout logs for analysis:", error);
          setWorkoutFrequencyData([]);
          setCategoryRepData([]);
          setYearToDateSummary({ workoutDays: 0, totalWeightLiftedLbs: 0, totalCardioDurationMin: 0, totalCaloriesBurned: 0, currentYear });
        }
      } else {
        // No logs, set all to empty/zeros
        setWorkoutFrequencyData([]);
        setCategoryRepData([]);
        setYearToDateSummary({ workoutDays: 0, totalWeightLiftedLbs: 0, totalCardioDurationMin: 0, totalCaloriesBurned: 0, currentYear });
      }
    }
  }, [isClient, timeRange]);

  const RADIAN = Math.PI / 180;
  const renderCustomizedLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percent, name, value }: any) => {
    if (percent < 0.05 && categoryRepData.length > 3) return null; 
    const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
    const x = cx + (radius + (categoryRepData.length > 4 ? 15 : 10)) * Math.cos(-midAngle * RADIAN); 
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
              {workoutFrequencyData.length > 0 
                ? `Based on ${timeRange.charAt(0).toUpperCase() + timeRange.slice(1)} data` 
                : (isClient ? `No workout data for this ${timeRange} period.` : "Log some workouts to see your data")}
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
                <p>{isClient ? `No workout data available for this ${timeRange} period.` : "Loading chart data..."}</p>
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

