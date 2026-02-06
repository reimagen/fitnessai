import { useMemo } from 'react';
import type { WorkoutLog } from '@/lib/types';
import type { ExerciseDocument } from '@/lib/exercise-types';
import { find6WeekAvgE1RM } from '@/analysis/analysis.config';

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
  trendImprovement: number | null;
  volumeTrend: number | null;
  avgE1RM: number | null;
  avgE1RMUnit: 'kg' | 'lbs' | null;
}

export function useLiftTrends(
  selectedLift: string,
  selectedLiftKey: string,
  progressionChartData: ProgressionChartData | undefined,
  workoutLogs: WorkoutLog[] | undefined,
  exercises: ExerciseDocument[] = []
): LiftTrendsResult {
  return useMemo(() => {
    if (!selectedLift || !progressionChartData?.chartData || progressionChartData.chartData.length < 2) {
      return {
        trendImprovement: null,
        volumeTrend: null,
        avgE1RM: null,
        avgE1RMUnit: null,
      };
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
    let avgE1RMUnit: 'kg' | 'lbs' | null = null;
    if (workoutLogs) {
      const result = find6WeekAvgE1RM(workoutLogs, [selectedLiftKey], exercises);
      if (result) {
        avgE1RM = result.weight;
        avgE1RMUnit = result.weightUnit;
      }
    }

    return {
      trendImprovement: calculateTrend('e1RM'),
      volumeTrend: calculateTrend('volume'),
      avgE1RM,
      avgE1RMUnit,
    };
  }, [selectedLift, selectedLiftKey, progressionChartData, workoutLogs, exercises]);
}
