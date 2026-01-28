import React from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, LabelList, Legend, ResponsiveContainer, Tooltip } from 'recharts';
import { ChartContainer, ChartTooltipContent } from '@/components/ui/chart';
import { RoundedBar } from '@/analysis/chart-utils';
import { chartConfig } from '@/analysis/chart.config';

interface CardioStats {
  count: number;
  totalDistanceMi: number;
  totalDurationMin: number;
  totalCalories: number;
}

interface CardioAmountChartPoint {
  dateLabel: string;
  total: number;
  [key: string]: number | string;
}

interface CardioOverTimeChartProps {
  cardioAmountChartData: CardioAmountChartPoint[];
  statsByActivity: Record<string, CardioStats>;
  isMobile: boolean;
}

type LegendPayloadEntry = {
  color?: string;
  value?: string | number;
};

export const CardioOverTimeChart: React.FC<CardioOverTimeChartProps> = ({ cardioAmountChartData, statsByActivity, isMobile }) => {
  return (
    <ChartContainer config={chartConfig} className="h-[250px] w-full">
      <ResponsiveContainer>
        <BarChart data={cardioAmountChartData} margin={{ top: 20, right: 20, left: -10, bottom: 5 }}>
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
          <Legend content={({ payload }: { payload?: LegendPayloadEntry[] }) => {
            if (!payload) return null;
            const numItems = payload.length;
            const columns = numItems > 2 ? Math.ceil(numItems / 2) : numItems;
            return (
              <div className="flex justify-center mt-4">
                <div className="grid gap-x-2 gap-y-1 text-xs" style={{ gridTemplateColumns: `repeat(${columns}, auto)` }}>
                  {payload.map((entry, index) => (
                    <div key={`item-${index}`} className="flex items-center gap-1.5 justify-start">
                      <span className="h-2.5 w-2.5 shrink-0 rounded-[2px]" style={{ backgroundColor: entry.color }} />
                      <span className="text-muted-foreground">{entry.value}</span>
                    </div>
                  ))}
                </div>
              </div>
            )
          }} />
          {Object.keys(statsByActivity).map(activity => (
            <Bar key={activity} dataKey={activity} stackId="a" fill={`var(--color-${activity})`} shape={<RoundedBar />}>
              {Object.keys(statsByActivity).indexOf(activity) === Object.keys(statsByActivity).length - 1 && (
                <LabelList dataKey="total" position="top" formatter={(value: number) => value > 0 ? value.toLocaleString() : ''} className="text-xs fill-foreground font-semibold" />
              )}
            </Bar>
          ))}
        </BarChart>
      </ResponsiveContainer>
    </ChartContainer>
  );
};
