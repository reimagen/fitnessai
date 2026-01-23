

"use client";

import { Bar, BarChart, CartesianGrid, ResponsiveContainer, XAxis, YAxis, Tooltip, Legend, ComposedChart, Scatter, ReferenceLine, Line, Label, LabelList, Pie, PieChart, Cell } from 'recharts';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import React, { useState, useMemo, useEffect } from 'react';
import type { WorkoutLog, PersonalRecord, ExerciseCategory, StrengthLevel, AnalyzeLiftProgressionInput, StrengthImbalanceInput, FitnessGoal, StrengthFinding } from '@/lib/types';
import type { ImbalanceType } from '@/lib/analysis.config';
import { useWorkouts, usePersonalRecords, useUserProfile, useAnalyzeLiftProgression, useAnalyzeStrength } from '@/lib/firestore.service';
import { format } from 'date-fns/format';
import { isWithinInterval } from 'date-fns/isWithinInterval';
import { startOfWeek } from 'date-fns/startOfWeek';
import { endOfWeek } from 'date-fns/endOfWeek';
import { startOfMonth } from 'date-fns/startOfMonth';
import { endOfMonth } from 'date-fns/endOfMonth';
import { startOfYear } from 'date-fns/startOfYear';
import { endOfYear } from 'date-fns/endOfYear';
import { parse } from 'date-fns/parse';
import { eachDayOfInterval } from 'date-fns/eachDayOfInterval';
import type { Interval } from 'date-fns';
import { subWeeks } from 'date-fns/subWeeks';
import { isAfter } from 'date-fns/isAfter';
import { differenceInDays, differenceInWeeks } from 'date-fns';
import { eachWeekOfInterval } from 'date-fns/eachWeekOfInterval';
import { TrendingUp, Loader2, Trophy, UserPlus } from 'lucide-react';
import { getStrengthLevel, getNormalizedExerciseName, getStrengthRatioStandards } from '@/lib/strength-standards';
import { ErrorState } from '@/components/shared/ErrorState';
import { useAuth } from '@/lib/auth.service';
import { cn } from '@/lib/utils';
import { IMBALANCE_CONFIG, IMBALANCE_TYPES, findBestPr, toTitleCase } from '@/lib/analysis.config';
import { chartConfig } from '@/lib/chart.config';
import { type ImbalanceFocus } from '@/lib/analysis.utils';
import { timeRangeDisplayNames } from '@/lib/analysis-constants';
import Link from 'next/link';
import { useToast } from '@/hooks/use-toast';
import { calculateExerciseCalories } from '@/lib/calorie-calculator';
import { useIsMobile } from '@/hooks/use-mobile';
import { CalorieBreakdownCard } from '@/components/analysis/CalorieBreakdownCard';
import { RepetitionBreakdownCard } from '@/components/analysis/RepetitionBreakdownCard';
import StrengthBalanceCard from '@/components/analysis/StrengthBalanceCard';
import { LiftProgressionCard } from '@/components/analysis/LiftProgressionCard';
import { ExerciseVarietyCard } from '@/components/analysis/ExerciseVarietyCard';
import { MilestonesCard } from '@/components/analysis/MilestonesCard';
import { CardioAnalysisCard } from '@/components/analysis/CardioAnalysisCard';

type ChartDataKey = keyof typeof chartConfig;

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

interface PeriodSummaryStats {
  workoutDays: number;
  totalWeightLiftedLbs: number;
  totalDistanceMi: number;
  totalCardioDurationMin: number;
  totalCaloriesBurned: number;
  periodLabel: string;
}

const categoryToCamelCase = (category: ExerciseCategory): keyof Omit<ChartDataPoint, 'dateLabel' | 'date'> => {
  switch (category) {
    case 'Upper Body': return 'upperBody';
    case 'Lower Body': return 'lowerBody';
    case 'Full Body': return 'fullBody';
    case 'Cardio': return 'cardio';
    case 'Core': return 'core';
    default: return 'other';
  }
};

const calculateE1RM = (weight: number, reps: number): number => {
  if (reps === 1) return weight;
  if (reps === 0) return 0;
  return weight * (1 + reps / 30);
};

// Custom shape for the Scatter plot to render the Trophy icon
const TrophyShape = (props: any) => {
  const { cx, cy, payload } = props;
  if (!payload.isActualPR) return null;
  // Position the icon centered on the data point
  return (
    <g transform={`translate(${cx - 12}, ${cy - 12})`}>
      <foreignObject x={0} y={0} width={24} height={24}>
        <Trophy
          className="h-6 w-6 text-yellow-500 fill-yellow-400 stroke-yellow-600"
          strokeWidth={1.5}
        />
      </foreignObject>
    </g>
  );
};

// Custom Tooltip for progression chart
const ProgressionTooltip = (props: any) => {
    const { active, payload } = props;
    if (active && payload && payload.length) {
        const data = payload[0].payload;
        
        return (
            <div className="p-2 bg-background border rounded-md shadow-lg text-xs space-y-1">
                 <p className="font-bold">{data.name}</p>
                {data.isActualPR && (
                     <p className="font-bold text-yellow-500 flex items-center gap-1">
                        <Trophy className="h-4 w-4" />
                        Personal Record: {data.actualPR.toLocaleString()} lbs
                    </p>
                )}
                {data.e1RM > 0 && <p style={{ color: 'hsl(var(--primary))' }}>e1RM: {data.e1RM.toLocaleString()} lbs</p>}
                {data.volume > 0 && <p style={{ color: 'hsl(var(--chart-2))' }}>Volume: {data.volume.toLocaleString()} lbs</p>}
            </div>
        );
    }
    return null;
};

// Custom Legend for the progression chart
const ProgressionChartLegend = (props: any) => {
    const { payload } = props;
    const isMobile = useIsMobile();
    if (!payload) return null;
    
    // Manually define the legend order and details
    const legendItems = [
      { dataKey: 'volume', color: 'hsl(var(--chart-2))' },
      { dataKey: 'e1RM', color: 'hsl(var(--primary))' },
      { dataKey: 'trend', color: 'hsl(var(--muted-foreground))' },
      { dataKey: 'actualPR', color: 'hsl(var(--accent))' },
    ];


    return (
        <div className={cn(
            "flex items-center justify-center gap-x-4 gap-y-2 text-xs mt-2",
            isMobile && "flex-wrap"
        )}>
            {legendItems.map((entry: any, index: number) => {
                const config = chartConfig[entry.dataKey as keyof typeof chartConfig];
                if (!config) return null;
                const isLine = entry.dataKey === 'e1RM';
                const isTrend = entry.dataKey === 'trend';

                return (
                    <div key={`item-${index}`} className="flex items-center gap-1.5">
                        {entry.dataKey === 'actualPR' ? (
                            <Trophy className="h-4 w-4 text-yellow-500" />
                        ) : isTrend ? (
                             <span className="w-4 h-px border-t-2 border-dashed" style={{ borderColor: entry.color }} />
                        ) : (
                            <span
                                className={`h-2.5 w-2.5 shrink-0 ${isLine ? 'rounded-full' : 'rounded-[2px]'}`}
                                style={{ backgroundColor: entry.color }}
                            />
                        )}
                        <span className="text-muted-foreground">{config.label}</span>
                    </div>
                );
            })}
        </div>
    );
};

