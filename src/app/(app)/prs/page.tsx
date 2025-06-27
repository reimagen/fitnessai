
"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Award, Trophy, UploadCloud } from "lucide-react";
import type { PersonalRecord } from "@/lib/types";
import { PrUploaderForm } from "@/components/prs/pr-uploader-form";
import { parsePersonalRecordsAction } from "./actions";
import { useToast } from "@/hooks/use-toast";
import { format, parseISO } from "date-fns";
import type { ParsePersonalRecordsOutput } from "@/ai/flows/personal-record-parser";

const LOCAL_STORAGE_KEY_PRS = "fitnessAppPersonalRecords";

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

export default function PRsPage() {
  const [allRecords, setAllRecords] = useState<PersonalRecord[]>([]);
  const [bestRecords, setBestRecords] = useState<PersonalRecord[]>([]);
  const [isClient, setIsClient] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    setIsClient(true);
  }, []);

  useEffect(() => {
    if (isClient) {
      const savedPrsString = localStorage.getItem(LOCAL_STORAGE_KEY_PRS);
      if (savedPrsString) {
        try {
          const parsedRecords: PersonalRecord[] = JSON.parse(savedPrsString).map((rec: any) => ({
            ...rec,
            date: parseISO(rec.date), // Rehydrate date object
          }));
          setAllRecords(parsedRecords);
        } catch (error) {
          console.error("Error parsing PRs from localStorage", error);
          setAllRecords([]);
        }
      }
    }
  }, [isClient]);

  useEffect(() => {
    if (isClient) {
      localStorage.setItem(LOCAL_STORAGE_KEY_PRS, JSON.stringify(allRecords));
      setBestRecords(getBestRecords(allRecords));
    }
  }, [allRecords, isClient]);

  const handleParsedData = (parsedData: ParsePersonalRecordsOutput) => {
    let addedCount = 0;
    const newRecords: PersonalRecord[] = [];

    const existingRecordKeys = new Set(allRecords.map(r => `${r.exerciseName.trim().toLowerCase()}|${r.dateString}`));

    parsedData.records.forEach(rec => {
        const key = `${rec.exerciseName.trim().toLowerCase()}|${rec.dateString}`;
        if (!existingRecordKeys.has(key)) {
            const newRecord: PersonalRecord = {
                id: `${rec.exerciseName}-${rec.dateString}-${Math.random()}`,
                exerciseName: rec.exerciseName,
                weight: rec.weight,
                weightUnit: rec.weightUnit,
                date: new Date(rec.dateString.replace(/-/g, '/')),
                dateString: rec.dateString,
            };
            newRecords.push(newRecord);
            existingRecordKeys.add(key); // Add to set to prevent duplicates within the same upload
            addedCount++;
        }
    });

    if (addedCount > 0) {
        setAllRecords(prev => [...prev, ...newRecords]);
        toast({
            title: "Records Updated",
            description: `Added ${addedCount} new personal record(s).`,
        });
    } else {
        toast({
            title: "No New Records",
            description: "The uploaded screenshot contained no new records.",
            variant: "default",
        });
    }
  };

  return (
    <div className="container mx-auto px-4 py-8 space-y-8">
      <header className="mb-4">
        <h1 className="font-headline text-3xl font-bold text-primary flex items-center">
          <Award className="mr-3 h-8 w-8" /> Personal Records
        </h1>
        <p className="text-muted-foreground">Your best lifts and achievements.</p>
      </header>

      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle className="font-headline flex items-center gap-2">
            <UploadCloud className="h-6 w-6 text-accent" />
            Upload New Records
          </CardTitle>
          <CardDescription>
            Upload a screenshot of your achievements to update your PR history.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <PrUploaderForm onParse={parsePersonalRecordsAction} onParsedData={handleParsedData} />
        </CardContent>
      </Card>
      
      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle className="font-headline flex items-center gap-2">
            <Trophy className="h-6 w-6 text-primary"/>
            Your Personal Bests
          </CardTitle>
          <CardDescription>
            Your top recorded lift for each exercise.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isClient && bestRecords.length > 0 ? (
             <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {bestRecords.map(record => (
                    <Card key={record.id} className="bg-secondary/50 flex flex-col justify-between p-4">
                        <div>
                            <p className="font-bold text-lg text-primary">{record.exerciseName}</p>
                            <p className="text-2xl font-black text-accent">{record.weight} <span className="text-lg font-bold text-muted-foreground">{record.weightUnit}</span></p>
                        </div>
                        <p className="text-xs text-muted-foreground mt-2">Achieved on: {format(record.date, "MMM d, yyyy")}</p>
                    </Card>
                ))}
            </div>
          ) : (
             <div className="flex flex-col items-center justify-center h-40 text-center">
                <Trophy className="h-16 w-16 text-primary/30 mb-4" />
                <p className="text-muted-foreground">
                    {isClient ? "No personal records logged yet. Upload a screenshot to get started!" : "Loading records..."}
                </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
