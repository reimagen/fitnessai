import React from "react";
import { Badge } from "@/components/ui/badge";
import { ChartContainer } from "@/components/ui/chart";
import { toTitleCase } from "@/lib/utils";
import { chartConfig } from "@/analysis/chart.config";
import { getLevelBadgeVariant, getTrendBadgeVariant } from "@/analysis/badge-utils";
import { useIsMobile } from "@/hooks/useMobile";
import { cn } from "@/lib/utils";
import { Trophy } from "lucide-react";
import { Bar, CartesianGrid, ComposedChart, Label, Legend, Line, ReferenceLine, ResponsiveContainer, Scatter, Tooltip, XAxis, YAxis } from "recharts";
import type { StrengthLevel } from "@/lib/types";

type ProgressionChartDataPoint = {
  name: string;
  e1RM: number;
  volume: number;
  isActualPR?: boolean;
  actualPR?: number;
};

type TrendlineData = {
  start: { x: string; y: number };
  end: { x: string; y: number };
} | null;

type LiftProgressionChartProps = {
  selectedLift: string;
  chartData: ProgressionChartDataPoint[];
  trendlineData: TrendlineData;
  currentLiftLevel: StrengthLevel | null;
  trendImprovement: number | null;
  volumeTrend: number | null;
  avgE1RM: number | null;
};

type TrophyShapeProps = {
  cx: number;
  cy: number;
  payload: ProgressionChartDataPoint;
};

type ProgressionTooltipProps = {
  active?: boolean;
  payload?: Array<{
    payload: ProgressionChartDataPoint;
  }>;
};

type ProgressionChartLegendPayloadItem = {
  dataKey: string;
  color: string;
};

type ProgressionChartLegendProps = {
  payload?: ProgressionChartLegendPayloadItem[];
};

const TrophyShape: React.FC<TrophyShapeProps> = ({ cx, cy, payload }) => {
  if (!payload.isActualPR) return null;
  return (
    <g transform={`translate(${cx - 12}, ${cy - 12})`}>
      <foreignObject x={0} y={0} width={24} height={24}>
        <Trophy
          className="h-6 w-6 text-amber-500 fill-amber-400 stroke-amber-600"
          strokeWidth={1.5}
        />
      </foreignObject>
    </g>
  );
};

const ProgressionTooltip: React.FC<ProgressionTooltipProps> = ({ active, payload }) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    return (
      <div className="p-2 bg-background border rounded-md shadow-lg text-xs space-y-1">
        <p className="font-bold">{data.name}</p>
        {data.isActualPR && (
          <p className="font-bold text-amber-500 flex items-center gap-1">
            <Trophy className="h-4 w-4" />
            Personal Record: {data.actualPR?.toLocaleString()} lbs
          </p>
        )}
        {data.e1RM > 0 && <p style={{ color: "hsl(var(--primary))" }}>e1RM: {data.e1RM.toLocaleString()} lbs</p>}
        {data.volume > 0 && <p style={{ color: "hsl(var(--chart-2))" }}>Volume: {data.volume.toLocaleString()} lbs</p>}
      </div>
    );
  }
  return null;
};

