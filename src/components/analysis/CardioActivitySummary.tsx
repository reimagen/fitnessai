import React from 'react';
import { Bike, Footprints, HeartPulse, Mountain, Ship, Waves } from 'lucide-react';
import { formatCardioDuration } from '@/analysis/formatting-utils';

interface CardioStats {
  count: number;
  totalDistanceMi: number;
  totalDurationMin: number;
  totalCalories: number;
  hasEstimatedCalories: boolean;
}

interface CardioActivitySummaryProps {
  statsByActivity: Record<string, CardioStats>;
}

export const CardioActivitySummary: React.FC<CardioActivitySummaryProps> = ({ statsByActivity }) => {
  const getActivityIcon = (name: string) => {
    let icon = <Footprints className="h-5 w-5 text-accent flex-shrink-0" />;
    if (name === 'Running') icon = <HeartPulse className="h-5 w-5 text-accent flex-shrink-0" />;
    if (name === 'Cycling') icon = <Bike className="h-5 w-5 text-accent flex-shrink-0" />;
    if (name === 'Rowing') icon = <Ship className="h-5 w-5 text-accent flex-shrink-0" />;
    if (name === 'Climbmill') icon = <Mountain className="h-5 w-5 text-accent flex-shrink-0" />;
    if (name === 'Swimming') icon = <Waves className="h-5 w-5 text-accent flex-shrink-0" />;
    return icon;
  };

  return (
    <div className="flex flex-col">
      <h4 className="font-bold mb-4 text-center md:text-left">Activity Summary</h4>
      <div className="flex flex-col justify-start items-start space-y-3">
        {Object.entries(statsByActivity).map(([name, stats]) => {
          const avgDistance = stats.count > 0 && stats.totalDistanceMi > 0 ? (stats.totalDistanceMi / stats.count).toFixed(1) : null;
          const formattedDuration = formatCardioDuration(stats.totalDurationMin);

          return (
            <div key={name} className="flex items-start gap-3">
              {getActivityIcon(name)}
              <div>
                <p className="font-bold">{name}</p>
                <p className="text-xs text-muted-foreground">
                  You completed {stats.count} session{stats.count > 1 ? 's' : ''}
                  {stats.totalDistanceMi > 0 && `, covering ${stats.totalDistanceMi.toFixed(1)} mi`}
                  {stats.totalDurationMin > 0 && ` in ${formattedDuration}`}
                  , burning {Math.round(stats.totalCalories).toLocaleString()} kcal{stats.hasEstimatedCalories ? ' est.' : ''}
                  {avgDistance && ` Your average distance was ${avgDistance} mi.`}
                </p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
