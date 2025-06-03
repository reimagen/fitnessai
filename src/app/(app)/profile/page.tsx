
"use client";

import { useState } from "react";
import type { UserProfile, FitnessGoal } from "@/lib/types";
import { UserDetailsCard } from "@/components/profile/user-details-card";
import { GoalSetterCard } from "@/components/profile/goal-setter-card";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Settings, LogOut, Palette } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

// Initial mock user data, now managed by the page
const initialMockUser: UserProfile = {
  id: "user123",
  name: "Alex Fitness",
  email: "alex.fitness@example.com",
  avatarUrl: "https://placehold.co/100x100.png",
  fitnessGoals: [
    { id: "goal1", description: "Lose 5kg by end of August", achieved: false, targetDate: new Date("2024-08-31"), isPrimary: true },
    { id: "goal2", description: "Run a 10k marathon", achieved: false, targetDate: new Date("2024-12-31"), isPrimary: false },
    { id: "goal3", description: "Workout 4 times a week", achieved: true, isPrimary: false, targetDate: new Date("2024-07-30") },
  ],
};

export default function ProfilePage() {
  const [userProfile, setUserProfile] = useState<UserProfile>(initialMockUser);
  const { toast } = useToast();

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

  return (
    <div className="container mx-auto px-4 py-8 space-y-8">
      <header className="mb-8">
        <h1 className="font-headline text-3xl font-bold text-primary">Your Profile</h1>
        <p className="text-muted-foreground">Manage your account, preferences, and fitness goals.</p>
      </header>

      <UserDetailsCard user={userProfile} />
      <GoalSetterCard 
        initialGoals={userProfile.fitnessGoals} 
        onGoalsChange={handleGoalsUpdate} 
      />
      
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
