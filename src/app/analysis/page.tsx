
"use client";

import { Loader2, Trophy, UserPlus, TrendingUp } from 'lucide-react';
import React, { useState, useEffect, useMemo } from 'react';
import type { WorkoutLog, PersonalRecord, AnalyzeLiftProgressionInput, StrengthImbalanceInput, FitnessGoal, StrengthFinding, StrengthLevel } from '@/lib/types';
import { useWorkouts, usePersonalRecords, useUserProfile, useAnalyzeLiftProgression, useAnalyzeStrength } from '@/lib/firestore.service';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ErrorState } from '@/components/shared/ErrorState';
import { useAuth } from '@/lib/auth.service';
import { getNormalizedExerciseName } from '@/lib/strength-standards';
import { useToast } from '@/hooks/use-toast';
import { useIsMobile } from '@/hooks/use-mobile';
import Link from 'next/link';
import { CalorieBreakdownCard } from '@/components/analysis/CalorieBreakdownCard';
import { RepetitionBreakdownCard } from '@/components/analysis/RepetitionBreakdownCard';
import StrengthBalanceCard from '@/components/analysis/StrengthBalanceCard';
import { LiftProgressionCard } from '@/components/analysis/LiftProgressionCard';
import { ExerciseVarietyCard } from '@/components/analysis/ExerciseVarietyCard';
import { MilestonesCard } from '@/components/analysis/MilestonesCard';
import { CardioAnalysisCard } from '@/components/analysis/CardioAnalysisCard';
import { useStrengthFindings } from '@/hooks/useStrengthFindings';
import { useFilteredData } from '@/hooks/useFilteredData';
import { useChartData } from '@/hooks/useChartData';
import { useLiftProgression } from '@/hooks/useLiftProgression';
import { useLiftTrends } from '@/hooks/useLiftTrends';
import { useCardioAnalysis } from '@/hooks/useCardioAnalysis';
import { formatCardioDuration } from '@/lib/formatting-utils';
import { getLevelBadgeVariant, getTrendBadgeVariant, focusBadgeProps } from '@/lib/badge-utils';
import { cn } from '@/lib/utils';
import { subWeeks, isAfter } from 'date-fns';
import { chartConfig } from '@/lib/chart.config';
import { timeRangeDisplayNames } from '@/lib/analysis-constants';

