
"use client";

import { useState } from "react";
import type { UserProfile } from "@/lib/types";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Edit2, Save, XCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

type UserDetailsCardProps = {
  user: UserProfile;
  onNameUpdate: (newName: string) => void;
  // onAvatarUpdate prop removed
};

export function UserDetailsCard({ user, onNameUpdate }: UserDetailsCardProps) {
  const { toast } = useToast();
  const [isEditingName, setIsEditingName] = useState(false);
  const [editedName, setEditedName] = useState(user.name);

  const primaryGoal = user.fitnessGoals.find(g => g.isPrimary);
  const displayGoal = primaryGoal || user.fitnessGoals.find(g => g.isPrimary !== false) || user.fitnessGoals[0];

  const handleEditClick = () => {
    setEditedName(user.name);
    setIsEditingName(true);
  };

  const handleCancelClick = () => {
    setIsEditingName(false);
  };

  const handleSaveClick = () => {
    if (editedName.trim() === "") {
      toast({
        title: "Invalid Name",
        description: "Name cannot be empty.",
        variant: "destructive",
      });
      return;
    }
    onNameUpdate(editedName);
    setIsEditingName(false);
    toast({
      title: "Name Updated!",
      description: "Your profile name has been saved.",
    });
  };

  return (
    <>
      <Card className="shadow-lg">
        <CardHeader className="flex flex-col items-center text-center sm:flex-row sm:text-left">
          <div 
            className="relative h-24 w-24 mb-4 sm:mb-0 sm:mr-6 rounded-full"
            // Removed onClick, role, tabIndex, onKeyDown, aria-label for avatar change
          >
            <Avatar
              className={cn(
                "h-full w-full ring-2 ring-primary ring-offset-2" // Removed transition-opacity and group-hover:opacity-70
              )}
            >
              <AvatarImage src={user.avatarUrl} alt={user.name} data-ai-hint="person portrait" />
              <AvatarFallback>{user.name.substring(0, 2).toUpperCase()}</AvatarFallback>
            </Avatar>
            {/* Removed camera icon overlay div */}
          </div>
          {/* Removed hidden file input */}
          <div className="flex-grow">
            {isEditingName ? (
              <div className="flex flex-col gap-2 items-center sm:items-start">
                <Input
                  type="text"
                  value={editedName}
                  onChange={(e) => setEditedName(e.target.value)}
                  className="text-xl font-semibold leading-none tracking-tight"
                  aria-label="Edit user name"
                />
              </div>
            ) : (
              <>
                <CardTitle className="font-headline text-2xl">{user.name}</CardTitle>
              </>
            )}
          </div>
          {isEditingName ? (
            <div className="flex gap-2 mt-4 sm:mt-0 sm:ml-auto">
              <Button variant="outline" size="icon" onClick={handleCancelClick} aria-label="Cancel name edit">
                <XCircle className="h-5 w-5" />
              </Button>
              <Button size="icon" onClick={handleSaveClick} aria-label="Save new name">
                <Save className="h-5 w-5" />
              </Button>
            </div>
          ) : (
            <Button variant="ghost" size="icon" className="sm:ml-auto mt-4 sm:mt-0" onClick={handleEditClick} aria-label="Edit profile name">
              <Edit2 className="h-5 w-5" />
            </Button>
          )}
        </CardHeader>
        <CardContent>
          <div className="mt-4 space-y-2">
            <div>
              <h4 className="font-semibold text-sm text-muted-foreground">Joined:</h4>
              <p>June 1, 2025</p>
            </div>
             <div>
              <h4 className="font-semibold text-sm text-muted-foreground">Primary Goal:</h4>
              <p className="text-accent font-medium">{displayGoal?.description || "Not set"}</p>
            </div>
          </div>
        </CardContent>
      </Card>
      {/* Removed ImageCropDialog instance */}
    </>
  );
}
