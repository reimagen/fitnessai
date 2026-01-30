import { useMemo } from 'react';
import type { PersonalRecord, UserProfile, StrengthLevel, WorkoutLog } from '@/lib/types';
import { getStrengthLevel } from '@/lib/strength-standards';
import { findBestPr, find6WeekAvgE1RM } from '@/analysis/analysis.config';

interface ProgressionChartData {
  chartData: Array<{
    e1RM: number;
    volume: number;
  }>;
}

type TrendPoint = {
  x: number;
  y: number;
};

interface LiftTrendsResult {
  currentLiftLevel: StrengthLevel | null;
  trendImprovement: number | null;
  volumeTrend: number | null;
  avgE1RM: number | null;
}

export function useLiftTrends(
  selectedLift: string,
  selectedLiftKey: string,
  progressionChartData: ProgressionChartData | undefined,
  personalRecords: PersonalRecord[] | undefined,
  userProfile: UserProfile | undefined,
  workoutLogs: WorkoutLog[] | undefined
): LiftTrendsResult {
  return useMemo(() => {
    if (!selectedLift || !progressionChartData?.chartData || progressionChartData.chartData.length < 2) {
      return {
        currentLiftLevel: null,
        trendImprovement: null,
        volumeTrend: null,
      };
    }

    let currentLiftLevel: StrengthLevel | null = null;
    if (userProfile && personalRecords) {
      const bestPRforLift = findBestPr(personalRecords, [selectedLiftKey]);
      if (bestPRforLift) {
        currentLiftLevel = getStrengthLevel(bestPRforLift, userProfile);
      }
    }

    const { chartData: data } = progressionChartData;

    const calculateTrend = (dataKey: 'e1RM' | 'volume'): number | null => {
      const points: TrendPoint[] = data
        .map((d, i) => ({ x: i, y: d[dataKey] }))
        .filter(point => point.y > 0);

      if (points.length < 2) {
        return null;
      }

      const n = points.length;
      const x_mean = points.reduce((acc, point) => acc + point.x, 0) / n;
      const y_mean = points.reduce((acc, point) => acc + point.y, 0) / n;

      const numerator = points.reduce((acc, point) => acc + (point.x - x_mean) * (point.y - y_mean), 0);
      const denominator = points.reduce((acc, point) => acc + (point.x - x_mean) ** 2, 0);

      if (denominator === 0) {
        return null;
      }

      const slope = numerator / denominator;
      const intercept = y_mean - slope * x_mean;

      const startY = slope * 0 + intercept;
      const endY = slope * (data.length - 1) + intercept;

      if (startY > 0) {
        return ((endY - startY) / startY) * 100;
      }
      return null;
    };

    let avgE1RM: number | null = null;
    if (workoutLogs) {
      const result = find6WeekAvgE1RM(workoutLogs, [selectedLiftKey]);
      if (result) {
        avgE1RM = result.weight;
      }
    }

    return {
      currentLiftLevel,
      trendImprovement: calculateTrend('e1RM'),
      volumeTrend: calculateTrend('volume'),
      avgE1RM,
    };
  }, [selectedLift, selectedLiftKey, progressionChartData, personalRecords, userProfile, workoutLogs]);
}
