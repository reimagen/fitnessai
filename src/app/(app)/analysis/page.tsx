
"use client";

import { Bar, BarChart, CartesianGrid, ResponsiveContainer, XAxis, YAxis, Tooltip, Legend, PieChart, Pie, Cell } from 'recharts';
import { ChartConfig, ChartContainer, ChartTooltipContent, ChartLegendContent } from '@/components/ui/chart';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import React, { useState, useMemo, useEffect } from 'react';
import type { WorkoutLog, PersonalRecord, ExerciseCategory, StrengthImbalanceOutput, UserProfile, StrengthLevel, Exercise } from '@/lib/types';
import { useWorkouts, usePersonalRecords, useUserProfile } from '@/lib/firestore.service';
import { format, isWithinInterval, startOfWeek, endOfWeek, startOfMonth, endOfMonth, startOfYear, endOfYear, getWeek, getYear, parse, eachDayOfInterval, getWeekOfMonth, type Interval } from 'date-fns';
import { TrendingUp, Award, Flame, Route, IterationCw, Scale, Loader2, Zap, AlertTriangle, Lightbulb, Milestone, Trophy } from 'lucide-react';
import { analyzeStrengthAction } from './actions';
import { useToast } from '@/hooks/use-toast';
import { getStrengthLevel, getStrengthThresholds } from '@/lib/strength-standards';


const IMBALANCE_TYPES = [
    'Horizontal Push vs. Pull',
    'Vertical Push vs. Pull',
    'Quad vs. Hamstring',
    'Adductor vs. Abductor',
] as const;

type ImbalanceType = (typeof IMBALANCE_TYPES)[number];
type ImbalanceFocus = 'Balanced' | 'Level Imbalance' | 'Ratio Imbalance';

const IMBALANCE_CONFIG: Record<ImbalanceType, { lift1Options: string[], lift2Options: string[], targetRatioDisplay: string, ratioCalculation: (l1: number, l2: number) => number }> = {
    'Horizontal Push vs. Pull': { lift1Options: ['bench press', 'chest press', 'butterfly'], lift2Options: ['seated row', 'reverse fly', 'reverse flys'], targetRatioDisplay: '1:1', ratioCalculation: (l1, l2) => l1/l2 },
    'Vertical Push vs. Pull': { lift1Options: ['overhead press', 'shoulder press'], lift2Options: ['lat pulldown'], targetRatioDisplay: '0.75:1', ratioCalculation: (l1, l2) => l1/l2 },
    'Quad vs. Hamstring': { lift1Options: ['leg extension'], lift2Options: ['leg curl'], targetRatioDisplay: '1.33:1', ratioCalculation: (l1, l2) => l1/l2 },
    'Adductor vs. Abductor': { lift1Options: ['adductor'], lift2Options: ['abductor'], targetRatioDisplay: '0.8:1', ratioCalculation: (l1, l2) => l1/l2 },
};

// Helper to find the best PR for a given list of exercises
function findBestPr(records: PersonalRecord[], exerciseNames: string[]): PersonalRecord | null {
    const relevantRecords = records.filter(r => exerciseNames.some(name => r.exerciseName.trim().toLowerCase() === name.trim().toLowerCase()));
    if (relevantRecords.length === 0) return null;

    return relevantRecords.reduce((best, current) => {
        const bestWeightKg = best.weightUnit === 'lbs' ? best.weight * 0.453592 : best.weight;
        const currentWeightKg = current.weightUnit === 'lbs' ? current.weight * 0.453592 : current.weight;
        return currentWeightKg > bestWeightKg ? current : best;
    });
}


const chartConfig = {
  distance: { label: "Distance (mi)", color: "hsl(var(--accent))" },
  upperBody: { label: "Upper Body", color: "hsl(var(--chart-1))" },
  fullBody: { label: "Full Body", color: "hsl(var(--chart-2))" },
  lowerBody: { label: "Lower Body", color: "hsl(var(--chart-3))" },
  cardio: { label: "Cardio", color: "hsl(var(--chart-4))" },
  core: { label: "Core", color: "hsl(var(--chart-5))" },
  other: { label: "Other", color: "hsl(var(--chart-6))" },
  value: { label: "Value", color: "hsl(var(--accent))" },
} satisfies ChartConfig;

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

const timeRangeDisplayNames: Record<string, string> = {
  'weekly': 'This Week',
  'monthly': 'This Month',
  'yearly': 'This Year',
  'all-time': 'All Time',
};

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
    path += ` Z`;
    return path;
};

const stackOrder: (keyof Omit<ChartDataPoint, 'dateLabel' | 'date'>)[] = ['upperBody', 'lowerBody', 'cardio', 'core', 'fullBody', 'other'];

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

type StrengthFinding = Omit<StrengthImbalanceOutput['findings'][0], 'insight' | 'recommendation'> & {
    lift1Level: StrengthLevel;
    lift2Level: StrengthLevel;
};

