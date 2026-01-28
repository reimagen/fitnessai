import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader } from "@/components/ui/card";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { AlertTriangle, Check, Lightbulb, Loader2, RefreshCw, Star, Zap } from "lucide-react";
import { format as formatDate } from "date-fns";
import type { AnalyzeFitnessGoalsOutput, FitnessGoal } from "@/lib/types";

type GoalAnalysisSectionProps = {
  analysis: AnalyzeFitnessGoalsOutput | undefined;
  generatedDate: Date | undefined;
  activeGoalsForAnalysis: FitnessGoal[];
  acceptedSuggestions: string[];
  isAnalyzing: boolean;
  onAnalyze: () => void;
  onAcceptSuggestion: (originalDescription: string, suggestedGoal: string, timelineInDays?: number) => void;
};

export function GoalAnalysisSection({
  analysis,
  generatedDate,
  activeGoalsForAnalysis,
  acceptedSuggestions,
  isAnalyzing,
  onAnalyze,
  onAcceptSuggestion,
}: GoalAnalysisSectionProps) {
  return (
    <div className="pt-6 mt-6 border-t">
      <h4 className="font-headline flex items-center gap-2 text-lg mb-2 text-primary">
        <Zap className="h-5 w-5" />
        AI Goal Analysis
      </h4>
      <p className="text-sm text-muted-foreground mb-4">
        Get AI-powered help refining your goals to make them specific and time-bound, based on your profile stats.
      </p>

      <TooltipProvider>
        <Tooltip delayDuration={100}>
          <TooltipTrigger asChild>
            <div className="inline-block">
              <Button onClick={onAnalyze} disabled={isAnalyzing || activeGoalsForAnalysis.length === 0} className="w-full sm:w-auto">
                {isAnalyzing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Zap className="mr-2 h-4 w-4" />}
                Analyze My Goals
              </Button>
            </div>
          </TooltipTrigger>
          {activeGoalsForAnalysis.length === 0 && (
            <TooltipContent>
              <p>Please add at least one active goal before analyzing.</p>
            </TooltipContent>
          )}
        </Tooltip>
      </TooltipProvider>

      {analysis && (
        <Card className="mt-6 bg-secondary/30">
          <CardHeader>
            <CardDescription>
              {generatedDate ? `Generated on: ${formatDate(generatedDate, "MMMM d, yyyy")}` : ""}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm italic text-muted-foreground">{analysis.overallSummary}</p>
            <div className="space-y-4">
              {analysis.goalInsights.map((insight, index) => {
                const isPrimary = insight.relationshipToPrimary === "Primary";
                const canApplySuggestion = activeGoalsForAnalysis.some(
                  goal => goal.description === insight.originalGoalDescription && goal.description !== insight.suggestedGoal,
                );
                const wasSuggestionAccepted = acceptedSuggestions.includes(insight.originalGoalDescription);

                return (
                  <div key={index} className="p-3 border rounded-md bg-background/50">
                    <div className="relative">
                      <div className="md:pr-36">
                        <p className="text-sm font-semibold text-muted-foreground">
                          {isPrimary && <Star className="inline-block h-4 w-4 mr-2 fill-yellow-400 text-yellow-500" />}
                          Original Goal: &quot;{insight.originalGoalDescription}&quot;
                        </p>
                      </div>
                      <div className="absolute top-0 right-0 hidden md:block">
                        {wasSuggestionAccepted ? (
                          <Button size="sm" variant="outline" className="h-auto px-2 py-1 text-xs" onClick={onAnalyze}>
                            <RefreshCw className="mr-1.5 h-3 w-3" />
                            Refresh Analysis
                          </Button>
                        ) : canApplySuggestion ? (
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-auto px-2 py-1 text-xs"
                            onClick={() =>
                              onAcceptSuggestion(insight.originalGoalDescription, insight.suggestedGoal, insight.suggestedTimelineInDays)
                            }
                          >
                            <Check className="mr-1.5 h-3 w-3" />
                            Use AI Suggestion
                          </Button>
                        ) : null}
                      </div>
                    </div>

                    <div className="mt-3 space-y-3">
                      {insight.isConflicting && (
                        <div className="flex items-start gap-2 text-sm text-destructive">
                          <AlertTriangle className="h-4 w-4 mt-0.5 flex-shrink-0" />
                          <p>
                            <span className="font-semibold">Conflict:</span> This goal may conflict with others.
                          </p>
                        </div>
                      )}
                      <div className="flex items-start gap-2 text-sm text-primary">
                        <Lightbulb className="h-4 w-4 mt-0.5 flex-shrink-0" />
                        <p>
                          <span className="font-semibold">Suggestion:</span> {insight.suggestedGoal}
                        </p>
                      </div>
                      <p className="text-xs text-muted-foreground pl-6">{insight.analysis}</p>
                    </div>

                    <div className="mt-4 md:hidden">
                      {wasSuggestionAccepted ? (
                        <Button size="sm" variant="outline" className="w-full" onClick={onAnalyze}>
                          <RefreshCw className="mr-2 h-4 w-4" />
                          Refresh Analysis
                        </Button>
                      ) : canApplySuggestion ? (
                        <Button
                          size="sm"
                          variant="outline"
                          className="w-full"
                          onClick={() =>
                            onAcceptSuggestion(insight.originalGoalDescription, insight.suggestedGoal, insight.suggestedTimelineInDays)
                          }
                        >
                          <Check className="mr-2 h-4 w-4" />
                          Use AI Suggestion
                        </Button>
                      ) : null}
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
