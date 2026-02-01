
"use client";

import { useState, type ChangeEvent, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { ParsePersonalRecordsOutput } from "@/ai/flows/personal-record-parser";
import { Loader2, UploadCloud, CheckCircle, RotateCcw } from "lucide-react";
import Image from "next/image";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { getNormalizedExerciseName } from "@/lib/strength-standards";
import { useAuth } from "@/lib/auth.service";
import { useToast } from "@/hooks/useToast";
import { useAddPersonalRecords } from "@/lib/firestore.service";
import { RecordDatePickerDialog } from "@/components/prs/RecordDatePickerDialog";

type PrUploaderFormProps = {
  onParse: (userId: string, data: { photoDataUri: string }) => Promise<{ success: boolean; data?: ParsePersonalRecordsOutput; error?: string }>;
};

type ParsedRecord = ParsePersonalRecordsOutput["records"][number];

export function PrUploaderForm({ onParse }: PrUploaderFormProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const addPersonalRecordsMutation = useAddPersonalRecords();
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [parsedResult, setParsedResult] = useState<ParsePersonalRecordsOutput | null>(null);
  const [recordsNeedingDate, setRecordsNeedingDate] = useState<ParsedRecord[]>([]);
  const [pendingRecords, setPendingRecords] = useState<ParsedRecord[]>([]);
  const [confirmDate, setConfirmDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [showDatePicker, setShowDatePicker] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const selectedFile = event.target.files?.[0];
    if (selectedFile) {
      // Clear previous state before setting the new file
      setParsedResult(null);
      setRecordsNeedingDate([]);
      setPendingRecords([]);
      setShowDatePicker(false);

      setFile(selectedFile);
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreviewUrl(reader.result as string);
      };
      reader.readAsDataURL(selectedFile);
    }
  };

  const handleSubmit = async () => {
    if (!file || !previewUrl || !user) {
      toast({ title: "Error", description: "Please select a file and ensure you are logged in.", variant: "destructive" });
      return;
    }
    setIsLoading(true);
    setParsedResult(null);
    setRecordsNeedingDate([]);
    setPendingRecords([]);
    setShowDatePicker(false);

    const result = await onParse(user.uid, { photoDataUri: previewUrl });

    if (result.success && result.data) {
        // Normalize exercise names before passing them on
        const normalizedData: ParsePersonalRecordsOutput = {
            records: result.data.records.map(rec => ({
                ...rec,
                exerciseName: getNormalizedExerciseName(rec.exerciseName),
            })),
        };
        setParsedResult(normalizedData);
        const missingDates = normalizedData.records.filter(rec => !rec.dateString);
        if (missingDates.length > 0) {
          setRecordsNeedingDate(missingDates);
          setPendingRecords(normalizedData.records);
          setShowDatePicker(true);
        } else {
          await saveParsedRecords(normalizedData.records);
        }
    } else {
      const isDailyLimit = result.error?.startsWith('DAILY_LIMIT_REACHED:');
      const errorMessage = isDailyLimit
        ? result.error?.replace('DAILY_LIMIT_REACHED: ', '')
        : result.error;
      toast({
        title: isDailyLimit ? "Daily Limit Reached" : "Parsing Error",
        description: errorMessage || "Unable to parse the screenshot. Please try again.",
        variant: "destructive"
      });
    }
    setIsLoading(false);
  };
  
  const saveParsedRecords = async (records: ParsedRecord[]) => {
    if (!user) return;
    const recordsToAdd = records.map(record => ({
      exerciseName: record.exerciseName,
      weight: record.weight,
      weightUnit: record.weightUnit,
      date: new Date(record.dateString!.replace(/-/g, "/")),
      category: record.category,
    }));

    addPersonalRecordsMutation.mutate(
      { userId: user.uid, records: recordsToAdd },
      {
        onSuccess: () => {
          toast({
            title: "PRs Saved!",
            description: `Saved ${recordsToAdd.length} personal records.`,
          });
        },
        onError: error => {
          toast({
            title: "Save Failed",
            description: `Could not save parsed PRs: ${error.message}`,
            variant: "destructive",
          });
        },
      }
    );
  };

  const handleConfirmDate = async () => {
    if (!confirmDate) return;
    const updatedRecords = pendingRecords.map(record => ({
      ...record,
      dateString: record.dateString || confirmDate,
    }));
    await saveParsedRecords(updatedRecords);
    setShowDatePicker(false);
  };

  const handleCancelDatePicker = () => {
    handleClear();
  };

  const handleClear = () => {
    setFile(null);
    setPreviewUrl(null);
    setParsedResult(null);
    setRecordsNeedingDate([]);
    setPendingRecords([]);
    setShowDatePicker(false);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  return (
    <div className="space-y-6">
      <div className={cn(isLoading && "opacity-50")}>
         <div className={cn(
            "flex h-10 w-full items-center rounded-md border border-primary bg-background pl-1 pr-3 py-1 text-sm",
            (isLoading) && "cursor-not-allowed opacity-70"
            )}>
          <Label
            htmlFor="pr-screenshot-upload"
            variant="file"
            className={cn(
                "whitespace-nowrap rounded-sm px-3 py-1.5 text-xs font-medium border border-primary text-primary bg-card hover:bg-primary/10 cursor-pointer shadow-sm",
                (isLoading) && "pointer-events-none"
                )}
          >
            Choose File
          </Label>
          <Input
            id="pr-screenshot-upload"
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onClick={(event) => { (event.target as HTMLInputElement).value = "" }}
            onChange={handleFileChange}
            className="sr-only"
            disabled={isLoading}
          />
          <span className="ml-3 text-muted-foreground truncate text-xs">
            {file ? file.name : "No file chosen"}
          </span>
        </div>
        <p className="mt-2 text-sm text-muted-foreground">
          Upload a screenshot of your personal records.
        </p>
      </div>

      {previewUrl && (
        <div className="mt-4">
          <p className="text-sm font-medium mb-2">Image Preview:</p>
          <div className="border border-primary rounded-md p-2 inline-block bg-muted/20 shadow-sm">
            <Image src={previewUrl} alt="PR Screenshot preview" width={300} height={200} className="rounded-md object-contain" data-ai-hint="mobile screen" />
          </div>
        </div>
      )}
      
      <Button
        onClick={handleSubmit}
        disabled={!file || isLoading || showDatePicker || addPersonalRecordsMutation.isPending}
        className="w-full bg-accent hover:bg-accent/90 text-accent-foreground"
      >
        {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <UploadCloud className="mr-2 h-4 w-4" />}
        Parse PRs
      </Button>

      {(file || parsedResult) && (
         <Button onClick={handleClear} variant="outline" className="w-full mt-2">
            <RotateCcw className="mr-2 h-4 w-4" />
            Clear and Reset
        </Button>
      )}

      {parsedResult && !showDatePicker && (
         <Card className="mt-4 border-green-500 bg-green-500/10">
          <CardHeader className="flex flex-row items-center gap-2 !pb-2">
            <CheckCircle className="h-5 w-5 text-green-600" />
            <CardTitle className="text-green-700 !text-base">Parsing Successful</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-green-700 mb-2">Found {parsedResult.records.length} records.</p>
            <ul className="space-y-1 text-xs text-muted-foreground max-h-40 overflow-y-auto pr-2">
              {parsedResult.records.map((rec, index) => (
                <li key={index} className="truncate">
                  <strong>{rec.exerciseName}:</strong> {rec.weight}{rec.weightUnit} on{" "}
                  {rec.dateString ? format(new Date(rec.dateString.replace(/-/g, "/")), "MMM d, yyyy") : "Date required"}
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      <RecordDatePickerDialog
        isOpen={showDatePicker}
        onClose={handleCancelDatePicker}
        records={recordsNeedingDate}
        selectedDate={confirmDate}
        onDateChange={setConfirmDate}
        onConfirm={handleConfirmDate}
        isSaving={addPersonalRecordsMutation.isPending}
      />
    </div>
  );
}
