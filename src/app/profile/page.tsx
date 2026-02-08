
"use client";

import { UserDetailsCard } from "@/components/profile/UserDetailsCard";
import { GoalSetterCard } from "@/components/profile/GoalSetterCard";
import { WorkoutPreferencesCard } from "@/components/profile/WorkoutPreferencesCard";
import { WeeklyCardioTargetsCard } from "@/components/profile/WeeklyCardioTargetsCard";
import { ProfileCompletionNotice } from "@/components/profile/ProfileCompletionNotice";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { LogOut, Loader2, AlertTriangle, UserPlus, Mail, HelpCircle } from "lucide-react";
import Link from "next/link";
import { useUserProfile, useGoals, useSaveGoals } from "@/lib/firestore.service";
import type { UserProfile, FitnessGoal } from "@/lib/types";
import { useProfileUpdate } from "@/hooks/useProfileUpdate";
import { useAuth } from "@/lib/auth.service";
import { HeroHeader } from "@/components/layout/HeroHeader";
import { useToast } from "@/hooks/useToast";


export default function ProfilePage() {
  const { data: profileResult, isLoading: isLoadingProfile } = useUserProfile();
  const userProfile = profileResult?.data;
  const { updateProfile, isPending } = useProfileUpdate();
  const { user, signOut: handleSignOut } = useAuth();
  const { data: fitnessGoals = [] } = useGoals();
  const saveGoalsMutation = useSaveGoals();
  const { toast } = useToast();

  const handleGoalsUpdate = (updatedGoals: FitnessGoal[]) => {
    if (!user) return;
    saveGoalsMutation.mutate(updatedGoals, {
      onSuccess: () => {
        toast({
          title: "Goals Updated!",
          description: "Your fitness goals have been saved.",
        });
      },
      onError: (error) => {
        toast({
          title: "Update Failed",
          description: error.message,
          variant: "destructive",
        });
      },
    });
  };

  const handleProfileDetailsUpdate = (updatedDetails: Partial<Pick<UserProfile, 'name' | 'joinedDate' | 'age' | 'gender' | 'heightValue' | 'heightUnit' | 'weightValue' | 'weightUnit' | 'skeletalMuscleMassValue' | 'skeletalMuscleMassUnit' | 'bodyFatPercentage'>>) => {
    if (!user) return;
    updateProfile(
      updatedDetails,
      { successTitle: "Profile Updated!", successDescription: "Your profile details have been saved." }
    );
  };

  const handlePreferencesUpdate = (updatedPreferences: Partial<Pick<UserProfile, 'workoutsPerWeek' | 'sessionTimeMinutes' | 'experienceLevel' | 'aiPreferencesNotes'>>) => {
    if (!user) return;
    updateProfile(
      updatedPreferences,
      { successTitle: "Preferences Updated!", successDescription: "Your workout preferences have been saved." }
    );
  };

  const handleCardioTargetsUpdate = (updatedTargets: Partial<Pick<UserProfile, 'weeklyCardioCalorieGoal' | 'weeklyCardioStretchCalorieGoal' | 'cardioCalculationMethod' | 'activityLevel' | 'weightGoal'>>) => {
    if (!user) return;
    updateProfile(
      updatedTargets,
      { successTitle: "Cardio Targets Updated!", successDescription: "Your weekly cardio targets have been saved." }
    );
  };

  const handleCreateProfile = () => {
    // This creates the user's profile document for the first time
    if (!user) return;
    const defaultProfileData = {
      id: user.uid, // Set the user's ID in the document
      email: user.email || "",
      fitnessGoals: [],
      joinedDate: new Date(), // Set the joined date to now
      // name is intentionally omitted to allow "Not set" to display
    };
    updateProfile(
      defaultProfileData,
      { successTitle: "Profile Created!", successDescription: "Welcome! You can now customize your profile." }
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 space-y-8">
      <HeroHeader
        className="mb-8"
        title="Profile"
        subtitle="Manage your account, preferences, and fitness goals."
      />

      {isLoadingProfile ? (
        <div className="flex justify-center items-center h-64">
          <Loader2 className="h-10 w-10 animate-spin text-primary" />
        </div>
      ) : userProfile ? (
        <>
          <ProfileCompletionNotice profile={userProfile} />
          <UserDetailsCard
            user={userProfile}
            onUpdate={handleProfileDetailsUpdate}
          />
          <WorkoutPreferencesCard
            preferences={{
              workoutsPerWeek: userProfile.workoutsPerWeek,
              sessionTimeMinutes: userProfile.sessionTimeMinutes,
              experienceLevel: userProfile.experienceLevel,
              aiPreferencesNotes: userProfile.aiPreferencesNotes,
            }}
            onUpdate={handlePreferencesUpdate}
          />
          <WeeklyCardioTargetsCard
            targets={{
              weeklyCardioCalorieGoal: userProfile.weeklyCardioCalorieGoal,
              weeklyCardioStretchCalorieGoal: userProfile.weeklyCardioStretchCalorieGoal,
              cardioCalculationMethod: userProfile.cardioCalculationMethod,
              activityLevel: userProfile.activityLevel,
              weightGoal: userProfile.weightGoal,
              experienceLevel: userProfile.experienceLevel,
              weightValue: userProfile.weightValue,
              weightUnit: userProfile.weightUnit,
            }}
            onUpdate={handleCardioTargetsUpdate}
          />
          <div id="goals">
            <GoalSetterCard
              initialGoals={fitnessGoals}
              onGoalsChange={handleGoalsUpdate}
              userProfile={userProfile}
            />
          </div>
        </>
      ) : (
        <Card className="shadow-lg border-primary">
          <CardHeader>
            <CardTitle className="font-headline flex items-center gap-2">
              <AlertTriangle className="h-6 w-6 text-primary" />
              Welcome! Let&apos;s Create Your Profile
            </CardTitle>
            <CardDescription>
              It looks like you&apos;re new here. Create a profile to get started.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-4">
              Creating a profile will allow you to save your workout data and track your progress.
            </p>
            <Button onClick={handleCreateProfile} disabled={isPending}>
              {isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <UserPlus className="mr-2 h-4 w-4" />}
              Create My Profile
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Support & Help Section */}
      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <HelpCircle className="h-5 w-5" />
            Help & Support
          </CardTitle>
          <CardDescription>
            Need help? Send us feedback or check our FAQ
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <Link href="/support" className="block">
            <Button variant="outline" className="w-full justify-start">
              <Mail className="mr-2 h-4 w-4" />
              Support & Feedback
            </Button>
          </Link>
          <a href="mailto:support@fitnessai.app" className="block">
            <Button variant="outline" className="w-full justify-start">
              <Mail className="mr-2 h-4 w-4" />
              Email: support@fitnessai.app
            </Button>
          </a>
          <Link href="/help" className="block">
            <Button variant="outline" className="w-full justify-start">
              <HelpCircle className="mr-2 h-4 w-4" />
              Help & FAQ
            </Button>
          </Link>
        </CardContent>
      </Card>

      <Card className="shadow-lg">
        <CardContent className="pt-6">
          <Button variant="destructive" className="w-full" onClick={handleSignOut}>
            <LogOut className="mr-2 h-4 w-4" /> Log Out
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
