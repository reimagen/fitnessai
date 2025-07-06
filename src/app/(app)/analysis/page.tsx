
"use client";

import { Bar, BarChart, CartesianGrid, ResponsiveContainer, XAxis, YAxis, Tooltip, Legend, PieChart, Pie, Cell, LineChart, Line } from 'recharts';
import { ChartConfig, ChartContainer, ChartTooltipContent, ChartLegendContent } from '@/components/ui/chart';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import React, { useState, useMemo, useEffect } from 'react';
import type { WorkoutLog, PersonalRecord, ExerciseCategory, StrengthImbalanceOutput, UserProfile, StrengthLevel } from '@/lib/types';
import { useWorkouts, usePersonalRecords, useUserProfile } from '@/lib/firestore.service';
import { format, isWithinInterval, startOfWeek, endOfWeek, startOfMonth, endOfYear, startOfYear } from 'date-fns';
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
        description: result.data.findings.length > 0 ? "Potential areas for improvement found." : "Your strength appears well-balanced.",
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
  
  const clientSideFindings = useMemo<StrengthFinding[]>(() => {
    if (!personalRecords || !userProfile) {
      return [];
    }
    const findings: StrengthFinding[] = [];

    IMBALANCE_TYPES.forEach(type => {
        const config = IMBALANCE_CONFIG[type];
        const lift1 = findBestPr(personalRecords, config.lift1Options);
        const lift2 = findBestPr(personalRecords, config.lift2Options);

        const lift1Level = lift1 ? getStrengthLevel(lift1, userProfile) : 'N/A';
        const lift2Level = lift2 ? getStrengthLevel(lift2, userProfile) : 'N/A';

        if (!lift1 || !lift2) {
             findings.push({
                imbalanceType: type,
                imbalanceFocus: 'Balanced', // Not really, but prevents rendering imbalance-specific UI
                lift1Name: config.lift1Options.join('/'),
                lift2Name: config.lift2Options.join('/'),
                lift1Weight: 0, lift1Unit: 'lbs', lift2Weight: 0, lift2Unit: 'lbs',
                userRatio: '', targetRatio: '',
                lift1Level,
                lift2Level,
            });
            return;
        };

        const lift1WeightKg = lift1.weightUnit === 'lbs' ? lift1.weight * 0.453592 : lift1.weight;
        const lift2WeightKg = lift2.weightUnit === 'lbs' ? lift2.weight * 0.453592 : lift2.weight;

        if (lift2WeightKg === 0) return;

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
      else if (timeRange === 'monthly') interval = { start: startOfMonth(today), end: new Date() };
      else interval = { start: startOfYear(today), end: endOfYear(today) };
      logsForPeriod = (workoutLogs || []).filter(log => isWithinInterval(log.date, interval));
      prsForPeriod = (personalRecords || []).filter(pr => isWithinInterval(pr.date, interval));
    }
    return { logsForPeriod, prsForPeriod };
  }, [timeRange, workoutLogs, personalRecords]);

  const chartData = useMemo(() => {
    const { logsForPeriod, prsForPeriod } = filteredData;
    const periodLabel = `${timeRangeDisplayNames[timeRange]}'s Summary`;

    const dailyCategoryCounts: { [dateKey: string]: ChartDataPoint } = {};
    logsForPeriod.forEach(log => {
      const dateKey = format(log.date, 'yyyy-MM-dd');
      if (!dailyCategoryCounts[dateKey]) {
        dailyCategoryCounts[dateKey] = { date: dateKey, dateLabel: format(log.date, 'MMM d'), upperBody: 0, lowerBody: 0, cardio: 0, core: 0, fullBody: 0, other: 0 };
      }
      log.exercises.forEach(ex => {
        const camelCaseCategory = categoryToCamelCase(ex.category || 'Other');
        if (dailyCategoryCounts[dateKey][camelCaseCategory] !== undefined) dailyCategoryCounts[dateKey][camelCaseCategory]++;
      });
    });
    const workoutFrequencyData = Object.values(dailyCategoryCounts).sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    const repsByCat: Record<keyof Omit<ChartDataPoint, 'dateLabel' | 'date'>, number> = { upperBody: 0, lowerBody: 0, fullBody: 0, cardio: 0, core: 0, other: 0 };
    const caloriesByCat: Record<keyof Omit<ChartDataPoint, 'dateLabel' | 'date'>, number> = { upperBody: 0, lowerBody: 0, fullBody: 0, cardio: 0, core: 0, other: 0 };
    const runningDataPoints: { date: Date, distance: number, type: 'outdoor' | 'treadmill' }[] = [];
    logsForPeriod.forEach(log => { 
        log.exercises.forEach(ex => {
            const camelCaseCategory = categoryToCamelCase(ex.category || 'Other');
            repsByCat[camelCaseCategory] += ex.reps || 0;
            caloriesByCat[camelCaseCategory] += ex.calories || 0;
            if (ex.category === 'Cardio' && ex.distance && ex.distance > 0) {
                let distanceInMiles = ex.distance;
                if (ex.distanceUnit === 'km') distanceInMiles = ex.distance * 0.621371;
                else if (ex.distanceUnit === 'ft') distanceInMiles = ex.distance * 0.000189394;
                const exerciseName = ex.name.trim().toLowerCase();
                let isConsideredRun = false;
                if (exerciseName === 'running' || exerciseName === 'run') isConsideredRun = true;
                else if (ex.duration && ex.duration > 0) {
                    let durationInHours = 0;
                    if (ex.durationUnit === 'sec') durationInHours = ex.duration / 3600;
                    else if (ex.durationUnit === 'hr') durationInHours = ex.duration;
                    else durationInHours = ex.duration / 60;
                    if (durationInHours > 0 && (distanceInMiles / durationInHours) >= 4.5) isConsideredRun = true;
                }
                if (isConsideredRun) runningDataPoints.push({ date: log.date, distance: parseFloat(distanceInMiles.toFixed(2)), type: exerciseName.includes('treadmill') ? 'treadmill' : 'outdoor' });
            }
        });
    });
    const categoryRepData = Object.entries(repsByCat).filter(([, value]) => value > 0).map(([name, value]) => ({ key: name, name: (chartConfig[name as ChartDataKey]?.label || name) as string, value, fill: `var(--color-${name})`}));
    const categoryCalorieData = Object.entries(caloriesByCat).filter(([, value]) => value > 0).map(([name, value]) => ({ key: name, name: (chartConfig[name as ChartDataKey]?.label || name) as string, value, fill: `var(--color-${name})`}));
    const runningProgressData = runningDataPoints.sort((a, b) => a.date.getTime() - b.date.getTime()).map(data => ({ dateLabel: format(data.date, 'MMM d'), distance: data.distance, type: data.type }));

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
    return { workoutFrequencyData, newPrsData: prsForPeriod.sort((a,b) => b.date.getTime() - a.date.getTime()), categoryRepData, categoryCalorieData, runningProgressData, periodSummary };
  }, [filteredData]);
  
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
  const CustomizedDot = (props: any) => props.payload?.type === 'treadmill' ? <circle cx={props.cx} cy={props.cy} r={4} stroke="hsl(var(--accent))" strokeWidth={2} fill="hsl(var(--background))" /> : <circle cx={props.cx} cy={props.cy} r={4} fill="hsl(var(--accent))" />;
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
            <Card className="shadow-lg lg:col-span-3"><CardHeader><CardTitle className="font-headline">Exercise Variety</CardTitle><CardDescription>Breakdown of exercises by category per workout day for {timeRangeDisplayNames[timeRange]}.</CardDescription></CardHeader><CardContent>{chartData.workoutFrequencyData.length > 0 ? <ChartContainer config={chartConfig} className="h-[300px] w-full"><ResponsiveContainer width="100%" height="100%"><BarChart data={chartData.workoutFrequencyData} margin={{ top: 20, right: 20, left: -10, bottom: 5 }}><CartesianGrid strokeDasharray="3 3" vertical={false}/><XAxis dataKey="dateLabel" /><YAxis allowDecimals={false} /><Tooltip content={<ChartTooltipContent />} /><Legend content={<CustomBarChartLegend />} /><Bar dataKey="upperBody" stackId="a" fill="var(--color-upperBody)" shape={<RoundedBar />} /><Bar dataKey="lowerBody" stackId="a" fill="var(--color-lowerBody)" shape={<RoundedBar />} /><Bar dataKey="cardio" stackId="a" fill="var(--color-cardio)" shape={<RoundedBar />} /><Bar dataKey="core" stackId="a" fill="var(--color-core)" shape={<RoundedBar />} /><Bar dataKey="fullBody" stackId="a" fill="var(--color-fullBody)" shape={<RoundedBar />} /><Bar dataKey="other" stackId="a" fill="var(--color-other)" shape={<RoundedBar />} /></BarChart></ResponsiveContainer></ChartContainer> : <div className="h-[300px] flex items-center justify-center text-muted-foreground"><p>No workout data for this period.</p></div>}</CardContent></Card>
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
                              Review your AI-powered analysis that factors in your goals and personal stats.
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
                            {analysisToRender?.summary && analysisToRender.findings.length === 0 && (
                                <p className="text-center text-muted-foreground italic text-sm">{analysisToRender.summary}</p>
                            )}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {IMBALANCE_TYPES.map((type, index) => {
                                    const finding = clientSideFindings.find(f => f.imbalanceType === type);
                                    const aiFinding = finding && analysisToRender ? analysisToRender.findings.find(f => f.imbalanceType === finding.imbalanceType) : undefined;
                                    
                                    if (finding && finding.userRatio) {
                                      const badgeProps = focusBadgeProps(finding.imbalanceFocus);
                                      return (
                                        <Card key={index} className="p-4 bg-secondary/50">
                                            <CardTitle className="text-base flex items-center justify-between">{finding.imbalanceType} <Badge variant={badgeProps.variant}>{badgeProps.text}</Badge></CardTitle>
                                            <div className="text-xs text-muted-foreground mt-2 grid grid-cols-2 gap-x-4 gap-y-1">
                                                <div>
                                                    <p>{finding.lift1Name}: <span className="font-bold text-foreground">{finding.lift1Weight} {finding.lift1Unit}</span></p>
                                                    {finding.lift1Level && finding.lift1Level !== 'N/A' && <p>Level: <span className="font-medium text-foreground capitalize">{finding.lift1Level}</span></p>}
                                                </div>
                                                <div>
                                                    <p>{finding.lift2Name}: <span className="font-bold text-foreground">{finding.lift2Weight} {finding.lift2Unit}</span></p>
                                                    {finding.lift2Level && finding.lift2Level !== 'N/A' && <p>Level: <span className="font-medium text-foreground capitalize">{finding.lift2Level}</span></p>}
                                                </div>
                                                <p>Your Ratio: <span className="font-bold text-foreground">{finding.userRatio}</span></p>
                                                <p>Target Ratio: <span className="font-bold text-foreground">{finding.targetRatio}</span></p>
                                            </div>
                                            {isAnalysisLoading && finding.imbalanceFocus !== 'Balanced' ? (
                                                 <div className="mt-3 pt-3 border-t flex items-center justify-center text-muted-foreground">
                                                    <Loader2 className="h-4 w-4 animate-spin mr-2" /> Generating AI insight...
                                                 </div>
                                            ) : aiFinding && finding.imbalanceFocus !== 'Balanced' ? (
                                               <>
                                                <div className="mt-3 pt-3 border-t">
                                                    <p className="text-sm font-semibold flex items-center gap-2"><Lightbulb className="h-4 w-4 text-primary" />Insight</p>
                                                    <p className="text-xs text-muted-foreground mt-1">{aiFinding.insight}</p>
                                                </div>
                                                <div className="mt-2">
                                                    <p className="text-sm font-semibold flex items-center gap-2"><Zap className="h-4 w-4 text-accent" />Recommendation</p>
                                                    <p className="text-xs text-muted-foreground mt-1">{aiFinding.recommendation}</p>
                                                </div>
                                               </>
                                            ) : finding.imbalanceFocus !== 'Balanced' ? (
                                                 <div className="mt-3 pt-3 border-t text-center text-muted-foreground text-xs">
                                                    <p>This appears imbalanced. Click "Get AI Insights" for analysis.</p>
                                                </div>
                                            ) : (
                                                (() => {
                                                    const currentLevel = finding.lift1Level;
                                                    if (currentLevel === 'N/A') return null;

                                                    if (currentLevel === 'Elite') {
                                                        return (
                                                            <div className="mt-3 pt-3 border-t">
                                                                <p className="text-sm font-semibold flex items-center gap-2"><Trophy className="h-4 w-4 text-accent" />Elite Status</p>
                                                                <p className="text-xs text-muted-foreground mt-1">You've reached the Elite level while maintaining balance. Incredible work!</p>
                                                            </div>
                                                        );
                                                    }

                                                    let nextLevel: string | null = null;
                                                    if (currentLevel === 'Beginner') nextLevel = 'Intermediate';
                                                    else if (currentLevel === 'Intermediate') nextLevel = 'Advanced';
                                                    else if (currentLevel === 'Advanced') nextLevel = 'Elite';

                                                    if (nextLevel) {
                                                        return (
                                                            <div className="mt-3 pt-3 border-t">
                                                                <p className="text-sm font-semibold flex items-center gap-2"><Milestone className="h-4 w-4 text-primary" />Next Focus</p>
                                                                <p className="text-xs text-muted-foreground mt-1">
                                                                    Your lifts are well-balanced. Focus on progressive overload to advance from <span className="font-bold text-foreground">{currentLevel}</span> to <span className="font-bold text-foreground">{nextLevel}</span>.
                                                                </p>
                                                            </div>
                                                        );
                                                    }
                                                    return null;
                                                })()
                                            )}
                                        </Card>
                                      )
                                    } else {
                                        const config = IMBALANCE_CONFIG[type];
                                        let requirements = `Requires: ${config.lift1Options.join(' or ')} & ${config.lift2Options.join(' or ')}`;

                                        return (
                                            <Card key={index} className="p-4 bg-secondary/50 flex flex-col">
                                                <CardTitle className="text-base flex items-center justify-between">{type} <Badge variant="secondary">No Data</Badge></CardTitle>
                                                <div className="flex-grow flex flex-col items-center justify-center text-center text-muted-foreground my-4">
                                                    <Scale className="h-8 w-8 text-muted-foreground/50 mb-2"/>
                                                    <p className="text-sm font-semibold">Log PRs to analyze</p>
                                                    <p className="text-xs mt-1">{requirements}</p>
                                                </div>
                                            </Card>
                                        )
                                    }
                                })}
                            </div>
                        </div>
                    )}
                </CardContent>
            </Card>
            <Card className="shadow-lg lg:col-span-6"><CardHeader><CardTitle className="font-headline flex items-center gap-2"><Route className="h-6 w-6 text-accent" /> Running Distance Progression</CardTitle><CardDescription>Your running distance over time. Solid dots are outdoor runs, open circles are treadmill sessions (faster than 4.5 mph).</CardDescription></CardHeader><CardContent>{chartData.runningProgressData.length > 0 ? <ChartContainer config={chartConfig} className="h-[300px] w-full"><ResponsiveContainer width="100%" height="100%"><LineChart data={chartData.runningProgressData} margin={{ top: 20, right: 30, left: 10, bottom: 5 }}><CartesianGrid strokeDasharray="3 3" vertical={false} /><XAxis dataKey="dateLabel" /><YAxis dataKey="distance" domain={['auto', 'auto']} label={{ value: 'mi', angle: -90, position: 'insideLeft', offset: -5, fill: 'hsl(var(--muted-foreground))' }} /><Tooltip content={<ChartTooltipContent indicator="dot" />} /><Legend iconSize={0} formatter={(value) => <span className="text-muted-foreground">{value}</span>} /><Line type="monotone" dataKey="distance" name="distance" stroke="hsl(var(--accent))" strokeWidth={2} dot={<CustomizedDot />} activeDot={{ r: 6 }} /></LineChart></ResponsiveContainer></ChartContainer> : <div className="h-[300px] flex items-center justify-center text-muted-foreground"><p>No running data available for this period.</p></div>}</CardContent></Card>
        </>)}
      </div>
    </div>
  );
}
