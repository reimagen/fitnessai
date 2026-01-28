
"use client";

import { Pie, PieChart, ResponsiveContainer, Tooltip, Cell, Legend } from 'recharts';
import { ChartContainer, ChartTooltipContent, ChartLegendContent } from '@/components/ui/chart';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Flame, Loader2 } from 'lucide-react';
import React from 'react';
import { useIsMobile } from '@/hooks/useMobile';
import { renderPieLabel } from '@/analysis/chart-utils';
import { timeRangeDisplayNames } from '@/analysis/analysis-constants';
import { chartConfig } from '@/analysis/chart.config';

interface CategoryChartData {
  key: string;
  name: string;
  value: number;
  fill: string;
}

interface CalorieBreakdownCardProps {
  isLoading: boolean;
  isError: boolean;
  categoryCalorieData: CategoryChartData[];
  timeRange: string;
}


export function CalorieBreakdownCard({ isLoading, isError, categoryCalorieData, timeRange }: CalorieBreakdownCardProps) {
  const isMobile = useIsMobile();

  if (isLoading) {
    return (
      <Card className="shadow-lg lg:col-span-3 h-96 flex justify-center items-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </Card>
    );
  }

  if (isError) {
    return null;
  }

  return (
    <Card className="shadow-lg lg:col-span-3">
      <CardHeader>
        <CardTitle className="font-headline flex items-center gap-2">
          <Flame className="h-6 w-6 text-primary" /> Calorie Breakdown
        </CardTitle>
        <CardDescription>Total calories burned per category {timeRangeDisplayNames[timeRange]}</CardDescription>
      </CardHeader>
      <CardContent>
        {categoryCalorieData.length > 0 ? (
          <ChartContainer config={chartConfig} className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
                <Pie
                  data={categoryCalorieData}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  outerRadius={isMobile ? 60 : 80}
                  labelLine={false}
                  label={(props) => renderPieLabel(props, 'kcal', isMobile)}
                >
                  {categoryCalorieData.map((entry, index) => (
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
            <p>No calorie data available.</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
