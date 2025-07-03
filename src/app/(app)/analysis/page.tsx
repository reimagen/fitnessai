
"use client";

import { Bar, BarChart, CartesianGrid, ResponsiveContainer, XAxis, YAxis, Tooltip, Legend, PieChart, Pie, Cell, LineChart, Line } from 'recharts';
import { ChartConfig, ChartContainer, ChartTooltipContent, ChartLegendContent } from '@/components/ui/chart';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import React, { useState, useMemo } from 'react';
import type { WorkoutLog, PersonalRecord, ExerciseCategory } from '@/lib/types';
import { useWorkouts, usePersonalRecords } from '@/lib/firestore.service';
import { format, isWithinInterval, startOfWeek, endOfWeek, startOfMonth, endOfMonth, startOfYear, endOfYear } from 'date-fns';
import { TrendingUp, Award, Flame, Route, IterationCw, Scale, Loader2, Zap, AlertTriangle, Lightbulb } from 'lucide-react';
import { analyzeStrengthImbalancesAction } from './actions';
import type { StrengthImbalanceOutput } from '@/ai/flows/strength-imbalance-analyzer';
import { useToast } from '@/hooks/use-toast';

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
  other: number;
  fullBody: number;
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
  return `M${x + tl},${y}
          L${x + width - tr},${y}
          C${x + width - tr},${y} ${x + width},${y} ${x + width},${y + tr}
          L${x + width},${y + height - br}
          C${x + width},${y + height - br} ${x},${y + height} ${x + width - br},${y + height}
          L${x + bl},${y + height}
          C${x + bl},${y + height} ${x},${y + height} ${x},${y + height - bl}
          L${x},${y + tl}
          C${x},${y + tl} ${x},${y} ${x + tl},${y}
          Z`;
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

