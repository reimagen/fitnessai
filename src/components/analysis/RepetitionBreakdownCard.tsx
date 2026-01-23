
"use client";

import { Pie, PieChart, ResponsiveContainer, Tooltip, Cell, Legend } from 'recharts';
import { ChartContainer, ChartTooltipContent, ChartLegendContent } from '@/components/ui/chart';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { IterationCw, Loader2 } from 'lucide-react';
import React from 'react';
import { useIsMobile } from '@/hooks/use-mobile'; // Assuming this hook is available

interface CategoryChartData {
  key: string;
  name: string;
  value: number;
  fill: string;
}

interface RepetitionBreakdownCardProps {
  isLoading: boolean;
  isError: boolean;
  categoryRepData: CategoryChartData[];
  timeRange: string;
}

const timeRangeDisplayNames: Record<string, string> = {
  'weekly': 'This Week',
  'monthly': 'This Month',
  'yearly': 'This Year',
  'all-time': 'All Time',
};

// Re-defining necessary constants/helpers from page.tsx for this component
const RADIAN = Math.PI / 180;
const renderPieLabel = (props: any, unit?: 'reps' | 'kcal', isMobile?: boolean) => {
    const { cx, cy, midAngle, innerRadius, outerRadius, percent, name, value } = props;
    if (percent < 0.05) return null;
    
    const sin = Math.sin(-RADIAN * midAngle);
    const cos = Math.cos(-RADIAN * midAngle);
    
    // Use a smaller radius, especially on mobile, to pull labels inward
    const radiusMultiplier = isMobile ? 0.6 : 0.7;
    const labelRadius = innerRadius + (outerRadius - innerRadius) * radiusMultiplier;

    const x = cx + labelRadius * cos;
    const y = cy + labelRadius * sin;
    
    const displayValue = unit === 'kcal' ? Math.round(value).toLocaleString() : value.toLocaleString();
    const unitString = unit ? ` ${unit}` : '';

    return (
      <text 
        x={x} 
        y={y} 
        fill="hsl(var(--foreground))" 
        textAnchor={x > cx ? 'start' : 'end'}
        dominantBaseline="central" 
        className="text-xs"
      >
        {`${name} (${displayValue}${unitString})`}
      </text>
    );
  };

const chartConfig = {
    // Only include what's necessary for the legend or labels
    upperBody: { label: "Upper Body" },
    lowerBody: { label: "Lower Body" },
    fullBody: { label: "Full Body" },
    cardio: { label: "Cardio" },
    core: { label: "Core" },
    other: { label: "Other" },
};


export function RepetitionBreakdownCard({ isLoading, isError, categoryRepData, timeRange }: RepetitionBreakdownCardProps) {
  const isMobile = useIsMobile();

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
        <CardTitle className="font-headline flex items-center gap-2">
          <IterationCw className="h-6 w-6 text-primary" /> Repetition Breakdown
        </CardTitle>
        <CardDescription>Total reps per category {timeRangeDisplayNames[timeRange]}</CardDescription>
      </CardHeader>
      <CardContent>
        {categoryRepData.length > 0 ? (
          <ChartContainer config={chartConfig} className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
                <Pie
                  data={categoryRepData}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  outerRadius={isMobile ? 60 : 80}
                  labelLine={false}
                  label={(props) => renderPieLabel(props, 'reps', isMobile)}
                >
                  {categoryRepData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.fill} stroke={entry.fill} />
                  ))}
                </Pie>
                <Tooltip content={<ChartTooltipContent hideIndicator />} />
                <Legend content={<ChartLegendContent nameKey="key" />} wrapperStyle={{ paddingTop: "20px" }} />
              </PieChart>
            </ResponsiveContainer>
          </ChartContainer>
        ) : (
          <div className="h-[300px] flex items-center justify-center text-muted-foreground">
            <p>No repetition data available.</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
