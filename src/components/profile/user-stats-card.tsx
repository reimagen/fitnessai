
"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Edit2, Save, XCircle, UserCircle2, ArrowRightLeft } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

type UserStatsCardProps = {
  age?: number;
  gender?: string;
  heightValue?: number; // Height in cm
  heightUnit?: 'cm' | 'ft/in';
  onStatsUpdate: (stats: { age?: number; gender?: string; heightValue?: number; heightUnit?: 'cm' | 'ft/in' }) => void;
};

const GENDER_OPTIONS = ["Male", "Female", "Other", "Prefer not to say"];
const HEIGHT_UNIT_OPTIONS = [
    { label: "Centimeters", value: "cm" },
    { label: "Feet/Inches", value: "ft/in" },
];

// Conversion constants
const INCH_TO_CM = 2.54;
const FT_TO_INCHES = 12;

export function UserStatsCard({ age, gender, heightValue, heightUnit, onStatsUpdate }: UserStatsCardProps) {
  const { toast } = useToast();
  const [isEditing, setIsEditing] = useState(false);
  
  const [editedAge, setEditedAge] = useState(age?.toString() || "");
  const [editedGender, setEditedGender] = useState(gender || "");
  
  const [editedHeightUnit, setEditedHeightUnit] = useState<'cm' | 'ft/in'>(heightUnit || "cm");
  const [editedHeightCm, setEditedHeightCm] = useState(""); // For 'cm' input
  const [editedHeightFt, setEditedHeightFt] = useState("");   // For 'ft/in' input - feet
  const [editedHeightIn, setEditedHeightIn] = useState("");   // For 'ft/in' input - inches

  useEffect(() => {
    setEditedAge(age?.toString() || "");
    setEditedGender(gender || "");
    
    const initialUnit = heightUnit || "cm";
    setEditedHeightUnit(initialUnit);

    if (heightValue !== undefined) {
      if (initialUnit === "cm") {
        setEditedHeightCm(heightValue.toString());
        setEditedHeightFt("");
        setEditedHeightIn("");
      } else { // ft/in
        const totalInches = heightValue / INCH_TO_CM;
        setEditedHeightFt(Math.floor(totalInches / FT_TO_INCHES).toString());
        setEditedHeightIn(Math.round(totalInches % FT_TO_INCHES).toString());
        setEditedHeightCm(""); // Clear cm field if primary is ft/in
      }
    } else {
      setEditedHeightCm("");
      setEditedHeightFt("");
      setEditedHeightIn("");
    }
  }, [age, gender, heightValue, heightUnit, isEditing]); // Rerun if isEditing changes to reset form on cancel

  const handleEditClick = () => {
    setIsEditing(true);
  };

  const handleCancelClick = () => {
    setIsEditing(false);
    // Reset fields to original prop values, useEffect will handle this due to isEditing change
  };

  const handleHeightUnitChange = (newUnit: 'cm' | 'ft/in') => {
    const oldUnit = editedHeightUnit;
    setEditedHeightUnit(newUnit);

    if (oldUnit === newUnit) return;

    // Try to convert existing value
    if (newUnit === 'ft/in') { // cm -> ft/in
        const cmVal = parseFloat(editedHeightCm);
        if (!isNaN(cmVal) && cmVal > 0) {
            const totalInches = cmVal / INCH_TO_CM;
            setEditedHeightFt(Math.floor(totalInches / FT_TO_INCHES).toString());
            setEditedHeightIn(Math.round(totalInches % FT_TO_INCHES).toString());
        } else { // no valid cm value, clear ft/in
            setEditedHeightFt("");
            setEditedHeightIn("");
        }
        setEditedHeightCm(""); // Clear cm field
    } else { // ft/in -> cm
        const ftVal = parseFloat(editedHeightFt);
        const inVal = parseFloat(editedHeightIn);
        if ((!isNaN(ftVal) && ftVal >=0) || (!isNaN(inVal) && inVal >=0 && inVal < 12)) {
            const totalInches = (isNaN(ftVal) ? 0 : ftVal) * FT_TO_INCHES + (isNaN(inVal) ? 0 : inVal);
             if (totalInches > 0) {
                setEditedHeightCm((totalInches * INCH_TO_CM).toFixed(1)); // Keep one decimal for cm
             } else {
                setEditedHeightCm("");
             }
        } else { // no valid ft/in value, clear cm
            setEditedHeightCm("");
        }
        setEditedHeightFt(""); // Clear ft/in fields
        setEditedHeightIn("");
    }
  };

  const handleSaveClick = () => {
    const currentAgeNum = parseInt(editedAge, 10);
    if (editedAge !== "" && (isNaN(currentAgeNum) || currentAgeNum <= 0 || currentAgeNum > 120)) {
      toast({ title: "Invalid Age", description: "Please enter a valid age.", variant: "destructive" });
      return;
    }

    let finalHeightCmValue: number | undefined = undefined;

    if (editedHeightUnit === 'cm') {
      const cmVal = parseFloat(editedHeightCm);
      if (editedHeightCm !== "") { // Only validate if not empty
        if (isNaN(cmVal) || cmVal <= 0) {
          toast({ title: "Invalid Height", description: "Please enter a valid height in cm.", variant: "destructive" });
          return;
        }
        finalHeightCmValue = cmVal;
      }
    } else { // ft/in
      const ftVal = parseFloat(editedHeightFt);
      const inVal = parseFloat(editedHeightIn);
      
      const ftIsEmpty = editedHeightFt === "";
      const inIsEmpty = editedHeightIn === "";

      if (!ftIsEmpty && (isNaN(ftVal) || ftVal < 0)) {
        toast({ title: "Invalid Feet", description: "Please enter a valid value for feet.", variant: "destructive" });
        return;
      }
      if (!inIsEmpty && (isNaN(inVal) || inVal < 0 || inVal >= 12)) {
        toast({ title: "Invalid Inches", description: "Inches must be between 0 and 11.", variant: "destructive" });
        return;
      }

      if (ftIsEmpty && inIsEmpty) {
        finalHeightCmValue = undefined; // Both empty, so clear height
      } else {
        const totalInches = (ftIsEmpty ? 0 : ftVal) * FT_TO_INCHES + (inIsEmpty ? 0 : inVal);
        if (totalInches <= 0 && (!ftIsEmpty || !inIsEmpty)) { // If any part is filled, total height must be positive
             toast({ title: "Invalid Height", description: "Height must be a positive value.", variant: "destructive" });
             return;
        }
        finalHeightCmValue = totalInches > 0 ? totalInches * INCH_TO_CM : undefined;
      }
    }
    
    onStatsUpdate({ 
      age: editedAge === "" ? undefined : currentAgeNum, 
      gender: editedGender === "" ? undefined : editedGender,
      heightValue: finalHeightCmValue,
      heightUnit: finalHeightCmValue !== undefined ? editedHeightUnit : undefined,
    });
    setIsEditing(false);
  };

  const displayHeight = () => {
    if (heightValue === undefined || heightUnit === undefined) return "Not set";
    if (heightUnit === 'cm') return `${heightValue.toFixed(1)} cm`;
    
    // Convert cm to ft/in for display
    const totalInches = heightValue / INCH_TO_CM;
    const feet = Math.floor(totalInches / FT_TO_INCHES);
    const inches = Math.round(totalInches % FT_TO_INCHES);
    return `${feet} ft ${inches} in`;
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
            <div>
                <Label htmlFor="height-unit-select" className="text-sm font-medium">Height Unit</Label>
                <Select value={editedHeightUnit} onValueChange={(value) => handleHeightUnitChange(value as 'cm' | 'ft/in')}>
                    <SelectTrigger id="height-unit-select" className="mt-1">
                        <SelectValue placeholder="Select unit" />
                    </SelectTrigger>
                    <SelectContent>
                        {HEIGHT_UNIT_OPTIONS.map(option => (
                            <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            </div>
            {editedHeightUnit === 'cm' ? (
                 <div>
                    <Label htmlFor="height-cm-input" className="text-sm font-medium">Height (cm)</Label>
                    <Input
                        id="height-cm-input"
                        type="number"
                        value={editedHeightCm}
                        onChange={(e) => setEditedHeightCm(e.target.value)}
                        placeholder="e.g., 175"
                        className="mt-1"
                    />
                </div>
            ) : (
                <div>
                    <Label className="text-sm font-medium">Height (ft/in)</Label>
                    <div className="flex gap-2 mt-1">
                        <Input
                            id="height-ft-input"
                            type="number"
                            value={editedHeightFt}
                            onChange={(e) => setEditedHeightFt(e.target.value)}
                            placeholder="ft"
                            className="w-1/2"
                            aria-label="Feet"
                        />
                        <Input
                            id="height-in-input"
                            type="number"
                            value={editedHeightIn}
                            onChange={(e) => setEditedHeightIn(e.target.value)}
                            placeholder="in"
                            className="w-1/2"
                            aria-label="Inches"
                            min="0"
                            max="11"
                        />
                    </div>
                </div>
            )}
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
            <div>
              <h4 className="font-semibold text-sm text-muted-foreground">Height:</h4>
              <p>{displayHeight()}</p>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
