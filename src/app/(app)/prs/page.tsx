
"use client";

import { useState, useEffect, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Award, Trophy, UploadCloud, Trash2, Flag, CheckCircle, Milestone, Loader2 } from "lucide-react";
import type { PersonalRecord, ExerciseCategory, UserProfile, FitnessGoal } from "@/lib/types";
import { PrUploaderForm } from "@/components/prs/pr-uploader-form";
import { parsePersonalRecordsAction } from "./actions";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import type { ParsePersonalRecordsOutput } from "@/ai/flows/personal-record-parser";
import { Button } from "@/components/ui/button";
import { usePersonalRecords, useUserProfile, useAddPersonalRecords } from "@/lib/firestore.service";
import { writeBatch, collection, doc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useQueryClient } from "@tanstack/react-query";

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

  const { data: allRecords, isLoading: isLoadingPrs } = usePersonalRecords();
  const { data: userProfile } = useUserProfile();
  const addPersonalRecordsMutation = useAddPersonalRecords();

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

  const groupedRecords = bestRecords.reduce((acc, record) => {
    const category = record.category || 'Other';
    if (!acc[category]) {
      acc[category] = [];
    }
    acc[category].push(record);
    return acc;
  }, {} as Record<string, PersonalRecord[]>);

  const categoryOrder: ExerciseCategory[] = ['Upper Body', 'Lower Body', 'Core', 'Full Body', 'Cardio', 'Other'];

  return (
    <div className="container mx-auto px-4 py-8 space-y-8">
      <header className="mb-4">
        <h1 className="font-headline text-3xl font-bold text-primary flex items-center">
          <Award className="mr-3 h-8 w-8" /> Milestones & Achievements
        </h1>
        <p className="text-muted-foreground">A showcase of your best lifts and completed goals.</p>
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
            Your top recorded lift for each exercise, grouped by category.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoadingPrs ? (
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
                            {groupedRecords[category].map(record => (
                                <Card key={record.id} className="bg-secondary/50 flex flex-col justify-between p-4">
                                    <div>
                                        <p className="font-bold text-lg text-primary capitalize">{record.exerciseName}</p>
                                        <p className="text-2xl font-black text-accent">{record.weight} <span className="text-lg font-bold text-muted-foreground">{record.weightUnit}</span></p>
                                    </div>
                                    <p className="text-xs text-muted-foreground mt-2">Achieved on: {format(record.date, "MMM d, yyyy")}</p>
                                </Card>
                            ))}
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
            <Milestone className="h-6 w-6 text-primary"/>
            Key Milestones
          </CardTitle>
          <CardDescription>
            Automatic recognition of your major achievements.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center h-40 text-center">
            <Milestone className="h-16 w-16 text-primary/30 mb-4" />
            <p className="text-muted-foreground">Coming Soon!</p>
            <p className="text-xs text-center mt-1">This feature is under development.</p>
          </div>
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
