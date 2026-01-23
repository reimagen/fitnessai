
"use client";

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, TrendingUp } from 'lucide-react';

interface PeriodSummaryStats {
  workoutDays: number;
  totalWeightLiftedLbs: number;
  totalDistanceMi: number;
  totalCardioDurationMin: number;
  totalCaloriesBurned: number;
  periodLabel: string;
}

interface PeriodSummaryCardProps {
  isLoading: boolean;
  isError: boolean;
  periodSummary: PeriodSummaryStats | undefined;
  formatCardioDuration: (totalMinutes: number) => string;
}

export function PeriodSummaryCard({ isLoading, isError, periodSummary, formatCardioDuration }: PeriodSummaryCardProps) {
  if (isLoading) {
    return (
      <Card className="shadow-lg mb-6 h-40 flex justify-center items-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </Card>
    );
  }

  if (isError || !periodSummary) {
    return null;
  }

  const summaryData = {
    "Workout Days": periodSummary.workoutDays,
    "Weight Lifted (lbs)": periodSummary.totalWeightLiftedLbs.toLocaleString(),
    "Distance (mi)": periodSummary.totalDistanceMi.toLocaleString(),
    "Cardio Duration": formatCardioDuration(periodSummary.totalCardioDurationMin),
    "Calories Burned": periodSummary.totalCaloriesBurned.toLocaleString()
  };

  return (
    <Card className="shadow-lg mb-6 bg-card">
      <CardHeader>
        <CardTitle className="font-headline flex items-center gap-2 text-xl">
          <TrendingUp className="h-6 w-6 text-primary" />
          {periodSummary.periodLabel}
        </CardTitle>
      </CardHeader>
      <CardContent className="grid grid-cols-2 gap-y-6 gap-x-3 md:grid-cols-5 text-center py-6">
        {Object.entries(summaryData).map(([label, value]) => (
          <div key={label}>
            <p className="text-3xl font-bold text-accent">{value}</p>
            <p className="text-sm text-muted-foreground mt-1">{label}</p>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
