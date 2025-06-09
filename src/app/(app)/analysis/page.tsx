
"use client";

import { Bar, BarChart, CartesianGrid, ResponsiveContainer, XAxis, YAxis, Tooltip, Legend, PieChart, Pie, Cell } from 'recharts';
import { ChartConfig, ChartContainer, ChartTooltipContent, ChartLegendContent } from '@/components/ui/chart';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import React, { useState, useEffect } from 'react';
import type { WorkoutLog, Exercise } from '@/lib/types';
import { generateWorkoutSummaries } from '@/lib/workout-summary';
import { format, parseISO, startOfWeek, endOfWeek, startOfMonth, endOfMonth, isWithinInterval, getYear, startOfYear, endOfYear } from 'date-fns';
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
  exercises: {
    label: "Exercises",
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
  exercises: number;
  duration: number;
}

interface CategoryRepDataPoint {
  name: string;
  value: number;
  fill: string;
}

interface PeriodSummaryStats {
  workoutDays: number;
  totalWeightLiftedLbs: number;
  totalDistanceMi: number;
  totalCardioDurationMin: number;
  totalCaloriesBurned: number;
  periodLabel: string;
}

const timeRangeDisplayNames: Record<string, string> = {
  'weekly': 'This Week',
  'monthly': 'This Month',
  'yearly': 'This Year',
  'all-time': 'All Time',
};

