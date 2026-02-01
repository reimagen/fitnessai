
"use client";

import { UserDetailsCard } from "@/components/profile/UserDetailsCard";
import { GoalSetterCard } from "@/components/profile/GoalSetterCard";
import { WorkoutPreferencesCard } from "@/components/profile/WorkoutPreferencesCard";
import { ProfileCompletionNotice } from "@/components/profile/ProfileCompletionNotice";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { LogOut, Loader2, AlertTriangle, UserPlus } from "lucide-react";
import { useUserProfile } from "@/lib/firestore.service";
import type { UserProfile, FitnessGoal } from "@/lib/types";
import { useProfileUpdate } from "@/hooks/useProfileUpdate";
import { useAuth } from "@/lib/auth.service";


export default function ProfilePage() {
  const { data: profileResult, isLoading: isLoadingProfile } = useUserProfile();
  const userProfile = profileResult?.data;
  const { updateProfile, isPending } = useProfileUpdate();
  const { user, signOut: handleSignOut } = useAuth();
  
  const handleGoalsUpdate = (updatedGoals: FitnessGoal[]) => {
    if (!user) return;
    updateProfile(
      { fitnessGoals: updatedGoals },
      { successTitle: "Goals Updated!", successDescription: "Your fitness goals have been saved." }
    );
  };

  const handleProfileDetailsUpdate = (updatedDetails: Partial<Pick<UserProfile, 'name' | 'joinedDate' | 'age' | 'gender' | 'heightValue' | 'heightUnit' | 'weightValue' | 'weightUnit' | 'skeletalMuscleMassValue' | 'skeletalMuscleMassUnit' | 'bodyFatPercentage'>>) => {
    if (!user) return;
    updateProfile(
      updatedDetails,
      { successTitle: "Profile Updated!", successDescription: "Your profile details have been saved." }
    );
  };

  const handlePreferencesUpdate = (updatedPreferences: Partial<Pick<UserProfile, 'workoutsPerWeek' | 'sessionTimeMinutes' | 'experienceLevel' | 'aiPreferencesNotes' | 'weeklyCardioCalorieGoal' | 'weeklyCardioStretchCalorieGoal' | 'cardioGoalMode' | 'stretchGoalMultiplier' | 'activityLevel' | 'weightGoal' | 'cardioCalculationMethod'>>) => {
    if (!user) return;
    updateProfile(
      updatedPreferences,
      { successTitle: "Preferences Updated!", successDescription: "Your workout preferences have been saved." }
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
      <header className="mb-8">
        <h1 className="font-headline text-3xl font-bold text-primary">Your Profile</h1>
        <p className="text-muted-foreground">Manage your account, preferences, and fitness goals.</p>
      </header>

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
              weeklyCardioCalorieGoal: userProfile.weeklyCardioCalorieGoal,
              weeklyCardioStretchCalorieGoal: userProfile.weeklyCardioStretchCalorieGoal,
              cardioGoalMode: userProfile.cardioGoalMode,
              stretchGoalMultiplier: userProfile.stretchGoalMultiplier,
              weightValue: userProfile.weightValue,
              weightUnit: userProfile.weightUnit,
              fitnessGoals: userProfile.fitnessGoals,
              activityLevel: userProfile.activityLevel,
              weightGoal: userProfile.weightGoal,
              cardioCalculationMethod: userProfile.cardioCalculationMethod,
            }}
            onUpdate={handlePreferencesUpdate}
          />
          <div id="goals">
            <GoalSetterCard
              initialGoals={userProfile.fitnessGoals}
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
                {isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <UserPlus className="mr-2 h-4 w-4"/>}
                Create My Profile
              </Button>
            </CardContent>
          </Card>
      )}
      
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
