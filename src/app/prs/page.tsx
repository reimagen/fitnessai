
"use client";

import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Award, Trophy, UploadCloud, Trash2, Flag, CheckCircle, Milestone, Loader2, Edit2, Check, X, Info, Edit } from "lucide-react";
import type { PersonalRecord, ExerciseCategory, UserProfile, FitnessGoal, StrengthLevel } from "@/lib/types";
import { PrUploaderForm } from "@/components/prs/pr-uploader-form";
import { ManualPrForm } from "@/components/prs/manual-pr-form";
import { parsePersonalRecordsAction } from "./actions";
import { useToast } from "@/hooks/use-toast";
import { format, startOfDay } from "date-fns";
import type { ParsePersonalRecordsOutput } from "@/ai/flows/personal-record-parser";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { usePersonalRecords, useUserProfile, useAddPersonalRecords, useUpdatePersonalRecord } from "@/lib/firestore.service";
import { writeBatch, doc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useQueryClient } from "@tanstack/react-query";
import { getStrengthThresholds, getStrengthStandardType } from "@/lib/strength-standards";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import { ErrorState } from "@/components/shared/ErrorState";
import { useAuth } from "@/lib/auth.service";


// Function to group records and find the best for each exercise
const getBestRecords = (records: PersonalRecord[]): PersonalRecord[] => {
    if (!records || records.length === 0) return [];

    const recordsByExercise: { [key: string]: PersonalRecord[] } = records.reduce((acc, record) => {
        const key = record.exerciseName.trim().toLowerCase();
        if (!acc[key]) {
            acc[key] = [];
        }
        acc[key].push(record);
        return acc;
    }, {} as { [key: string]: PersonalRecord[] });

    const bestRecords = Object.values(recordsByExercise).map(exerciseRecords => {
        return exerciseRecords.reduce((best, current) => {
            // Simple weight comparison, assuming same unit for now. 
            // A more robust solution would convert units before comparing.
            return current.weight > best.weight ? current : best;
        });
    });

    // Sort by most recent date
    return bestRecords.sort((a, b) => b.date.getTime() - a.date.getTime());
}