// Helper function to extract running exercises and convert distances to miles
const getRunningExercises = (logs: WorkoutLog[]): (Exercise & { date: Date })[] => {
  const runningExercises: (Exercise & { date: Date })[] = [];
  logs.forEach(log => {
    log.exercises.forEach(ex => {
      const exerciseName = ex.name.trim().toLowerCase();
      const isRunningActivity = exerciseName.includes('run') || exerciseName.includes('treadmill');
      if (ex.category === 'Cardio' && isRunningActivity && ex.distance && ex.distance > 0) {
        let distanceInMiles = ex.distance;
        if (ex.distanceUnit === 'km') distanceInMiles = ex.distance * 0.621371;
        else if (ex.distanceUnit === 'ft') distanceInMiles = ex.distance * 0.000189394;
        
        runningExercises.push({
          ...ex,
          distance: distanceInMiles, // Standardize to miles
          distanceUnit: 'mi',
          date: log.date,
        });
      }
    });
  });
  return runningExercises.sort((a, b) => a.date.getTime() - b.date.getTime());
};

export default function AnalysisPage() {
  const { toast } = useToast();
  const [timeRange, setTimeRange] = useState('weekly');
  const [isAnalysisLoading, setIsAnalysisLoading] = useState(false);
  const [latestAnalysis, setLatestAnalysis] = useState<StrengthImbalanceOutput | null>(null);

  const { data: workoutLogs, isLoading: isLoadingWorkouts } = useWorkouts();
  const { data: personalRecords, isLoading: isLoadingPrs } = usePersonalRecords();
  const { data: userProfile, isLoading: isLoadingProfile } = useUserProfile();

  const analysisToRender = latestAnalysis || userProfile?.strengthAnalysis?.result;
  const generatedDate = latestAnalysis ? new Date() : userProfile?.strengthAnalysis?.generatedDate;


  const handleAnalyzeStrength = async () => {
    if (!personalRecords || personalRecords.length === 0) {
      toast({
        title: "Not Enough Data",
        description: "Log some personal records before running an analysis.",
        variant: "default",
      });
      return;
    }
    if (!userProfile) {
        toast({
            title: "Profile Not Loaded",
            description: "Please wait for your profile to load before running analysis.",
            variant: "default",
        });
        return;
    }

    setIsAnalysisLoading(true);

    const prsForAnalysis = personalRecords.map(pr => ({
      ...pr,
      date: pr.date.toISOString(), // Convert Date to string for server action
    }));

    const analysisInput = {
        personalRecords: prsForAnalysis,
        userProfile: {
            age: userProfile.age,
            gender: userProfile.gender,
            heightValue: userProfile.heightValue,
            heightUnit: userProfile.heightUnit,
            weightValue: userProfile.weightValue,
            weightUnit: userProfile.weightUnit,
            skeletalMuscleMassValue: userProfile.skeletalMuscleMassValue,
            skeletalMuscleMassUnit: userProfile.skeletalMuscleMassUnit,
            fitnessGoals: userProfile.fitnessGoals
              .filter(g => !g.achieved)
              .map(g => ({
                description: g.description,
                isPrimary: g.isPrimary || false,
              })),
        }
    };

    const result = await analyzeStrengthAction(analysisInput);

    if (result.success && result.data) {
      setLatestAnalysis(result.data);
      toast({
        title: "Analysis Complete",
        description: result.data.summary || (result.data.findings.length > 0 ? "Potential areas for improvement found." : "Your strength appears well-balanced."),
      });
    } else {
      toast({
        title: "Analysis Failed",
        description: result.error || "An unknown error occurred.",
        variant: "destructive",
      });
    }
    setIsAnalysisLoading(false);
  };
  
  const clientSideFindings = useMemo<(StrengthFinding | { imbalanceType: ImbalanceType; hasData: false })[]>(() => {
    if (!personalRecords || !userProfile) {
      return [];
    }
    const findings: (StrengthFinding | { imbalanceType: ImbalanceType; hasData: false })[] = [];

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

        let targetRatioDisplay = config.targetRatioDisplay;
        let targetRatioValue: number | null = null;
        
        const staticRatioParts = config.targetRatioDisplay.split(':');
        if(staticRatioParts.length === 2 && !isNaN(parseFloat(staticRatioParts[0])) && !isNaN(parseFloat(staticRatioParts[1])) && parseFloat(staticRatioParts[1]) !== 0) {
            targetRatioValue = parseFloat(staticRatioParts[0]) / parseFloat(staticRatioParts[1]);
        }

        if (lift1Level !== 'N/A' && lift2Level !== 'N/A') {
            let targetLevelForRatio: 'Intermediate' | 'Advanced' | 'Elite' = 'Elite';
            if (lift1Level === 'Beginner' || lift2Level === 'Beginner') {
                targetLevelForRatio = 'Intermediate';
            } else if (lift1Level === 'Intermediate' || lift2Level === 'Intermediate') {
                targetLevelForRatio = 'Advanced';
            }

            const lift1Thresholds = getStrengthThresholds(config.lift1Options[0], userProfile, 'kg');
            const lift2Thresholds = getStrengthThresholds(config.lift2Options[0], userProfile, 'kg');

            if (lift1Thresholds && lift2Thresholds) {
                const targetLevelKey = targetLevelForRatio.toLowerCase() as keyof typeof lift1Thresholds;
                const targetLift1Weight = lift1Thresholds[targetLevelKey];
                const targetLift2Weight = lift2Thresholds[targetLevelKey];
                
                if (targetLift2Weight > 0) {
                    targetRatioValue = targetLift1Weight / targetLift2Weight;
                    targetRatioDisplay = `${targetRatioValue.toFixed(2)}:1`;
                }
            }
        }
        
        let imbalanceFocus: ImbalanceFocus = 'Balanced';
        let ratioIsUnbalanced = false;
        if (targetRatioValue !== null) {
            const deviation = Math.abs(ratio - targetRatioValue);
            const tolerance = targetRatioValue * 0.10; // 10% tolerance
            ratioIsUnbalanced = deviation > tolerance;
        }

        if (lift1Level !== 'N/A' && lift2Level !== 'N/A' && lift1Level !== lift2Level) {
            imbalanceFocus = 'Level Imbalance';
        } else if (ratioIsUnbalanced) {
            imbalanceFocus = 'Ratio Imbalance';
        }

        findings.push({
            imbalanceType: type,
            lift1Name: lift1.exerciseName,
            lift1Weight: lift1.weight,
            lift1Unit: lift1.weightUnit,
            lift2Name: lift2.exerciseName,
            lift2Weight: lift2.weight,
            lift2Unit: lift2.weightUnit,
            userRatio: `${ratio.toFixed(2)}:1`,
            targetRatio: targetRatioDisplay,
            imbalanceFocus: imbalanceFocus,
            lift1Level,
            lift2Level,
        });
    });

    return findings;
  }, [personalRecords, userProfile]);


  const filteredData = useMemo(() => {
    const today = new Date();
    let logsForPeriod = workoutLogs || [];
    let prsForPeriod = personalRecords || [];
    
    if (timeRange !== 'all-time') {
      let interval: Interval;
      if (timeRange === 'weekly') interval = { start: startOfWeek(today, { weekStartsOn: 0 }), end: endOfWeek(today, { weekStartsOn: 0 }) };
      else if (timeRange === 'monthly') interval = { start: startOfMonth(today), end: endOfMonth(today) };
      else interval = { start: startOfYear(today), end: endOfYear(today) };
      logsForPeriod = (workoutLogs || []).filter(log => isWithinInterval(log.date, interval));
      prsForPeriod = (personalRecords || []).filter(pr => isWithinInterval(pr.date, interval));
    }
    return { logsForPeriod, prsForPeriod };
  }, [timeRange, workoutLogs, personalRecords]);

  const chartData = useMemo(() => {
    const { logsForPeriod, prsForPeriod } = filteredData;
    const periodLabel = `${timeRangeDisplayNames[timeRange]}'s Summary`;
    const today = new Date();

    let workoutFrequencyData: ChartDataPoint[] = [];
    
    // Helper function to process logs for a given period and return unique exercise counts
    const getUniqueExerciseCounts = (logs: WorkoutLog[]) => {
      const uniqueExercises: { [key in keyof Omit<ChartDataPoint, 'dateLabel' | 'date'>]?: Set<string> } = {};
      
      logs.forEach(log => {
        log.exercises.forEach(ex => {
          const camelCaseCategory = categoryToCamelCase(ex.category || 'Other');
          if (!uniqueExercises[camelCaseCategory]) {
            uniqueExercises[camelCaseCategory] = new Set();
          }
          uniqueExercises[camelCaseCategory]!.add(ex.name.trim().toLowerCase());
        });
      });
      
      const counts: Partial<ChartDataPoint> = {};
      for (const category in uniqueExercises) {
        counts[category as keyof typeof counts] = uniqueExercises[category as keyof uniqueExercises]!.size;
      }
      return counts;
    };
    
    switch (timeRange) {
        case 'weekly': {
            const weekStart = startOfWeek(today, { weekStartsOn: 0 });
            const weekEnd = endOfWeek(today, { weekStartsOn: 0 });
            const daysInWeek = eachDayOfInterval({ start: weekStart, end: weekEnd });

            workoutFrequencyData = daysInWeek.map(day => {
                const dateKey = format(day, 'yyyy-MM-dd');
                const logsForDay = logsForPeriod.filter(log => format(log.date, 'yyyy-MM-dd') === dateKey);
                const counts = getUniqueExerciseCounts(logsForDay);
                return {
                    date: dateKey,
                    dateLabel: format(day, 'MMM d'),
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
            logsForPeriod.forEach(log => {
                const weekStart = startOfWeek(log.date, { weekStartsOn: 0 });
                const dateKey = format(weekStart, 'yyyy-MM-dd');
                if (!aggregatedData[dateKey]) aggregatedData[dateKey] = [];
                aggregatedData[dateKey].push(log);
            });

            workoutFrequencyData = Object.entries(aggregatedData).map(([dateKey, logs]) => {
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
            }).sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
            break;
        }
        
        case 'yearly': {
            const aggregatedData: { [key: string]: WorkoutLog[] } = {};
            logsForPeriod.forEach(log => {
                const dateKey = format(log.date, 'yyyy-MM');
                if (!aggregatedData[dateKey]) aggregatedData[dateKey] = [];
                aggregatedData[dateKey].push(log);
            });
            workoutFrequencyData = Object.entries(aggregatedData).map(([dateKey, logs]) => {
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
            }).sort((a, b) => parse(a.date, 'yyyy-MM', new Date()).getTime() - parse(b.date, 'yyyy-MM', new Date()).getTime());
            break;
        }
        
        case 'all-time': {
             const aggregatedData: { [key: string]: WorkoutLog[] } = {};
            logsForPeriod.forEach(log => {
                const dateKey = format(log.date, 'yyyy');
                if (!aggregatedData[dateKey]) aggregatedData[dateKey] = [];
                aggregatedData[dateKey].push(log);
            });
            workoutFrequencyData = Object.entries(aggregatedData).map(([dateKey, logs]) => {
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
            }).sort((a, b) => parseInt(a.date) - parseInt(b.date));
            break;
        }
    }


    const repsByCat: Record<keyof Omit<ChartDataPoint, 'dateLabel' | 'date'>, number> = { upperBody: 0, lowerBody: 0, fullBody: 0, cardio: 0, core: 0, other: 0 };
    const caloriesByCat: Record<keyof Omit<ChartDataPoint, 'dateLabel' | 'date'>, number> = { upperBody: 0, lowerBody: 0, fullBody: 0, cardio: 0, core: 0, other: 0 };
    
    logsForPeriod.forEach(log => { 
        log.exercises.forEach(ex => {
            const camelCaseCategory = categoryToCamelCase(ex.category || 'Other');
            repsByCat[camelCaseCategory] += ex.reps || 0;
            caloriesByCat[camelCaseCategory] += ex.calories || 0;
        });
    });
    const categoryRepData = Object.entries(repsByCat).filter(([, value]) => value > 0).map(([name, value]) => ({ key: name, name: (chartConfig[name as ChartDataKey]?.label || name) as string, value, fill: `var(--color-${name})`}));
    const categoryCalorieData = Object.entries(caloriesByCat).filter(([, value]) => value > 0).map(([name, value]) => ({ key: name, name: (chartConfig[name as ChartDataKey]?.label || name) as string, value, fill: `var(--color-${name})`}));
    
    const uniqueWorkoutDates = new Set<string>();
    let totalWeight = 0, totalDistance = 0, totalDuration = 0, totalCalories = 0;
    logsForPeriod.forEach(log => {
        uniqueWorkoutDates.add(format(log.date, 'yyyy-MM-dd'));
        log.exercises.forEach(ex => {
            if (ex.weight && ex.sets && ex.reps) totalWeight += ex.weight * ex.sets * ex.reps * (ex.weightUnit === 'kg' ? 2.20462 : 1);
            if (ex.category === 'Cardio' && ex.distance) {
                let distMi = ex.distance;
                if (ex.distanceUnit === 'km') distMi *= 0.621371; else if (ex.distanceUnit === 'ft') distMi *= 0.000189394;
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
    return { workoutFrequencyData, newPrsData: prsForPeriod.sort((a,b) => b.date.getTime() - a.date.getTime()), categoryRepData, categoryCalorieData, periodSummary };
  }, [filteredData, timeRange, workoutLogs, personalRecords]);
  
  const runningProgressionData = useMemo(() => {
    const allRunningExercises = getRunningExercises(workoutLogs || []);
    if (allRunningExercises.length === 0) return null;

    let runsForPeriod: (Exercise & { date: Date })[];
    const today = new Date();
    if (timeRange !== 'all-time') {
      let interval: Interval;
      if (timeRange === 'weekly') interval = { start: startOfWeek(today, { weekStartsOn: 0 }), end: endOfWeek(today, { weekStartsOn: 0 }) };
      else if (timeRange === 'monthly') interval = { start: startOfMonth(today), end: endOfMonth(today) };
      else interval = { start: startOfYear(today), end: endOfYear(today) };
      runsForPeriod = allRunningExercises.filter(run => isWithinInterval(run.date, interval));
    } else {
      runsForPeriod = allRunningExercises;
    }

    if (runsForPeriod.length === 0) return { chartData: [], totalDistance: 0, avgDistance: 0 };
    
    let chartData: { name: string, value: number }[] = [];
    const totalDistance = runsForPeriod.reduce((sum, run) => sum + (run.distance || 0), 0);
    const avgDistance = runsForPeriod.length > 0 ? totalDistance / runsForPeriod.length : 0;

    switch(timeRange) {
        case 'weekly':
            chartData = runsForPeriod.map(run => ({ name: format(run.date, 'E d'), value: parseFloat(run.distance?.toFixed(2) || '0') }));
            break;
        case 'monthly': {
            const weeklyTotals: { [week: string]: { total: number, count: number } } = {};
            runsForPeriod.forEach(run => {
                const weekNum = getWeekOfMonth(run.date, { weekStartsOn: 0 });
                const weekKey = `Wk ${weekNum}`;
                 if (!weeklyTotals[weekKey]) {
                    weeklyTotals[weekKey] = { total: 0, count: 0 };
                }
                weeklyTotals[weekKey].total += run.distance || 0;
                weeklyTotals[weekKey].count += 1;
            });
            chartData = Object.entries(weeklyTotals).map(([name, data]) => ({ name, value: parseFloat(data.total.toFixed(2)) }));
            break;
        }
        case 'yearly': {
            const monthlyTotals: { [month: string]: { total: number, count: number } } = {};
            runsForPeriod.forEach(run => {
                const monthName = format(run.date, 'MMM');
                if (!monthlyTotals[monthName]) {
                    monthlyTotals[monthName] = { total: 0, count: 0 };
                }
                monthlyTotals[monthName].total += run.distance || 0;
                monthlyTotals[monthName].count += 1;
            });
            chartData = Object.entries(monthlyTotals).map(([name, data]) => ({ name, value: parseFloat(data.total.toFixed(2)) }));
            break;
        }
        case 'all-time': {
            const yearlyTotals: { [year: string]: { total: number, count: number } } = {};
            runsForPeriod.forEach(run => {
                const yearName = format(run.date, 'yyyy');
                if (!yearlyTotals[yearName]) {
                    yearlyTotals[yearName] = { total: 0, count: 0 };
                }
                yearlyTotals[yearName].total += run.distance || 0;
                yearlyTotals[yearName].count += 1;
            });
            chartData = Object.entries(yearlyTotals).map(([name, data]) => ({ name, value: parseFloat(data.total.toFixed(2)) }));
            break;
        }
    }
    return { chartData, totalDistance, avgDistance };

  }, [workoutLogs, timeRange]);

  const focusBadgeProps = (focus: ImbalanceFocus): { variant: 'secondary' | 'default' | 'destructive', text: string } => {
    switch (focus) {
        case 'Level Imbalance': return { variant: 'default', text: 'Level Imbalance' };
        case 'Ratio Imbalance': return { variant: 'destructive', text: 'Ratio Imbalance' };
        case 'Balanced': return { variant: 'secondary', text: 'Balanced' };
        default: return { variant: 'secondary', text: 'Balanced' };
    }
  };

  const RADIAN = Math.PI / 180;
  const renderPieLabel = (props: any, unit?: 'reps' | 'kcal') => {
    const { cx, cy, midAngle, innerRadius, outerRadius, percent, name, value } = props;
    if (percent < 0.05) return null;
    const radius = innerRadius + (outerRadius - innerRadius) * 0.5 + 15;
    const x = cx + radius * Math.cos(-midAngle * RADIAN);
    const y = cy + radius * Math.sin(-midAngle * RADIAN);
    const displayValue = unit === 'kcal' ? Math.round(value) : value;
    const unitString = unit ? ` ${unit}` : '';
    return <text x={x} y={y} fill="hsl(var(--foreground))" textAnchor={x > cx ? 'start' : 'end'} dominantBaseline="central" className="text-xs">{`${name} (${displayValue}${unitString})`}</text>;
  };

  const formatCardioDuration = (totalMinutes: number): string => `${Math.floor(totalMinutes / 60)}h ${totalMinutes % 60}m`;
  
  const CustomBarChartLegend = ({ payload }: any) => {
    if (!payload) return null;
    const legendOrder: ChartDataKey[] = ['upperBody', 'lowerBody', 'core', 'fullBody', 'cardio', 'other'];
    const payloadMap = payload.reduce((acc: any, entry: any) => { acc[entry.dataKey] = entry; return acc; }, {});
    return <div className="grid grid-cols-3 gap-x-4 gap-y-2 text-xs mt-4">{legendOrder.map(name => { const entry = payloadMap[name]; if (!entry || !chartConfig[name]) return null; return <div key={`item-${entry.dataKey}`} className="flex items-center justify-center gap-1.5"><span className="h-2.5 w-2.5 shrink-0 rounded-[2px]" style={{ backgroundColor: entry.color }} /><span className="text-muted-foreground">{chartConfig[name].label}</span></div>; })}</div>;
  };
  
  const isLoading = isLoadingWorkouts || isLoadingPrs || isLoadingProfile;

  return (
    <div className="container mx-auto px-4 py-8">
      <header className="mb-8">
        <h1 className="font-headline text-3xl font-bold text-primary">Your Progress</h1>
        <p className="text-muted-foreground">Visualize your fitness journey and stay motivated.</p>
      </header>
      <div className="mb-6"><Select value={timeRange} onValueChange={setTimeRange}><SelectTrigger className="w-[180px]"><SelectValue placeholder="Select time range" /></SelectTrigger><SelectContent><SelectItem value="weekly">This Week</SelectItem><SelectItem value="monthly">This Month</SelectItem><SelectItem value="yearly">This Year</SelectItem><SelectItem value="all-time">All Time</SelectItem></SelectContent></Select></div>
      {isLoading ? <Card className="shadow-lg mb-6 h-40 flex justify-center items-center"><Loader2 className="h-8 w-8 animate-spin text-primary" /></Card>
      : chartData.periodSummary && (
        <Card className="shadow-lg mb-6 bg-card"><CardHeader><CardTitle className="font-headline flex items-center gap-2 text-xl"><TrendingUp className="h-6 w-6 text-primary" />{chartData.periodSummary.periodLabel}</CardTitle></CardHeader><CardContent className="grid grid-cols-2 gap-y-6 gap-x-3 md:grid-cols-5 text-center py-6">{Object.entries({"Workout Days": chartData.periodSummary.workoutDays, "Weight Lifted (lbs)": chartData.periodSummary.totalWeightLiftedLbs.toLocaleString(), "Distance (mi)": chartData.periodSummary.totalDistanceMi, "Cardio Duration": formatCardioDuration(chartData.periodSummary.totalCardioDurationMin), "Calories Burned": chartData.periodSummary.totalCaloriesBurned.toLocaleString()}).map(([label, value]) => <div key={label}><p className="text-3xl font-bold text-accent">{value}</p><p className="text-sm text-muted-foreground mt-1">{label}</p></div>)}</CardContent></Card>
      )}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-6">
        {isLoading ? Array.from({length: 6}).map((_, i) => <Card key={i} className="shadow-lg lg:col-span-3 h-96 flex justify-center items-center"><Loader2 className="h-8 w-8 animate-spin text-primary" /></Card>)
        : (<>
            <Card className="shadow-lg lg:col-span-3"><CardHeader><CardTitle className="font-headline">Exercise Variety</CardTitle><CardDescription>Unique exercises performed per category for {timeRangeDisplayNames[timeRange]}.</CardDescription></CardHeader><CardContent>{chartData.workoutFrequencyData.length > 0 ? <ChartContainer config={chartConfig} className="h-[300px] w-full"><ResponsiveContainer width="100%" height="100%"><BarChart data={chartData.workoutFrequencyData} margin={{ top: 20, right: 20, left: -10, bottom: 5 }}><CartesianGrid strokeDasharray="3 3" vertical={false}/><XAxis dataKey="dateLabel" tick={{fontSize: 12}} interval={0} /><YAxis allowDecimals={false} /><Tooltip content={<ChartTooltipContent />} /><Legend content={<CustomBarChartLegend />} /><Bar dataKey="upperBody" stackId="a" fill="var(--color-upperBody)" shape={<RoundedBar />} /><Bar dataKey="lowerBody" stackId="a" fill="var(--color-lowerBody)" shape={<RoundedBar />} /><Bar dataKey="cardio" stackId="a" fill="var(--color-cardio)" shape={<RoundedBar />} /><Bar dataKey="core" stackId="a" fill="var(--color-core)" shape={<RoundedBar />} /><Bar dataKey="fullBody" stackId="a" fill="var(--color-fullBody)" shape={<RoundedBar />} /><Bar dataKey="other" stackId="a" fill="var(--color-other)" shape={<RoundedBar />} /></BarChart></ResponsiveContainer></ChartContainer> : <div className="h-[300px] flex items-center justify-center text-muted-foreground"><p>No workout data for this period.</p></div>}</CardContent></Card>
            <Card className="shadow-lg lg:col-span-3"><CardHeader><CardTitle className="font-headline flex items-center gap-2"><Award className="h-6 w-6 text-accent" /> New Personal Records</CardTitle><CardDescription>Achievements in {timeRangeDisplayNames[timeRange]}</CardDescription></CardHeader><CardContent>{chartData.newPrsData.length > 0 ? <div className="h-[300px] w-full overflow-y-auto pr-2 space-y-3">{chartData.newPrsData.map(pr => <div key={pr.id} className="flex items-center justify-between p-3 rounded-md bg-secondary/50"><div className="flex flex-col"><p className="font-semibold text-primary">{pr.exerciseName}</p><p className="text-xs text-muted-foreground">{format(pr.date, "MMMM d, yyyy")}</p></div><p className="font-bold text-lg text-accent">{pr.weight} <span className="text-sm font-medium text-muted-foreground">{pr.weightUnit}</span></p></div>)}</div> : <div className="h-[300px] flex items-center justify-center text-muted-foreground"><p>No new PRs for this period.</p></div>}</CardContent></Card>
            <Card className="shadow-lg lg:col-span-3"><CardHeader><CardTitle className="font-headline flex items-center gap-2"><IterationCw className="h-6 w-6 text-primary" /> Repetition Breakdown</CardTitle><CardDescription>Total reps per category for {timeRangeDisplayNames[timeRange]}</CardDescription></CardHeader><CardContent>{chartData.categoryRepData.length > 0 ? <ChartContainer config={chartConfig} className="h-[300px] w-full"><ResponsiveContainer width="100%" height="100%"><PieChart margin={{ top: 20, right: 20, bottom: 20, left: 20 }}><Pie data={chartData.categoryRepData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} labelLine={false} label={(props) => renderPieLabel(props)}>{chartData.categoryRepData.map((entry, index) => <Cell key={`cell-${index}`} fill={entry.fill} stroke={entry.fill} />)}</Pie><Tooltip content={<ChartTooltipContent hideIndicator />} /><Legend content={<ChartLegendContent nameKey="key" />} wrapperStyle={{paddingTop: "20px"}}/></PieChart></ResponsiveContainer></ChartContainer> : <div className="h-[300px] flex items-center justify-center text-muted-foreground"><p>No repetition data available.</p></div>}</CardContent></Card>
            <Card className="shadow-lg lg:col-span-3"><CardHeader><CardTitle className="font-headline flex items-center gap-2"><Flame className="h-6 w-6 text-primary" /> Calorie Breakdown</CardTitle><CardDescription>Total calories burned per category for {timeRangeDisplayNames[timeRange]}</CardDescription></CardHeader><CardContent>{chartData.categoryCalorieData.length > 0 ? <ChartContainer config={chartConfig} className="h-[300px] w-full"><ResponsiveContainer width="100%" height="100%"><PieChart margin={{ top: 20, right: 20, bottom: 20, left: 20 }}><Pie data={chartData.categoryCalorieData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} labelLine={false} label={(props) => renderPieLabel(props, 'kcal')}>{chartData.categoryCalorieData.map((entry, index) => <Cell key={`cell-${index}`} fill={entry.fill} stroke={entry.fill} />)}</Pie><Tooltip content={<ChartTooltipContent hideIndicator />} /><Legend content={<ChartLegendContent nameKey="key" />} wrapperStyle={{paddingTop: "20px"}}/></PieChart></ResponsiveContainer></ChartContainer> : <div className="h-[300px] flex items-center justify-center text-muted-foreground"><p>No calorie data available.</p></div>}</CardContent></Card>
            <Card className="shadow-lg lg:col-span-6">
                <CardHeader>
                    <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                        <div className="flex-grow">
                             <CardTitle className="font-headline flex items-center gap-2">
                                <Scale className="h-6 w-6 text-primary" />Strength Balance Analysis
                            </CardTitle>
                            <CardDescription className="mt-2">
                              Applying a balanced approach to strength training protects you from injury.
                              {generatedDate && (
                                  <span className="block text-xs mt-1 text-muted-foreground/80">
                                      Last analysis on: {format(generatedDate, "MMMM d, yyyy 'at' h:mm a")}
                                  </span>
                              )}
                            </CardDescription>
                        </div>
                        <Button onClick={handleAnalyzeStrength} disabled={isAnalysisLoading || isLoading || clientSideFindings.length === 0} className="flex-shrink-0 w-full md:w-auto">
                            {isAnalysisLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <Zap className="mr-2 h-4 w-4" />}
                            {userProfile?.strengthAnalysis ? "Re-analyze Insights" : "Get AI Insights"}
                        </Button>
                    </div>
                </CardHeader>
                <CardContent className="p-6 space-y-4">
                    {isLoadingPrs ? (
                        <div className="text-center text-muted-foreground p-4">
                           <Loader2 className="h-6 w-6 animate-spin mx-auto"/>
                        </div>
                    ) : (
                        <div className="w-full space-y-4">
                            {analysisToRender?.summary && analysisToRender.findings.length > 0 && (
                                <p className="text-center text-muted-foreground italic text-sm">{analysisToRender.summary}</p>
                            )}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {IMBALANCE_TYPES.map((type, index) => {
                                    const finding = clientSideFindings.find(f => f.imbalanceType === type);
                                    if (!finding) return null;

                                    if ('hasData' in finding && !finding.hasData) {
                                        const config = IMBALANCE_CONFIG[type];
                                        const requirements = `Requires: ${config.lift1Options.join('/')} & ${config.lift2Options.join('/')}`;
                                        return (
                                            <Card key={index} className="p-4 bg-secondary/50 flex flex-col">
                                                <CardTitle className="text-base flex items-center justify-between">{type} <Badge variant="secondary">No Data</Badge></CardTitle>
                                                <div className="flex-grow flex flex-col items-center justify-center text-center text-muted-foreground my-4">
                                                    <Scale className="h-8 w-8 text-muted-foreground/50 mb-2"/>
                                                    <p className="text-sm font-semibold">Log PRs to analyze</p>
                                                    <p className="text-xs mt-1">{requirements}</p>
                                                </div>
                                            </Card>
                                        );
                                    }
                                    
                                    const dataFinding = finding as StrengthFinding;
                                    const aiFinding = analysisToRender ? analysisToRender.findings.find(f => f.imbalanceType === dataFinding.imbalanceType) : undefined;
                                    const badgeProps = focusBadgeProps(dataFinding.imbalanceFocus);
                                    
                                    return (
                                        <Card key={index} className="p-4 bg-secondary/50 flex flex-col">
                                            <CardTitle className="text-base">{dataFinding.imbalanceType}</CardTitle>
                                            <div className="text-xs text-muted-foreground mt-2 grid grid-cols-2 gap-x-4 gap-y-1 pb-4">
                                                <div>
                                                    <p>{dataFinding.lift1Name}: <span className="font-bold text-foreground">{dataFinding.lift1Weight} {dataFinding.lift1Unit}</span></p>
                                                    {dataFinding.lift1Level && dataFinding.lift1Level !== 'N/A' && <p className="mt-1">Level: <span className="font-medium text-foreground capitalize">{dataFinding.lift1Level}</span></p>}
                                                </div>
                                                <div>
                                                    <p>{dataFinding.lift2Name}: <span className="font-bold text-foreground">{dataFinding.lift2Weight} {dataFinding.lift2Unit}</span></p>
                                                    {dataFinding.lift2Level && dataFinding.lift2Level !== 'N/A' && <p className="mt-1">Level: <span className="font-medium text-foreground capitalize">{dataFinding.lift2Level}</span></p>}
                                                </div>
                                                <p>Your Ratio: <span className="font-bold text-foreground">{dataFinding.userRatio}</span></p>
                                                <p>Target Ratio: <span className="font-bold text-foreground">{dataFinding.targetRatio}</span></p>
                                            </div>

                                            <div className="flex-grow"></div>
                                            
                                            {isAnalysisLoading && dataFinding.userRatio ? (
                                                 <div className="flex items-center justify-center text-muted-foreground pt-3 border-t">
                                                    <Loader2 className="h-4 w-4 animate-spin mr-2" /> Generating AI insight...
                                                 </div>
                                            ) : aiFinding ? (
                                               <div className="space-y-3 pt-4 border-t">
                                                    <div className="mb-4">
                                                        <Badge variant={badgeProps.variant}>{badgeProps.text}</Badge>
                                                    </div>
                                                    <div>
                                                        <p className="text-sm font-semibold flex items-center gap-2"><Lightbulb className="h-4 w-4 text-primary" />Insight</p>
                                                        <p className="text-xs text-muted-foreground mt-1">{aiFinding.insight}</p>
                                                    </div>
                                                    <div>
                                                        <p className="text-sm font-semibold flex items-center gap-2"><Zap className="h-4 w-4 text-accent" />Recommendation</p>
                                                        <p className="text-xs text-muted-foreground mt-1">{aiFinding.recommendation}</p>
                                                    </div>
                                               </div>
                                            ) : dataFinding.imbalanceFocus !== 'Balanced' ? (
                                                 <div className="pt-4 border-t">
                                                    <div className="mb-4">
                                                        <Badge variant={badgeProps.variant}>{badgeProps.text}</Badge>
                                                    </div>
                                                    <p className="text-center text-muted-foreground text-xs">This appears imbalanced. Click "Get AI Insights" for analysis.</p>
                                                </div>
                                            ) : (
                                                <div className="pt-4 border-t">
                                                    <div className="mb-4">
                                                        <Badge variant={badgeProps.variant}>{badgeProps.text}</Badge>
                                                    </div>
                                                    {(() => {
                                                        const currentLevel = dataFinding.lift1Level;
                                                        if (currentLevel === 'N/A') return null;

                                                        if (currentLevel === 'Elite') {
                                                            return (
                                                                <>
                                                                    <p className="text-sm font-semibold flex items-center gap-2"><Trophy className="h-4 w-4 text-accent" />Elite Status</p>
                                                                    <p className="text-xs text-muted-foreground mt-1">You've reached the Elite level while maintaining balance. Incredible work!</p>
                                                                </>
                                                            );
                                                        }

                                                        let nextLevel: string | null = null;
                                                        if (currentLevel === 'Beginner') nextLevel = 'Intermediate';
                                                        else if (currentLevel === 'Intermediate') nextLevel = 'Advanced';
                                                        else if (currentLevel === 'Advanced') nextLevel = 'Elite';

                                                        if (nextLevel) {
                                                            return (
                                                                <>
                                                                    <p className="text-sm font-semibold flex items-center gap-2"><Milestone className="h-4 w-4 text-primary" />Next Focus</p>
                                                                    <p className="text-xs text-muted-foreground mt-1">
                                                                        Your lifts are well-balanced. Focus on progressive overload to advance from <span className="font-bold text-foreground">{currentLevel}</span> to <span className="font-bold text-foreground">{nextLevel}</span>.
                                                                    </p>
                                                                </>
                                                            );
                                                        }
                                                        return null;
                                                    })()}
                                                </div>
                                            )}
                                        </Card>
                                    );
                                })}
                            </div>
                        </div>
                    )}
                </CardContent>
            </Card>
            <Card className="shadow-lg lg:col-span-6">
                <CardHeader>
                    <CardTitle className="font-headline flex items-center gap-2"><Route className="h-6 w-6 text-accent" /> Running Progression</CardTitle>
                    <CardDescription>
                        {timeRange === 'weekly' && "Your individual runs this week."}
                        {timeRange === 'monthly' && "Your total running distance per week this month."}
                        {timeRange === 'yearly' && "Your total distance per month."}
                        {timeRange === 'all-time' && "Your total distance per year."}
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    {runningProgressionData && runningProgressionData.chartData.length > 0 ? (
                        <>
                            <ChartContainer config={chartConfig} className="h-[250px] w-full">
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart data={runningProgressionData.chartData} margin={{ top: 20, right: 20, left: -10, bottom: 5 }}>
                                        <CartesianGrid strokeDasharray="3 3" vertical={false} />
                                        <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                                        <YAxis dataKey="value" domain={[0, 'auto']} label={{ value: 'mi', angle: -90, position: 'insideLeft', offset: -5, fill: 'hsl(var(--muted-foreground))' }} />
                                        <Tooltip content={<ChartTooltipContent indicator="dot" />} />
                                        <Bar dataKey="value" fill="var(--color-value)" radius={[4, 4, 0, 0]} />
                                    </BarChart>
                                </ResponsiveContainer>
                            </ChartContainer>
                             <div className="mt-6 p-4 bg-secondary/50 rounded-lg">
                                <h4 className="text-sm font-semibold text-center mb-2 text-muted-foreground">Summary for {timeRangeDisplayNames[timeRange]}</h4>
                                <div className="flex justify-around text-center">
                                    <div>
                                        <p className="text-2xl font-bold text-accent">{runningProgressionData.totalDistance.toFixed(1)} mi</p>
                                        <p className="text-xs text-muted-foreground">Total Distance</p>
                                    </div>
                                    <div>
                                        <p className="text-2xl font-bold text-accent">{runningProgressionData.avgDistance.toFixed(1)} mi</p>
                                        <p className="text-xs text-muted-foreground">Avg. Distance / Run</p>
                                    </div>
                                </div>
                            </div>
                        </>
                    ) : (
                        <div className="h-[300px] flex items-center justify-center text-muted-foreground">
                            <p>No running data available for this period.</p>
                        </div>
                    )}
                </CardContent>
            </Card>
        </>)}
      </div>
    </div>
  );
}

    