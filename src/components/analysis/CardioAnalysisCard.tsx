import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import React, { useMemo } from 'react';
import type { WorkoutLog, UserProfile, ExerciseCategory, PersonalRecord } from '@/lib/types';
import { format } from 'date-fns/format';
import { eachDayOfInterval, startOfMonth, endOfMonth, eachWeekOfInterval, startOfWeek, endOfWeek, differenceInDays, differenceInWeeks } from 'date-fns';
import { Flame, Bike, Footprints, HeartPulse, Mountain, Ship, Waves } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { calculateExerciseCalories } from '@/lib/calorie-calculator';
import { useIsMobile } from '@/hooks/use-mobile';
import { cn } from '@/lib/utils';
import { chartConfig } from '@/lib/chart.config';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, BarChart, Bar, XAxis, YAxis, CartesianGrid, LabelList, Legend } from 'recharts';
import { ChartContainer, ChartTooltipContent } from '@/components/ui/chart';
import { getPath, RoundedBar, renderPieLabel } from '@/lib/chart-utils';
import { toTitleCase } from '@/lib/analysis.config';


type ChartDataKey = keyof typeof chartConfig;

const categoryToCamelCase = (category: ExerciseCategory): string => {
  switch (category) {
    case 'Upper Body': return 'upperBody';
    case 'Lower Body': return 'lowerBody';
    case 'Full Body': return 'fullBody';
    case 'Cardio': return 'cardio';
    case 'Core': return 'core';
    default: return 'other';
  }
};


interface CardioAnalysisCardProps {
    isLoading: boolean;
    isError: boolean;
    userProfile: UserProfile | undefined;
    workoutLogs: WorkoutLog[] | undefined;
    filteredData: {
        logsForPeriod: WorkoutLog[];
        prsForPeriod: PersonalRecord[];
        goalsForPeriod: any[]; // Adjust type as needed
    };
    timeRange: string;
    timeRangeDisplayNames: Record<string, string>;
}

