
"use client";

import { useState, useEffect } from "react";
import type { UserProfile, FitnessGoal } from "@/lib/types";
import { UserDetailsCard } from "@/components/profile/user-details-card";
import { UserStatsCard } from "@/components/profile/user-stats-card"; // New import
import { GoalSetterCard } from "@/components/profile/goal-setter-card";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Settings, LogOut, Palette } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const initialMockUser: UserProfile = {
  id: "user123",
  name: "Alex Fitness",
  email: "alex.fitness@example.com",
  avatarUrl: "https://placehold.co/100x100.png",
  age: 30,
  gender: "Male",
  heightValue: 175, // Default height in cm
  heightUnit: 'cm',   // Default height unit
  fitnessGoals: [
    { id: "goal1", description: "Lose 5kg by end of August", achieved: false, targetDate: new Date("2024-08-31"), isPrimary: true },
    { id: "goal2", description: "Run a 10k marathon", achieved: false, targetDate: new Date("2024-12-31"), isPrimary: false },
    { id: "goal3", description: "Workout 4 times a week", achieved: false, isPrimary: false, targetDate: new Date("2024-07-30") },
  ],
};

const LOCAL_STORAGE_KEY = "fitnessAppUserProfile";

export default function ProfilePage() {
  const [userProfile, setUserProfile] = useState<UserProfile>(initialMockUser);
  const [isClient, setIsClient] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    setIsClient(true);
  }, []);

  useEffect(() => {
    if (isClient) {
      const savedProfile = localStorage.getItem(LOCAL_STORAGE_KEY);
      if (savedProfile) {
        try {
          const parsedProfile = JSON.parse(savedProfile);
          
          parsedProfile.fitnessGoals = parsedProfile.fitnessGoals.map((goal: FitnessGoal) => ({
            ...goal,
            targetDate: goal.targetDate ? new Date(goal.targetDate) : undefined,
          }));
          // Ensure age, gender, heightValue, heightUnit from localStorage are used or defaults from initialMockUser
          parsedProfile.age = parsedProfile.age !== undefined ? parsedProfile.age : initialMockUser.age;
          parsedProfile.gender = parsedProfile.gender !== undefined ? parsedProfile.gender : initialMockUser.gender;
          parsedProfile.heightValue = parsedProfile.heightValue !== undefined ? parsedProfile.heightValue : initialMockUser.heightValue;
          parsedProfile.heightUnit = parsedProfile.heightUnit !== undefined ? parsedProfile.heightUnit : initialMockUser.heightUnit;
          setUserProfile(parsedProfile);
        } catch (error) {
          console.error("Error parsing user profile from localStorage", error);
          // Fallback to initialMockUser if parsing fails
          setUserProfile(initialMockUser);
        }
      } else {
        // If no saved profile, use initialMockUser
         setUserProfile(initialMockUser);
      }
    }
  }, [isClient]); 

  useEffect(() => {
    if (isClient) {
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(userProfile));
    }
  }, [userProfile, isClient]); 

  const handleGoalsUpdate = (updatedGoals: FitnessGoal[]) => {
    setUserProfile(prevProfile => ({
      ...prevProfile,
      fitnessGoals: updatedGoals,
    }));
    toast({
        title: "Goals Updated!",
        description: "Your fitness goals have been saved.",
    });
  };

  const handleNameUpdate = (newName: string) => {
    setUserProfile(prevProfile => ({
      ...prevProfile,
      name: newName,
    }));
    // Toast is handled in UserDetailsCard for name updates
  };

  const handleStatsUpdate = (newStats: { age?: number; gender?: string; heightValue?: number; heightUnit?: 'cm' | 'ft/in' }) => {
    setUserProfile(prevProfile => ({
      ...prevProfile,
      age: newStats.age !== undefined ? newStats.age : prevProfile.age,
      gender: newStats.gender !== undefined ? newStats.gender : prevProfile.gender,
      heightValue: newStats.heightValue, // This can be undefined to clear height
      heightUnit: newStats.heightValue !== undefined ? newStats.heightUnit : undefined, // Clear unit if value is cleared
    }));
    toast({
      title: "Stats Updated!",
      description: "Your personal stats have been saved.",
    });
  };


  return (
    <div className="container mx-auto px-4 py-8 space-y-8">
      <header className="mb-8">
        <h1 className="font-headline text-3xl font-bold text-primary">Your Profile</h1>
        <p className="text-muted-foreground">Manage your account, preferences, and fitness goals.</p>
      </header>

      {isClient ? ( 
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <UserDetailsCard 
              user={userProfile} 
              onNameUpdate={handleNameUpdate}
            />
            <UserStatsCard
              age={userProfile.age}
              gender={userProfile.gender}
              heightValue={userProfile.heightValue}
              heightUnit={userProfile.heightUnit}
              onStatsUpdate={handleStatsUpdate}
            />
          </div>
          <GoalSetterCard 
            initialGoals={userProfile.fitnessGoals} 
            onGoalsChange={handleGoalsUpdate} 
          />
        </>
      ) : (
        <>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <UserDetailsCard 
                    user={initialMockUser} 
                    onNameUpdate={handleNameUpdate}
                />
                 <UserStatsCard
                    age={initialMockUser.age}
                    gender={initialMockUser.gender}
                    heightValue={initialMockUser.heightValue}
                    heightUnit={initialMockUser.heightUnit}
                    onStatsUpdate={handleStatsUpdate} 
                 />
            </div>
            <GoalSetterCard 
                initialGoals={initialMockUser.fitnessGoals} 
                onGoalsChange={handleGoalsUpdate} 
            />
        </>
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
            <div className="flex items-center justify-between p-3 rounded-md border hover:bg-secondary/50 transition-colors">
                <div>
                    <h4 className="font-medium">Theme</h4>
                    <p className="text-sm text-muted-foreground">Switch between light and dark mode.</p>
                </div>
                <Button variant="outline" size="sm">
                    <Palette className="mr-2 h-4 w-4" /> Toggle Theme
                </Button>
            </div>
             <div className="flex items-center justify-between p-3 rounded-md border hover:bg-secondary/50 transition-colors">
                <div>
                    <h4 className="font-medium">Notification Preferences</h4>
                    <p className="text-sm text-muted-foreground">Manage your app notifications.</p>
                </div>
                <Button variant="outline" size="sm">
                    Manage
                </Button>
            </div>
             <div className="flex items-center justify-between p-3 rounded-md border hover:bg-secondary/50 transition-colors">
                <div>
                    <h4 className="font-medium">Account Data</h4>
                    <p className="text-sm text-muted-foreground">Export or delete your account data.</p>
                </div>
                <Button variant="outline" size="sm">
                    Manage Data
                </Button>
            </div>
          <Button variant="destructive" className="w-full mt-4">
            <LogOut className="mr-2 h-4 w-4" /> Log Out (Placeholder)
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