export default function AnalysisPage() {
  const { toast } = useToast();
  const { user } = useAuth();
  const [timeRange, setTimeRange] = useState('weekly');
  const [selectedLift, setSelectedLift] = useState<string>('');

  // Data fetching
  const { data: profileResult, isLoading: isLoadingProfile, isError: isErrorProfile } = useUserProfile();
  const userProfile = profileResult?.data;
  const isProfileNotFound = profileResult?.notFound === true;

  const analyzeProgressionMutation = useAnalyzeLiftProgression();
  const analyzeStrengthMutation = useAnalyzeStrength();

  const enableDataFetching = !isLoadingProfile && !!userProfile;
  const { data: workoutLogs, isLoading: isLoadingWorkouts, isError: isErrorWorkouts } = useWorkouts(undefined, enableDataFetching);
  const { data: personalRecords, isLoading: isLoadingPrs, isError: isErrorPrs } = usePersonalRecords(enableDataFetching);

  const analysisToRender = userProfile?.strengthAnalysis?.result;
  const generatedDate = userProfile?.strengthAnalysis?.generatedDate;

  const selectedLiftKey = getNormalizedExerciseName(selectedLift);
  const progressionAnalysisToRender = userProfile?.liftProgressionAnalysis?.[selectedLiftKey];

  // Custom hooks for data processing
  const clientSideFindings = useStrengthFindings(personalRecords, userProfile || undefined);
  const filteredData = useFilteredData(timeRange, workoutLogs, personalRecords, userProfile?.fitnessGoals);
  const chartData = useChartData(timeRange, filteredData.logsForPeriod, filteredData.prsForPeriod, filteredData.goalsForPeriod);
  const progressionChartData = useLiftProgression(selectedLift, selectedLiftKey, workoutLogs, personalRecords);
  const { currentLiftLevel, trendImprovement, volumeTrend } = useLiftTrends(
    selectedLift,
    selectedLiftKey,
    progressionChartData,
    personalRecords,
    userProfile || undefined
  );
  const cardioAnalysisData = useCardioAnalysis(timeRange, workoutLogs, userProfile || undefined, filteredData.logsForPeriod);

  // Handler for strength analysis
  const handleAnalyzeStrength = () => {
    if (!userProfile) {
      toast({ title: 'Profile Not Loaded', description: 'Your user profile is not available. Please try again.', variant: 'destructive' });
      return;
    }
    const validFindings = clientSideFindings.filter((f): f is StrengthFinding => !('hasData' in f));

    const analysisInput: StrengthImbalanceInput = {
      clientSideFindings: validFindings.map((f: StrengthFinding) => ({
        ...f,
        targetRatio: f.targetRatio,
      })),
      userProfile: {
        age: userProfile.age,
        gender: userProfile.gender,
        weightValue: userProfile.weightValue,
        weightUnit: userProfile.weightUnit,
        skeletalMuscleMassValue: userProfile.skeletalMuscleMassValue,
        skeletalMuscleMassUnit: userProfile.skeletalMuscleMassUnit,
        fitnessGoals: (userProfile.fitnessGoals || [])
          .filter((g: FitnessGoal) => !g.achieved)
          .map((g: FitnessGoal) => ({
            description: g.description,
            isPrimary: g.isPrimary || false,
          })),
      },
    };

    analyzeStrengthMutation.mutate(analysisInput);
  };

  // Get frequently logged lifts
  const frequentlyLoggedLifts = useMemo(() => {
    if (!workoutLogs) return [];
    const weightedExercises = new Map<string, number>();
    workoutLogs.forEach((log: WorkoutLog) => {
      log.exercises.forEach((ex) => {
        if (ex.weight && ex.weight > 0 && ex.category !== 'Cardio') {
          const name = getNormalizedExerciseName(ex.name);
          weightedExercises.set(name, (weightedExercises.get(name) || 0) + 1);
        }
      });
    });
    return Array.from(weightedExercises.entries())
      .filter(([, count]: [string, number]) => count > 1)
      .sort((a: [string, number], b: [string, number]) => b[1] - a[1])
      .map(([name]: [string, number]) => name);
  }, [workoutLogs]);

  // Set default lift when available
  useEffect(() => {
    if (frequentlyLoggedLifts.length > 0 && !selectedLift) {
      setSelectedLift(frequentlyLoggedLifts[0]);
    }
  }, [frequentlyLoggedLifts, selectedLift]);

  // Handle lift progression analysis
  const handleAnalyzeProgression = () => {
    if (!userProfile) {
      toast({ title: 'Profile Not Loaded', description: 'Your user profile is not available. Please try again.', variant: 'destructive' });
      return;
    }
    const sixWeeksAgo = subWeeks(new Date(), 6);
    if (!workoutLogs) return;

    const exerciseHistory = workoutLogs
      .filter((log: WorkoutLog) => isAfter(log.date, sixWeeksAgo))
      .flatMap((log: WorkoutLog) =>
        log.exercises
          .filter((ex) => getNormalizedExerciseName(ex.name) === selectedLiftKey)
          .map((ex) => ({
            date: log.date.toISOString(),
            weight: ex.weight || 0,
            sets: ex.sets || 0,
            reps: ex.reps || 0,
          }))
      );

    const analysisInput: AnalyzeLiftProgressionInput = {
      exerciseName: selectedLift,
      exerciseHistory,
      userProfile: {
        age: userProfile.age,
        gender: userProfile.gender,
        heightValue: userProfile.heightValue,
        heightUnit: userProfile.heightUnit,
        weightValue: userProfile.weightValue,
        weightUnit: userProfile.weightUnit,
        skeletalMuscleMassValue: userProfile.skeletalMuscleMassValue,
        skeletalMuscleMassUnit: userProfile.skeletalMuscleMassUnit,
        fitnessGoals: (userProfile.fitnessGoals || [])
          .filter((g: FitnessGoal) => !g.achieved)
          .map((g: FitnessGoal) => ({
            description: g.description,
            isPrimary: g.isPrimary || false,
          })),
      },
      currentLevel: currentLiftLevel || undefined,
      trendPercentage: trendImprovement ?? undefined,
      volumeTrendPercentage: volumeTrend ?? undefined,
    };

    analyzeProgressionMutation.mutate(analysisInput);
  };

  // Loading and error states
  const isLoading = isLoadingProfile || (enableDataFetching && (isLoadingWorkouts || isLoadingPrs));
  const isError = isErrorProfile || (enableDataFetching && (isErrorWorkouts || isErrorPrs));
  const showProgressionReanalyze = !!progressionAnalysisToRender;

  if (isLoadingProfile) {
    return (
      <div className="container mx-auto px-4 py-8 flex justify-center items-center h-full">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
      </div>
    );
  }

  if (isErrorProfile) {
    return (
      <div className="container mx-auto px-4 py-8">
        <ErrorState message="Could not load your profile data. Please try again later." />
      </div>
    );
  }

  if (isProfileNotFound) {
    return (
      <div className="container mx-auto px-4 py-8 text-center">
        <header className="mb-12">
          <h1 className="font-headline text-4xl font-bold text-primary md:text-5xl">Unlock Your Analysis</h1>
          <p className="mt-2 text-lg text-muted-foreground">Create a profile to view your progress and get AI-powered insights.</p>
        </header>
        <Card className="shadow-lg max-w-md mx-auto">
          <CardHeader>
            <CardTitle className="font-headline">Create Your Profile First</CardTitle>
            <CardDescription>
              Your profile is needed to analyze workout data and calculate strength metrics.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Link href="/profile" passHref>
              <Button className="w-full">
                <UserPlus className="mr-2" />
                Go to Profile Setup
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <header className="mb-8">
        <h1 className="font-headline text-3xl font-bold text-primary">Your Progress</h1>
        <p className="text-muted-foreground">Visualize your fitness journey and stay motivated.</p>
      </header>
      <div className="mb-6">
        <Select value={timeRange} onValueChange={setTimeRange}>
          <SelectTrigger className="w-[180px] bg-card shadow">
            <SelectValue placeholder="Select time range" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="weekly">This Week</SelectItem>
            <SelectItem value="monthly">This Month</SelectItem>
            <SelectItem value="yearly">This Year</SelectItem>
            <SelectItem value="all-time">All Time</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {isError && (
        <div className="mb-6">
          <ErrorState message="Could not load your progress data. Please try again later." />
        </div>
      )}

      {isLoading ? (
        <Card className="shadow-lg mb-6 h-40 flex justify-center items-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </Card>
      ) : !isError && chartData.periodSummary ? (
        <Card className="shadow-lg mb-6 bg-card">
          <CardHeader>
            <CardTitle className="font-headline flex items-center gap-2 text-xl">
              <TrendingUp className="h-6 w-6 text-primary" />
              {chartData.periodSummary.periodLabel}
            </CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-2 gap-y-6 gap-x-3 md:grid-cols-5 text-center py-6">
            {Object.entries({
              'Workout Days': chartData.periodSummary.workoutDays,
              'Weight Lifted (lbs)': chartData.periodSummary.totalWeightLiftedLbs.toLocaleString(),
              'Distance (mi)': chartData.periodSummary.totalDistanceMi.toLocaleString(),
              'Cardio Duration': formatCardioDuration(chartData.periodSummary.totalCardioDurationMin),
              'Calories Burned': chartData.periodSummary.totalCaloriesBurned.toLocaleString(),
            }).map(([label, value]) => (
              <div key={label}>
                <p className="text-3xl font-bold text-accent">{value}</p>
                <p className="text-sm text-muted-foreground mt-1">{label}</p>
              </div>
            ))}
          </CardContent>
        </Card>
      ) : null}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-6">
        {isLoading
          ? Array.from({ length: 6 }).map((_, i) => (
              <Card key={i} className="shadow-lg lg:col-span-3 h-96 flex justify-center items-center">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </Card>
            ))
          : !isError && (
              <>
                <ExerciseVarietyCard
                  isLoading={isLoading}
                  isError={isError}
                  workoutFrequencyData={chartData.workoutFrequencyData}
                  timeRange={timeRange}
                />
                <MilestonesCard
                  isLoading={isLoading}
                  isError={isError}
                  newPrsData={chartData.newPrsData}
                  achievedGoalsData={chartData.achievedGoalsData}
                  timeRange={timeRange}
                />
                <CalorieBreakdownCard
                  isLoading={isLoading}
                  isError={isError}
                  categoryCalorieData={chartData.categoryCalorieData}
                  timeRange={timeRange}
                />
                <RepetitionBreakdownCard
                  isLoading={isLoading}
                  isError={isError}
                  categoryRepData={chartData.categoryRepData}
                  timeRange={timeRange}
                />

                <StrengthBalanceCard
                  isLoading={isLoading}
                  isError={isError}
                  userProfile={userProfile!}
                  personalRecords={personalRecords}
                  strengthAnalysis={userProfile?.strengthAnalysis}
                />
                <LiftProgressionCard
                  isLoading={isLoading}
                  isError={isError}
                  userProfile={userProfile!}
                  workoutLogs={workoutLogs}
                  personalRecords={personalRecords}
                  selectedLift={selectedLift}
                  setSelectedLift={setSelectedLift}
                  frequentlyLoggedLifts={frequentlyLoggedLifts}
                />
                <CardioAnalysisCard
                  isLoading={isLoading}
                  isError={isError}
                  userProfile={userProfile!}
                  workoutLogs={workoutLogs}
                  cardioAnalysisData={cardioAnalysisData}
                  timeRange={timeRange}
                  timeRangeDisplayNames={timeRangeDisplayNames}
                />
              </>
            )}
      </div>
    </div>
  );
}