export const CardioAnalysisCard: React.FC<CardioAnalysisCardProps> = ({
    isLoading,
    isError,
    userProfile,
    workoutLogs,
    filteredData,
    timeRange,
    timeRangeDisplayNames,
}) => {
    const { toast } = useToast();
    const isMobile = useIsMobile();

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

        const totalCalories = cardioExercises.reduce((sum, ex) => sum + (ex.calories || 0), 0);

        const statsByActivity = cardioExercises.reduce((acc, ex) => {
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

        const pieChartData = Object.entries(statsByActivity).map(([name, stats], index) => ({
            name: `${name} `,
            value: Math.round(stats.totalCalories),
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
            const weeksWithData = uniqueMonthsWithData * 4.345;
            weeklyAverage = weeksWithData > 0 ? totalCalories / weeksWithData : 0;
            calorieSummary = `This year you've burned ${Math.round(totalCalories).toLocaleString()} cardio calories, averaging ${Math.round(weeklyAverage).toLocaleString()}/week.`;
        } else { // all-time
            const firstLogDate = workoutLogs && workoutLogs.length > 0 ? workoutLogs.reduce((earliest, log) => log.date < earliest.date ? log : earliest).date : new Date();
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

        let cardioAmountChartData: any[] = [];
        const activities = Array.from(new Set(cardioExercises.map(ex => ex.name)));
        const initialActivityData = Object.fromEntries(activities.map(act => [act, 0]));

        const processAndFinalizeData = (dataMap: Map<string, any>) => {
            const finalizedData = Array.from(dataMap.values());
            finalizedData.forEach(dataPoint => {
                let total = 0;
                activities.forEach(activity => {
                    total += dataPoint[activity] || 0;
                });
                dataPoint.total = Math.round(total);
            });
            return finalizedData;
        };

        switch (timeRange) {
            case 'weekly': {
                const weekStart = startOfWeek(today, { weekStartsOn: 0 });
                const daysInWeek = eachDayOfInterval({ start: weekStart, end: endOfWeek(today, { weekStartsOn: 0 }) });
                const dailyData = new Map<string, any>(daysInWeek.map(day => [format(day, 'yyyy-MM-dd'), { dateLabel: format(day, 'E'), ...initialActivityData }]));

                cardioExercises.forEach(ex => {
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

                const weeks = eachWeekOfInterval({ start: monthStart, end: monthEnd }, { weekStartsOn: 0 });

                weeks.forEach(weekStart => {
                    const weekEnd = endOfWeek(weekStart, { weekStartsOn: 0 });
                    if (weekStart.getMonth() === monthStart.getMonth() || weekEnd.getMonth() === monthStart.getMonth()) {
                        const dateLabel = `${format(weekStart, 'MMM d')}-${format(weekEnd, 'd')}`;
                        weeklyData.set(format(weekStart, 'yyyy-MM-dd'), { dateLabel, ...initialActivityData });
                    }
                });

                cardioExercises.forEach(ex => {
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
                cardioExercises.forEach(ex => {
                    const monthKey = format(ex.date, 'yyyy-MM');
                    if (!monthlyData.has(monthKey)) {
                        monthlyData.set(monthKey, { dateLabel: format(ex.date, 'MMM'), ...initialActivityData });
                    }
                    const monthData = monthlyData.get(monthKey);
                    monthData[ex.name] = (monthData[ex.name] || 0) + (ex.calories || 0);
                });
                const finalizedData = processAndFinalizeData(monthlyData);
                cardioAmountChartData = finalizedData
                    .filter(month => Object.values(month).some(val => typeof val === 'number' && val > 0))
                    .sort((a, b) => {
                        const monthOrder = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
                        return monthOrder.indexOf(a.dateLabel) - monthOrder.indexOf(b.dateLabel);
                    });
                break;
            }
            case 'all-time': {
                const yearlyData = new Map<string, any>();
                cardioExercises.forEach(ex => {
                    const yearKey = format(ex.date, 'yyyy');
                    if (!yearlyData.has(yearKey)) {
                        yearlyData.set(yearKey, { dateLabel: yearKey, ...initialActivityData });
                    }
                    const yearData = yearlyData.get(yearKey);
                    yearData[ex.name] = (yearData[ex.name] || 0) + (ex.calories || 0);
                });
                const finalizedData = processAndFinalizeData(yearlyData);
                cardioAmountChartData = Array.from(finalizedData.entries()).sort(([, a], [, b]) => a.dateLabel.localeCompare(b.dateLabel)).map(([, data]) => data);
                break;
            }
        }

        return { totalCalories, statsByActivity, pieChartData, calorieSummary, cardioAmountChartData };
    }, [filteredData, workoutLogs, timeRange, userProfile]);

    const formatCardioDuration = (totalMinutes: number): string => {
        const hours = Math.floor(totalMinutes / 60);
        const minutes = Math.round(totalMinutes % 60);
        if (hours > 0) {
            return `${hours}h ${minutes}m`;
        }
        return `${minutes}m`;
    };

    return (
        <Card className="shadow-lg lg:col-span-6">
            <CardHeader>
                <CardTitle className="font-headline flex items-center gap-2"><Flame className="h-6 w-6 text-primary" />Cardio Analysis</CardTitle>
                <CardDescription>A summary of your cardio performance {timeRangeDisplayNames[timeRange]}.</CardDescription>
            </CardHeader>
            <CardContent>
                {cardioAnalysisData.totalCalories > 0 ? (
                    <div className="space-y-4">
                        <p className="text-center text-muted-foreground text-sm">{cardioAnalysisData.calorieSummary}</p>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 pt-2">
                            <div className="flex flex-col">
                                <h4 className="font-bold mb-4 text-center md:text-left">Activity Summary</h4>
                                <div className="flex flex-col justify-start items-start space-y-3">
                                    {Object.entries(cardioAnalysisData.statsByActivity).map(([name, stats]) => {
                                        const avgDistance = stats.count > 0 && stats.totalDistanceMi > 0 ? (stats.totalDistanceMi / stats.count).toFixed(1) : null;
                                        const formattedDuration = formatCardioDuration(stats.totalDurationMin);

                                        let icon = <Footprints className="h-5 w-5 text-accent flex-shrink-0" />;
                                        if (name === 'Running') icon = <HeartPulse className="h-5 w-5 text-accent flex-shrink-0" />;
                                        if (name === 'Cycling') icon = <Bike className="h-5 w-5 text-accent flex-shrink-0" />;
                                        if (name === 'Rowing') icon = <Ship className="h-5 w-5 text-accent flex-shrink-0" />;
                                        if (name === 'Climbmill') icon = <Mountain className="h-5 w-5 text-accent flex-shrink-0" />;
                                        if (name === 'Swimming') icon = <Waves className="h-5 w-5 text-accent flex-shrink-0" />;

                                        return (
                                            <div key={name} className="flex items-start gap-3">
                                                {icon}
                                                <div>
                                                    <p className="font-bold">{name}</p>
                                                    <p className="text-xs text-muted-foreground">
                                                        You completed {stats.count} session{stats.count > 1 ? 's' : ''}
                                                        {stats.totalDistanceMi > 0 && `, covering ${stats.totalDistanceMi.toFixed(1)} mi`}
                                                        {stats.totalDurationMin > 0 && ` in ${formattedDuration}`}
                                                        , burning {Math.round(stats.totalCalories).toLocaleString()} kcal.
                                                        {avgDistance && ` Your average distance was ${avgDistance} mi.`}
                                                    </p>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                            <Tabs defaultValue="types" className="w-full">
                                <TabsList className="grid w-full grid-cols-2">
                                    <TabsTrigger value="types">Cardio By Activity</TabsTrigger>
                                    <TabsTrigger value="amount">Cardio Over Time</TabsTrigger>
                                </TabsList>
                                <TabsContent value="types">
                                    <ChartContainer config={chartConfig} className="h-[250px] w-full">
                                        <ResponsiveContainer>
                                            <PieChart margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
                                                <Pie
                                                    data={cardioAnalysisData.pieChartData}
                                                    dataKey="value"
                                                    nameKey="name"
                                                    cx="50%"
                                                    cy="50%"
                                                    outerRadius={isMobile ? 60 : 80}
                                                    labelLine={false}
                                                    label={(props) => renderPieLabel(props, 'kcal', isMobile)}
                                                >
                                                    {cardioAnalysisData.pieChartData.map((entry, index) => (
                                                        <Cell key={`cell-${index}`} fill={entry.fill} />
                                                    ))}
                                                </Pie>
                                                <Tooltip content={<ChartTooltipContent hideIndicator />} />
                                                <Legend content={({ payload }) => {
                                                    if (!payload) return null;
                                                    const numItems = payload.length;
                                                    const useTwoRows = numItems > 3;

                                                    return (
                                                        <div className="flex justify-center">
                                                            <div
                                                                className="grid gap-x-2 gap-y-1 text-xs mt-2"
                                                                style={{
                                                                    gridTemplateColumns: `repeat(${useTwoRows ? Math.ceil(numItems / 2) : numItems}, auto)`,
                                                                }}
                                                            >
                                                                {payload?.map((entry: any, index: number) => (
                                                                    <div key={`item-${index}`} className="flex items-center gap-1.5 justify-start">
                                                                        <span
                                                                            className="h-2.5 w-2.5 shrink-0 rounded-[2px]"
                                                                            style={{ backgroundColor: entry.color }}
                                                                        />
                                                                        <span className="text-muted-foreground">{entry.payload?.name}</span>
                                                                    </div>
                                                                ))}
                                                            </div>
                                                        </div>
                                                    );
                                                }} />
                                            </PieChart>
                                        </ResponsiveContainer>
                                    </ChartContainer>
                                </TabsContent>
                                <TabsContent value="amount">
                                    <ChartContainer config={chartConfig} className="h-[250px] w-full">
                                        <ResponsiveContainer>
                                            <BarChart data={cardioAnalysisData.cardioAmountChartData} margin={{ top: 20, right: 20, left: -10, bottom: 5 }}>
                                                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                                                <XAxis
                                                    dataKey="dateLabel"
                                                    tick={{ fontSize: 12 }}
                                                    interval={0}
                                                    angle={isMobile ? -45 : 0}
                                                    textAnchor={isMobile ? 'end' : 'middle'}
                                                    height={isMobile ? 50 : 30}
                                                    minTickGap={-5}
                                                />
                                                <YAxis allowDecimals={false} />
                                                <Tooltip content={<ChartTooltipContent nameKey="name" />} />
                                                <Legend content={({ payload }) => {
                                                    if (!payload) return null;
                                                    const numItems = payload.length;
                                                    const columns = numItems > 2 ? Math.ceil(numItems / 2) : numItems;
                                                    return (
                                                        <div className="flex justify-center mt-4">
                                                            <div className="grid gap-x-2 gap-y-1 text-xs" style={{ gridTemplateColumns: `repeat(${columns}, auto)` }}>
                                                                {payload.map((entry: any, index: number) => (
                                                                    <div key={`item-${index}`} className="flex items-center gap-1.5 justify-start">
                                                                        <span className="h-2.5 w-2.5 shrink-0 rounded-[2px]" style={{ backgroundColor: entry.color }} />
                                                                        <span className="text-muted-foreground">{entry.value}</span>
                                                                    </div>
                                                                ))}
                                                            </div>
                                                        </div>
                                                    )
                                                }} />
                                                {Object.keys(cardioAnalysisData.statsByActivity).map(activity => (
                                                    <Bar key={activity} dataKey={activity} stackId="a" fill={`var(--color-${activity})`} shape={<RoundedBar />}>
                                                        {Object.keys(cardioAnalysisData.statsByActivity).indexOf(activity) === Object.keys(cardioAnalysisData.statsByActivity).length - 1 && (
                                                            <LabelList dataKey="total" position="top" formatter={(value: number) => value > 0 ? value.toLocaleString() : ''} className="text-xs fill-foreground font-semibold" />
                                                        )}
                                                    </Bar>
                                                ))}
                                            </BarChart>
                                        </ResponsiveContainer>
                                    </ChartContainer>
                                </TabsContent>
                            </Tabs>
                        </div>
                    </div>
                ) : (
                    <div className="h-[250px] flex items-center justify-center text-muted-foreground text-center">
                        <p>No cardio data logged for this period.</p>
                    </div>
                )}
            </CardContent>
        </Card>
    );
};
