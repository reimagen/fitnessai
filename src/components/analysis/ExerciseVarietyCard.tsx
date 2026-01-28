
"use client";

import { Bar, BarChart, CartesianGrid, ResponsiveContainer, XAxis, YAxis, Tooltip, Legend } from 'recharts';
import { ChartContainer, ChartTooltipContent } from '@/components/ui/chart';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2 } from 'lucide-react';
import React from 'react';
import { getPath, RoundedBar } from '@/lib/chart-utils';
import { timeRangeDisplayNames } from '@/lib/analysis-constants';
import { chartConfig } from '@/lib/chart.config';

interface ChartDataPoint {
  date: string;
  dateLabel: string;
  upperBody: number;
  lowerBody: number;
  cardio: number;
  core: number;
  fullBody: number;
  other: number;
}

type ChartDataKey = keyof typeof chartConfig;

type LegendPayloadEntry = {
  dataKey?: string;
  color?: string;
};

const CustomBarChartLegend = ({ payload }: { payload?: LegendPayloadEntry[] }) => {
    if (!payload) return null;
    const legendOrder: ChartDataKey[] = ['upperBody', 'lowerBody', 'core', 'fullBody', 'cardio', 'other'];
    const payloadMap = payload.reduce<Record<string, LegendPayloadEntry>>((acc, entry) => {
      if (entry.dataKey) {
        acc[entry.dataKey] = entry;
      }
      return acc;
    }, {});
    return <div className="grid grid-cols-3 gap-x-4 gap-y-2 text-xs mt-4">{legendOrder.map(name => { const entry = payloadMap[name]; if (!entry || !chartConfig[name]) return null; return <div key={`item-${entry.dataKey}`} className="flex items-center justify-center gap-1.5"><span className="h-2.5 w-2.5 shrink-0 rounded-[2px]" style={{ backgroundColor: entry.color }} /><span className="text-muted-foreground">{chartConfig[name].label}</span></div>; })}</div>;
};

interface ExerciseVarietyCardProps {
  isLoading: boolean;
  isError: boolean;
  workoutFrequencyData: ChartDataPoint[];
  timeRange: string;
}

export function ExerciseVarietyCard({ isLoading, isError, workoutFrequencyData, timeRange }: ExerciseVarietyCardProps) {
  if (isLoading) {
    return (
      <Card className="shadow-lg lg:col-span-3 h-96 flex justify-center items-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </Card>
    );
  }

  if (isError) {
    return null; // Error handled by parent component's general error state
  }

  return (
    <Card className="shadow-lg lg:col-span-3">
      <CardHeader>
        <CardTitle className="font-headline">Exercise Variety</CardTitle>
        <CardDescription>Unique exercises performed per category {timeRangeDisplayNames[timeRange]}.</CardDescription>
      </CardHeader>
      <CardContent>
        {workoutFrequencyData.length > 0 ? (
          <ChartContainer config={chartConfig} className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={workoutFrequencyData} margin={{ top: 20, right: 20, left: -10, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="dateLabel" tick={{ fontSize: 12 }} interval={0} />
                <YAxis allowDecimals={false} />
                <Tooltip content={<ChartTooltipContent />} />
                <Legend content={<CustomBarChartLegend />} />
                <Bar dataKey="upperBody" stackId="a" fill="var(--color-upperBody)" shape={<RoundedBar />} />
                <Bar dataKey="lowerBody" stackId="a" fill="var(--color-lowerBody)" shape={<RoundedBar />} />
                <Bar dataKey="cardio" stackId="a" fill="var(--color-cardio)" shape={<RoundedBar />} />
                <Bar dataKey="core" stackId="a" fill="var(--color-core)" shape={<RoundedBar />} />
                <Bar dataKey="fullBody" stackId="a" fill="var(--color-fullBody)" shape={<RoundedBar />} />
                <Bar dataKey="other" stackId="a" fill="var(--color-other)" shape={<RoundedBar />} />
              </BarChart>
            </ResponsiveContainer>
          </ChartContainer>
        ) : (
          <div className="h-[300px] flex items-center justify-center text-muted-foreground">
            <p>No workout data for this period.</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
