
"use client";

import { useState, useEffect } from "react";
import type { UserProfile } from "@/lib/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Edit2, Save, XCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

type UserDetailsCardProps = {
  user: UserProfile;
  onUpdate: (details: Partial<Pick<UserProfile, 'name' | 'age' | 'gender' | 'heightValue' | 'heightUnit'>>) => void;
};

const GENDER_OPTIONS = ["Male", "Female", "Other", "Prefer not to say"];
const HEIGHT_UNIT_OPTIONS = [
    { label: "Centimeters", value: "cm" },
    { label: "Feet/Inches", value: "ft/in" },
];
const INCH_TO_CM = 2.54;
const FT_TO_INCHES = 12;

export function UserDetailsCard({ user, onUpdate }: UserDetailsCardProps) {
  const { toast } = useToast();
  const [isEditing, setIsEditing] = useState(false);

  // Editing state for all fields
  const [editedName, setEditedName] = useState(user.name);
  const [editedAge, setEditedAge] = useState(user.age?.toString() || "");
  const [editedGender, setEditedGender] = useState(user.gender || "");
  const [editedHeightUnit, setEditedHeightUnit] = useState<'cm' | 'ft/in'>(user.heightUnit || "cm");
  const [editedHeightCm, setEditedHeightCm] = useState("");
  const [editedHeightFt, setEditedHeightFt] = useState("");
  const [editedHeightIn, setEditedHeightIn] = useState("");

  useEffect(() => {
    if (isEditing) {
      setEditedName(user.name);
      setEditedAge(user.age?.toString() || "");
      setEditedGender(user.gender || "");
      const initialUnit = user.heightUnit || "cm";
      setEditedHeightUnit(initialUnit);

      if (user.heightValue !== undefined) {
        if (initialUnit === "cm") {
          setEditedHeightCm(user.heightValue.toString());
          setEditedHeightFt("");
          setEditedHeightIn("");
        } else { // ft/in
          const totalInches = user.heightValue / INCH_TO_CM;
          setEditedHeightFt(Math.floor(totalInches / FT_TO_INCHES).toString());
          setEditedHeightIn(Math.round(totalInches % FT_TO_INCHES).toString());
          setEditedHeightCm("");
        }
      } else {
        setEditedHeightCm("");
        setEditedHeightFt("");
        setEditedHeightIn("");
      }
    }
  }, [isEditing, user]);

  const handleEditClick = () => setIsEditing(true);
  const handleCancelClick = () => setIsEditing(false);

  const handleHeightUnitChange = (newUnit: 'cm' | 'ft/in') => {
    const oldUnit = editedHeightUnit;
    setEditedHeightUnit(newUnit);
    if (oldUnit === newUnit) return;

    if (newUnit === 'ft/in') { // cm -> ft/in
        const cmVal = parseFloat(editedHeightCm);
        if (!isNaN(cmVal) && cmVal > 0) {
            const totalInches = cmVal / INCH_TO_CM;
            setEditedHeightFt(Math.floor(totalInches / FT_TO_INCHES).toString());
            setEditedHeightIn(Math.round(totalInches % FT_TO_INCHES).toString());
        } else {
            setEditedHeightFt(""); setEditedHeightIn("");
        }
        setEditedHeightCm("");
    } else { // ft/in -> cm
        const ftVal = parseFloat(editedHeightFt);
        const inVal = parseFloat(editedHeightIn);
        if ((!isNaN(ftVal) && ftVal >=0) || (!isNaN(inVal) && inVal >=0 && inVal < 12)) {
            const totalInches = (isNaN(ftVal) ? 0 : ftVal) * FT_TO_INCHES + (isNaN(inVal) ? 0 : inVal);
             if (totalInches > 0) {
                setEditedHeightCm((totalInches * INCH_TO_CM).toFixed(1));
             } else { setEditedHeightCm(""); }
        } else { setEditedHeightCm(""); }
        setEditedHeightFt(""); setEditedHeightIn("");
    }
  };

  const handleSaveClick = () => {
    if (editedName.trim() === "") {
      toast({ title: "Invalid Name", description: "Name cannot be empty.", variant: "destructive" });
      return;
    }
    const currentAgeNum = parseInt(editedAge, 10);
    if (editedAge !== "" && (isNaN(currentAgeNum) || currentAgeNum <= 0 || currentAgeNum > 120)) {
      toast({ title: "Invalid Age", description: "Please enter a valid age.", variant: "destructive" });
      return;
    }

    let finalHeightCmValue: number | undefined = undefined;
    if (editedHeightUnit === 'cm') {
      const cmVal = parseFloat(editedHeightCm);
      if (editedHeightCm !== "") {
        if (isNaN(cmVal) || cmVal <= 0) {
          toast({ title: "Invalid Height", description: "Please enter a valid height in cm.", variant: "destructive" }); return;
        }
        finalHeightCmValue = cmVal;
      }
    } else { // ft/in
      const ftVal = parseFloat(editedHeightFt);
      const inVal = parseFloat(editedHeightIn);
      const ftIsEmpty = editedHeightFt === ""; const inIsEmpty = editedHeightIn === "";
      if (!ftIsEmpty && (isNaN(ftVal) || ftVal < 0)) {
        toast({ title: "Invalid Feet", description: "Please enter a valid value for feet.", variant: "destructive" }); return;
      }
      if (!inIsEmpty && (isNaN(inVal) || inVal < 0 || inVal >= 12)) {
        toast({ title: "Invalid Inches", description: "Inches must be between 0 and 11.", variant: "destructive" }); return;
      }
      if (ftIsEmpty && inIsEmpty) { finalHeightCmValue = undefined; }
      else {
        const totalInches = (ftIsEmpty ? 0 : ftVal) * FT_TO_INCHES + (inIsEmpty ? 0 : inVal);
        if (totalInches <= 0 && (!ftIsEmpty || !inIsEmpty)) {
             toast({ title: "Invalid Height", description: "Height must be a positive value.", variant: "destructive" }); return;
        }
        finalHeightCmValue = totalInches > 0 ? totalInches * INCH_TO_CM : undefined;
      }
    }
    
    onUpdate({ 
      name: editedName,
      age: editedAge === "" ? undefined : currentAgeNum, 
      gender: editedGender === "" ? undefined : editedGender,
      heightValue: finalHeightCmValue,
      heightUnit: finalHeightCmValue !== undefined ? editedHeightUnit : undefined,
    });
    setIsEditing(false);
  };

  const displayHeight = () => {
    if (user.heightValue === undefined || user.heightUnit === undefined) return "Not set";
    if (user.heightUnit === 'cm') return `${user.heightValue.toFixed(1)} cm`;
    const totalInches = user.heightValue / INCH_TO_CM;
    const feet = Math.floor(totalInches / FT_TO_INCHES);
    const inches = Math.round(totalInches % FT_TO_INCHES);
    return `${feet} ft ${inches} in`;
  };

  return (
    <Card className="shadow-lg">
      <CardHeader className="flex flex-row items-start justify-between pb-4">
        {isEditing ? (
          <Input
            type="text"
            value={editedName}
            onChange={(e) => setEditedName(e.target.value)}
            className="text-2xl font-headline font-semibold leading-none tracking-tight flex-grow mr-4"
            aria-label="Edit user name"
          />
        ) : (
          <CardTitle className="font-headline text-3xl flex-grow">{user.name}</CardTitle>
        )}
        <div className="text-right space-y-1">
          <p className="text-sm text-muted-foreground">Joined: June 1, 2025</p>
          {isEditing ? (
            <div className="flex gap-2 justify-end">
              <Button variant="outline" size="icon" onClick={handleCancelClick} aria-label="Cancel edit">
                <XCircle className="h-5 w-5" />
              </Button>
              <Button size="icon" onClick={handleSaveClick} aria-label="Save details">
                <Save className="h-5 w-5" />
              </Button>
            </div>
          ) : (
            <Button variant="ghost" size="icon" onClick={handleEditClick} aria-label="Edit profile details" className="ml-auto">
              <Edit2 className="h-5 w-5" />
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="mt-4 space-y-4">
          <h4 className="text-md font-semibold text-muted-foreground border-b pb-1">Personal Stats</h4>
          {isEditing ? (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="age-input" className="text-sm font-medium">Age</Label>
                  <Input id="age-input" type="number" value={editedAge} onChange={(e) => setEditedAge(e.target.value)} placeholder="Your age" className="mt-1" />
                </div>
                <div>
                  <Label htmlFor="gender-select" className="text-sm font-medium">Gender</Label>
                  <Select value={editedGender} onValueChange={setEditedGender}>
                    <SelectTrigger id="gender-select" className="mt-1"><SelectValue placeholder="Select gender" /></SelectTrigger>
                    <SelectContent>{GENDER_OPTIONS.map(o => <SelectItem key={o} value={o}>{o}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
              </div>
              <div>
                <Label htmlFor="height-unit-select" className="text-sm font-medium">Height Unit</Label>
                <Select value={editedHeightUnit} onValueChange={(v) => handleHeightUnitChange(v as 'cm' | 'ft/in')}>
                  <SelectTrigger id="height-unit-select" className="mt-1"><SelectValue placeholder="Select unit" /></SelectTrigger>
                  <SelectContent>{HEIGHT_UNIT_OPTIONS.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              {editedHeightUnit === 'cm' ? (
                <div>
                  <Label htmlFor="height-cm-input" className="text-sm font-medium">Height (cm)</Label>
                  <Input id="height-cm-input" type="number" value={editedHeightCm} onChange={(e) => setEditedHeightCm(e.target.value)} placeholder="e.g., 175" className="mt-1" />
                </div>
              ) : (
                <div>
                  <Label className="text-sm font-medium">Height (ft/in)</Label>
                  <div className="flex gap-2 mt-1">
                    <Input id="height-ft-input" type="number" value={editedHeightFt} onChange={(e) => setEditedHeightFt(e.target.value)} placeholder="ft" className="w-1/2" aria-label="Feet" />
                    <Input id="height-in-input" type="number" value={editedHeightIn} onChange={(e) => setEditedHeightIn(e.target.value)} placeholder="in" className="w-1/2" aria-label="Inches" min="0" max="11" />
                  </div>
                </div>
              )}
            </>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-x-4 gap-y-2 text-sm">
              <div>
                <span className="font-medium text-muted-foreground">Age: </span>
                <span>{user.age || "Not set"}</span>
              </div>
              <div>
                <span className="font-medium text-muted-foreground">Gender: </span>
                <span>{user.gender || "Not set"}</span>
              </div>
              <div>
                <span className="font-medium text-muted-foreground">Height: </span>
                <span>{displayHeight()}</span>
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
