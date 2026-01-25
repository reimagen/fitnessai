

"use client";

import { useCurrentWeekWorkouts, useUserProfile } from "@/lib/firestore.service";
import { UserProfile } from "@/lib/types";
import { WeeklyProgressTracker } from "@/components/home/WeeklyProgressTracker";
import { RecentHistory } from "@/components/home/RecentHistory";
import { WeeklyCardioTracker } from "@/components/home/WeeklyCardioTracker";
import { AlertCircle } from "lucide-react";
import { useState } from "react";

type HomeDashboardProps = {
  initialProfile?: UserProfile | null;
};

export function HomeDashboard({ initialProfile }: HomeDashboardProps): JSX.Element {
  const [retryCount, setRetryCount] = useState(0);

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
    const handleRetry = () => {
      setRetryCount(prev => prev + 1);
      // The component will re-render and the query will retry
    };

    return (
      <div className="flex gap-4 p-6 rounded-lg border border-destructive bg-destructive/10 text-destructive">
        <AlertCircle className="h-5 w-5 flex-shrink-0 mt-0.5" />
        <div className="flex-1">
          <h3 className="font-semibold mb-1">Unable to load dashboard</h3>
          <p className="text-sm mb-4">We encountered an error while loading your workout data. Please check your connection and try again.</p>
          <button
            onClick={handleRetry}
            className="px-4 py-2 rounded-md bg-destructive text-white font-medium text-sm hover:bg-destructive/90 transition-colors"
          >
            Retry
          </button>
        </div>
      </div>
    );
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
