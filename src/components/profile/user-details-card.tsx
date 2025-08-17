
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
import { format } from "date-fns";

type UserDetailsCardProps = {
  user: UserProfile;
  onUpdate: (details: Partial<Pick<UserProfile, 'name' | 'joinedDate' | 'age' | 'gender' | 'heightValue' | 'heightUnit' | 'weightValue' | 'weightUnit' | 'skeletalMuscleMassValue' | 'skeletalMuscleMassUnit' | 'bodyFatPercentage'>>) => void;
};

const GENDER_OPTIONS = ["Male", "Female", "Other", "Prefer not to say"];
const HEIGHT_UNIT_OPTIONS = [
    { label: "cm", value: "cm" },
    { label: "ft/in", value: "ft/in" },
];
const WEIGHT_UNIT_OPTIONS = [
    { label: "kg", value: "kg" },
    { label: "lbs", value: "lbs" },
];
const INCH_TO_CM = 2.54;
const FT_TO_INCHES = 12;

// Helper to format Date to 'yyyy-MM-dd' for date input
const formatDateForInput = (date: Date | undefined): string => {
  if (!date) return "";
  // Ensure 'date' is a Date object before formatting
  return format(date instanceof Date ? date : new Date(date), "yyyy-MM-dd");
};

export function UserDetailsCard({ user, onUpdate }: UserDetailsCardProps) {
  const { toast } = useToast();
  const [isEditing, setIsEditing] = useState(false);

  const [editedName, setEditedName] = useState(user.name);
  const [editedJoinedDate, setEditedJoinedDate] = useState(formatDateForInput(user.joinedDate));
  const [editedAge, setEditedAge] = useState(user.age?.toString() || "");
  const [editedGender, setEditedGender] = useState(user.gender || "");
  const [editedHeightUnit, setEditedHeightUnit] = useState<'cm' | 'ft/in'>(user.heightUnit || "cm");
  const [editedHeightCm, setEditedHeightCm] = useState("");
  const [editedHeightFt, setEditedHeightFt] = useState("");
  const [editedHeightIn, setEditedHeightIn] = useState("");
  const [editedWeightUnit, setEditedWeightUnit] = useState<'kg' | 'lbs'>(user.weightUnit || "lbs");
  const [editedWeight, setEditedWeight] = useState("");
  const [editedSkeletalMuscleMassValue, setEditedSkeletalMuscleMassValue] = useState("");
  const [editedSkeletalMuscleMassUnit, setEditedSkeletalMuscleMassUnit] = useState<'kg' | 'lbs'>(user.skeletalMuscleMassUnit || "lbs");
  const [editedBodyFat, setEditedBodyFat] = useState(user.bodyFatPercentage?.toString() || "");

  useEffect(() => {
    if (isEditing) {
      setEditedName(user.name);
      setEditedJoinedDate(formatDateForInput(user.joinedDate));
      setEditedAge(user.age?.toString() || "");
      setEditedGender(user.gender || "");
      const initialHeightUnit = user.heightUnit || "cm";
      setEditedHeightUnit(initialHeightUnit);

      if (user.heightValue !== undefined) {
        if (initialHeightUnit === "cm") {
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

      setEditedWeightUnit(user.weightUnit || "lbs");
      setEditedWeight(user.weightValue?.toString() || "");
      
      setEditedSkeletalMuscleMassUnit(user.skeletalMuscleMassUnit || 'lbs');
      setEditedSkeletalMuscleMassValue(user.skeletalMuscleMassValue?.toString() || "");
      
      setEditedBodyFat(user.bodyFatPercentage?.toString() || "");

    }
  }, [isEditing, user]);

  const handleEditClick = () => setIsEditing(true);
  const handleCancelClick = () => setIsEditing(false);

  const handleHeightUnitChange = (newUnit: 'cm' | 'ft/in') => {
    const oldUnit = editedHeightUnit;
    setEditedHeightUnit(newUnit);
    if (oldUnit === newUnit) return;

    if (newUnit === 'ft/in') { 
        const cmVal = parseFloat(editedHeightCm);
        if (!isNaN(cmVal) && cmVal > 0) {
            const totalInches = cmVal / INCH_TO_CM;
            setEditedHeightFt(Math.floor(totalInches / FT_TO_INCHES).toString());
            setEditedHeightIn(Math.round(totalInches % FT_TO_INCHES).toString());
        } else {
            setEditedHeightFt(""); setEditedHeightIn("");
        }
        setEditedHeightCm("");
    } else { 
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
    if (!editedJoinedDate || isNaN(new Date(editedJoinedDate.replace(/-/g, '\/')).getTime())) { // Use replace for cross-browser compatibility with YYYY-MM-DD
      toast({ title: "Invalid Joined Date", description: "Please enter a valid date.", variant: "destructive" });
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
    } else { 
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

    const weightVal = parseFloat(editedWeight);
    if (editedWeight !== "" && (isNaN(weightVal) || weightVal <= 0)) {
        toast({ title: "Invalid Weight", description: "Please enter a valid weight.", variant: "destructive" }); return;
    }

    const smmVal = parseFloat(editedSkeletalMuscleMassValue);
    if (editedSkeletalMuscleMassValue !== "" && (isNaN(smmVal) || smmVal <= 0)) {
        toast({ title: "Invalid Skeletal Muscle Mass", description: "Please enter a valid value for skeletal muscle mass.", variant: "destructive" }); return;
    }
    
    const bodyFatVal = parseFloat(editedBodyFat);
    if (editedBodyFat !== "" && (isNaN(bodyFatVal) || bodyFatVal <= 0 || bodyFatVal >= 100)) {
        toast({ title: "Invalid Body Fat %", description: "Please enter a valid percentage for body fat.", variant: "destructive" }); return;
    }

    const dateParts = editedJoinedDate.split('-').map(Number);
    // Create date object from parts to ensure local timezone interpretation
    const newJoinedDateObject = new Date(dateParts[0], dateParts[1] - 1, dateParts[2]);


    onUpdate({ 
      name: editedName,
      joinedDate: newJoinedDateObject,
      age: editedAge === "" ? undefined : currentAgeNum, 
      gender: editedGender === "" ? undefined : editedGender,
      heightValue: finalHeightCmValue,
      heightUnit: finalHeightCmValue !== undefined ? editedHeightUnit : undefined,
      weightValue: editedWeight !== "" ? weightVal : undefined,
      weightUnit: editedWeight !== "" ? editedWeightUnit : undefined,
      skeletalMuscleMassValue: editedSkeletalMuscleMassValue !== "" ? smmVal : undefined,
      skeletalMuscleMassUnit: editedSkeletalMuscleMassValue !== "" ? editedSkeletalMuscleMassUnit : undefined,
      bodyFatPercentage: editedBodyFat !== "" ? bodyFatVal : undefined,
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

  const displayWeight = () => {
    if (user.weightValue === undefined || user.weightUnit === undefined) return "Not set";
    return `${user.weightValue} ${user.weightUnit}`;
  };
  
  const displaySkeletalMuscleMass = () => {
    if (user.skeletalMuscleMassValue === undefined || user.skeletalMuscleMassUnit === undefined) return "Not set";
    return `${user.skeletalMuscleMassValue} ${user.skeletalMuscleMassUnit}`;
  };

  const displayBodyFat = () => {
    if (user.bodyFatPercentage === undefined) return "Not set";
    return `${user.bodyFatPercentage.toFixed(1)}%`;
  };

  return (
    <Card className="shadow-lg">
      <CardHeader className="pb-4 relative">
        <div className="absolute top-6 right-6 flex gap-2">
          {isEditing ? (
            <>
              <Button variant="outline" size="icon" onClick={handleCancelClick} aria-label="Cancel edit">
                <XCircle className="h-5 w-5" />
              </Button>
              <Button size="icon" onClick={handleSaveClick} aria-label="Save details">
                <Save className="h-5 w-5" />
              </Button>
            </>
          ) : (
            <Button variant="ghost" size="icon" onClick={handleEditClick} aria-label="Edit profile details">
              <Edit2 className="h-5 w-5" />
            </Button>
          )}
        </div>
        <div>
          {isEditing ? (
            <Input
              type="text"
              value={editedName}
              onChange={(e) => setEditedName(e.target.value)}
              className="text-2xl font-headline font-semibold leading-none tracking-tight w-2/3 mb-1"
              aria-label="Edit user name"
            />
          ) : (
            <CardTitle className="font-headline text-3xl mb-1 mr-16">{user.name}</CardTitle> // Added mr-16 for spacing from buttons
          )}
           {isEditing ? (
            <div className="mt-1">
              <Label htmlFor="joined-date-input" className="text-sm font-medium text-muted-foreground">Joined:</Label>
              <Input 
                id="joined-date-input"
                type="date" 
                value={editedJoinedDate} 
                onChange={(e) => setEditedJoinedDate(e.target.value)} 
                className="text-sm w-full md:w-auto"
              />
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">
              Joined: {user.joinedDate ? format(user.joinedDate instanceof Date ? user.joinedDate : new Date(user.joinedDate), "MMMM d, yyyy") : "Not set"}
            </p>
          )}
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="mt-4 space-y-4">
          <h4 className="text-md font-semibold text-muted-foreground border-b pb-1">Personal Stats</h4>
          {isEditing ? (
            <div className="space-y-4">
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

              {/* Combined Height Input */}
              <div>
                <Label htmlFor="height-unit-select" className="text-sm font-medium">Height</Label>
                <div className="flex items-center gap-2 mt-1">
                    {editedHeightUnit === 'cm' ? (
                        <Input id="height-cm-input" type="number" value={editedHeightCm} onChange={(e) => setEditedHeightCm(e.target.value)} placeholder="e.g., 175" aria-label="Height in cm" />
                    ) : (
                        <div className="flex flex-grow gap-2">
                        <Input id="height-ft-input" type="number" value={editedHeightFt} onChange={(e) => setEditedHeightFt(e.target.value)} placeholder="ft" className="w-1/2" aria-label="Feet" />
                        <Input id="height-in-input" type="number" value={editedHeightIn} onChange={(e) => setEditedHeightIn(e.target.value)} placeholder="in" className="w-1/2" aria-label="Inches" min="0" max="11" />
                        </div>
                    )}
                    <Select value={editedHeightUnit} onValueChange={(v) => handleHeightUnitChange(v as 'cm' | 'ft/in')}>
                        <SelectTrigger id="height-unit-select" className="w-[80px]"><SelectValue placeholder="Unit" /></SelectTrigger>
                        <SelectContent>{HEIGHT_UNIT_OPTIONS.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}</SelectContent>
                    </Select>
                </div>
              </div>
              
               <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label className="text-sm font-medium">Weight</Label>
                  <div className="flex gap-2 mt-1">
                    <Input id="weight-input" type="number" value={editedWeight} onChange={(e) => setEditedWeight(e.target.value)} placeholder="e.g., 150" className="flex-grow" aria-label="Weight" />
                     <Select value={editedWeightUnit} onValueChange={(v) => setEditedWeightUnit(v as 'kg' | 'lbs')}>
                        <SelectTrigger id="weight-unit-select" className="w-[80px]"><SelectValue placeholder="Unit" /></SelectTrigger>
                        <SelectContent>{WEIGHT_UNIT_OPTIONS.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                </div>
                <div>
                  <Label className="text-sm font-medium">Skeletal Muscle Mass</Label>
                  <div className="flex gap-2 mt-1">
                    <Input id="smm-input" type="number" value={editedSkeletalMuscleMassValue} onChange={(e) => setEditedSkeletalMuscleMassValue(e.target.value)} placeholder="e.g., 40" className="flex-grow" aria-label="Skeletal Muscle Mass" />
                     <Select value={editedSkeletalMuscleMassUnit} onValueChange={(v) => setEditedSkeletalMuscleMassUnit(v as 'kg' | 'lbs')}>
                        <SelectTrigger id="smm-unit-select" className="w-[80px]"><SelectValue placeholder="Unit" /></SelectTrigger>
                        <SelectContent>{WEIGHT_UNIT_OPTIONS.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
              <div>
                  <Label htmlFor="bodyfat-input" className="text-sm font-medium">Body Fat (%)</Label>
                  <Input id="bodyfat-input" type="number" step="0.1" value={editedBodyFat} onChange={(e) => setEditedBodyFat(e.target.value)} placeholder="e.g., 24.5" className="mt-1" />
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 gap-x-4 gap-y-2 text-sm">
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
               <div>
                <span className="font-medium text-muted-foreground">Weight: </span>
                <span>{displayWeight()}</span>
              </div>
              <div>
                <span className="font-medium text-muted-foreground">Skeletal Muscle: </span>
                <span>{displaySkeletalMuscleMass()}</span>
              </div>
              <div>
                <span className="font-medium text-muted-foreground">Body Fat: </span>
                <span>{displayBodyFat()}</span>
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
