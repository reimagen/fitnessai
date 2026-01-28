import React from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';
import { ChartContainer, ChartTooltipContent } from '@/components/ui/chart';
import { chartConfig } from '@/analysis/chart.config';
import { renderPieLabel } from '@/analysis/chart-utils';

interface PieChartData {
  name: string;
  value: number;
  fill: string;
}

interface CardioByActivityChartProps {
  pieChartData: PieChartData[];
  isMobile: boolean;
}

type LegendPayloadEntry = {
  color?: string;
  payload?: {
    name?: string;
  };
};

export const CardioByActivityChart: React.FC<CardioByActivityChartProps> = ({ pieChartData, isMobile }) => {
  return (
    <ChartContainer config={chartConfig} className="h-[250px] w-full">
      <ResponsiveContainer>
        <PieChart margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
          <Pie
            data={pieChartData}
            dataKey="value"
            nameKey="name"
            cx="50%"
            cy="50%"
            outerRadius={isMobile ? 60 : 80}
            labelLine={false}
            label={(props) => renderPieLabel(props, 'kcal', isMobile)}
          >
            {pieChartData.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={entry.fill} />
            ))}
          </Pie>
          <Tooltip content={<ChartTooltipContent hideIndicator />} />
          <Legend content={({ payload }: { payload?: LegendPayloadEntry[] }) => {
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
                  {payload?.map((entry, index) => (
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
  );
};