export default function AnalysisPage() {
  const { toast } = useToast();
  const { user } = useAuth();
  const isMobile = useIsMobile();
  const [timeRange, setTimeRange] = useState('weekly');
  
  const [selectedLift, setSelectedLift] = useState<string>('');
  const [currentLiftLevel, setCurrentLiftLevel] = useState<StrengthLevel | null>(null);
  const [trendImprovement, setTrendImprovement] = useState<number | null>(null);
  const [volumeTrend, setVolumeTrend] = useState<number | null>(null);

  const { data: profileResult, isLoading: isLoadingProfile, isError: isErrorProfile } = useUserProfile();
  const userProfile = profileResult?.data;
  const isProfileNotFound = profileResult?.notFound === true;
  
  const analyzeProgressionMutation = useAnalyzeLiftProgression();
  const analyzeStrengthMutation = useAnalyzeStrength();

  const enableDataFetching = !isLoadingProfile && !!userProfile;
  const { data: workoutLogs, isLoading: isLoadingWorkouts, isError: isErrorWorkouts } = useWorkouts(undefined, enableDataFetching);
  const { data: personalRecords, isLoading: isLoadingPrs, isError: isErrorPrs } = usePersonalRecords(enableDataFetching);
  
  const analysisToRender = userProfile?.strengthAnalysis?.result;
  const generatedDate = userProfile?.strengthAnalysis?.generatedDate;
  
  const selectedLiftKey = getNormalizedExerciseName(selectedLift);
  const progressionAnalysisToRender = userProfile?.liftProgressionAnalysis?.[selectedLiftKey];


  const clientSideFindings = useMemo<(StrengthFinding | { imbalanceType: ImbalanceType; hasData: false })[]>(() => {
    if (!personalRecords || !userProfile || !userProfile.gender) {
      return [];
    }
    const findings: (StrengthFinding | { imbalanceType: ImbalanceType; hasData: false })[] = [];
    const strengthLevelRanks: Record<StrengthLevel, number> = {
      'Beginner': 0, 'Intermediate': 1, 'Advanced': 2, 'Elite': 3, 'N/A': -1,
    };


    IMBALANCE_TYPES.forEach(type => {
        const config = IMBALANCE_CONFIG[type];
        const lift1 = findBestPr(personalRecords, config.lift1Options);
        const lift2 = findBestPr(personalRecords, config.lift2Options);

        if (!lift1 || !lift2) {
             findings.push({ imbalanceType: type, hasData: false });
             return;
        };

        const lift1Level = getStrengthLevel(lift1, userProfile);
        const lift2Level = getStrengthLevel(lift2, userProfile);

        const lift1WeightKg = lift1.weightUnit === 'lbs' ? lift1.weight * 0.453592 : lift1.weight;
        const lift2WeightKg = lift2.weightUnit === 'lbs' ? lift2.weight * 0.453592 : lift2.weight;

        if (lift2WeightKg === 0) {
            findings.push({ imbalanceType: type, hasData: false });
            return;
        }

        const ratio = config.ratioCalculation(lift1WeightKg, lift2WeightKg);
        
        const rank1 = strengthLevelRanks[lift1Level];
        const rank2 = strengthLevelRanks[lift2Level];
        const guidingLevelRank = (rank1 === -1 || rank2 === -1) ? -1 : Math.min(rank1, rank2);
        const guidingLevel: StrengthLevel = Object.keys(strengthLevelRanks).find(key => strengthLevelRanks[key as StrengthLevel] === guidingLevelRank) as StrengthLevel || 'N/A';
        
        const ratioStandards = getStrengthRatioStandards(type, userProfile.gender as 'Male' | 'Female', guidingLevel);
        
        const balancedRangeDisplay = ratioStandards
            ? `${ratioStandards.lowerBound.toFixed(2)}-${ratioStandards.upperBound.toFixed(2)}:1`
            : 'N/A';
        
        const targetRatioDisplay = ratioStandards ? `${ratioStandards.targetRatio.toFixed(2)}:1` : 'N/A';
        
        let imbalanceFocus: ImbalanceFocus = 'Balanced';
        let ratioIsUnbalanced = false;

        if (ratioStandards) {
            ratioIsUnbalanced = ratio < ratioStandards.lowerBound || ratio > ratioStandards.upperBound;
        }

        if (lift1Level !== 'N/A' && lift2Level !== 'N/A' && lift1Level !== lift2Level) {
            imbalanceFocus = 'Level Imbalance';
        } else if (ratioIsUnbalanced) {
            imbalanceFocus = 'Ratio Imbalance';
        }

        findings.push({
            imbalanceType: type,
            lift1Name: toTitleCase(lift1.exerciseName),
            lift1Weight: lift1.weight,
            lift1Unit: lift1.weightUnit,
            lift2Name: toTitleCase(lift2.exerciseName),
            lift2Weight: lift2.weight,
            lift2Unit: lift2.weightUnit,
            userRatio: `${ratio.toFixed(2)}:1`,
            targetRatio: targetRatioDisplay,
            balancedRange: balancedRangeDisplay,
            imbalanceFocus: imbalanceFocus,
            lift1Level,
            lift2Level,
        });
    });

    return findings;
  }, [personalRecords, userProfile]);

  const handleAnalyzeStrength = () => {
    // TypeScript guard: ensure userProfile is not null before proceeding
    if (!userProfile) {
        toast({ title: "Profile Not Loaded", description: "Your user profile is not available. Please try again.", variant: "destructive" });
        return;
    }
    // Filter out findings that don't have data
    const validFindings = clientSideFindings.filter((f): f is StrengthFinding => !('hasData' in f));

    const analysisInput: StrengthImbalanceInput = {
        clientSideFindings: validFindings.map((f: StrengthFinding) => ({
            ...f,
            targetRatio: f.targetRatio, // Ensure targetRatio is passed
        })),
        userProfile: {
            age: userProfile.age,
            gender: userProfile.gender,
            weightValue: userProfile.weightValue,
            weightUnit: userProfile.weightUnit,
            skeletalMuscleMassValue: userProfile.skeletalMuscleMassValue,
            skeletalMuscleMassUnit: userProfile.skeletalMuscleMassUnit,
            fitnessGoals: (userProfile.fitnessGoals || [])
              .filter((g: FitnessGoal) => !g.achieved)
              .map((g: FitnessGoal) => ({
                description: g.description,
                isPrimary: g.isPrimary || false,
              })),
        }
    };

    analyzeStrengthMutation.mutate(analysisInput);
  };
  

  const filteredData = useMemo(() => {
    const today = new Date();
    let logsForPeriod = workoutLogs || [];
    let prsForPeriod = personalRecords || [];
    let goalsForPeriod = (userProfile?.fitnessGoals || []).filter((g: FitnessGoal) => g.achieved && g.dateAchieved);

    if (timeRange !== 'all-time') {
      let interval: Interval;
      if (timeRange === 'weekly') interval = { start: startOfWeek(today, { weekStartsOn: 0 }), end: endOfWeek(today, { weekStartsOn: 0 }) };
      else if (timeRange === 'monthly') interval = { start: startOfMonth(today), end: endOfMonth(today) };
      else interval = { start: startOfYear(today), end: endOfYear(today) };

      logsForPeriod = (workoutLogs || []).filter((log: WorkoutLog) => isWithinInterval(log.date, interval));
      prsForPeriod = (personalRecords || []).filter((pr: PersonalRecord) => isWithinInterval(pr.date, interval));
      goalsForPeriod = goalsForPeriod.filter((g: FitnessGoal) => isWithinInterval(g.dateAchieved!, interval));
    }

    return { logsForPeriod, prsForPeriod, goalsForPeriod };
  }, [timeRange, workoutLogs, personalRecords, userProfile?.fitnessGoals]);

  const chartData = useMemo(() => {
    const { logsForPeriod } = filteredData;
    const periodLabel = `${timeRangeDisplayNames[timeRange]}'s Summary`;
    const today = new Date();

    let workoutFrequencyData: ChartDataPoint[] = [];
    
    // Define a more specific type for the keys of the unique exercises object.
    type ExerciseCategoryKey = keyof Omit<ChartDataPoint, 'date' | 'dateLabel'>;

    // Helper function to process logs for a given period and return unique exercise counts
    const getUniqueExerciseCounts = (logs: WorkoutLog[]): Partial<Record<ExerciseCategoryKey, number>> => {
      const uniqueExercises: Partial<Record<ExerciseCategoryKey, Set<string>>> = {};

      logs.forEach((log: WorkoutLog) => {
        log.exercises.forEach((ex) => {
          const camelCaseCategory = categoryToCamelCase(ex.category || 'Other');
          if (!uniqueExercises[camelCaseCategory]) {
            uniqueExercises[camelCaseCategory] = new Set();
          }
          uniqueExercises[camelCaseCategory]!.add(ex.name.trim().toLowerCase());
        });
      });
      
      const counts: Partial<Record<ExerciseCategoryKey, number>> = {};
      for (const category in uniqueExercises) {
          const catKey = category as ExerciseCategoryKey;
          counts[catKey] = uniqueExercises[catKey]!.size;
      }
      return counts;
    };
    
    switch (timeRange) {
        case 'weekly': {
            const weekStart = startOfWeek(today, { weekStartsOn: 0 });
            const weekEnd = endOfWeek(today, { weekStartsOn: 0 });
            const daysInWeek = eachDayOfInterval({ start: weekStart, end: weekEnd });

            workoutFrequencyData = daysInWeek.map((day: Date) => {
                const dateKey = format(day, 'yyyy-MM-dd');
                const logsForDay = logsForPeriod.filter((log: WorkoutLog) => format(log.date, 'yyyy-MM-dd') === dateKey);
                const counts = getUniqueExerciseCounts(logsForDay);
                return {
                    date: dateKey,
                    dateLabel: format(day, 'E'),
                    upperBody: counts.upperBody || 0,
                    lowerBody: counts.lowerBody || 0,
                    cardio: counts.cardio || 0,
                    core: counts.core || 0,
                    fullBody: counts.fullBody || 0,
                    other: counts.other || 0,
                };
            });
            break;
        }
            
        case 'monthly': {
            const aggregatedData: { [key: string]: WorkoutLog[] } = {};
            logsForPeriod.forEach((log: WorkoutLog) => {
                const weekStart = startOfWeek(log.date, { weekStartsOn: 0 });
                const dateKey = format(weekStart, 'yyyy-MM-dd');
                if (!aggregatedData[dateKey]) aggregatedData[dateKey] = [];
                aggregatedData[dateKey].push(log);
            });

            workoutFrequencyData = Object.entries(aggregatedData).map(([dateKey, logs]: [string, WorkoutLog[]]) => {
                const weekStart = parse(dateKey, 'yyyy-MM-dd', new Date());
                const weekEnd = endOfWeek(weekStart, { weekStartsOn: 0 });
                const dateLabel = `${format(weekStart, 'MMM d')}-${format(weekEnd, 'd')}`;
                const counts = getUniqueExerciseCounts(logs);
                return {
                    date: dateKey,
                    dateLabel,
                    upperBody: counts.upperBody || 0,
                    lowerBody: counts.lowerBody || 0,
                    cardio: counts.cardio || 0,
                    core: counts.core || 0,
                    fullBody: counts.fullBody || 0,
                    other: counts.other || 0,
                };
            }).sort((a: ChartDataPoint, b: ChartDataPoint) => new Date(a.date).getTime() - new Date(b.date).getTime());
            break;
        }

        case 'yearly': {
            const aggregatedData: { [key: string]: WorkoutLog[] } = {};
            logsForPeriod.forEach((log: WorkoutLog) => {
                const dateKey = format(log.date, 'yyyy-MM');
                if (!aggregatedData[dateKey]) aggregatedData[dateKey] = [];
                aggregatedData[dateKey].push(log);
            });
            workoutFrequencyData = Object.entries(aggregatedData).map(([dateKey, logs]: [string, WorkoutLog[]]) => {
                const dateLabel = format(parse(dateKey, 'yyyy-MM', new Date()), 'MMM');
                const counts = getUniqueExerciseCounts(logs);
                return {
                    date: dateKey,
                    dateLabel,
                    upperBody: counts.upperBody || 0,
                    lowerBody: counts.lowerBody || 0,
                    cardio: counts.cardio || 0,
                    core: counts.core || 0,
                    fullBody: counts.fullBody || 0,
                    other: counts.other || 0,
                };
            }).sort((a: ChartDataPoint, b: ChartDataPoint) => parse(a.date, 'yyyy-MM', new Date()).getTime() - parse(b.date, 'yyyy-MM', new Date()).getTime());
            break;
        }

        case 'all-time': {
            const aggregatedData: { [key: string]: WorkoutLog[] } = {};
            logsForPeriod.forEach((log: WorkoutLog) => {
                const dateKey = format(log.date, 'yyyy');
                if (!aggregatedData[dateKey]) aggregatedData[dateKey] = [];
                aggregatedData[dateKey].push(log);
            });
            workoutFrequencyData = Object.entries(aggregatedData).map(([dateKey, logs]: [string, WorkoutLog[]]) => {
                const counts = getUniqueExerciseCounts(logs);
                return {
                    date: dateKey,
                    dateLabel: dateKey,
                    upperBody: counts.upperBody || 0,
                    lowerBody: counts.lowerBody || 0,
                    cardio: counts.cardio || 0,
                    core: counts.core || 0,
                    fullBody: counts.fullBody || 0,
                    other: counts.other || 0,
                };
            }).sort((a: ChartDataPoint, b: ChartDataPoint) => parseInt(a.date) - parseInt(b.date));
            break;
        }
    }


    const repsByCat: Record<keyof Omit<ChartDataPoint, 'dateLabel' | 'date'>, number> = { upperBody: 0, lowerBody: 0, fullBody: 0, cardio: 0, core: 0, other: 0 };
    const caloriesByCat: Record<keyof Omit<ChartDataPoint, 'dateLabel' | 'date'>, number> = { upperBody: 0, lowerBody: 0, fullBody: 0, cardio: 0, core: 0, other: 0 };

    logsForPeriod.forEach((log: WorkoutLog) => {
        log.exercises.forEach((ex) => {
            const camelCaseCategory = categoryToCamelCase(ex.category || 'Other');
            repsByCat[camelCaseCategory] += (ex.reps || 0) * (ex.sets || 0);
            caloriesByCat[camelCaseCategory] += ex.calories || 0;
        });
    });
    const categoryRepData = Object.entries(repsByCat).filter(([, value]: [string, number]) => value > 0).map(([name, value]: [string, number]) => ({ key: name, name: (chartConfig[name as ChartDataKey]?.label || name) as string, value, fill: `var(--color-${name})`}));
    const categoryCalorieData = Object.entries(caloriesByCat).filter(([, value]: [string, number]) => value > 0).map(([name, value]: [string, number]) => ({ key: name, name: (chartConfig[name as ChartDataKey]?.label || name) as string, value, fill: `var(--color-${name})`}));

    const uniqueWorkoutDates = new Set<string>();
    let totalWeight = 0, totalDistance = 0, totalDuration = 0, totalCalories = 0;
    logsForPeriod.forEach((log: WorkoutLog) => {
        uniqueWorkoutDates.add(format(log.date, 'yyyy-MM-dd'));
        log.exercises.forEach((ex) => {
            if (ex.weight && ex.sets && ex.reps) totalWeight += ex.weight * ex.sets * ex.reps * (ex.weightUnit === 'kg' ? 2.20462 : 1);
            if (ex.category === 'Cardio' && ex.distance) {
                let distMi = 0;
                if (ex.distanceUnit === 'km') distMi = (ex.distance || 0) * 0.621371;
                else if (ex.distanceUnit === 'ft') distMi = (ex.distance || 0) / 5280;
                else if (ex.distanceUnit === 'm') distMi = (ex.distance || 0) / 1609.34;
                else if (ex.distanceUnit === 'mi') distMi = ex.distance || 0;
                totalDistance += distMi;
            }
            if (ex.category === 'Cardio' && ex.duration) {
                let durMin = ex.duration;
                if (ex.durationUnit === 'hr') durMin *= 60; else if (ex.durationUnit === 'sec') durMin /= 60;
                totalDuration += durMin;
            }
            totalCalories += ex.calories || 0;
        });
    });
    const periodSummary = {
        workoutDays: uniqueWorkoutDates.size,
        totalWeightLiftedLbs: Math.round(totalWeight),
        totalDistanceMi: Math.round(totalDistance),
        totalCardioDurationMin: Math.round(totalDuration),
        totalCaloriesBurned: Math.round(totalCalories),
        periodLabel: periodLabel
    };
    return {
        workoutFrequencyData,
        newPrsData: filteredData.prsForPeriod.sort((a: PersonalRecord, b: PersonalRecord) => b.date.getTime() - a.date.getTime()),
        achievedGoalsData: (filteredData.goalsForPeriod as (FitnessGoal & { dateAchieved: Date })[]).sort((a: FitnessGoal & { dateAchieved: Date }, b: FitnessGoal & { dateAchieved: Date }) => b.dateAchieved.getTime() - a.dateAchieved.getTime()),
        categoryRepData,
        categoryCalorieData,
        periodSummary
    };
  }, [filteredData, timeRange, workoutLogs, personalRecords]);
  
  const frequentlyLoggedLifts = useMemo(() => {
    if (!workoutLogs) return [];
    const weightedExercises = new Map<string, number>();
    workoutLogs.forEach((log: WorkoutLog) => {
      log.exercises.forEach((ex) => {
        if (ex.weight && ex.weight > 0 && ex.category !== 'Cardio') {
          const name = getNormalizedExerciseName(ex.name);
          weightedExercises.set(name, (weightedExercises.get(name) || 0) + 1);
        }
      });
    });
    return Array.from(weightedExercises.entries())
      .filter(([, count]: [string, number]) => count > 1) // Need at least 2 workouts to calc regression
      .sort((a: [string, number], b: [string, number]) => b[1] - a[1])
      .map(([name]: [string, number]) => name);
  }, [workoutLogs]);

  useEffect(() => {
    // When the list of frequently logged lifts is available,
    // and no lift is currently selected, select the first one.
    if (frequentlyLoggedLifts.length > 0 && !selectedLift) {
      setSelectedLift(frequentlyLoggedLifts[0]);
    }
  }, [frequentlyLoggedLifts, selectedLift]);

  const progressionChartData = useMemo(() => {
    if (!selectedLift || !workoutLogs) {
        return { chartData: [], trendlineData: null };
    };

    const sixWeeksAgo = subWeeks(new Date(), 6);
    const liftHistory = new Map<string, { date: Date; e1RM: number; volume: number; actualPR?: number; isActualPR?: boolean; }>();

    workoutLogs.forEach((log: WorkoutLog) => {
      if (!isAfter(log.date, sixWeeksAgo)) return;

      log.exercises.forEach((ex) => {
        if (getNormalizedExerciseName(ex.name) === selectedLiftKey && ex.weight && ex.reps && ex.sets) {
          const dateKey = format(log.date, 'yyyy-MM-dd');
          const weightInLbs = ex.weightUnit === 'kg' ? ex.weight * 2.20462 : ex.weight;
          const currentE1RM = calculateE1RM(weightInLbs, ex.reps);
          const currentVolume = weightInLbs * ex.sets * ex.reps;
          
          const existingEntry = liftHistory.get(dateKey);
          if (existingEntry) {
            existingEntry.volume += currentVolume;
            if (currentE1RM > existingEntry.e1RM) {
              existingEntry.e1RM = currentE1RM;
            }
          } else {
            liftHistory.set(dateKey, {
              date: log.date,
              e1RM: currentE1RM,
              volume: currentVolume,
            });
          }
        }
      });
    });
    
    const bestPR = personalRecords
        ?.filter(pr => getNormalizedExerciseName(pr.exerciseName) === selectedLiftKey)
        .reduce((max, pr) => {
            const maxWeightLbs = max.weightUnit === 'kg' ? max.weight * 2.20462 : max.weight;
            const prWeightLbs = pr.weightUnit === 'kg' ? pr.weight * 2.20462 : pr.weight;
            return prWeightLbs > maxWeightLbs ? pr : max;
        }, { weight: 0, date: new Date(0) } as PersonalRecord);

    if (bestPR && bestPR.weight > 0 && isAfter(bestPR.date, sixWeeksAgo)) {
        const prDateKey = format(bestPR.date, 'yyyy-MM-dd');
        const prWeightLbs = bestPR.weightUnit === 'kg' ? bestPR.weight * 2.20462 : bestPR.weight;
        
        const existingEntry = liftHistory.get(prDateKey);
        if (existingEntry) {
            existingEntry.actualPR = prWeightLbs;
            existingEntry.isActualPR = true;
        } else {
            liftHistory.set(prDateKey, {
                date: bestPR.date,
                e1RM: 0,
                volume: 0,
                actualPR: prWeightLbs,
                isActualPR: true,
            });
        }
    }
    
    const chartData = Array.from(liftHistory.values())
        .sort((a, b) => a.date.getTime() - b.date.getTime())
        .map(item => ({
            name: format(item.date, 'MMM d'),
            e1RM: Math.round(item.e1RM),
            volume: Math.round(item.volume),
            actualPR: item.actualPR ? Math.round(item.actualPR) : undefined,
            isActualPR: item.isActualPR || false,
        }));
        
    // --- Trendline Calculation ---
    let trendlineData = null;
    const points = chartData.map((d, i) => ({ x: i, y: d.e1RM })).filter(p => p.y > 0);
    if (points.length >= 2) {
        const { x_mean, y_mean } = points.reduce((acc, p) => ({ x_mean: acc.x_mean + p.x, y_mean: acc.y_mean + p.y }), { x_mean: 0, y_mean: 0 });
        const n = points.length;
        const xMean = x_mean / n;
        const yMean = y_mean / n;

        const numerator = points.reduce((acc, p) => acc + (p.x - xMean) * (p.y - yMean), 0);
        const denominator = points.reduce((acc, p) => acc + (p.x - xMean) ** 2, 0);

        if(denominator > 0) {
            const slope = numerator / denominator;
            const intercept = yMean - slope * xMean;

            const startY = slope * 0 + intercept;
            const endY = slope * (chartData.length - 1) + intercept;
            
            trendlineData = {
                start: { x: chartData[0].name, y: startY },
                end: { x: chartData[chartData.length - 1].name, y: endY },
            };
        }
    }
    
    return { chartData, trendlineData };
}, [selectedLift, selectedLiftKey, workoutLogs, personalRecords]);

const cardioAnalysisData = useMemo(() => {
    if (!userProfile) {
        return { totalCalories: 0, statsByActivity: {}, pieChartData: [], calorieSummary: "", cardioAmountChartData: [] };
    }
    const { logsForPeriod } = filteredData;
    const today = new Date();

    const cardioExercises = logsForPeriod.flatMap(log => 
        log.exercises
            .filter(ex => ex.category === 'Cardio')
            .map(ex => {
                let name = toTitleCase(ex.name);
                const exNameLower = ex.name.toLowerCase();

                // Speed-based categorization for treadmill, elliptical, and ascent trainer
                if (exNameLower.includes('treadmill') || exNameLower.includes('elliptical') || exNameLower.includes('ascent trainer')) {
                    const distanceMi = (ex.distanceUnit === 'km' ? (ex.distance || 0) * 0.621371 : (ex.distance || 0));
                    
                    let durationHr = 0;
                    if (ex.duration) {
                        if (ex.durationUnit === 'min') durationHr = ex.duration / 60;
                        else if (ex.durationUnit === 'sec') durationHr = ex.duration / 3600;
                        else if (ex.durationUnit === 'hr') durationHr = ex.duration;
                    }
                    
                    if (durationHr > 0) {
                        const speedMph = distanceMi / durationHr;
                        name = speedMph > 4.0 ? 'Running' : 'Walking';
                    } else {
                        name = 'Walking';
                    }
                } else if (exNameLower.includes('run')) name = 'Running';
                else if (exNameLower.includes('walk')) name = 'Walking';
                else if (exNameLower.includes('cycle') || exNameLower.includes('bike')) name = 'Cycling';
                else if (exNameLower.includes('climbmill') || exNameLower.includes('stairmaster')) name = 'Climbmill';
                else if (exNameLower.includes('rowing')) name = 'Rowing';
                else if (exNameLower.includes('swim')) name = 'Swimming';
                
                const calculatedCalories = calculateExerciseCalories(ex, userProfile, workoutLogs || []);
                
                return { ...ex, date: log.date, name, calories: ex.calories && ex.calories > 0 ? ex.calories : calculatedCalories };
            })
    );

    const totalCalories = cardioExercises.reduce((sum: number, ex: any) => sum + (ex.calories || 0), 0);

    const statsByActivity = cardioExercises.reduce((acc: Record<string, { count: number; totalDistanceMi: number; totalDurationMin: number; totalCalories: number }>, ex: any) => {
        if (!acc[ex.name]) {
            acc[ex.name] = { count: 0, totalDistanceMi: 0, totalDurationMin: 0, totalCalories: 0 };
        }
        const stats = acc[ex.name];
        stats.count++;
        stats.totalCalories += ex.calories || 0;

        let distanceMi = 0;
        if (ex.distance) {
            if (ex.distanceUnit === 'km') distanceMi = ex.distance * 0.621371;
            else if (ex.distanceUnit === 'ft') distanceMi = ex.distance * 0.000189394;
            else if (ex.distanceUnit === 'mi') distanceMi = ex.distance;
        }
        stats.totalDistanceMi += distanceMi;

        let durationMin = 0;
        if (ex.duration) {
            if (ex.durationUnit === 'hr') durationMin = ex.duration * 60;
            else if (ex.durationUnit === 'sec') durationMin = ex.duration / 60;
            else if (ex.durationUnit === 'min') durationMin = ex.duration;
        }
        stats.totalDurationMin += durationMin;

        return acc;
    }, {} as Record<string, { count: number; totalDistanceMi: number; totalDurationMin: number; totalCalories: number }>);

    const pieChartData = Object.entries(statsByActivity).map(([name, stats]) => ({
        name: `${name} `, // Add padding
        value: Math.round((stats as any).totalCalories),
        fill: `var(--color-${name})`
    }));
    
    let calorieSummary = "";
    const weeklyGoal = userProfile?.weeklyCardioCalorieGoal;
    let weeklyAverage = 0;

    if (timeRange === 'weekly') {
        weeklyAverage = totalCalories;
        calorieSummary = `This week you've burned a total of ${Math.round(totalCalories).toLocaleString()} cardio calories.`;
    } else if (timeRange === 'monthly') {
        const start = startOfMonth(new Date());
        const end = endOfMonth(new Date());
        const daysSoFar = differenceInDays(new Date(Math.min(today.getTime(), end.getTime())), start) + 1;
        const weeksSoFar = Math.max(1, daysSoFar / 7);
        weeklyAverage = weeksSoFar > 0 ? totalCalories / weeksSoFar : 0;
        calorieSummary = `This month you've burned ${Math.round(totalCalories).toLocaleString()} cardio calories, averaging ${Math.round(weeklyAverage).toLocaleString()}/week.`;
    } else if (timeRange === 'yearly') {
        const uniqueMonthsWithData = new Set(cardioExercises.map(ex => format(ex.date, 'yyyy-MM'))).size;
        const weeksWithData = uniqueMonthsWithData * 4.345; // Average weeks in a month
        weeklyAverage = weeksWithData > 0 ? totalCalories / weeksWithData : 0;
        calorieSummary = `This year you've burned ${Math.round(totalCalories).toLocaleString()} cardio calories, averaging ${Math.round(weeklyAverage).toLocaleString()}/week.`;
    } else { // all-time
        const firstLogDate = workoutLogs && workoutLogs.length > 0 ? workoutLogs.reduce((earliest: WorkoutLog, log: WorkoutLog) => log.date < earliest.date ? log : earliest).date : new Date();
        const numWeeks = differenceInWeeks(new Date(), firstLogDate) || 1;
        weeklyAverage = numWeeks > 0 ? totalCalories / numWeeks : 0;
        calorieSummary = `You've burned ${Math.round(totalCalories).toLocaleString()} cardio calories in total, averaging ${Math.round(weeklyAverage).toLocaleString()}/week.`;
    }
    
    if (weeklyGoal && weeklyGoal > 0) {
        const percentageAchieved = (weeklyAverage / weeklyGoal) * 100;
        calorieSummary += ` Your weekly calorie target is ${weeklyGoal.toLocaleString()}.`;

        if (percentageAchieved >= 100) {
            const surplus = weeklyAverage - weeklyGoal;
            calorieSummary += ` You are beating your goal by ${Math.round(surplus).toLocaleString()} calories (${Math.round(percentageAchieved - 100)}% over).`;
        } else if (percentageAchieved >= 50) {
            const percentageRemaining = 100 - percentageAchieved;
            calorieSummary += ` You are only ${Math.round(percentageRemaining)}% away from your goal.`;
        } else {
            calorieSummary += ` You are at ${Math.round(percentageAchieved)}% of your goal, keep going!`;
        }
    }
    
    // --- Cardio Amount Bar Chart Data ---
    let cardioAmountChartData: any[] = [];
    const activities = Array.from(new Set(cardioExercises.map((ex: any) => ex.name)));
    const initialActivityData = Object.fromEntries(activities.map((act: string) => [act, 0]));

    const processAndFinalizeData = (dataMap: Map<string, any>) => {
        const finalizedData = Array.from(dataMap.values());
        finalizedData.forEach((dataPoint: any) => {
            let total = 0;
            activities.forEach((activity: string) => {
                total += dataPoint[activity] || 0;
            });
            dataPoint.total = Math.round(total);
        });
        return finalizedData;
    };

    switch(timeRange) {
        case 'weekly': {
            const weekStart = startOfWeek(today, { weekStartsOn: 0 });
            const daysInWeek = eachDayOfInterval({ start: weekStart, end: endOfWeek(today, { weekStartsOn: 0 }) });
            const dailyData = new Map<string, any>(daysInWeek.map((day: Date) => [format(day, 'yyyy-MM-dd'), { dateLabel: format(day, 'E'), ...initialActivityData }]));

            cardioExercises.forEach((ex: any) => {
                const dateKey = format(ex.date, 'yyyy-MM-dd');
                const dayData = dailyData.get(dateKey);
                if (dayData) {
                    dayData[ex.name] = (dayData[ex.name] || 0) + (ex.calories || 0);
                }
            });
            cardioAmountChartData = processAndFinalizeData(dailyData);
            break;
        }
        case 'monthly': {
            const monthStart = startOfMonth(today);
            const monthEnd = endOfMonth(today);
            const weeklyData = new Map<string, any>();
            
            // Get all weeks that have at least one day in the current month
            const weeks = eachWeekOfInterval({ start: monthStart, end: monthEnd }, { weekStartsOn: 0 });

            weeks.forEach((weekStart: Date) => {
                const weekEnd = endOfWeek(weekStart, { weekStartsOn: 0 });
                 // Ensure we only create labels for weeks that are part of the month
                if (weekStart.getMonth() === monthStart.getMonth() || weekEnd.getMonth() === monthStart.getMonth()) {
                     const dateLabel = `${format(weekStart, 'MMM d')}-${format(weekEnd, 'd')}`;
                     weeklyData.set(format(weekStart, 'yyyy-MM-dd'), { dateLabel, ...initialActivityData });
                }
            });

            cardioExercises.forEach((ex: any) => {
                const weekStartKey = format(startOfWeek(ex.date, { weekStartsOn: 0 }), 'yyyy-MM-dd');
                const weekData = weeklyData.get(weekStartKey);
                if (weekData) {
                    weekData[ex.name] = (weekData[ex.name] || 0) + (ex.calories || 0);
                }
            });
            cardioAmountChartData = processAndFinalizeData(weeklyData);
            break;
        }
        case 'yearly': {
            const monthlyData = new Map<string, any>();
            cardioExercises.forEach((ex: any) => {
                const monthKey = format(ex.date, 'yyyy-MM');
                if (!monthlyData.has(monthKey)) {
                    monthlyData.set(monthKey, { dateLabel: format(ex.date, 'MMM'), ...initialActivityData });
                }
                const monthData = monthlyData.get(monthKey);
                monthData[ex.name] = (monthData[ex.name] || 0) + (ex.calories || 0);
            });
            const finalizedData = processAndFinalizeData(monthlyData);
             // Only show months that have data
            cardioAmountChartData = finalizedData
                .filter((month: any) => Object.values(month).some((val: any) => typeof val === 'number' && val > 0))
                .sort((a: any, b: any) => {
                    const monthOrder = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
                    return monthOrder.indexOf(a.dateLabel) - monthOrder.indexOf(b.dateLabel);
            });
            break;
        }
        case 'all-time': {
            const yearlyData = new Map<string, any>();
            cardioExercises.forEach((ex: any) => {
                const yearKey = format(ex.date, 'yyyy');
                if (!yearlyData.has(yearKey)) {
                    yearlyData.set(yearKey, { dateLabel: yearKey, ...initialActivityData });
                }
                const yearData = yearlyData.get(yearKey);
                yearData[ex.name] = (yearData[ex.name] || 0) + (ex.calories || 0);
            });
            const finalizedData = processAndFinalizeData(yearlyData);
            cardioAmountChartData = Array.from(finalizedData.entries()).sort(([, a]: [any, any], [, b]: [any, any]) => a.dateLabel.localeCompare(b.dateLabel)).map(([, data]: [any, any]) => data);
            break;
        }
    }


    return { totalCalories, statsByActivity, pieChartData, calorieSummary, cardioAmountChartData };
}, [filteredData, workoutLogs, timeRange, userProfile]);


useEffect(() => {
    if (!selectedLift || !progressionChartData.chartData || progressionChartData.chartData.length < 2) {
        setCurrentLiftLevel(null);
        setTrendImprovement(null);
        setVolumeTrend(null);
        return;
    }
    
    if (userProfile && personalRecords) {
        const bestPRforLift = findBestPr(personalRecords, [selectedLiftKey]);

        if (bestPRforLift) {
            setCurrentLiftLevel(getStrengthLevel(bestPRforLift, userProfile));
        } else {
            setCurrentLiftLevel(null);
        }
    }
    
    const { chartData } = progressionChartData;
    
    // --- Trend Calculation Function ---
    const calculateTrend = (dataKey: 'e1RM' | 'volume') => {
        const points = chartData.map((d: any, i: number) => ({ x: i, y: d[dataKey] })).filter((p: any) => p.y > 0);
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
        const endY = slope * (chartData.length - 1) + intercept;
        
        if (startY > 0) {
            return ((endY - startY) / startY) * 100;
        }
        return null;
    };

    setTrendImprovement(calculateTrend('e1RM'));
    setVolumeTrend(calculateTrend('volume'));

}, [selectedLift, selectedLiftKey, progressionChartData, personalRecords, userProfile]);

  const handleAnalyzeProgression = () => {
    if (!userProfile) {
      toast({ title: "Profile Not Loaded", description: "Your user profile is not available. Please try again.", variant: "destructive" });
      return;
    }
    const sixWeeksAgo = subWeeks(new Date(), 6);
    if (!workoutLogs) return;

    const exerciseHistory = workoutLogs
      .filter((log: WorkoutLog) => isAfter(log.date, sixWeeksAgo))
      .flatMap((log: WorkoutLog) =>
        log.exercises
          .filter((ex) => getNormalizedExerciseName(ex.name) === selectedLiftKey)
          .map((ex) => ({
            date: log.date.toISOString(),
            weight: ex.weight || 0,
            sets: ex.sets || 0,
            reps: ex.reps || 0,
          }))
      );

    const analysisInput: AnalyzeLiftProgressionInput = {
        exerciseName: selectedLift, // Send the original name for the AI's context
        exerciseHistory,
        userProfile: {
            age: userProfile.age,
            gender: userProfile.gender,
            heightValue: userProfile.heightValue,
            heightUnit: userProfile.heightUnit,
            weightValue: userProfile.weightValue,
            weightUnit: userProfile.weightUnit,
            skeletalMuscleMassValue: userProfile.skeletalMuscleMassValue,
            skeletalMuscleMassUnit: userProfile.skeletalMuscleMassUnit,
            fitnessGoals: (userProfile.fitnessGoals || [])
              .filter((g: FitnessGoal) => !g.achieved)
              .map((g: FitnessGoal) => ({
                description: g.description,
                isPrimary: g.isPrimary || false,
              })),
        },
        currentLevel: currentLiftLevel || undefined,
        trendPercentage: trendImprovement ?? undefined,
        volumeTrendPercentage: volumeTrend ?? undefined,
    };
    
    analyzeProgressionMutation.mutate(analysisInput);
  };

  const focusBadgeProps = (focus: ImbalanceFocus): { variant: 'secondary' | 'default' | 'destructive', text: string } => {
    switch (focus) {
        case 'Level Imbalance': return { variant: 'default', text: 'Level Imbalance' };
        case 'Ratio Imbalance': return { variant: 'destructive', text: 'Ratio Imbalance' };
        case 'Balanced': return { variant: 'secondary', text: 'Balanced' };
        default: return { variant: 'secondary', text: 'Balanced' };
    }
  };

  const formatCardioDuration = (totalMinutes: number): string => {
    const hours = Math.floor(totalMinutes / 60);
    const minutes = Math.round(totalMinutes % 60);
    if (hours > 0) {
        return `${hours}h ${minutes}m`;
    }
    return `${minutes}m`;
  }
  
  const CustomBarChartLegend = ({ payload }: any) => {
    if (!payload) return null;
    const legendOrder: ChartDataKey[] = ['upperBody', 'lowerBody', 'core', 'fullBody', 'cardio', 'other'];
    const payloadMap = payload.reduce((acc: any, entry: any) => { acc[entry.dataKey] = entry; return acc; }, {});
    return <div className="grid grid-cols-3 gap-x-4 gap-y-2 text-xs mt-4">{legendOrder.map(name => { const entry = payloadMap[name]; if (!entry || !chartConfig[name]) return null; return <div key={`item-${entry.dataKey}`} className="flex items-center justify-center gap-1.5"><span className="h-2.5 w-2.5 shrink-0 rounded-[2px]" style={{ backgroundColor: entry.color }} /><span className="text-muted-foreground">{chartConfig[name].label}</span></div>; })}</div>;
  };
  
  const isLoading = isLoadingProfile || (enableDataFetching && (isLoadingWorkouts || isLoadingPrs));
  const isError = isErrorProfile || (enableDataFetching && (isErrorWorkouts || isErrorPrs));
  const showProgressionReanalyze = !!progressionAnalysisToRender;

  const getLevelBadgeVariant = (level: StrengthLevel | null): 'secondary' | 'default' | 'destructive' | 'outline' => {
    if (!level) return 'outline';
    switch (level) {
        case 'Beginner': return 'destructive';
        case 'Intermediate': return 'secondary';
        case 'Advanced': return 'default';
        case 'Elite': return 'default'; // Or some other variant for elite, e.g., a custom gold one
        default: return 'outline';
    }
  };

  const getTrendBadgeVariant = (trend: number | null): 'default' | 'destructive' | 'secondary' => {
    if (trend === null) return 'secondary';
    if (trend > 1) return 'default';
    if (trend < -1) return 'destructive';
    return 'secondary';
  }

  if (isLoadingProfile) {
    return (
      <div className="container mx-auto px-4 py-8 flex justify-center items-center h-full">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
      </div>
    );
  }

  if (isErrorProfile) {
    return (
      <div className="container mx-auto px-4 py-8">
        <ErrorState message="Could not load your profile data. Please try again later." />
      </div>
    );
  }

  if (isProfileNotFound) {
    return (
      <div className="container mx-auto px-4 py-8 text-center">
        <header className="mb-12">
          <h1 className="font-headline text-4xl font-bold text-primary md:text-5xl">Unlock Your Analysis</h1>
          <p className="mt-2 text-lg text-muted-foreground">Create a profile to view your progress and get AI-powered insights.</p>
        </header>
        <Card className="shadow-lg max-w-md mx-auto">
          <CardHeader>
            <CardTitle className="font-headline">Create Your Profile First</CardTitle>
            <CardDescription>
              Your profile is needed to analyze workout data and calculate strength metrics.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Link href="/profile" passHref>
              <Button className="w-full">
                <UserPlus className="mr-2" />
                Go to Profile Setup
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <header className="mb-8">
        <h1 className="font-headline text-3xl font-bold text-primary">Your Progress</h1>
        <p className="text-muted-foreground">Visualize your fitness journey and stay motivated.</p>
      </header>
      <div className="mb-6">
        <Select value={timeRange} onValueChange={setTimeRange}>
          <SelectTrigger className="w-[180px] bg-card shadow">
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
      
      {isError && (
          <div className="mb-6">
              <ErrorState message="Could not load your progress data. Please try again later." />
          </div>
      )}
      
      {isLoading ? <Card className="shadow-lg mb-6 h-40 flex justify-center items-center"><Loader2 className="h-8 w-8 animate-spin text-primary" /></Card>
      : !isError && chartData.periodSummary && (
        <Card className="shadow-lg mb-6 bg-card"><CardHeader><CardTitle className="font-headline flex items-center gap-2 text-xl"><TrendingUp className="h-6 w-6 text-primary" />{chartData.periodSummary.periodLabel}</CardTitle></CardHeader><CardContent className="grid grid-cols-2 gap-y-6 gap-x-3 md:grid-cols-5 text-center py-6">{Object.entries({"Workout Days": chartData.periodSummary.workoutDays, "Weight Lifted (lbs)": chartData.periodSummary.totalWeightLiftedLbs.toLocaleString(), "Distance (mi)": chartData.periodSummary.totalDistanceMi.toLocaleString(), "Cardio Duration": formatCardioDuration(chartData.periodSummary.totalCardioDurationMin), "Calories Burned": chartData.periodSummary.totalCaloriesBurned.toLocaleString()}).map(([label, value]) => <div key={label}><p className="text-3xl font-bold text-accent">{value}</p><p className="text-sm text-muted-foreground mt-1">{label}</p></div>)}</CardContent></Card>
      )}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-6">
        {isLoading ? Array.from({length: 6}).map((_, i) => <Card key={i} className="shadow-lg lg:col-span-3 h-96 flex justify-center items-center"><Loader2 className="h-8 w-8 animate-spin text-primary" /></Card>)
        : !isError && (<>
            <ExerciseVarietyCard
              isLoading={isLoading}
              isError={isError}
              workoutFrequencyData={chartData.workoutFrequencyData}
              timeRange={timeRange}
            />
            <MilestonesCard
              isLoading={isLoading}
              isError={isError}
              newPrsData={chartData.newPrsData}
              achievedGoalsData={chartData.achievedGoalsData}
              timeRange={timeRange}
            />
            <CalorieBreakdownCard
              isLoading={isLoading}
              isError={isError}
              categoryCalorieData={chartData.categoryCalorieData}
              timeRange={timeRange}
            />
            <RepetitionBreakdownCard
              isLoading={isLoading}
              isError={isError}
              categoryRepData={chartData.categoryRepData}
              timeRange={timeRange}
            />


            <StrengthBalanceCard
              isLoading={isLoading}
              isError={isError}
              userProfile={userProfile!}
              personalRecords={personalRecords}
              strengthAnalysis={userProfile?.strengthAnalysis}
            />
            <LiftProgressionCard
              isLoading={isLoading}
              isError={isError}
              userProfile={userProfile!}
              workoutLogs={workoutLogs}
              personalRecords={personalRecords}
              selectedLift={selectedLift}
              setSelectedLift={setSelectedLift}
              frequentlyLoggedLifts={frequentlyLoggedLifts}
            />
            <CardioAnalysisCard
              isLoading={isLoading}
              isError={isError}
              userProfile={userProfile!}
              workoutLogs={workoutLogs}
              filteredData={filteredData}
              timeRange={timeRange}
              timeRangeDisplayNames={timeRangeDisplayNames}
            />
        </>)}
      </div>
    </div>
  );
}







    
















    

    















