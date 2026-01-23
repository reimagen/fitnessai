
"use client";

import { Bar, BarChart, CartesianGrid, ResponsiveContainer, XAxis, YAxis, Tooltip, Legend } from 'recharts';
import { ChartContainer, ChartTooltipContent } from '@/components/ui/chart';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2 } from 'lucide-react';
import React from 'react';

// Re-defining necessary types and constants from page.tsx for this component
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

const timeRangeDisplayNames: Record<string, string> = {
  'weekly': 'This Week',
  'monthly': 'This Month',
  'yearly': 'This Year',
  'all-time': 'All Time',
};

const chartConfig = {
  distance: { label: "Distance (mi)", color: "hsl(var(--accent))" },
  upperBody: { label: "Upper Body", color: "hsl(var(--chart-1))" },
  fullBody: { label: "Full Body", color: "hsl(var(--chart-2))" },
  lowerBody: { label: "Lower Body", color: "hsl(var(--chart-3))" },
  cardio: { label: "Cardio", color: "hsl(var(--chart-4))" },
  core: { label: "Core", color: "hsl(var(--chart-5))" },
  other: { label: "Other", color: "hsl(var(--chart-6))" },
  value: { label: "Value", color: "hsl(var(--accent))" },
  e1RM: { label: "Est. 1-Rep Max (lbs)", color: "hsl(var(--primary))" },
  volume: { label: "Volume (lbs)", color: "hsl(var(--chart-2))"},
  actualPR: { label: "Actual PR", color: "hsl(var(--accent))" },
  trend: { label: "e1RM Trend", color: "hsl(var(--muted-foreground))" },
  Running: { label: "Running", color: "hsl(var(--chart-1))" },
  Walking: { label: "Walking", color: "hsl(var(--chart-2))" },
  Cycling: { label: "Cycling", color: "hsl(var(--chart-3))" },
  Climbmill: { label: "Climbmill", color: "hsl(var(--chart-4))" },
  Rowing: { label: "Rowing", color: "hsl(var(--chart-5))" },
  Swimming: { label: "Swimming", color: "hsl(var(--chart-6))" },
};
type ChartDataKey = keyof typeof chartConfig;

const stackOrder: (keyof Omit<ChartDataPoint, 'dateLabel' | 'date'>)[] = ['upperBody', 'lowerBody', 'cardio', 'core', 'fullBody', 'other'];

const getPath = (x: number, y: number, width: number, height: number, radius: number | number[]) => {
    const [tl, tr, br, bl] = Array.isArray(radius) ? radius : [radius, radius, radius, radius];
    let path = `M ${x + tl},${y}`;
    path += ` L ${x + width - tr},${y}`;
    path += ` Q ${x + width},${y} ${x + width},${y + tr}`;
    path += ` L ${x + width},${y + height - br}`;
    path += ` Q ${x + width},${y + height} ${x + width - br},${y + height}`;
    path += ` L ${x + bl},${y + height}`;
    path += ` Q ${x},${y + height} ${x},${y + height - bl}`;
    path += ` L ${x},${y + tl}`;
    path += ` Q ${x},${y} ${x + tl},${y}`;
    return path;
};

const RoundedBar = (props: any) => {
  const { fill, x, y, width, height, payload, dataKey } = props;
  if (!payload || !dataKey || props.value === 0 || height === 0) return null;
  const myIndex = stackOrder.indexOf(dataKey as any);
  let isTop = true;
  if (myIndex !== -1) {
    for (let i = myIndex + 1; i < stackOrder.length; i++) {
      if (payload[stackOrder[i]] > 0) { isTop = false; break; }
    }
  }
  const radius = isTop ? [4, 4, 0, 0] : [0, 0, 0, 0];
  return <path d={getPath(x, y, width, height, radius)} stroke="none" fill={fill} />;
};

const CustomBarChartLegend = ({ payload }: any) => {
    if (!payload) return null;
    const legendOrder: ChartDataKey[] = ['upperBody', 'lowerBody', 'core', 'fullBody', 'cardio', 'other'];
    const payloadMap = payload.reduce((acc: any, entry: any) => { acc[entry.dataKey] = entry; return acc; }, {});
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
