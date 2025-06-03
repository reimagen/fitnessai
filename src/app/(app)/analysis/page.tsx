"use client";

import { Bar, BarChart, CartesianGrid, ResponsiveContainer, XAxis, YAxis, Tooltip, Legend } from 'recharts';
import { ChartConfig, ChartContainer, ChartTooltipContent } from '@/components/ui/chart';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import React, { useState } from 'react';

const weeklyWorkoutData = [
  { date: 'Mon', workouts: 1, duration: 60 }, // duration in minutes
  { date: 'Tue', workouts: 0, duration: 0 },
  { date: 'Wed', workouts: 1, duration: 75 },
  { date: 'Thu', workouts: 1, duration: 45 },
  { date: 'Fri', workouts: 0, duration: 0 },
  { date: 'Sat', workouts: 1, duration: 90 },
  { date: 'Sun', workouts: 0, duration: 0 },
];

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

export default function AnalysisPage() {
  const [timeRange, setTimeRange] = useState('weekly');

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
            <CardDescription>Based on {timeRange} data</CardDescription>
          </CardHeader>
          <CardContent>
            <ChartContainer config={chartConfig} className="h-[300px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={weeklyWorkoutData} margin={{ top: 20, right: 20, left: -10, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false}/>
                  <XAxis dataKey="date" />
                  <YAxis yAxisId="left" orientation="left" stroke="hsl(var(--primary))" />
                  <YAxis yAxisId="right" orientation="right" stroke="hsl(var(--accent))" />
                  <Tooltip content={<ChartTooltipContent />} />
                  <Legend />
                  <Bar yAxisId="left" dataKey="workouts" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                  <Bar yAxisId="right" dataKey="duration" fill="hsl(var(--accent))" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </ChartContainer>
          </CardContent>
        </Card>

        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle className="font-headline">Weight Progress</CardTitle>
            <CardDescription>Your weight trend over time</CardDescription>
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
