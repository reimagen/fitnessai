
"use client";

import type { UserProfile } from "@/lib/types";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Edit2 } from "lucide-react";

type UserDetailsCardProps = {
  user: UserProfile;
};

export function UserDetailsCard({ user }: UserDetailsCardProps) {
  const primaryGoal = user.fitnessGoals.find(g => g.isPrimary);
  // If no primary goal explicitly set, try to find one, or default to first or "Not set"
  const displayGoal = primaryGoal || user.fitnessGoals.find(g => g.isPrimary !== false) || user.fitnessGoals[0];


  return (
    <Card className="shadow-lg">
      <CardHeader className="flex flex-col items-center text-center sm:flex-row sm:text-left">
        <Avatar className="h-24 w-24 mb-4 sm:mb-0 sm:mr-6 ring-2 ring-primary ring-offset-2">
          <AvatarImage src={user.avatarUrl} alt={user.name} data-ai-hint="person portrait" />
          <AvatarFallback>{user.name.substring(0, 2).toUpperCase()}</AvatarFallback>
        </Avatar>
        <div>
          <CardTitle className="font-headline text-2xl">{user.name}</CardTitle>
          <CardDescription>{user.email}</CardDescription>
        </div>
        <Button variant="ghost" size="icon" className="sm:ml-auto mt-4 sm:mt-0">
          <Edit2 className="h-5 w-5" />
          <span className="sr-only">Edit Profile</span>
        </Button>
      </CardHeader>
      <CardContent>
        <div className="mt-4 space-y-2">
          <div>
            <h4 className="font-semibold text-sm text-muted-foreground">Joined:</h4>
            <p>July 15, 2023 (Example)</p>
          </div>
           <div>
            <h4 className="font-semibold text-sm text-muted-foreground">Primary Goal:</h4>
            <p className="text-accent font-medium">{displayGoal?.description || "Not set"}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