export default function AnalysisPage() {
  const [timeRange, setTimeRange] = useState('all-time');
  const [workoutFrequencyData, setWorkoutFrequencyData] = useState<ChartDataPoint[]>([]);
  const [categoryRepData, setCategoryRepData] = useState<CategoryRepDataPoint[]>([]);
  const [currentPeriodSummary, setCurrentPeriodSummary] = useState<PeriodSummaryStats | null>(null);
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  useEffect(() => {
    if (isClient) {
      const savedLogsString = localStorage.getItem(LOCAL_STORAGE_KEY_WORKOUTS);
      let parsedLogs: WorkoutLog[] = [];
      
      if (savedLogsString) {
        try {
          parsedLogs = JSON.parse(savedLogsString).map((log: any) => ({
            ...log,
            date: log.date ? parseISO(log.date) : new Date(), 
            exercises: log.exercises.map((ex: any) => ({
              id: ex.id || Math.random().toString(36).substring(2,9),
              name: ex.name,
              sets: ex.sets ?? 0,
              reps: ex.reps ?? 0,
              weight: ex.weight ?? 0,
              weightUnit: ex.weightUnit || 'kg',
              category: ex.category || 'Other',
              distance: ex.distance ?? 0,
              distanceUnit: ex.distanceUnit || 'km',
              duration: ex.duration ?? 0,
              durationUnit: ex.durationUnit,
              calories: ex.calories ?? 0,
            }))
          }));
        } catch (error) {
          console.error("Error parsing workout logs for analysis:", error);
          parsedLogs = [];
        }
      }
          
          let logsForCurrentPeriod = parsedLogs;
          const today = new Date();
          let periodLabel = timeRangeDisplayNames[timeRange] || (timeRange.charAt(0).toUpperCase() + timeRange.slice(1));

          if (timeRange === 'weekly') {
            const startOfCurrentWeek = startOfWeek(today, { weekStartsOn: 0 }); 
            const endOfCurrentWeek = endOfWeek(today, { weekStartsOn: 0 });
            logsForCurrentPeriod = parsedLogs.filter(log =>
              isWithinInterval(log.date, { start: startOfCurrentWeek, end: endOfCurrentWeek })
            );
            periodLabel = `${timeRangeDisplayNames['weekly']}'s`;
          } else if (timeRange === 'monthly') {
            const startOfCurrentMonth = startOfMonth(today);
            const endOfCurrentMonth = endOfMonth(today);
            logsForCurrentPeriod = parsedLogs.filter(log =>
              isWithinInterval(log.date, { start: startOfCurrentMonth, end: endOfCurrentMonth })
            );
            periodLabel = `${timeRangeDisplayNames['monthly']}'s`;
          } else if (timeRange === 'yearly') {
            const startOfCurrentYear = startOfYear(today);
            const endOfCurrentYear = endOfYear(today);
            logsForCurrentPeriod = parsedLogs.filter(log =>
              isWithinInterval(log.date, { start: startOfCurrentYear, end: endOfCurrentYear })
            );
            periodLabel = `${timeRangeDisplayNames['yearly']}'s`;
          } else { // 'all-time'
             periodLabel = `${timeRangeDisplayNames['all-time']}`;
          }
          

          const frequencySummaries = generateWorkoutSummaries(logsForCurrentPeriod);
          const displayFrequencySummaries = frequencySummaries.sort((a,b) => a.date.getTime() - b.date.getTime());
          
          const newWorkoutFrequencyData = displayFrequencySummaries.map(summary => ({
            dateLabel: format(summary.date, 'MMM d'),
            exercises: summary.totalExercises,
            duration: Math.round(summary.totalDurationMinutes),
          }));
          setWorkoutFrequencyData(newWorkoutFrequencyData);


          const repsByCat: Record<string, number> = {
            'Upper Body': 0, 'Lower Body': 0, 'Cardio': 0, 'Core': 0, 'Other': 0,
          };
          logsForCurrentPeriod.forEach(log => { 
            log.exercises.forEach(ex => {
              const reps = ex.reps || 0;
              if (ex.category === 'Upper Body') repsByCat['Upper Body'] += reps;
              else if (ex.category === 'Lower Body') repsByCat['Lower Body'] += reps;
              else if (ex.category === 'Cardio') repsByCat['Cardio'] += reps; 
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
          

          let currentPeriodWorkoutDays = 0;
          let currentPeriodTotalWeightLiftedLbs = 0;
          let currentPeriodTotalDistanceMi = 0;
          let currentPeriodTotalCardioDurationMin = 0;
          let currentPeriodTotalCaloriesBurned = 0;
          const uniqueWorkoutDatesThisPeriod = new Set<string>();

          logsForCurrentPeriod.forEach(log => {
            uniqueWorkoutDatesThisPeriod.add(format(log.date, 'yyyy-MM-dd'));
            log.exercises.forEach(ex => {
              if (ex.weight && ex.sets && ex.reps && ex.weight > 0 && ex.sets > 0 && ex.reps > 0) {
                  let volume = ex.weight * ex.sets * ex.reps;
                  if (ex.weightUnit === 'kg') {
                      volume *= 2.20462;
                  }
                  currentPeriodTotalWeightLiftedLbs += volume;
              }
              if (ex.category === 'Cardio' && ex.duration && ex.duration > 0) {
                  let durationInMin = 0;
                  switch (ex.durationUnit) {
                      case 'sec': durationInMin = ex.duration / 60; break;
                      case 'hr': durationInMin = ex.duration * 60; break;
                      case 'min': default: durationInMin = ex.duration; break;
                  }
                  currentPeriodTotalCardioDurationMin += durationInMin;
              }
              if (ex.category === 'Cardio' && ex.distance && ex.distanceUnit) {
                let distanceInMiles = 0;
                switch (ex.distanceUnit) {
                  case 'km':
                    distanceInMiles = ex.distance * 0.621371;
                    break;
                  case 'ft':
                    distanceInMiles = ex.distance * 0.000189394;
                    break;
                  case 'mi': default: distanceInMiles = ex.distance; break;
                }
                currentPeriodTotalDistanceMi += distanceInMiles;
              }
              currentPeriodTotalCaloriesBurned += (ex.calories || 0);
            });
          });
          currentPeriodWorkoutDays = uniqueWorkoutDatesThisPeriod.size;
          setCurrentPeriodSummary({
            workoutDays: currentPeriodWorkoutDays,
            totalWeightLiftedLbs: Math.round(currentPeriodTotalWeightLiftedLbs),
            totalDistanceMi: Math.round(currentPeriodTotalDistanceMi),
            totalCardioDurationMin: Math.round(currentPeriodTotalCardioDurationMin),
            totalCaloriesBurned: Math.round(currentPeriodTotalCaloriesBurned),
            periodLabel: periodLabel,
          });
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

  const formatCardioDuration = (totalMinutes: number): string => {
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;
    return `${hours}h ${minutes}m`;
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
            <SelectItem value="weekly">This Week</SelectItem>
            <SelectItem value="monthly">This Month</SelectItem>
            <SelectItem value="yearly">This Year</SelectItem>
            <SelectItem value="all-time">All Time</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {isClient && currentPeriodSummary && (
        <Card className="shadow-lg mb-6 bg-white">
          <CardHeader>
            <CardTitle className="font-headline flex items-center gap-2 text-xl">
              <TrendingUp className="h-6 w-6 text-primary" />
              {currentPeriodSummary.periodLabel} Summary
            </CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-2 gap-y-6 gap-x-3 md:grid-cols-5 text-center py-6">
            <div>
              <p className="text-3xl font-bold text-accent">{currentPeriodSummary.workoutDays.toLocaleString()}</p>
              <p className="text-sm text-muted-foreground mt-1">Workout Days</p>
            </div>
            <div>
              <p className="text-3xl font-bold text-accent">{currentPeriodSummary.totalWeightLiftedLbs.toLocaleString()}</p>
              <p className="text-sm text-muted-foreground mt-1">Weight Lifted (lbs)</p>
            </div>
            <div>
              <p className="text-3xl font-bold text-accent">{currentPeriodSummary.totalDistanceMi.toLocaleString()}</p>
              <p className="text-sm text-muted-foreground mt-1">Distance (mi)</p>
            </div>
            <div>
              <p className="text-3xl font-bold text-accent">
                {formatCardioDuration(currentPeriodSummary.totalCardioDurationMin)}
              </p>
              <p className="text-sm text-muted-foreground mt-1">Cardio Duration</p>
            </div>
            <div>
              <p className="text-3xl font-bold text-accent">{currentPeriodSummary.totalCaloriesBurned.toLocaleString()}</p>
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
              {isClient && workoutFrequencyData.length > 0
                ? `Based on ${timeRangeDisplayNames[timeRange] || (timeRange.charAt(0).toUpperCase() + timeRange.slice(1))} data`
                : (isClient ? `No workout data for ${timeRangeDisplayNames[timeRange] || timeRange}.` : "Log some workouts to see your data")}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isClient && workoutFrequencyData.length > 0 ? (
              <ChartContainer config={chartConfig} className="h-[300px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={workoutFrequencyData} margin={{ top: 20, right: 20, left: -10, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false}/>
                    <XAxis dataKey="dateLabel" />
                    <YAxis yAxisId="left" dataKey="exercises" stroke="hsl(var(--primary))" allowDecimals={false} /> 
                    <YAxis yAxisId="right" dataKey="duration" orientation="right" stroke="hsl(var(--accent))" allowDecimals={false} />
                    <Tooltip content={<ChartTooltipContent />} />
                    <Legend />
                    <Bar yAxisId="left" dataKey="exercises" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} /> 
                    <Bar yAxisId="right" dataKey="duration" fill="hsl(var(--accent))" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </ChartContainer>
            ) : (
              <div className="h-[300px] flex items-center justify-center text-muted-foreground">
                <p>{isClient ? `No workout data available for ${timeRangeDisplayNames[timeRange] || timeRange}.` : "Loading chart data..."}</p>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle className="font-headline">Reps by Category</CardTitle>
            <CardDescription>
              {isClient && categoryRepData.length > 0
                ? `Repetitions distribution for ${timeRangeDisplayNames[timeRange] || (timeRange.charAt(0).toUpperCase() + timeRange.slice(1))}`
                : (isClient ? `No repetition data for ${timeRangeDisplayNames[timeRange] || timeRange}.` : "Log some workouts to see your data")}
            </CardDescription>
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
                <p>{isClient ? `No repetition data available for ${timeRangeDisplayNames[timeRange] || timeRange}.` : "Loading chart data..."}</p>
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

