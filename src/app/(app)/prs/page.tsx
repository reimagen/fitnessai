
"use client";

import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Award, Trophy, UploadCloud, Trash2, Flag, CheckCircle, Milestone, Loader2, Edit2, Check, X, Info } from "lucide-react";
import type { PersonalRecord, ExerciseCategory, UserProfile, FitnessGoal, StrengthLevel } from "@/lib/types";
import { PrUploaderForm } from "@/components/prs/pr-uploader-form";
import { parsePersonalRecordsAction } from "./actions";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import type { ParsePersonalRecordsOutput } from "@/ai/flows/personal-record-parser";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { usePersonalRecords, useUserProfile, useAddPersonalRecords, useUpdatePersonalRecord } from "@/lib/firestore.service";
import { writeBatch, doc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useQueryClient } from "@tanstack/react-query";
import { getStrengthLevel, getStrengthThresholds, getStrengthStandardType } from "@/lib/strength-standards";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";


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

  const [editingRecordId, setEditingRecordId] = useState<string | null>(null);
  const [editedWeight, setEditedWeight] = useState('');
  const [editedDate, setEditedDate] = useState('');

  const { data: allRecords, isLoading: isLoadingPrs } = usePersonalRecords();
  const { data: userProfile, isLoading: isLoadingProfile } = useUserProfile();
  const addPersonalRecordsMutation = useAddPersonalRecords();
  const updateRecordMutation = useUpdatePersonalRecord();

  const bestRecords = useMemo(() => getBestRecords(allRecords || []), [allRecords]);
  const completedGoals = useMemo(() => userProfile?.fitnessGoals.filter(g => g.achieved) || [], [userProfile]);
  
  const handleParsedData = (parsedData: ParsePersonalRecordsOutput) => {
    let addedCount = 0;
    const newRecords: Omit<PersonalRecord, 'id'>[] = [];

    const existingRecordKeys = new Set((allRecords || []).map(r => `${r.exerciseName.trim().toLowerCase()}|${format(r.date, 'yyyy-MM-dd')}`));

    parsedData.records.forEach(rec => {
        const key = `${rec.exerciseName.trim().toLowerCase()}|${rec.dateString}`;
        if (!existingRecordKeys.has(key)) {
            const newRecord: Omit<PersonalRecord, 'id'> = {
                exerciseName: rec.exerciseName,
                weight: rec.weight,
                weightUnit: rec.weightUnit,
                date: new Date(rec.dateString.replace(/-/g, '/')),
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
    }
  };

  const performClearRecords = async () => {
    if (!allRecords || allRecords.length === 0) return;
    try {
        const batch = writeBatch(db);
        allRecords.forEach(record => {
            const docRef = doc(db, 'personalRecords', record.id);
            batch.delete(docRef);
        });
        await batch.commit();
        queryClient.invalidateQueries({ queryKey: ['prs'] });
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

    const date = new Date(editedDate.replace(/-/g, '/'));
    if (isNaN(date.getTime())) {
        toast({ title: 'Invalid Date', description: 'Please enter a valid date.', variant: 'destructive' });
        return;
    }

    updateRecordMutation.mutate(
        { id: recordId, data: { weight, date } },
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

  return (
    <div className="container mx-auto px-4 py-8 space-y-8">
      <header className="mb-4">
        <h1 className="font-headline text-3xl font-bold text-primary flex items-center">
          <Award className="mr-3 h-8 w-8" /> Milestones & Achievements
        </h1>
        <p className="text-muted-foreground">A showcase of your best lifts and completed goals, with strength level classifications.</p>
      </header>

       <Card className="shadow-lg">
        <CardHeader>
          <CardTitle className="font-headline flex items-center gap-2">
            <UploadCloud className="h-6 w-6 text-accent" />
            Upload Personal Records
          </CardTitle>
          <CardDescription>
            Upload a screenshot of your achievements to update your PR history.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <PrUploaderForm onParse={parsePersonalRecordsAction} onParsedData={handleParsedData} />
          {allRecords && allRecords.length > 0 && (
              <Button
                variant="destructive"
                className="w-full mt-4"
                onClick={performClearRecords}
              >
                <Trash2 className="mr-2 h-4 w-4" /> Clear All Records
              </Button>
          )}
        </CardContent>
      </Card>
      
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
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center items-center h-40">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : bestRecords.length > 0 ? (
             <div className="space-y-8">
                {categoryOrder.map(category => (
                  groupedRecords[category] && groupedRecords[category].length > 0 && (
                    <div key={category}>
                        <h3 className="text-xl font-headline font-semibold mb-4 text-primary border-b pb-2">{category}</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 pt-2">
                            {groupedRecords[category].map(record => {
                                const isEditing = editingRecordId === record.id;
                                const level = userProfile ? getStrengthLevel(record, userProfile) : 'N/A';
                                const thresholds = userProfile ? getStrengthThresholds(record.exerciseName, userProfile, record.weightUnit) : null;
                                const standardType = getStrengthStandardType(record.exerciseName);
                                const isTricepsExercise = ['tricep extension', 'tricep pushdown', 'triceps'].includes(record.exerciseName.trim().toLowerCase());

                                let progressData: { value: number; text?: string; } | null = null;
                                if (level !== 'N/A' && level !== 'Elite' && thresholds) {
                                  const levelOrder: StrengthLevel[] = ['Beginner', 'Intermediate', 'Advanced', 'Elite'];
                                  const currentLevelIndex = levelOrder.indexOf(level);
                                  const nextLevel = levelOrder[currentLevelIndex + 1];
                                  
                                  const currentThreshold = level === 'Beginner' ? 0 : thresholds[level.toLowerCase() as keyof typeof thresholds];
                                  const nextThreshold = thresholds[nextLevel.toLowerCase() as keyof typeof thresholds];
                                  
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
                                                            {level !== 'N/A' ? (
                                                                <Badge variant={levelToBadgeVariant(level)}>{level}</Badge>
                                                            ) : (
                                                                <TooltipProvider>
                                                                    <Tooltip>
                                                                        <TooltipTrigger>
                                                                            <Info className="h-4 w-4 text-muted-foreground cursor-help" />
                                                                        </TooltipTrigger>
                                                                        <TooltipContent>
                                                                            <p>Set SMM & gender in profile to classify.</p>
                                                                        </TooltipContent>
                                                                    </Tooltip>
                                                                </TooltipProvider>
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
                                              {progressData && (
                                                <div className="space-y-1.5">
                                                    <Progress value={progressData.value} className="h-2 [&>div]:bg-accent" />
                                                    {progressData.text && (
                                                        <p className="text-xs font-medium text-center text-accent">{progressData.text}</p>
                                                    )}
                                                </div>
                                              )}
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
                    No personal records logged yet. Upload a screenshot to get started!
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
                            {goal.targetDate && <p className="text-xs text-muted-foreground">Target Date: {format(goal.targetDate, "MMM d, yyyy")}</p>}
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