export default function AnalysisPage() {
  const [timeRange, setTimeRange] = useState('weekly');
  const { data: workoutLogs, isLoading: isLoadingWorkouts } = useWorkouts();
  const { data: personalRecords, isLoading: isLoadingPrs } = usePersonalRecords();

  const [analysisResult, setAnalysisResult] = useState<StrengthImbalanceOutput | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisError, setAnalysisError] = useState<string | null>(null);
  const { toast } = useToast();

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

  const handleAnalyzeImbalances = async () => {
    if (!personalRecords || personalRecords.length < 2) {
      toast({ title: "Not Enough Data", description: "Log at least two opposing personal records (e.g., a push and a pull) to analyze imbalances.", variant: "default" });
      return;
    }
    setIsAnalyzing(true);
    setAnalysisError(null);
    setAnalysisResult(null);

    const result = await analyzeStrengthImbalancesAction({ personalRecords });

    if (result.success && result.data) {
      setAnalysisResult(result.data);
    } else {
      setAnalysisError(result.error || "An unknown error occurred during analysis.");
      toast({ title: "Analysis Failed", description: result.error, variant: "destructive" });
    }
    setIsAnalyzing(false);
  };

  const severityBadgeVariant = (severity: 'Low' | 'Moderate' | 'High'): 'default' | 'secondary' | 'destructive' => {
      switch (severity) {
          case 'Low': return 'secondary';
          case 'Moderate': return 'default';
          case 'High': return 'destructive';
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
  
  const isLoading = isLoadingWorkouts || isLoadingPrs;

  return (
    <div className="container mx-auto px-4 py-8">
      <header className="mb-8">
        <h1 className="font-headline text-3xl font-bold text-primary">Your Progress</h1>
        <p className="text-muted-foreground">Visualize your fitness journey and stay motivated.</p>
      </header>
      <div className="mb-6"><Select value={timeRange} onValueChange={setTimeRange}><SelectTrigger className="w-[180px]"><SelectValue placeholder="Select time range" /></SelectTrigger><SelectContent><SelectItem value="weekly">This Week</SelectItem><SelectItem value="monthly">This Month</SelectItem><SelectItem value="yearly">This Year</SelectItem><SelectItem value="all-time">All Time</SelectItem></SelectContent></Select></div>
      {isLoading ? <Card className="shadow-lg mb-6 bg-white h-40 flex justify-center items-center"><Loader2 className="h-8 w-8 animate-spin text-primary" /></Card>
      : chartData.periodSummary && (
        <Card className="shadow-lg mb-6 bg-white"><CardHeader><CardTitle className="font-headline flex items-center gap-2 text-xl"><TrendingUp className="h-6 w-6 text-primary" />{chartData.periodSummary.periodLabel}</CardTitle></CardHeader><CardContent className="grid grid-cols-2 gap-y-6 gap-x-3 md:grid-cols-5 text-center py-6">{Object.entries({"Workout Days": chartData.periodSummary.workoutDays, "Weight Lifted (lbs)": chartData.periodSummary.totalWeightLiftedLbs.toLocaleString(), "Distance (mi)": chartData.periodSummary.totalDistanceMi, "Cardio Duration": formatCardioDuration(chartData.periodSummary.totalCardioDurationMin), "Calories Burned": chartData.periodSummary.totalCaloriesBurned.toLocaleString()}).map(([label, value]) => <div key={label}><p className="text-3xl font-bold text-accent">{value}</p><p className="text-sm text-muted-foreground mt-1">{label}</p></div>)}</CardContent></Card>
      )}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-6">
        {isLoading ? Array.from({length: 6}).map((_, i) => <Card key={i} className="shadow-lg lg:col-span-3 h-96 flex justify-center items-center"><Loader2 className="h-8 w-8 animate-spin text-primary" /></Card>)
        : (<>
            <Card className="shadow-lg lg:col-span-3"><CardHeader><CardTitle className="font-headline">Exercise Variety</CardTitle><CardDescription>Breakdown of exercises by category per workout day for {timeRangeDisplayNames[timeRange]}.</CardDescription></CardHeader><CardContent>{chartData.workoutFrequencyData.length > 0 ? <ChartContainer config={chartConfig} className="h-[300px] w-full"><ResponsiveContainer width="100%" height="100%"><BarChart data={chartData.workoutFrequencyData} margin={{ top: 20, right: 20, left: -10, bottom: 5 }}><CartesianGrid strokeDasharray="3 3" vertical={false}/><XAxis dataKey="dateLabel" /><YAxis allowDecimals={false} /><Tooltip content={<ChartTooltipContent />} /><Legend content={<CustomBarChartLegend />} /><Bar dataKey="upperBody" stackId="a" fill="var(--color-upperBody)" shape={<RoundedBar />} /><Bar dataKey="lowerBody" stackId="a" fill="var(--color-lowerBody)" shape={<RoundedBar />} /><Bar dataKey="cardio" stackId="a" fill="var(--color-cardio)" shape={<RoundedBar />} /><Bar dataKey="core" stackId="a" fill="var(--color-core)" shape={<RoundedBar />} /><Bar dataKey="fullBody" stackId="a" fill="var(--color-fullBody)" shape={<RoundedBar />} /><Bar dataKey="other" stackId="a" fill="var(--color-other)" shape={<RoundedBar />} /></BarChart></ResponsiveContainer></ChartContainer> : <div className="h-[300px] flex items-center justify-center text-muted-foreground"><p>No workout data for this period.</p></div>}</CardContent></Card>
            <Card className="shadow-lg lg:col-span-3"><CardHeader><CardTitle className="font-headline flex items-center gap-2"><Award className="h-6 w-6 text-accent" /> New Personal Records</CardTitle><CardDescription>Achievements in {timeRangeDisplayNames[timeRange]}</CardDescription></CardHeader><CardContent>{chartData.newPrsData.length > 0 ? <div className="h-[300px] w-full overflow-y-auto pr-2 space-y-3">{chartData.newPrsData.map(pr => <div key={pr.id} className="flex items-center justify-between p-3 rounded-md bg-secondary/50"><div className="flex flex-col"><p className="font-semibold text-primary">{pr.exerciseName}</p><p className="text-xs text-muted-foreground">{format(pr.date, "MMMM d, yyyy")}</p></div><p className="font-bold text-lg text-accent">{pr.weight} <span className="text-sm font-medium text-muted-foreground">{pr.weightUnit}</span></p></div>)}</div> : <div className="h-[300px] flex items-center justify-center text-muted-foreground"><p>No new PRs for this period.</p></div>}</CardContent></Card>
            <Card className="shadow-lg lg:col-span-3"><CardHeader><CardTitle className="font-headline flex items-center gap-2"><IterationCw className="h-6 w-6 text-primary" /> Repetition Breakdown</CardTitle><CardDescription>Total reps per category for {timeRangeDisplayNames[timeRange]}</CardDescription></CardHeader><CardContent>{chartData.categoryRepData.length > 0 ? <ChartContainer config={chartConfig} className="h-[300px] w-full"><ResponsiveContainer width="100%" height="100%"><PieChart margin={{ top: 20, right: 20, bottom: 20, left: 20 }}><Pie data={chartData.categoryRepData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} labelLine={false} label={(props) => renderPieLabel(props)}>{chartData.categoryRepData.map((entry, index) => <Cell key={`cell-${index}`} fill={entry.fill} stroke={entry.fill} />)}</Pie><Tooltip content={<ChartTooltipContent hideIndicator />} /><Legend content={<ChartLegendContent nameKey="key" />} wrapperStyle={{paddingTop: "20px"}}/></PieChart></ResponsiveContainer></ChartContainer> : <div className="h-[300px] flex items-center justify-center text-muted-foreground"><p>No repetition data available.</p></div>}</CardContent></Card>
            <Card className="shadow-lg lg:col-span-3"><CardHeader><CardTitle className="font-headline flex items-center gap-2"><Flame className="h-6 w-6 text-primary" /> Calorie Breakdown</CardTitle><CardDescription>Total calories burned per category for {timeRangeDisplayNames[timeRange]}</CardDescription></CardHeader><CardContent>{chartData.categoryCalorieData.length > 0 ? <ChartContainer config={chartConfig} className="h-[300px] w-full"><ResponsiveContainer width="100%" height="100%"><PieChart margin={{ top: 20, right: 20, bottom: 20, left: 20 }}><Pie data={chartData.categoryCalorieData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} labelLine={false} label={(props) => renderPieLabel(props, 'kcal')}>{chartData.categoryCalorieData.map((entry, index) => <Cell key={`cell-${index}`} fill={entry.fill} stroke={entry.fill} />)}</Pie><Tooltip content={<ChartTooltipContent hideIndicator />} /><Legend content={<ChartLegendContent nameKey="key" />} wrapperStyle={{paddingTop: "20px"}}/></PieChart></ResponsiveContainer></ChartContainer> : <div className="h-[300px] flex items-center justify-center text-muted-foreground"><p>No calorie data available.</p></div>}</CardContent></Card>
            <Card className="shadow-lg lg:col-span-6"><CardHeader><CardTitle className="font-headline flex items-center gap-2"><Scale className="h-6 w-6 text-primary" />Strength Balance Analysis</CardTitle><CardDescription>AI-powered insights into your strength ratios based on your Personal Records.</CardDescription></CardHeader>
                <CardContent className="min-h-[250px] flex flex-col items-center justify-center">
                    {isAnalyzing ? <Loader2 className="h-10 w-10 animate-spin text-primary" />
                    : analysisError ? <div className="text-center text-destructive"><AlertTriangle className="mx-auto h-8 w-8 mb-2" /><p className="font-semibold">Analysis Failed</p><p className="text-sm">{analysisError}</p></div>
                    : analysisResult ? (
                        <div className="w-full space-y-4">
                            <p className="text-center text-muted-foreground italic text-sm">{analysisResult.summary}</p>
                            {analysisResult.findings.length > 0 ? (
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    {analysisResult.findings.map((finding, index) => (
                                        <Card key={index} className="p-4 bg-secondary/50">
                                            <CardTitle className="text-base flex items-center justify-between">{finding.imbalanceType} <Badge variant={severityBadgeVariant(finding.severity)}>{finding.severity}</Badge></CardTitle>
                                            <div className="text-xs text-muted-foreground mt-2 grid grid-cols-2 gap-x-4">
                                                <p>{finding.lift1Name}: <span className="font-bold text-foreground">{finding.lift1Weight} {finding.lift1Unit}</span></p>
                                                <p>{finding.lift2Name}: <span className="font-bold text-foreground">{finding.lift2Weight} {finding.lift2Unit}</span></p>
                                                <p>Your Ratio: <span className="font-bold text-foreground">{finding.userRatio}</span></p>
                                                <p>Target Ratio: <span className="font-bold text-foreground">{finding.targetRatio}</span></p>
                                            </div>
                                            <div className="mt-3 pt-3 border-t">
                                                <p className="text-sm font-semibold flex items-center gap-2"><Lightbulb className="h-4 w-4 text-primary" />Insight</p>
                                                <p className="text-xs text-muted-foreground mt-1">{finding.insight}</p>
                                            </div>
                                            <div className="mt-2">
                                                <p className="text-sm font-semibold flex items-center gap-2"><Zap className="h-4 w-4 text-accent" />Recommendation</p>
                                                <p className="text-xs text-muted-foreground mt-1">{finding.recommendation}</p>
                                            </div>
                                        </Card>
                                    ))}
                                </div>
                            ) : null}
                            <Button variant="outline" className="w-full mt-4" onClick={handleAnalyzeImbalances}>Re-analyze</Button>
                        </div>
                    ) : (
                        <Button onClick={handleAnalyzeImbalances} disabled={isLoadingPrs || (personalRecords || []).length < 2}>
                            <Zap className="mr-2 h-4 w-4" /> Analyze Strength Balance
                        </Button>
                    )}
                </CardContent>
            </Card>
            <Card className="shadow-lg lg:col-span-6"><CardHeader><CardTitle className="font-headline flex items-center gap-2"><Route className="h-6 w-6 text-accent" /> Running Distance Progression</CardTitle><CardDescription>Your running distance over time. Solid dots are outdoor runs, open circles are treadmill sessions (faster than 4.5 mph).</CardDescription></CardHeader><CardContent>{chartData.runningProgressData.length > 0 ? <ChartContainer config={chartConfig} className="h-[300px] w-full"><ResponsiveContainer width="100%" height="100%"><LineChart data={chartData.runningProgressData} margin={{ top: 20, right: 30, left: 10, bottom: 5 }}><CartesianGrid strokeDasharray="3 3" vertical={false} /><XAxis dataKey="dateLabel" /><YAxis dataKey="distance" domain={['auto', 'auto']} label={{ value: 'mi', angle: -90, position: 'insideLeft', offset: -5, fill: 'hsl(var(--muted-foreground))' }} /><Tooltip content={<ChartTooltipContent indicator="dot" />} /><Legend iconSize={0} formatter={(value) => <span className="text-muted-foreground">{value}</span>} /><Line type="monotone" dataKey="distance" name="distance" stroke="hsl(var(--accent))" strokeWidth={2} dot={<CustomizedDot />} activeDot={{ r: 6 }} /></LineChart></ResponsiveContainer></ChartContainer> : <div className="h-[300px] flex items-center justify-center text-muted-foreground"><p>No running data available for this period.</p></div>}</CardContent></Card>
        </>)}
      </div>
    </div>
  );
}
