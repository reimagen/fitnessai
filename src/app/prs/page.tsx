
"use client";

import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Award, Loader2, UserPlus } from "lucide-react";
import { parsePersonalRecordsAction } from "./actions";
import { Button } from "@/components/ui/button";
import { usePersonalRecords, useUserProfile } from "@/lib/firestore.service";
import { ErrorState } from "@/components/shared/ErrorState";
import { useAuth } from "@/lib/auth.service";
import Link from "next/link";
import { PrsFormSection } from "@/components/prs/prs-form-section";
import { PersonalRecordsSection } from "@/components/prs/personal-records-section";
import { CompletedGoalsSection } from "@/components/prs/completed-goals-section";

export default function MilestonesPage() {
  const { user } = useAuth();

  const { data: profileResult, isLoading: isLoadingProfile, isError: isErrorProfile } = useUserProfile();
  const userProfile = profileResult?.data;

  // Enable PR fetching only if the profile has loaded and exists.
  const { data: allRecords, isLoading: isLoadingPrs, isError: isErrorPrs } = usePersonalRecords(!isLoadingProfile && !!userProfile);

  const completedGoals = useMemo(() => userProfile?.fitnessGoals?.filter(g => g.achieved) || [], [userProfile]);

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

  if (profileResult?.notFound) {
      return (
        <div className="container mx-auto px-4 py-8 text-center">
            <header className="mb-12">
                <h1 className="font-headline text-4xl font-bold text-primary md:text-5xl">Track Your Milestones</h1>
                <p className="mt-2 text-lg text-muted-foreground">Create a profile to start logging personal records and achievements.</p>
            </header>
            <Card className="shadow-lg max-w-md mx-auto">
                <CardHeader>
                    <CardTitle className="font-headline">Create Your Profile First</CardTitle>
                    <CardDescription>
                        Your profile is needed to calculate strength levels and save your milestones.
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
    <div className="container mx-auto px-4 py-8 space-y-8">
      <header className="mb-4">
        <h1 className="font-headline text-3xl font-bold text-primary flex items-center">
          <Award className="mr-3 h-8 w-8" /> Milestones & Achievements
        </h1>
        <p className="text-muted-foreground">Log your best lifts and completed goals, with strength level classifications.</p>
      </header>

      <PrsFormSection onParse={parsePersonalRecordsAction} />

      <PersonalRecordsSection
        userId={user!.uid}
        allRecords={allRecords}
        userProfile={userProfile ?? undefined}
        isLoading={isLoadingPrs}
        isError={isErrorPrs}
      />

      <CompletedGoalsSection completedGoals={completedGoals} />
    </div>
  );
}
 
