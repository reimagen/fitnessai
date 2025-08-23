
"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dumbbell, Target, BarChartBig, Award, UserPlus } from "lucide-react";
import Link from "next/link";
import { WeeklyProgressTracker } from "@/components/home/WeeklyProgressTracker";
import { RecentHistory } from "@/components/home/RecentHistory";
import { WeeklyCardioTracker } from "@/components/home/WeeklyCardioTracker";
import { useWorkouts, useUserProfile } from "@/lib/firestore.service";
import { Skeleton } from "@/components/ui/skeleton";
import { ErrorState } from "@/components/shared/ErrorState";
import { Button } from "@/components/ui/button";

export default function HomePage() {
  const { data: profileResult, isLoading: loadingProfile } = useUserProfile();
  const profile = profileResult?.data ?? null;
  const profileNotFound = profileResult?.notFound === true;

  // Only fetch workouts if the profile has been found.
  // This prevents errors for new users whose security rules may depend on a profile existing.
  const {
    data: workoutLogs = [],
    isLoading: loadingWorkouts,
    isError: errorWorkouts,
  } = useWorkouts();

  const isLoading = loadingProfile || (loadingWorkouts && !profileNotFound);

  // A genuine failure is an error fetching workouts that is NOT because the profile is missing.
  const isGenuineFailure = errorWorkouts && !profileNotFound;

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-8 space-y-12">
        <Skeleton className="h-40 w-full" />
        <Skeleton className="h-48 w-full" />
        <Skeleton className="h-64 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (isGenuineFailure) {
    return (
       <div className="container mx-auto px-4 py-8">
          <ErrorState message="Could not load your dashboard data. Please try again later." />
       </div>
    );
  }

  // New-user welcome state (no profile yet)
  if (profileNotFound) {
    return (
      <div className="container mx-auto px-4 py-8 text-center">
        <header className="mb-12">
            <h1 className="font-headline text-4xl font-bold text-primary md:text-5xl">Welcome to FitnessAI!</h1>
            <p className="mt-2 text-lg text-muted-foreground">Let's get your profile set up to personalize your experience.</p>
        </header>
        <Card className="shadow-lg max-w-md mx-auto">
            <CardHeader>
                <CardTitle className="font-headline">Create Your Profile</CardTitle>
                <CardDescription>
                    Your profile helps the AI create workout plans and track your progress accurately.
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

  // Normal dashboard for existing users
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
        <WeeklyProgressTracker workoutLogs={workoutLogs} userProfile={profile} />
        <RecentHistory workoutLogs={workoutLogs} />
        <WeeklyCardioTracker workoutLogs={workoutLogs} userProfile={profile} />
      </section>
    </div>
  );
}