const ProgressionChartLegend: React.FC<ProgressionChartLegendProps> = ({ payload }) => {
  const isMobile = useIsMobile();
  if (!payload) return null;

  const legendItems: ProgressionChartLegendPayloadItem[] = [
    { dataKey: "volume", color: "hsl(var(--chart-2))" },
    { dataKey: "e1RM", color: "hsl(var(--primary))" },
    { dataKey: "trend", color: "hsl(var(--muted-foreground))" },
    { dataKey: "actualPR", color: "hsl(var(--accent))" },
  ];

  return (
    <div className={cn(
      "flex items-center justify-center gap-x-4 gap-y-2 text-xs mt-2",
      isMobile && "flex-wrap"
    )}>
      {legendItems.map((entry, index: number) => {
        const config = chartConfig[entry.dataKey as keyof typeof chartConfig];
        if (!config) return null;
        const isLine = entry.dataKey === "e1RM";
        const isTrend = entry.dataKey === "trend";

        return (
          <div key={`item-${index}`} className="flex items-center gap-1.5">
            {entry.dataKey === "actualPR" ? (
              <Trophy className="h-4 w-4 text-amber-500" />
            ) : isTrend ? (
              <span className="w-4 h-px border-t-2 border-dashed" style={{ borderColor: entry.color }} />
            ) : (
              <span
                className={`h-2.5 w-2.5 shrink-0 ${isLine ? "rounded-full" : "rounded-[2px]"}`}
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

export const LiftProgressionChart: React.FC<LiftProgressionChartProps> = ({
  selectedLift,
  chartData,
  trendlineData,
  currentLiftLevel,
  trendImprovement,
  volumeTrend,
  avgE1RM,
}) => {
  if (!selectedLift || chartData.length <= 1) {
    return null;
  }

  return (
    <div className="pt-4">
      <div className="text-center mb-2">
        <h4 className="font-semibold capitalize">{toTitleCase(selectedLift)} - Strength & Volume Trend (Last 6 Weeks)</h4>
        <div className="text-sm text-muted-foreground mt-1 flex items-center justify-center gap-x-4 gap-y-1 flex-wrap min-h-[24px]">
          {currentLiftLevel && (
            <span>
              Current Level: <Badge variant={getLevelBadgeVariant(currentLiftLevel)}>{currentLiftLevel}</Badge>
            </span>
          )}
          {avgE1RM !== null && (
            <span>
              e1RM: <Badge variant={getLevelBadgeVariant('Beginner')}>{Math.round(avgE1RM)} lbs</Badge>
            </span>
          )}
          {trendImprovement !== null && (
            <span>
              e1RM Trend: <Badge variant={getTrendBadgeVariant(trendImprovement)}>
                {trendImprovement > 0 ? "+" : ""}{trendImprovement.toFixed(0)}%
              </Badge>
            </span>
          )}
          {volumeTrend !== null && (
            <span>
              Volume Trend: <Badge variant={getTrendBadgeVariant(volumeTrend)}>
                {volumeTrend > 0 ? "+" : ""}{volumeTrend.toFixed(0)}%
              </Badge>
            </span>
          )}
        </div>
      </div>
      <ChartContainer config={chartConfig} className="h-[250px] w-full">
        <ResponsiveContainer>
          <ComposedChart data={chartData} margin={{ top: 5, right: 20, left: 20, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} />
            <XAxis dataKey="name" tick={{ fontSize: 10 }} interval="preserveStartEnd" />
            <YAxis yAxisId="left" domain={["dataMin - 10", "dataMax + 10"]} allowDecimals={false} tick={{ fontSize: 10 }}>
              <Label value="e1RM (lbs)" angle={-90} position="insideLeft" style={{ textAnchor: "middle", fontSize: "12px" }} />
            </YAxis>
            <YAxis yAxisId="right" orientation="right" domain={["dataMin - 500", "dataMax + 500"]} allowDecimals={false} tick={{ fontSize: 10 }}>
              <Label value="Total Volume (lbs)" angle={90} position="insideRight" style={{ textAnchor: "middle", fontSize: "12px" }} />
            </YAxis>
            <Tooltip content={<ProgressionTooltip />} />
            <Legend content={<ProgressionChartLegend />} />
            <Bar yAxisId="right" dataKey="volume" fill="var(--color-volume)" radius={[4, 4, 0, 0]} />
            <Line yAxisId="left" type="monotone" dataKey="e1RM" stroke="var(--color-e1RM)" strokeWidth={2} dot={{ r: 4, fill: "var(--color-e1RM)" }} />
            <Scatter
              yAxisId="left"
              dataKey="actualPR"
              fill="var(--color-actualPR)"
              shape={(props: unknown) => <TrophyShape {...(props as TrophyShapeProps)} />}
            />
            {trendlineData && (
              <ReferenceLine
                yAxisId="left"
                segment={[trendlineData.start, trendlineData.end]}
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
  );
};
