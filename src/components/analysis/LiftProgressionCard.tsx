import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, Zap, Trophy, TrendingUp, Lightbulb } from 'lucide-react';
import { format, subWeeks, isAfter } from 'date-fns';
import React, { useMemo, useEffect } from 'react';
import type { WorkoutLog, PersonalRecord, UserProfile, StrengthLevel, AnalyzeLiftProgressionInput } from '@/lib/types';
import { useAnalyzeLiftProgression } from '@/lib/firestore.service';
import { getNormalizedExerciseName, getStrengthLevel, toTitleCase, findBestPr } from '@/lib/strength-standards';
import { ChartConfig, ChartContainer, ChartTooltipContent } from '@/components/ui/chart';
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, XAxis, YAxis, Tooltip, Legend, ComposedChart, Scatter, ReferenceLine, Line, Label } from 'recharts';
import { cn } from '@/lib/utils';
import { useIsMobile } from '@/hooks/use-mobile';
import { useToast } from '@/hooks/use-toast';

import { chartConfig } from '@/lib/chart.config';

interface LiftProgressionCardProps {
    isLoading: boolean;
    isError: boolean;
    userProfile: UserProfile | undefined;
    workoutLogs: WorkoutLog[] | undefined;
    personalRecords: PersonalRecord[] | undefined;
    selectedLift: string;
    setSelectedLift: (lift: string) => void;
    frequentlyLoggedLifts: string[];
}

const calculateE1RM = (weight: number, reps: number): number => {
    if (reps === 1) return weight;
    if (reps === 0) return 0;
    return weight * (1 + reps / 30);
};

