import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import React from 'react';
import { Flame } from 'lucide-react';
import { useIsMobile } from '@/hooks/useMobile';
import { CardioActivitySummary } from './CardioActivitySummary';
import { CardioByActivityChart } from './CardioByActivityChart';
import { CardioOverTimeChart } from './CardioOverTimeChart';

interface CardioStats {
  count: number;
  totalDistanceMi: number;
  totalDurationMin: number;
  totalCalories: number;
  hasEstimatedCalories: boolean;
}

interface PieChartData {
  name: string;
  value: number;
  fill: string;
}

interface CardioAmountChartPoint {
  dateLabel: string;
  total: number;
  [key: string]: number | string;
}

interface CardioAnalysisData {
  totalCalories: number;
  statsByActivity: Record<string, CardioStats>;
  pieChartData: PieChartData[];
  calorieSummary: string;
  cardioAmountChartData: CardioAmountChartPoint[];
}

interface CardioAnalysisCardProps {
    cardioAnalysisData: CardioAnalysisData;
    timeRange: string;
    timeRangeDisplayNames: Record<string, string>;
}

export const CardioAnalysisCard: React.FC<CardioAnalysisCardProps> = ({
    cardioAnalysisData,
    timeRange,
    timeRangeDisplayNames,
}) => {
    const isMobile = useIsMobile();

    return (
        <Card className="shadow-lg lg:col-span-6">
            <CardHeader>
                <CardTitle className="font-headline flex items-center gap-2"><Flame className="h-6 w-6 text-primary" />Cardio Analysis</CardTitle>
                <CardDescription>A summary of your cardio performance {timeRangeDisplayNames[timeRange]}.</CardDescription>
            </CardHeader>
            <CardContent>
                {cardioAnalysisData.totalCalories > 0 ? (
                    <div className="space-y-4">
                        <p className="text-center text-muted-foreground">{cardioAnalysisData.calorieSummary}</p>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 pt-2">
                            <CardioActivitySummary statsByActivity={cardioAnalysisData.statsByActivity} />
                            <Tabs defaultValue="types" className="w-full">
                                <TabsList className="grid w-full grid-cols-2">
                                    <TabsTrigger value="types" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
                                        Cardio By Activity
                                    </TabsTrigger>
                                    <TabsTrigger value="amount" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
                                        Cardio Over Time
                                    </TabsTrigger>
                                </TabsList>
                                <TabsContent value="types">
                                    <CardioByActivityChart pieChartData={cardioAnalysisData.pieChartData} isMobile={isMobile} />
                                </TabsContent>
                                <TabsContent value="amount">
                                    <CardioOverTimeChart
                                        cardioAmountChartData={cardioAnalysisData.cardioAmountChartData}
                                        statsByActivity={cardioAnalysisData.statsByActivity}
                                        isMobile={isMobile}
                                    />
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
