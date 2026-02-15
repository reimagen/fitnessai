import { Card, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Loader2, Zap, Lightbulb, Scale } from 'lucide-react';
import type { StrengthImbalanceOutput } from '@/lib/types';
import type { ImbalanceType } from '@/analysis/analysis.config';
import { focusBadgeProps } from '@/analysis/analysis.utils';
import {
  getGuidingLevel,
  getNextStrengthLevel,
  severityBadgeForFinding,
  type ClientSideFinding,
} from '@/analysis/strength-balance.utils';

type StrengthBalanceFindingCardProps = {
  type: ImbalanceType;
  finding: ClientSideFinding;
  aiFinding: StrengthImbalanceOutput['findings'][number] | undefined;
  isAnalyzing: boolean;
};

function isNoDataFinding(
  finding: ClientSideFinding
): finding is { imbalanceType: ImbalanceType; hasData: false; missingLifts?: string[] } {
  return 'hasData' in finding && finding.hasData === false;
}

export function StrengthBalanceFindingCard({
  type,
  finding,
  aiFinding,
  isAnalyzing,
}: StrengthBalanceFindingCardProps) {
  if (isNoDataFinding(finding)) {
    return (
      <Card className="p-4 bg-secondary/50 flex flex-col transition-all hover:-translate-y-0.5 hover:bg-secondary/70 hover:shadow-xl hover:shadow-primary/15">
        <CardTitle className="text-base flex items-center justify-between">
          {type} <Badge variant="secondary">No Data</Badge>
        </CardTitle>
        <div className="flex-grow flex flex-col items-center justify-center text-center text-muted-foreground my-4">
          <Scale className="h-8 w-8 text-muted-foreground/50 mb-2" />
          <p className="text-sm font-semibold">Log workouts to analyze</p>
          {finding.missingLifts && finding.missingLifts.length > 0 && (
            <p className="text-xs text-muted-foreground mt-1">
              Missing: {finding.missingLifts.join(', ')}
            </p>
          )}
          <p className="text-xs text-muted-foreground mt-1">Requires Data from Last 6 Weeks</p>
        </div>
      </Card>
    );
  }

  const dataFinding = finding;
  const badgeProps = focusBadgeProps(dataFinding.imbalanceFocus);
  const severityBadge = severityBadgeForFinding(dataFinding);
  const guidingLevel = getGuidingLevel(dataFinding.lift1Level, dataFinding.lift2Level);
  const nextLevel = getNextStrengthLevel(guidingLevel);

  return (
    <Card className="p-4 bg-secondary/50 flex flex-col transition-all hover:-translate-y-0.5 hover:bg-secondary/70 hover:shadow-xl hover:shadow-primary/15">
      <CardTitle className="text-base">{dataFinding.imbalanceType}</CardTitle>
      <div className="text-xs text-muted-foreground grid grid-cols-2 gap-x-4 gap-y-1 pb-4">
        <p>
          {dataFinding.lift1Name}:{' '}
          <span className="font-bold text-foreground">
            {dataFinding.lift1Weight} {dataFinding.lift1Unit}
          </span>
          {dataFinding.lift1SessionCount && (
            <span className="text-xs text-muted-foreground ml-1">({dataFinding.lift1SessionCount} sessions)</span>
          )}
        </p>
        <p>
          {dataFinding.lift2Name}:{' '}
          <span className="font-bold text-foreground">
            {dataFinding.lift2Weight} {dataFinding.lift2Unit}
          </span>
          {dataFinding.lift2SessionCount && (
            <span className="text-xs text-muted-foreground ml-1">({dataFinding.lift2SessionCount} sessions)</span>
          )}
        </p>
        <p>
          Your Ratio: <span className="font-bold text-foreground">{dataFinding.userRatio}</span>
        </p>
        <p>
          Balanced Range: <span className="font-bold text-foreground">{dataFinding.balancedRange}</span>
        </p>
      </div>

      <div className="pt-4 mt-auto border-t flex flex-col flex-grow">
        <div className="flex-grow">
          {isAnalyzing ? (
            <div className="flex items-center justify-center text-muted-foreground text-sm">
              <Loader2 className="h-4 w-4 animate-spin mr-2" /> Generating AI insight...
            </div>
          ) : aiFinding ? (
            <div className="space-y-3">
              <div className="mb-4 flex items-center gap-2">
                <Badge variant={badgeProps.variant}>{badgeProps.text}</Badge>
                {severityBadge && <Badge variant={severityBadge.variant}>{severityBadge.text}</Badge>}
              </div>
              <div>
                <p className="text-sm font-semibold flex items-center gap-2">
                  <Lightbulb className="h-4 w-4 text-primary" />Insight
                </p>
                <p className="text-xs text-muted-foreground mt-1">{aiFinding.insight}</p>
              </div>
              <div>
                <p className="text-sm font-semibold flex items-center gap-2">
                  <Zap className="h-4 w-4 text-accent" />Recommendation
                </p>
                <p className="text-xs text-muted-foreground mt-1">{aiFinding.recommendation}</p>
              </div>
            </div>
          ) : dataFinding.imbalanceFocus !== 'Balanced' ? (
            <div>
              <div className="mb-4 flex items-center gap-2">
                <Badge variant={badgeProps.variant}>{badgeProps.text}</Badge>
                {severityBadge && <Badge variant={severityBadge.variant}>{severityBadge.text}</Badge>}
              </div>
              <p className="text-center text-muted-foreground text-xs">
                This appears imbalanced. Click &quot;Get AI Insights&quot; for analysis.
              </p>
            </div>
          ) : (
            <div>
              <div className="mb-4">
                <Badge variant={badgeProps.variant}>{badgeProps.text}</Badge>
              </div>
              <p className="text-sm font-semibold flex items-center gap-2">Next Focus</p>
              <p className="text-xs text-muted-foreground mt-1">
                {guidingLevel !== 'N/A' && nextLevel
                  ? (
                    <>
                      Your lifts are well-balanced. Focus on progressive overload to advance both lifts from{' '}
                      <span className="font-bold text-foreground">{guidingLevel}</span> to{' '}
                      <span className="font-bold text-foreground">{nextLevel}</span>.
                    </>
                    )
                  : 'Your lifts are well-balanced. Keep training consistently and logging workouts to maintain this balance.'}
              </p>
            </div>
          )}
        </div>
      </div>
    </Card>
  );
}