// Custom shape for the Scatter plot to render the Trophy icon
const TrophyShape = (props: any) => {
    const { cx, cy, payload } = props;
    if (!payload.isActualPR) return null;
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

export const LiftProgressionCard: React.FC<LiftProgressionCardProps> = ({
    isLoading,
    isError,
    userProfile,
    workoutLogs,
    personalRecords,
    selectedLift,
    setSelectedLift,
    frequentlyLoggedLifts,
}) => {
    const { toast } = useToast();
    const isMobile = useIsMobile();
    const analyzeProgressionMutation = useAnalyzeLiftProgression();

    const [currentLiftLevel, setCurrentLiftLevel] = React.useState<StrengthLevel | null>(null);
    const [trendImprovement, setTrendImprovement] = React.useState<number | null>(null);
    const [volumeTrend, setVolumeTrend] = React.useState<number | null>(null);

    const selectedLiftKey = getNormalizedExerciseName(selectedLift);
    const progressionAnalysisToRender = userProfile?.liftProgressionAnalysis?.[selectedLiftKey];

    const progressionChartData = useMemo(() => {
        if (!selectedLift || !workoutLogs) {
            return { chartData: [], trendlineData: null };
        };

        const sixWeeksAgo = subWeeks(new Date(), 6);
        const liftHistory = new Map<string, { date: Date; e1RM: number; volume: number; actualPR?: number; isActualPR?: boolean; }>();

        workoutLogs.forEach(log => {
            if (!isAfter(log.date, sixWeeksAgo)) return;

            log.exercises.forEach(ex => {
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

        let trendlineData = null;
        const points = chartData.map((d, i) => ({ x: i, y: d.e1RM })).filter(p => p.y > 0);
        if (points.length >= 2) {
            const { x_mean, y_mean } = points.reduce((acc, p) => ({ x_mean: acc.x_mean + p.x, y_mean: acc.y_mean + p.y }), { x_mean: 0, y_mean: 0 });
            const n = points.length;
            const xMean = x_mean / n;
            const yMean = y_mean / n;

            const numerator = points.reduce((acc, p) => acc + (p.x - xMean) * (p.y - yMean), 0);
            const denominator = points.reduce((acc, p) => acc + (p.x - xMean) ** 2, 0);

            if (denominator > 0) {
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

        const calculateTrend = (dataKey: 'e1RM' | 'volume') => {
            const points = chartData.map((d, i) => ({ x: i, y: d[dataKey] })).filter(p => p.y > 0);
            if (points.length < 2) {
                return null;
            }

            const n = points.length;
            const x_mean = points.reduce((acc, p) => acc + p.x, 0) / n;
            const y_mean = points.reduce((acc, p) => acc + p.y, 0) / n;

            const numerator = points.reduce((acc, p) => acc + (p.x - x_mean) * (p.y - y_mean), 0);
            const denominator = points.reduce((acc, p) => acc + (p.x - x_mean) ** 2, 0);

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
            .filter(log => isAfter(log.date, sixWeeksAgo))
            .flatMap(log =>
                log.exercises
                    .filter(ex => getNormalizedExerciseName(ex.name) === selectedLiftKey)
                    .map(ex => ({
                        date: log.date.toISOString(),
                        weight: ex.weight || 0,
                        sets: ex.sets || 0,
                        reps: ex.reps || 0,
                    }))
            );

        const analysisInput: AnalyzeLiftProgressionInput = {
            exerciseName: selectedLift,
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
                    .filter(g => !g.achieved)
                    .map(g => ({
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

    const getLevelBadgeVariant = (level: StrengthLevel | null): 'secondary' | 'default' | 'destructive' | 'outline' => {
        if (!level) return 'outline';
        switch (level) {
            case 'Beginner': return 'destructive';
            case 'Intermediate': return 'secondary';
            case 'Advanced': return 'default';
            case 'Elite': return 'default';
            default: return 'outline';
        }
    };

    const getTrendBadgeVariant = (trend: number | null): 'default' | 'destructive' | 'secondary' => {
        if (trend === null) return 'secondary';
        if (trend > 1) return 'default';
        if (trend < -1) return 'destructive';
        return 'secondary';
    };

    const showProgressionReanalyze = !!progressionAnalysisToRender;

    return (
        <Card className="shadow-lg lg:col-span-6">
            <CardHeader>
                <CardTitle className="font-headline flex items-center gap-2"><TrendingUp className="h-6 w-6 text-primary" />Lift Progression Analysis</CardTitle>
                <CardDescription>Select a frequently logged lift to analyze your strength (e1RM) and volume trends over the last 6 weeks.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
                <div className="flex flex-col sm:flex-row gap-4">
                    <Select value={selectedLift} onValueChange={setSelectedLift}>
                        <SelectTrigger className="w-full sm:w-[250px]">
                            <SelectValue placeholder="Select an exercise...">
                                {selectedLift ? toTitleCase(selectedLift) : "Select an exercise..."}
                            </SelectValue>
                        </SelectTrigger>
                        <SelectContent>
                            {frequentlyLoggedLifts.length > 0 ? (
                                frequentlyLoggedLifts.map(lift => <SelectItem key={lift} value={lift}>{toTitleCase(lift)}</SelectItem>)
                            ) : (
                                <SelectItem value="none" disabled>Log more workouts to analyze</SelectItem>
                            )}
                        </SelectContent>
                    </Select>
                    <Button onClick={handleAnalyzeProgression} disabled={!selectedLift || analyzeProgressionMutation.isPending} className="w-full sm:w-auto">
                        {analyzeProgressionMutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Zap className="mr-2 h-4 w-4" />}
                        {showProgressionReanalyze ? "Re-analyze" : "Get AI Progression Analysis"}
                    </Button>
                </div>

                {selectedLift && progressionChartData.chartData.length > 1 && (
                    <div className="pt-4">
                        <div className="text-center mb-2">
                            <h4 className="font-semibold capitalize">{toTitleCase(selectedLift)} - Strength & Volume Trend (Last 6 Weeks)</h4>
                            <div className="text-sm text-muted-foreground mt-1 flex items-center justify-center gap-x-4 gap-y-1 flex-wrap min-h-[24px]">
                                {currentLiftLevel && currentLiftLevel !== 'N/A' && (
                                    <span>
                                        Current Level: <Badge variant={getLevelBadgeVariant(currentLiftLevel)}>{currentLiftLevel}</Badge>
                                    </span>
                                )}
                                {trendImprovement !== null && (
                                    <span>
                                        e1RM Trend: <Badge variant={getTrendBadgeVariant(trendImprovement)}>
                                            {trendImprovement > 0 ? '+' : ''}{trendImprovement.toFixed(0)}%
                                        </Badge>
                                    </span>
                                )}
                                {volumeTrend !== null && (
                                    <span>
                                        Volume Trend: <Badge variant={getTrendBadgeVariant(volumeTrend)}>
                                            {volumeTrend > 0 ? '+' : ''}{volumeTrend.toFixed(0)}%
                                        </Badge>
                                    </span>
                                )}
                            </div>
                        </div>
                        <ChartContainer config={chartConfig} className="h-[250px] w-full">
                            <ResponsiveContainer>
                                <ComposedChart data={progressionChartData.chartData} margin={{ top: 5, right: 20, left: 20, bottom: 5 }}>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                                    <XAxis dataKey="name" tick={{ fontSize: 10 }} interval="preserveStartEnd" />
                                    <YAxis yAxisId="left" domain={['dataMin - 10', 'dataMax + 10']} allowDecimals={false} tick={{ fontSize: 10 }}>
                                        <Label value="e1RM (lbs)" angle={-90} position="insideLeft" style={{ textAnchor: 'middle', fontSize: '12px' }} />
                                    </YAxis>
                                    <YAxis yAxisId="right" orientation="right" domain={['dataMin - 500', 'dataMax + 500']} allowDecimals={false} tick={{ fontSize: 10 }}>
                                        <Label value="Total Volume (lbs)" angle={90} position="insideRight" style={{ textAnchor: 'middle', fontSize: '12px' }} />
                                    </YAxis>
                                    <Tooltip content={<ProgressionTooltip />} />
                                    <Legend content={<ProgressionChartLegend />} />
                                    <Bar yAxisId="right" dataKey="volume" fill="var(--color-volume)" radius={[4, 4, 0, 0]} />
                                    <Line yAxisId="left" type="monotone" dataKey="e1RM" stroke="var(--color-e1RM)" strokeWidth={2} dot={{ r: 4, fill: "var(--color-e1RM)" }} />
                                    <Scatter yAxisId="left" dataKey="actualPR" fill="var(--color-actualPR)" shape={<TrophyShape />} />
                                    {progressionChartData.trendlineData && (
                                        <ReferenceLine
                                            yAxisId="left"
                                            segment={[progressionChartData.trendlineData.start, progressionChartData.trendlineData.end]}
                                            stroke="hsl(var(--muted-foreground))"
                                            strokeDasharray="3 3"
                                            strokeWidth={2}
                                        />
                                    )}
                                </ComposedChart>
                            </ResponsiveContainer>
                        </ChartContainer>
                        <p className="text-xs text-muted-foreground text-center mt-2 px-4">
                            e1RM is calculated from your workout history. The weight you can lift for 10 reps is about 75% of your true 1-rep max
                        </p>
                    </div>
                )}

                <div className="pt-4 border-t">
                    {analyzeProgressionMutation.isPending ? (
                        <div className="flex items-center justify-center text-muted-foreground p-4 text-sm">
                            <Loader2 className="h-5 w-5 animate-spin mr-3" /> Generating AI analysis...
                        </div>
                    ) : progressionAnalysisToRender ? (
                        <div className="space-y-4">
                            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 text-center">
                                <p className="text-xs text-muted-foreground">Analysis from: {format(progressionAnalysisToRender.generatedDate, "MMM d, yyyy")}</p>
                            </div>
                            <div>
                                <p className="text-sm font-semibold flex items-center gap-2"><Lightbulb className="h-4 w-4 text-primary" />Insight</p>
                                <p className="text-xs text-muted-foreground mt-1">{progressionAnalysisToRender.result.insight}</p>
                            </div>
                            <div>
                                <p className="text-sm font-semibold flex items-center gap-2"><Zap className="h-4 w-4 text-accent" />Recommendation</p>
                                <p className="text-xs text-muted-foreground mt-1">{progressionAnalysisToRender.result.recommendation}</p>
                            </div>
                        </div>
                    ) : null}
                </div>

            </CardContent>
        </Card>
    );
};
