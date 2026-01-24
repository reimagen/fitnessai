import { useMemo } from 'react';
import type { PersonalRecord, UserProfile, StrengthLevel } from '@/lib/types';
import { getStrengthLevel } from '@/lib/strength-standards';
import { findBestPr } from '@/lib/analysis.config';

interface ProgressionChartData {
  chartData: Array<{
    e1RM: number;
    volume: number;
  }>;
}

interface LiftTrendsResult {
  currentLiftLevel: StrengthLevel | null;
  trendImprovement: number | null;
  volumeTrend: number | null;
}

export function useLiftTrends(
  selectedLift: string,
  selectedLiftKey: string,
  progressionChartData: ProgressionChartData | undefined,
  personalRecords: PersonalRecord[] | undefined,
  userProfile: UserProfile | undefined
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
      const points = data
        .map((d: any, i: number) => ({ x: i, y: d[dataKey] }))
        .filter((p: any) => p.y > 0);

      if (points.length < 2) {
        return null;
      }

      const n = points.length;
      const x_mean = points.reduce((acc: number, p: any) => acc + p.x, 0) / n;
      const y_mean = points.reduce((acc: number, p: any) => acc + p.y, 0) / n;

      const numerator = points.reduce((acc: number, p: any) => acc + (p.x - x_mean) * (p.y - y_mean), 0);
      const denominator = points.reduce((acc: number, p: any) => acc + (p.x - x_mean) ** 2, 0);

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

    return {
      currentLiftLevel,
      trendImprovement: calculateTrend('e1RM'),
      volumeTrend: calculateTrend('volume'),
    };
  }, [selectedLift, selectedLiftKey, progressionChartData, personalRecords, userProfile]);
}
