import React from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, TrendingUp, Zap } from "lucide-react";
import type { WorkoutLog, PersonalRecord, UserProfile } from "@/lib/types";
import type { ExerciseDocument } from "@/lib/exercise-types";
import { getNormalizedExerciseName } from "@/lib/strength-standards";
import { toTitleCase } from "@/lib/utils";
import { useLiftProgression } from "@/hooks/useLiftProgression";
import { useLiftTrends } from "@/hooks/useLiftTrends";
import { useLiftProgressionAnalysis } from "@/hooks/useLiftProgressionAnalysis";
import { LiftProgressionChart } from "@/components/analysis/LiftProgressionChart";
import { LiftProgressionInsights } from "@/components/analysis/LiftProgressionInsights";

interface LiftProgressionCardProps {
  userProfile: UserProfile | undefined;
  workoutLogs: WorkoutLog[] | undefined;
  personalRecords: PersonalRecord[] | undefined;
  selectedLift: string;
  setSelectedLift: (lift: string) => void;
  frequentlyLoggedLifts: string[];
  exercises: ExerciseDocument[];
}

/**
 * Normalizes exercise name for lookup (removes EGYM/Machine prefix and extra characters)
 */
const normalizeForLookup = (name: string): string =>
  name
    .trim()
    .toLowerCase()
    .replace(/^(egym|machine)\s+/, '')
    .replace(/[()]/g, '')
    .replace(/\s+/g, ' ');

/**
 * Resolves exercise name to its canonical name using the exercise library.
 * If the normalized name matches a legacyName, uses the canonical exercise name.
 */
const resolveCanonicalName = (exerciseName: string, exerciseLibrary: ExerciseDocument[]): string => {
  const normalized = normalizeForLookup(exerciseName);

  // Try to find the exercise by normalized name or in legacyNames
  const exercise = exerciseLibrary.find(e => {
    if (e.normalizedName.toLowerCase() === normalized) return true;
    if (e.legacyNames?.some(ln => normalizeForLookup(ln) === normalized)) return true;
    return false;
  });

  return exercise?.normalizedName || exerciseName;
};

export const LiftProgressionCard: React.FC<LiftProgressionCardProps> = ({
  userProfile,
  workoutLogs,
  personalRecords,
  selectedLift,
  setSelectedLift,
  frequentlyLoggedLifts,
  exercises,
}) => {
  const canonicalLiftName = resolveCanonicalName(selectedLift, exercises);
  const selectedLiftKey = getNormalizedExerciseName(canonicalLiftName);

  // Check for analysis under both new (canonical) and old (original) keys
  // to handle migrations when exercise names were updated
  const progressionAnalysisToRender =
    userProfile?.liftProgressionAnalysis?.[selectedLiftKey] ||
    userProfile?.liftProgressionAnalysis?.[getNormalizedExerciseName(selectedLift)];

  const progressionChartData = useLiftProgression(
    selectedLift,
    selectedLiftKey,
    workoutLogs,
    personalRecords,
    exercises
  );

  const { currentLiftLevel, trendImprovement, volumeTrend, avgE1RM } = useLiftTrends(
    selectedLift,
    selectedLiftKey,
    progressionChartData,
    personalRecords,
    userProfile,
    workoutLogs,
    exercises
  );

  const { handleAnalyzeProgression, isPending } = useLiftProgressionAnalysis({
    userProfile,
    workoutLogs,
    selectedLift: canonicalLiftName,
    selectedLiftKey,
    currentLiftLevel,
    trendImprovement,
    volumeTrend,
    exercises,
  });

  const showProgressionReanalyze = !!progressionAnalysisToRender;

  return (
    <Card className="shadow-lg lg:col-span-6">
      <CardHeader>
        <CardTitle className="font-headline flex items-center gap-2">
          <TrendingUp className="h-6 w-6 text-primary" />
          Lift Progression Analysis
        </CardTitle>
        <CardDescription>
          Select a frequently logged lift to analyze your strength (e1RM) and volume trends over the last 6 weeks.
        </CardDescription>
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
                frequentlyLoggedLifts.map((lift) => (
                  <SelectItem key={lift} value={lift}>
                    {toTitleCase(lift)}
                  </SelectItem>
                ))
              ) : (
                <SelectItem value="none" disabled>Log more workouts to analyze</SelectItem>
              )}
            </SelectContent>
          </Select>
          <Button
            onClick={handleAnalyzeProgression}
            disabled={!selectedLift || isPending}
            className="w-full sm:w-auto"
          >
            {isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Zap className="mr-2 h-4 w-4" />}
            {showProgressionReanalyze ? "Re-analyze" : "Get AI Progression Analysis"}
          </Button>
        </div>

        <LiftProgressionChart
          selectedLift={selectedLift}
          chartData={progressionChartData.chartData}
          trendlineData={progressionChartData.trendlineData}
          currentLiftLevel={currentLiftLevel}
          trendImprovement={trendImprovement}
          volumeTrend={volumeTrend}
          avgE1RM={avgE1RM}
        />

        <div className="pt-4 border-t">
          {isPending ? (
            <div className="flex items-center justify-center text-muted-foreground p-4 text-sm">
              <Loader2 className="h-5 w-5 animate-spin mr-3" /> Generating AI analysis...
            </div>
          ) : progressionAnalysisToRender ? (
            <LiftProgressionInsights
              generatedDate={progressionAnalysisToRender.generatedDate}
              insight={progressionAnalysisToRender.result.insight}
              recommendation={progressionAnalysisToRender.result.recommendation}
            />
          ) : null}
        </div>
      </CardContent>
    </Card>
  );
};
