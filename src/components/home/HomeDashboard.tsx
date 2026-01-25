

"use client";

import { useCurrentWeekWorkouts, useUserProfile } from "@/lib/firestore.service";
import { UserProfile } from "@/lib/types";
import { WeeklyProgressTracker } from "@/components/home/WeeklyProgressTracker";
import { RecentHistory } from "@/components/home/RecentHistory";
import { WeeklyCardioTracker } from "@/components/home/WeeklyCardioTracker";

type HomeDashboardProps = {
  initialProfile?: UserProfile | null;
};

export function HomeDashboard({ initialProfile }: HomeDashboardProps) {
  const { data: profileResult, isLoading: loadingProfile } = useUserProfile({
    initialData: initialProfile ? { data: initialProfile, notFound: false } : undefined,
  });
  const profile = profileResult?.data ?? null;
  
  // profileNotFound is handled by the parent page (page.tsx), so we can assume profile exists here
  const enableDataFetching = !loadingProfile && profile !== null;
  const {
    data: workoutLogs = [],
    isLoading: loadingWorkouts,
    isError: errorWorkouts,
  } = useCurrentWeekWorkouts(enableDataFetching);

  const isLoading = loadingProfile || (enableDataFetching && loadingWorkouts);

  const isGenuineFailure = errorWorkouts && profile !== null; // Error fetching workouts for an existing profile

  if (isLoading) {
    return (
      <div className="space-y-12">
        {/* These skeletons are for the individual components while they load their specific data */}
        <div className="h-48 w-full bg-muted rounded-lg animate-pulse" /> 
        <div className="h-64 w-full bg-muted rounded-lg animate-pulse" />
        <div className="h-64 w-full bg-muted rounded-lg animate-pulse" />
      </div>
    );
  }

  if (isGenuineFailure) {
    return <p className="text-destructive text-center mt-8">Error loading dashboard data. Please try again.</p>;
  }

  // At this point, we assume profile exists and data fetching is complete (or not enabled if profile was null which is handled by parent)
  return (
    <section className="space-y-12">
      <WeeklyProgressTracker workoutLogs={workoutLogs} userProfile={profile} />
      <RecentHistory workoutLogs={workoutLogs} />
      <WeeklyCardioTracker workoutLogs={workoutLogs} userProfile={profile} />
    </section>
  );
}
