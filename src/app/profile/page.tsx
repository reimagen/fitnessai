
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
import { ThemeToggle } from "@/components/layout/theme-toggle";

export default function ProfilePage() {
  const { toast } = useToast();
  const { data: userProfile, isLoading: isLoadingProfile } = useUserProfile();
  const updateUserMutation = useUpdateUserProfile();
  
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

  const handleProfileDetailsUpdate = (updatedDetails: Partial<Pick<UserProfile, 'name' | 'joinedDate' | 'age' | 'gender' | 'heightValue' | 'heightUnit' | 'weightValue' | 'weightUnit' | 'skeletalMuscleMassValue' | 'skeletalMuscleMassUnit'>>) => {
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

  const handlePreferencesUpdate = (updatedPreferences: Partial<Pick<UserProfile, 'workoutsPerWeek' | 'sessionTimeMinutes' | 'experienceLevel' | 'aiPreferencesNotes'>>) => {
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
    // This creates the 'main-user-profile' document for the first time
    const defaultProfileData = {
      name: "Fitness Pro",
      joinedDate: new Date(),
      fitnessGoals: [],
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
                No Profile Found
              </CardTitle>
              <CardDescription>
                It looks like this is a new device or you don't have a profile set up yet.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground mb-4">
                To get started, you can create a profile. In a real-world app, you would sign in to retrieve your existing data.
              </p>
              <Button onClick={handleCreateProfile} disabled={updateUserMutation.isPending}>
                {updateUserMutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <UserPlus className="mr-2 h-4 w-4"/>}
                Create My Profile
              </Button>
            </CardContent>
          </Card>
      )}
      
      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle className="font-headline flex items-center gap-2">
            <Settings className="h-6 w-6 text-primary"/>
            App Settings
          </CardTitle>
          <CardDescription>Customize your FitnessAI experience.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
            <div className="flex items-center justify-between p-3 rounded-md border">
                <div>
                    <h4 className="font-medium">Theme</h4>
                    <p className="text-sm text-muted-foreground">Switch between light, dark, and system modes.</p>
                </div>
                <ThemeToggle />
            </div>
             <div className="flex items-center justify-between p-3 rounded-md border">
                <div>
                    <h4 className="font-medium">Notification Preferences</h4>
                    <p className="text-sm text-muted-foreground">Manage your app notifications.</p>
                </div>
                <Button variant="outline" size="sm" disabled>
                    Manage
                </Button>
            </div>
             <div className="flex items-center justify-between p-3 rounded-md border">
                <div>
                    <h4 className="font-medium">Account Data</h4>
                    <p className="text-sm text-muted-foreground">Export or delete your account data.</p>
                </div>
                <Button variant="outline" size="sm" disabled>
                    Manage Data
                </Button>
            </div>
          <Button variant="destructive" className="w-full mt-4" disabled>
            <LogOut className="mr-2 h-4 w-4" /> Log Out
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
