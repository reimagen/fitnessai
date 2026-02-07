
"use client";

import React from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, UserPlus } from "lucide-react";
import { useUserProfile, useWorkouts, usePersonalRecords } from "@/lib/firestore.service";
import Link from "next/link";
import { PlanGeneratorSection } from "@/components/plan/PlanGeneratorSection";
import { GeneratedPlanSection } from "@/components/plan/GeneratedPlanSection";
import { ErrorBoundary } from "@/components/error/ErrorBoundary";
import { HeroHeader } from "@/components/layout/HeroHeader";


export default function PlanPage() {
  const { data: profileResult, isLoading: isLoadingProfile, isError: isErrorProfile } = useUserProfile();
  const userProfile = profileResult?.data;
  const isProfileNotFound = profileResult?.notFound === true;

  const { data: workoutLogs, isLoading: isLoadingWorkouts, isError: isErrorWorkouts } = useWorkouts();
  const { data: personalRecords, isLoading: isLoadingPrs, isError: isErrorPrs } = usePersonalRecords();
  const generatedPlan = userProfile?.weeklyPlan;

  if (isLoadingProfile) {
    return (
      <div className="container mx-auto px-4 py-8 flex justify-center items-center h-64">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
      </div>
    );
  }

  if (isProfileNotFound) {
    return (
      <div className="container mx-auto px-4 py-8 text-center">
        <HeroHeader
          className="mb-12"
          align="center"
          size="lg"
          title="Get Your AI Plan"
          subtitle="Create a profile to generate a personalized workout plan."
        />
        <Card className="shadow-lg max-w-md mx-auto">
          <CardHeader>
            <CardTitle className="font-headline">Create Your Profile First</CardTitle>
            <CardDescription>
              Your profile is needed for the AI to create a workout plan tailored to your goals and stats.
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
    <ErrorBoundary feature="plan">
      <div className="container mx-auto px-4 py-8 space-y-8">
        <HeroHeader
          className="mb-8"
          title="Weekly Plan"
          subtitle="Workouts are based on your recent 6-week progress and workout preferences."
        />

        <PlanGeneratorSection
          userProfile={userProfile}
          workoutLogs={workoutLogs}
          personalRecords={personalRecords}
          isLoadingProfile={isLoadingProfile}
          isLoadingWorkouts={isLoadingWorkouts}
          isLoadingPrs={isLoadingPrs}
          isErrorProfile={isErrorProfile}
          isErrorWorkouts={isErrorWorkouts}
          isErrorPrs={isErrorPrs}
        />

        {generatedPlan && (
          <GeneratedPlanSection generatedPlan={generatedPlan} />
        )}

      </div>
    </ErrorBoundary>
  );
}
