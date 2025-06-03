
"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Edit2, Save, XCircle, UserCircle2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

type UserStatsCardProps = {
  age?: number;
  gender?: string;
  onStatsUpdate: (stats: { age?: number; gender?: string }) => void;
};

const GENDER_OPTIONS = ["Male", "Female", "Other", "Prefer not to say"];

export function UserStatsCard({ age, gender, onStatsUpdate }: UserStatsCardProps) {
  const { toast } = useToast();
  const [isEditing, setIsEditing] = useState(false);
  const [editedAge, setEditedAge] = useState(age || "");
  const [editedGender, setEditedGender] = useState(gender || "");

  useEffect(() => {
    setEditedAge(age || "");
    setEditedGender(gender || "");
  }, [age, gender]);

  const handleEditClick = () => {
    setIsEditing(true);
  };

  const handleCancelClick = () => {
    setEditedAge(age || "");
    setEditedGender(gender || "");
    setIsEditing(false);
  };

  const handleSaveClick = () => {
    const currentAge = typeof editedAge === 'string' ? parseInt(editedAge, 10) : editedAge;

    if (editedAge !== "" && (isNaN(currentAge) || currentAge <= 0 || currentAge > 120)) {
      toast({
        title: "Invalid Age",
        description: "Please enter a valid age.",
        variant: "destructive",
      });
      return;
    }

    onStatsUpdate({ 
      age: editedAge === "" ? undefined : currentAge, 
      gender: editedGender === "" ? undefined : editedGender 
    });
    setIsEditing(false);
    // Toast is handled by parent on successful update
  };

  return (
    <Card className="shadow-lg">
      <CardHeader className="flex flex-row items-center justify-between">
        <div className="flex items-center gap-2">
            <UserCircle2 className="h-6 w-6 text-primary" />
            <CardTitle className="font-headline text-xl">Personal Stats</CardTitle>
        </div>
        {isEditing ? (
          <div className="flex gap-2">
            <Button variant="outline" size="icon" onClick={handleCancelClick} aria-label="Cancel stats edit">
              <XCircle className="h-5 w-5" />
            </Button>
            <Button size="icon" onClick={handleSaveClick} aria-label="Save new stats">
              <Save className="h-5 w-5" />
            </Button>
          </div>
        ) : (
          <Button variant="ghost" size="icon" onClick={handleEditClick} aria-label="Edit personal stats">
            <Edit2 className="h-5 w-5" />
          </Button>
        )}
      </CardHeader>
      <CardContent className="space-y-4">
        {isEditing ? (
          <>
            <div>
              <Label htmlFor="age-input" className="text-sm font-medium">Age</Label>
              <Input
                id="age-input"
                type="number"
                value={editedAge}
                onChange={(e) => setEditedAge(e.target.value)}
                placeholder="Your age"
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor="gender-select" className="text-sm font-medium">Gender</Label>
              <Select value={editedGender} onValueChange={setEditedGender}>
                <SelectTrigger id="gender-select" className="mt-1">
                  <SelectValue placeholder="Select gender" />
                </SelectTrigger>
                <SelectContent>
                  {GENDER_OPTIONS.map(option => (
                    <SelectItem key={option} value={option}>{option}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </>
        ) : (
          <>
            <div>
              <h4 className="font-semibold text-sm text-muted-foreground">Age:</h4>
              <p>{age || "Not set"}</p>
            </div>
            <div>
              <h4 className="font-semibold text-sm text-muted-foreground">Gender:</h4>
              <p>{gender || "Not set"}</p>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
