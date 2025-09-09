
"use client";

import { useState, type ChangeEvent, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { ParseWorkoutScreenshotOutput } from "@/ai/flows/screenshot-workout-parser";
import { Loader2, UploadCloud, CheckCircle, XCircle, RotateCcw } from "lucide-react";
import Image from "next/image";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { useAuth } from "@/lib/auth.service";
import { useToast } from "@/hooks/use-toast";

type ScreenshotParserFormProps = {
  onParse: (userId: string, data: { photoDataUri: string }) => Promise<{ success: boolean; data?: ParseWorkoutScreenshotOutput; error?: string }>;
  onParsedData: (data: ParseWorkoutScreenshotOutput) => void;
};

export function ScreenshotParserForm({ onParse, onParsedData }: ScreenshotParserFormProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [parsedResult, setParsedResult] = useState<ParseWorkoutScreenshotOutput | null>(null);
  const [needsDateConfirmation, setNeedsDateConfirmation] = useState(false);
  const [manualDate, setManualDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const selectedFile = event.target.files?.[0];
    if (selectedFile) {
      setParsedResult(null);
      setNeedsDateConfirmation(false);

      setFile(selectedFile);
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreviewUrl(reader.result as string);
      };
      reader.readAsDataURL(selectedFile);
    } else {
      setFile(null);
      setPreviewUrl(null);
    }
  };

  const handleSubmit = async () => {
    if (!file || !previewUrl || !user) {
      toast({ title: "Error", description: "Please select a file and ensure you are logged in.", variant: "destructive" });
      return;
    }
    setIsLoading(true);
    setParsedResult(null);

    const result = await onParse(user.uid, { photoDataUri: previewUrl });

    if (result.success && result.data) {
      if (result.data.workoutDate) {
        setParsedResult(result.data);
        onParsedData(result.data);
      } else {
        setParsedResult(result.data);
        setNeedsDateConfirmation(true);
      }
    } else {
      const isLimitError = result.error?.toLowerCase().includes('limit');
      toast({ 
        title: isLimitError ? "Daily Limit Reached" : "Parsing Error", 
        description: result.error, 
        variant: "destructive" 
      });
    }
    setIsLoading(false);
  };

  const handleConfirmAndSave = () => {
    if (!parsedResult || !manualDate) return;

    const dataWithManualDate = {
      ...parsedResult,
      workoutDate: manualDate,
    };

    onParsedData(dataWithManualDate);
    handleClearScreenshot();
  };

  const handleClearScreenshot = () => {
    setFile(null);
    setPreviewUrl(null);
    setParsedResult(null);
    setNeedsDateConfirmation(false);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  return (
    <div className="space-y-6">
      <div className={cn(isLoading && "opacity-50")}>
        <div
          className={cn(
            "flex h-10 w-full items-center rounded-md border border-primary bg-background pl-1 pr-3 py-1 text-sm",
            (isLoading || needsDateConfirmation) && "cursor-not-allowed opacity-70"
          )}
        >
          <Label
            htmlFor="screenshot-upload"
            variant="file"
            className={cn(
              "whitespace-nowrap rounded-sm px-3 py-1.5 text-xs font-medium border border-primary text-primary bg-card hover:bg-primary/10 cursor-pointer shadow-sm",
              (isLoading || needsDateConfirmation) && "pointer-events-none"
            )}
          >
            Choose File
          </Label>
          <Input
            id="screenshot-upload"
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onClick={(event) => { (event.target as HTMLInputElement).value = "" }}
            onChange={handleFileChange}
            className="hidden"
            disabled={isLoading || needsDateConfirmation}
          />
          <span className="ml-3 text-muted-foreground truncate text-xs">
            {file ? file.name : "No file chosen"}
          </span>
        </div>
        <p className="mt-2 text-sm text-muted-foreground">
          Upload a screenshot of your workout log. Try to get the date in view. For screenshots without a date, you will be asked to confirm a date. 
        </p>
      </div>

      {previewUrl && (
        <div className="mt-4">
          <p className="text-sm font-medium mb-2">Image Preview:</p>
          <div className="border border-primary rounded-md p-2 inline-block bg-muted/20 shadow-sm">
            <Image src={previewUrl} alt="Screenshot preview" width={300} height={200} className="rounded-md object-contain" data-ai-hint="mobile screen" />
          </div>
        </div>
      )}
      
      {!needsDateConfirmation && (
        <Button onClick={handleSubmit} disabled={!file || isLoading} className="w-full bg-accent hover:bg-accent/90 text-accent-foreground">
          {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <UploadCloud className="mr-2 h-4 w-4" />}
          Parse Screenshot
        </Button>
      )}

      {(file || parsedResult) && (
         <Button onClick={handleClearScreenshot} variant="outline" className="w-full mt-2">
            <RotateCcw className="mr-2 h-4 w-4" />
            {needsDateConfirmation ? "Cancel and Start Over" : "Clear and Reset"}
        </Button>
      )}

      {needsDateConfirmation && parsedResult && (
        <Card className="mt-4 border-primary bg-primary/10">
          <CardHeader>
            <CardTitle className="text-primary">Confirm Workout Date</CardTitle>
            <CardDescription>
              We couldn't find a date in the screenshot. Please select the correct date for this workout to merge it with your history.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="manual-date" className="font-semibold">Workout Date</Label>
              <Input
                id="manual-date"
                type="date"
                value={manualDate}
                onChange={(e) => setManualDate(e.target.value)}
                className="mt-1"
              />
            </div>
            <div>
              <p className="text-sm font-semibold mb-2">Parsed Exercises ({parsedResult.exercises.length} found):</p>
              <ul className="space-y-1 text-xs text-muted-foreground max-h-40 overflow-y-auto pr-2">
                {parsedResult.exercises.map((ex, index) => (
                  <li key={index} className="truncate">
                    <strong>{ex.name}</strong>
                    {ex.category && ` (${ex.category})`}
                    {ex.sets !== undefined && ex.sets > 0 ? ` ${ex.sets} sets` : ""}
                    {ex.reps !== undefined && ex.reps > 0 ? `, ${ex.reps} reps` : ""}
                    {ex.weight !== undefined && ex.weight > 0 ? ` @ ${ex.weight}${ex.weightUnit || 'kg'}` : ""}
                    {ex.distance !== undefined && ex.distance > 0 ? ` - ${ex.distance} ${ex.distanceUnit || ''}`.trim() : ""}
                    {ex.duration !== undefined && ex.duration > 0 ? ` - ${ex.duration} ${ex.durationUnit || ''}`.trim() : ""}
                    {ex.calories !== undefined && ex.calories > 0 ? ` - ${ex.calories} kcal` : ""}
                  </li>
                ))}
              </ul>
            </div>
            <Button onClick={handleConfirmAndSave} className="w-full">
              <CheckCircle className="mr-2 h-4 w-4" /> Confirm and Save Log
            </Button>
          </CardContent>
        </Card>
      )}

      {!needsDateConfirmation && parsedResult && (
         <Card className="mt-4 border-green-500 bg-green-500/10">
          <CardHeader className="flex flex-row items-center gap-2 !pb-2">
            <CheckCircle className="h-5 w-5 text-green-600" />
            <CardTitle className="text-green-700 !text-base">Parsing Successful</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-green-700 mb-2">
              Workout Date: {parsedResult.workoutDate ? new Date(parsedResult.workoutDate.replace(/-/g, '\/')).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric'}) : "Not found"}
            </p>
            <p className="text-sm text-green-700 mb-2">Exercises found: {parsedResult.exercises.length}</p>
            <ul className="space-y-1 text-xs text-muted-foreground">
              {parsedResult.exercises.map((ex, index) => (
                <li key={index} className="truncate">
                  <strong>{ex.name}</strong>
                  {ex.category && ` (${ex.category})`}
                  {ex.sets !== undefined && ex.sets > 0 ? ` ${ex.sets} sets` : ""}
                  {ex.reps !== undefined && ex.reps > 0 ? `, ${ex.reps} reps` : ""}
                  {ex.weight !== undefined && ex.weight > 0 ? ` @ ${ex.weight}${ex.weightUnit || 'kg'}` : ""}
                  {ex.distance !== undefined && ex.distance > 0 ? ` - ${ex.distance} ${ex.distanceUnit || ''}`.trim() : ""}
                  {ex.duration !== undefined && ex.duration > 0 ? ` - ${ex.duration} ${ex.durationUnit || ''}`.trim() : ""}
                  {ex.calories !== undefined && ex.calories > 0 ? ` - ${ex.calories} kcal` : ""}
                </li>
              ))}
            </ul>
            <p className="text-xs text-muted-foreground mt-2">This data has been added to your log below.</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