export default function MilestonesPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { user } = useAuth();

  const [editingRecordId, setEditingRecordId] = useState<string | null>(null);
  const [editedWeight, setEditedWeight] = useState('');
  const [editedDate, setEditedDate] = useState('');
  const [activeForm, setActiveForm] = useState<'manual' | 'parse' | 'none'>('none');

  const { data: allRecords, isLoading: isLoadingPrs, isError: isErrorPrs } = usePersonalRecords();
  const { data: profileResult, isLoading: isLoadingProfile, isError: isErrorProfile } = useUserProfile();
  const userProfile = profileResult?.data;
  const addPersonalRecordsMutation = useAddPersonalRecords();
  const updateRecordMutation = useUpdatePersonalRecord();

  const bestRecords = useMemo(() => getBestRecords(allRecords || []), [allRecords]);
  const completedGoals = useMemo(() => userProfile?.fitnessGoals?.filter(g => g.achieved) || [], [userProfile]);
  
  const handleParsedData = (parsedData: ParsePersonalRecordsOutput) => {
    if (!user) return;
    let addedCount = 0;
    const newRecords: Omit<PersonalRecord, 'id' | 'userId'>[] = [];

    const existingRecordKeys = new Set((allRecords || []).map(r => `${r.exerciseName.trim().toLowerCase()}|${format(r.date, 'yyyy-MM-dd')}`));

    parsedData.records.forEach(rec => {
        const key = `${rec.exerciseName.trim().toLowerCase()}|${rec.dateString}`;
        if (!existingRecordKeys.has(key)) {
            const newRecord: Omit<PersonalRecord, 'id' | 'userId'> = {
                exerciseName: rec.exerciseName,
                weight: rec.weight,
                weightUnit: rec.weightUnit,
                date: new Date(`${rec.dateString}T00:00:00Z`),
                category: rec.category,
            };
            newRecords.push(newRecord);
            existingRecordKeys.add(key); // prevent duplicates in the same upload
            addedCount++;
        }
    });

    if (addedCount > 0) {
        addPersonalRecordsMutation.mutate(newRecords, {
            onSuccess: () => {
                toast({
                    title: "Records Updated",
                    description: `Added ${addedCount} new personal record(s).`,
                });
                setActiveForm('none');
            },
            onError: (error) => {
                 toast({
                    title: "Update Failed",
                    description: `Could not save new records: ${error.message}`,
                    variant: "destructive"
                });
            }
        });
    } else {
        toast({
            title: "No New Records",
            description: "The uploaded screenshot contained no new records.",
            variant: "default",
        });
        setActiveForm('none');
    }
  };
  
  const handleManualAdd = (newRecord: Omit<PersonalRecord, 'id' | 'userId'>) => {
    addPersonalRecordsMutation.mutate([newRecord], {
        onSuccess: () => {
            toast({
                title: "PR Added!",
                description: `Your new record for ${newRecord.exerciseName} has been saved.`,
            });
            setActiveForm('none');
        },
        onError: (error) => {
            toast({
                title: "Save Failed",
                description: `Could not save the new record: ${error.message}`,
                variant: "destructive"
            });
        }
    });
  };

  const performClearRecords = async () => {
    if (!allRecords || allRecords.length === 0 || !user) return;
    try {
        const batch = writeBatch(db);
        allRecords.forEach(record => {
            const docRef = doc(db, 'users', user.uid, 'personalRecords', record.id);
            batch.delete(docRef);
        });
        await batch.commit();
        queryClient.invalidateQueries({ queryKey: ['prs', user.uid] });
        toast({
            title: "Records Cleared",
            description: "All personal records have been removed.",
            variant: "destructive",
        });
    } catch(error: any) {
        toast({
            title: "Clear Failed",
            description: `Could not clear records: ${error.message}`,
            variant: "destructive"
        });
    }
  };
  
  const handleEditClick = (record: PersonalRecord) => {
    setEditingRecordId(record.id);
    setEditedWeight(record.weight.toString());
    setEditedDate(format(record.date, 'yyyy-MM-dd'));
  };

  const handleCancelEdit = () => {
    setEditingRecordId(null);
  };

  const handleSaveEdit = (recordId: string) => {
    const weight = parseFloat(editedWeight);
    if (isNaN(weight) || weight <= 0) {
        toast({ title: 'Invalid Weight', description: 'Please enter a valid positive number for weight.', variant: 'destructive' });
        return;
    }
    
    // Create a Date object in the client's local timezone.
    const date = new Date(editedDate.replace(/-/g, '/'));
    if (isNaN(date.getTime())) {
        toast({ title: 'Invalid Date', description: 'Please enter a valid date.', variant: 'destructive' });
        return;
    }
    // Normalize to the start of the day to ensure consistency.
    const normalizedDate = startOfDay(date);

    // Pass the full, timezone-aware Date object to the server.
    updateRecordMutation.mutate(
        { id: recordId, data: { weight, date: normalizedDate } },
        {
            onSuccess: () => {
                toast({ title: 'PR Updated!', description: 'Your personal record has been successfully updated.' });
                setEditingRecordId(null);
            },
            onError: (error) => {
                toast({ title: 'Update Failed', description: error.message, variant: 'destructive' });
            },
        }
    );
  };

  const groupedRecords = bestRecords.reduce((acc, record) => {
    const category = record.category || 'Other';
    if (!acc[category]) {
      acc[category] = [];
    }
    acc[category].push(record);
    return acc;
  }, {} as Record<string, PersonalRecord[]>);

  const categoryOrder: ExerciseCategory[] = ['Upper Body', 'Lower Body', 'Core', 'Full Body', 'Cardio', 'Other'];

  const levelToBadgeVariant = (level: StrengthLevel) => {
    switch (level) {
      case 'Beginner': return 'destructive';
      case 'Intermediate': return 'secondary';
      case 'Advanced': return 'accent';
      case 'Elite': return 'default';
      default: return 'outline';
    }
  };

  const isLoading = isLoadingPrs || isLoadingProfile;
  const isError = isErrorPrs || isErrorProfile;

  return (
    <div className="container mx-auto px-4 py-8 space-y-8">
      <header className="mb-4">
        <h1 className="font-headline text-3xl font-bold text-primary flex items-center">
          <Award className="mr-3 h-8 w-8" /> Milestones & Achievements
        </h1>
        <p className="text-muted-foreground">Log your best lifts and completed goals, with strength level classifications.</p>
      </header>

      {activeForm === 'none' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card className="shadow-lg hover:shadow-xl transition-shadow cursor-pointer" onClick={() => setActiveForm('manual')}>
            <CardHeader>
              <CardTitle className="font-headline flex items-center gap-2">
                <Edit className="h-6 w-6 text-accent" />
                Log PR Manually
              </CardTitle>
              <CardDescription>
                Log a single personal record for a classifiable exercise.
              </CardDescription>
            </CardHeader>
          </Card>
          <Card className="shadow-lg hover:shadow-xl transition-shadow cursor-pointer" onClick={() => setActiveForm('parse')}>
            <CardHeader>
              <CardTitle className="font-headline flex items-center gap-2">
                <UploadCloud className="h-6 w-6 text-accent" />
                Upload from Screenshot
              </CardTitle>
              <CardDescription>
                Upload an image to parse multiple PRs at once.
              </CardDescription>
            </CardHeader>
          </Card>
        </div>
      )}

      <div className={cn(activeForm === 'manual' ? "block" : "hidden")}>
        <Card className="shadow-lg">
          <CardHeader className="relative">
             <Button
                variant="ghost"
                size="icon"
                onClick={() => setActiveForm('none')}
                className="absolute top-4 right-4 text-muted-foreground hover:bg-secondary"
                aria-label="Close form"
            >
                <X className="h-5 w-5" />
            </Button>
             <CardTitle className="font-headline flex items-center gap-2">
                <Edit className="h-6 w-6 text-accent" />
                Add PR Manually
              </CardTitle>
              <CardDescription>
                Log a single personal record for a classifiable exercise.
              </CardDescription>
          </CardHeader>
          <CardContent>
            <ManualPrForm 
              onAdd={handleManualAdd} 
              isSubmitting={addPersonalRecordsMutation.isPending} 
            />
          </CardContent>
        </Card>
      </div>
      
      <div className={cn(activeForm === 'parse' ? "block" : "hidden")}>
        <Card className="shadow-lg">
           <CardHeader className="relative">
             <Button
                variant="ghost"
                size="icon"
                onClick={() => setActiveForm('none')}
                className="absolute top-4 right-4 text-muted-foreground hover:bg-secondary"
                aria-label="Close form"
            >
                <X className="h-5 w-5" />
            </Button>
              <CardTitle className="font-headline flex items-center gap-2">
                <UploadCloud className="h-6 w-6 text-accent" />
                Upload from Screenshot
              </CardTitle>
              <CardDescription>
                Upload an image to parse multiple PRs at once.
              </CardDescription>
            </CardHeader>
          <CardContent>
            <PrUploaderForm onParse={parsePersonalRecordsAction} onParsedData={handleParsedData} />
          </CardContent>
        </Card>
      </div>
      
      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle className="font-headline flex items-center gap-2">
            <Trophy className="h-6 w-6 text-primary"/>
            Personal Records
          </CardTitle>
          <CardDescription>
            Your top recorded lift (1RM) for each exercise. Levels are classified based on your personal stats. 
            Body-weight based levels use ratios from strengthlevel.com. 
            Otherwise, level calculations are based on your skeletal muscle mass.
          </CardDescription>
          {allRecords && allRecords.length > 0 && (
              <Button
                variant="destructive"
                size="sm"
                className="w-full mt-4"
                onClick={performClearRecords}
              >
                <Trash2 className="mr-2 h-4 w-4" /> Clear All Records
              </Button>
            )}
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center items-center h-40">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : isError ? (
            <ErrorState message="Could not load your personal records. Please try again." />
          ) : bestRecords.length > 0 ? (
             <div className="space-y-8">
                {categoryOrder.map(category => (
                  groupedRecords[category] && groupedRecords[category].length > 0 && (
                    <div key={category}>
                        <h3 className="text-xl font-headline font-semibold mb-4 text-primary border-b pb-2">{category}</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 pt-2">
                            {groupedRecords[category].map(record => {
                                const isEditing = editingRecordId === record.id;
                                const level = record.strengthLevel || 'N/A';
                                const standardType = getStrengthStandardType(record.exerciseName);
                                const isSmmExercise = standardType === 'smm';
                                const needsSmmData = isSmmExercise && (!userProfile?.skeletalMuscleMassValue || !userProfile.gender);

                                const thresholds = userProfile && !needsSmmData ? getStrengthThresholds(record.exerciseName, userProfile, record.weightUnit) : null;
                                const isTricepsExercise = ['tricep extension', 'tricep pushdown', 'triceps'].includes(record.exerciseName.trim().toLowerCase());

                                let progressData: { value: number; text?: string; } | null = null;
                                if (level !== 'N/A' && level !== 'Elite' && thresholds) {
                                  const levelOrder: StrengthLevel[] = ['Beginner', 'Intermediate', 'Advanced', 'Elite'];
                                  const currentLevelIndex = levelOrder.indexOf(level);
                                  const nextLevel = levelOrder[currentLevelIndex + 1];
                                  
                                  const currentThreshold = level === 'Beginner' ? 0 : thresholds[level.toLowerCase() as keyof typeof thresholds];
                                  const nextThreshold = thresholds[nextLevel.toLowerCase() as keyof thresholds];
                                  
                                  if (record.weight < nextThreshold) {
                                    const range = nextThreshold - currentThreshold;
                                    const progress = record.weight - currentThreshold;
                                    const percentage = range > 0 ? (progress / range) * 100 : 0;
                                    
                                    progressData = { value: percentage };

                                    if (record.weight >= nextThreshold * 0.9) {
                                        const weightToGo = nextThreshold - record.weight;
                                        progressData.text = `Only ${weightToGo} ${record.weightUnit} to ${nextLevel}!`;
                                    }
                                  }
                                }

                                return (
                                    <Card key={record.id} className="bg-secondary/50 flex flex-col justify-between p-4">
                                      {isEditing ? (
                                        <div className="flex flex-col gap-2 h-full">
                                          <p className="font-bold text-lg text-primary capitalize">{record.exerciseName}</p>
                                          <div className="flex items-center gap-2">
                                            <Input 
                                                type="number" 
                                                value={editedWeight} 
                                                onChange={(e) => setEditedWeight(e.target.value)} 
                                                className="w-2/3" 
                                                aria-label="Edit weight"
                                            />
                                            <span className="text-lg font-bold text-muted-foreground">{record.weightUnit}</span>
                                          </div>
                                          <Input 
                                              type="date" 
                                              value={editedDate} 
                                              onChange={(e) => setEditedDate(e.target.value)}
                                              aria-label="Edit date"
                                          />
                                          <div className="flex justify-end items-center gap-2 mt-auto pt-2">
                                            <Button variant="ghost" size="icon" onClick={handleCancelEdit} aria-label="Cancel edit">
                                                <X className="h-4 w-4" />
                                            </Button>
                                            <Button size="icon" onClick={() => handleSaveEdit(record.id)} aria-label="Save changes" disabled={updateRecordMutation.isPending}>
                                                {updateRecordMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin"/> : <Check className="h-4 w-4" />}
                                            </Button>
                                          </div>
                                        </div>
                                      ) : (
                                        <div className="flex flex-col h-full">
                                            <div>
                                                <div className="flex justify-between items-start">
                                                    <div>
                                                        <div className="flex items-center gap-2 flex-wrap mb-1">
                                                            <p className="font-bold text-lg text-primary capitalize">{record.exerciseName}</p>
                                                            {level !== 'N/A' && (
                                                                <Badge variant={levelToBadgeVariant(level)}>{level}</Badge>
                                                            )}
                                                        </div>
                                                        <p className="text-2xl font-black text-accent">{record.weight} <span className="text-lg font-bold text-muted-foreground">{record.weightUnit}</span></p>
                                                    </div>
                                                    <Button variant="ghost" size="icon" onClick={() => handleEditClick(record)} aria-label={`Edit ${record.exerciseName} PR`}>
                                                        <Edit2 className="h-4 w-4" />
                                                    </Button>
                                                </div>
                                                <p className="text-xs text-muted-foreground mt-1">Achieved on: {format(record.date, "MMM d, yyyy")}</p>
                                            </div>
                                            
                                            <div className="flex-grow my-3">
                                              {needsSmmData ? (
                                                <div className="p-2 my-2 text-center text-xs text-muted-foreground bg-background/50 border rounded-md">
                                                  <Info className="h-4 w-4 mx-auto mb-1" />
                                                  <p>This exercise requires your Skeletal Muscle Mass to classify your strength level. Please update your profile.</p>
                                                </div>
                                              ) : progressData ? (
                                                <div className="space-y-1.5">
                                                    <Progress value={progressData.value} className="h-2 [&>div]:bg-accent" />
                                                    {progressData.text && (
                                                        <p className="text-xs font-medium text-center text-accent">{progressData.text}</p>
                                                    )}
                                                </div>
                                              ) : null}
                                            </div>
                                            
                                            {thresholds && level !== 'N/A' && (
                                              <div className="mt-auto pt-3 border-t border-muted/20 text-xs space-y-1">
                                                {level !== 'Elite' && level !== 'Advanced' && (
                                                    <div className="flex justify-between items-center">
                                                        <span className="font-medium text-muted-foreground">Intermediate</span>
                                                        <span className="font-semibold text-foreground">{thresholds.intermediate} {record.weightUnit}</span>
                                                    </div>
                                                )}
                                                {level !== 'Elite' && (
                                                     <div className="flex justify-between items-center">
                                                        <span className="font-medium text-muted-foreground">Advanced</span>
                                                        <span className="font-semibold text-foreground">{thresholds.advanced} {record.weightUnit}</span>
                                                    </div>
                                                )}
                                                <div className="flex justify-between items-center">
                                                    <span className="font-medium text-muted-foreground">Elite</span>
                                                    <span className="font-semibold text-foreground">{thresholds.elite} {record.weightUnit}</span>
                                                </div>
                                                {standardType && (
                                                    <div className="text-center text-muted-foreground/80 text-[10px] pt-2">
                                                        <p className="uppercase tracking-wider">
                                                            Based on {standardType === 'smm' ? 'Skeletal Muscle Mass' : 'Bodyweight'}
                                                        </p>
                                                        {isTricepsExercise && (
                                                            <p className="normal-case italic tracking-normal">*Machine is Seated Dip</p>
                                                        )}
                                                    </div>
                                                )}
                                              </div>
                                            )}
                                        </div>
                                      )}
                                    </Card>
                                )
                            })}
                        </div>
                    </div>
                  )
                ))}
            </div>
          ) : (
             <div className="flex flex-col items-center justify-center h-40 text-center">
                <Trophy className="h-16 w-16 text-primary/30 mb-4" />
                <p className="text-muted-foreground">
                    No personal records logged yet. Add a PR or upload a screenshot to get started!
                </p>
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle className="font-headline flex items-center gap-2">
            <Flag className="h-6 w-6 text-primary"/>
            Completed Goals
          </CardTitle>
          <CardDescription>
            All the goals you've set and conquered.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {completedGoals.length > 0 ? (
             <div className="space-y-3">
                {completedGoals.map(goal => (
                    <div key={goal.id} className="flex items-center justify-between p-3 rounded-md bg-secondary/50">
                        <div className="flex flex-col">
                            <p className="font-semibold text-primary">{goal.description}</p>
                            <p className="text-xs text-muted-foreground">Target: {format(goal.targetDate, "MMM d, yyyy")}</p>
                            {goal.dateAchieved && <p className="text-xs text-muted-foreground">Achieved on: {format(goal.dateAchieved, "MMM d, yyyy")}</p>}
                        </div>
                        <div className="flex items-center gap-2 text-green-600">
                            <CheckCircle className="h-5 w-5"/>
                            <span className="text-sm font-bold">Done!</span>
                        </div>
                    </div>
                ))}
            </div>
          ) : (
             <div className="flex flex-col items-center justify-center h-40 text-center">
                <Flag className="h-16 w-16 text-primary/30 mb-4" />
                <p className="text-muted-foreground">
                    No completed goals yet. Set and achieve goals on your profile!
                </p>
            </div>
          )}
        </CardContent>
      </Card>

    </div>
  );
}
 
