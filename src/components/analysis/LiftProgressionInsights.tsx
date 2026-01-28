import React from "react";
import { Lightbulb, Zap } from "lucide-react";
import { format } from "date-fns";

type LiftProgressionInsightsProps = {
  generatedDate?: Date;
  insight?: string;
  recommendation?: string;
};

export const LiftProgressionInsights: React.FC<LiftProgressionInsightsProps> = ({
  generatedDate,
  insight,
  recommendation,
}) => {
  return (
    <div className="space-y-4">
      {generatedDate && (
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 text-center">
          <p className="text-xs text-muted-foreground">Analysis from: {format(generatedDate, "MMM d, yyyy")}</p>
        </div>
      )}
      {insight && (
        <div>
          <p className="text-sm font-semibold flex items-center gap-2"><Lightbulb className="h-4 w-4 text-primary" />Insight</p>
          <p className="text-xs text-muted-foreground mt-1">{insight}</p>
        </div>
      )}
      {recommendation && (
        <div>
          <p className="text-sm font-semibold flex items-center gap-2"><Zap className="h-4 w-4 text-accent" />Recommendation</p>
          <p className="text-xs text-muted-foreground mt-1">{recommendation}</p>
        </div>
      )}
    </div>
  );
};
