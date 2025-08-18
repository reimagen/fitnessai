
"use client";

import { UserDetailsCard } from "@/components/profile/user-details-card";
import { GoalSetterCard } from "@/components/profile/goal-setter-card";
import { WorkoutPreferencesCard } from "@/components/profile/workout-preferences-card";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Settings, LogOut, Loader2, AlertTriangle, UserPlus } from "lucide-react";
import { useUserProfile, useUpdateUserProfile } from "@/lib/firestore.service";
import type { UserProfile, FitnessGoal } from "@/lib/types";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/lib/auth.service";

export default function ProfilePage() {
  const { toast } = useToast();
  const { data: profileResult, isLoading: isLoadingProfile } = useUserProfile();
  const userProfile = profileResult?.data;
  const updateUserMutation = useUpdateUserProfile();
  const { user, signOut: handleSignOut } = useAuth();
  
  const handleGoalsUpdate = (updatedGoals: FitnessGoal[]) => {
    updateUserMutation.mutate({ fitnessGoals: updatedGoals }, {
      onSuccess: () => {
        toast({
          title: "Goals Updated!",
          description: "Your fitness goals have been saved.",
        });
      },
      onError: (error) => {
        toast({ title: "Update Failed", description: error.message, variant: "destructive" });
      }
    });
  };

  const handleProfileDetailsUpdate = (updatedDetails: Partial<Pick<UserProfile, 'name' | 'joinedDate' | 'age' | 'gender' | 'heightValue' | 'heightUnit' | 'weightValue' | 'weightUnit' | 'skeletalMuscleMassValue' | 'skeletalMuscleMassUnit' | 'bodyFatPercentage'>>) => {
    updateUserMutation.mutate(updatedDetails, {
      onSuccess: () => {
        toast({
          title: "Profile Updated!",
          description: "Your profile details have been saved.",
        });
      },
      onError: (error) => {
        toast({ title: "Update Failed", description: error.message, variant: "destructive" });
      }
    });
  };

  const handlePreferencesUpdate = (updatedPreferences: Partial<Pick<UserProfile, 'workoutsPerWeek' | 'sessionTimeMinutes' | 'experienceLevel' | 'aiPreferencesNotes' | 'weeklyCardioCalorieGoal' | 'weeklyCardioStretchCalorieGoal'>>) => {
    updateUserMutation.mutate(updatedPreferences, {
      onSuccess: () => {
        toast({
          title: "Preferences Updated!",
          description: "Your workout preferences have been saved.",
        });
      },
      onError: (error) => {
        toast({ title: "Update Failed", description: error.message, variant: "destructive" });
      }
    });
  };

  const handleCreateProfile = () => {
    // This creates the user's profile document for the first time
    if (!user) return;
    const defaultProfileData = {
      email: user.email || "",
      joinedDate: new Date(),
      fitnessGoals: [],
      name: "", // Initialize name as an empty string
    };
    updateUserMutation.mutate(defaultProfileData, {
      onSuccess: () => {
        toast({
          title: "Profile Created!",
          description: "Welcome! You can now customize your profile.",
        });
      },
      onError: (error) => {
        toast({
          title: "Creation Failed",
          description: error.message,
          variant: "destructive"
        });
      }
    });
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
            }}
            onUpdate={handlePreferencesUpdate}
          />
          <GoalSetterCard 
            initialGoals={userProfile.fitnessGoals} 
            onGoalsChange={handleGoalsUpdate} 
          />
        </>
      ) : (
          <Card className="shadow-lg border-primary">
            <CardHeader>
              <CardTitle className="font-headline flex items-center gap-2">
                <AlertTriangle className="h-6 w-6 text-primary" />
                Welcome! Let's Create Your Profile
              </CardTitle>
              <CardDescription>
                It looks like you're new here. Create a profile to get started.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground mb-4">
                Creating a profile will allow you to save your workout data and track your progress.
              </p>
              <Button onClick={handleCreateProfile} disabled={updateUserMutation.isPending}>
                {updateUserMutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <UserPlus className="mr-2 h-4 w-4"/>}
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
