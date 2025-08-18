
"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dumbbell, Target, BarChartBig, Award } from "lucide-react";
import Link from "next/link";
import { WeeklyProgressTracker } from "@/components/home/WeeklyProgressTracker";
import { RecentHistory } from "@/components/home/RecentHistory";
import { WeeklyCardioTracker } from "@/components/home/WeeklyCardioTracker";
import { useWorkouts, useUserProfile } from "@/lib/firestore.service";
import { Skeleton } from "@/components/ui/skeleton";
import { ErrorState } from "@/components/shared/ErrorState";

export default function HomePage() {
  const { data: workoutLogs, isLoading: isLoadingWorkouts, isError: isErrorWorkouts } = useWorkouts();
  // The isError flag from useUserProfile is true if the profile doc doesn't exist, which is expected before creation.
  // We must handle this case specifically.
  const { data: userProfile, isLoading: isLoadingProfile, isError: isProfileError } = useUserProfile();

  const isLoading = isLoadingWorkouts || isLoadingProfile;
  // A true error only occurs if workout loading fails. A profile error is expected for new users.
  const isActualError = isErrorWorkouts;
  // This state specifically checks if the only "error" is the expected one for a missing profile.
  const isNewUserWithoutProfile = isProfileError && !userProfile && !isErrorWorkouts;

  return (
    <div className="container mx-auto px-4 py-8">
      <header className="mb-12 text-center">
        <h1 className="font-headline text-4xl font-bold text-primary md:text-5xl">Welcome to FitnessAI</h1>
        <p className="mt-2 text-lg text-muted-foreground">Your personal AI fitness companion.</p>
      </header>

      <section>
        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle className="font-headline text-xl">Quick Actions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-4 gap-4 text-center">
              <Link href="/history" className="group flex flex-col items-center justify-center space-y-2 rounded-lg p-4 transition-colors hover:bg-secondary">
                <Dumbbell className="h-8 w-8 text-primary transition-transform group-hover:scale-110" />
                <span className="text-sm font-medium text-foreground">Log Workout</span>
              </Link>
              <Link href="/prs" className="group flex flex-col items-center justify-center space-y-2 rounded-lg p-4 transition-colors hover:bg-secondary">
                <Award className="h-8 w-8 text-primary transition-transform group-hover:scale-110" />
                <span className="text-sm font-medium text-foreground">Log PRs</span>
              </Link>
              <Link href="/plan" className="group flex flex-col items-center justify-center space-y-2 rounded-lg p-4 transition-colors hover:bg-secondary">
                <Target className="h-8 w-8 text-accent transition-transform group-hover:scale-110" />
                <span className="text-sm font-medium text-foreground">Get AI Plan</span>
              </Link>
              <Link href="/analysis" className="group flex flex-col items-center justify-center space-y-2 rounded-lg p-4 transition-colors hover:bg-secondary">
                <BarChartBig className="h-8 w-8 text-primary transition-transform group-hover:scale-110" />
                <span className="text-sm font-medium text-foreground">View Analysis</span>
              </Link>
            </div>
          </CardContent>
        </Card>
      </section>

      <section className="mt-12 space-y-12">
        {isLoading ? (
          <>
            <Skeleton className="h-48 w-full" />
            <Skeleton className="h-64 w-full" />
            <Skeleton className="h-64 w-full" />
          </>
        ) : isActualError ? (
          <ErrorState message="Could not load your dashboard data. Please try again later." />
        ) : (
          <>
            {/* The components will now receive userProfile (which can be null/undefined for new users) and handle it gracefully */}
            <WeeklyProgressTracker workoutLogs={workoutLogs || []} userProfile={userProfile} />
            <RecentHistory workoutLogs={workoutLogs || []} />
            <WeeklyCardioTracker workoutLogs={workoutLogs || []} userProfile={userProfile} />
          </>
        )}
      </section>
    </div>
  );
}
