
"use client";

import { useState, type ChangeEvent, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { ParseWorkoutScreenshotOutput } from "@/ai/flows/screenshot-workout-parser";
import { Loader2, UploadCloud, CheckCircle, XCircle, FileImage, RotateCcw } from "lucide-react";
import Image from "next/image";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

type ScreenshotParserFormProps = {
  onParse: (data: { photoDataUri: string }) => Promise<{ success: boolean; data?: ParseWorkoutScreenshotOutput; error?: string }>;
  onParsedData: (data: ParseWorkoutScreenshotOutput) => void;
};

export function ScreenshotParserForm({ onParse, onParsedData }: ScreenshotParserFormProps) {
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [parsedResult, setParsedResult] = useState<ParseWorkoutScreenshotOutput | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const selectedFile = event.target.files?.[0];
    if (selectedFile) {
      setFile(selectedFile);
      setError(null);
      setParsedResult(null); // Clear previous results when a new file is selected
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
    if (!file || !previewUrl) {
      setError("Please select a file to upload.");
      return;
    }
    setIsLoading(true);
    setError(null);
    setParsedResult(null);

    const result = await onParse({ photoDataUri: previewUrl });

    if (result.success && result.data) {
      setParsedResult(result.data);
      onParsedData(result.data);
    } else {
      setError(result.error || "Failed to parse screenshot.");
    }
    setIsLoading(false);
  };

  const handleClearScreenshot = () => {
    setFile(null);
    setPreviewUrl(null);
    setError(null);
    setParsedResult(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = ""; // Reset the file input
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <div
          className={cn(
            "flex h-10 w-full items-center rounded-md border border-primary bg-background pl-1 pr-3 py-1 text-sm",
            isLoading && "opacity-50 cursor-not-allowed"
          )}
        >
          <Label
            htmlFor="screenshot-upload"
            className={cn(
              "whitespace-nowrap rounded-sm px-3 py-1.5 text-xs font-medium border border-primary text-primary bg-card hover:bg-primary/10 cursor-pointer shadow-sm",
              isLoading && "pointer-events-none"
            )}
          >
            Choose File
          </Label>
          <Input
            id="screenshot-upload"
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleFileChange}
            className="hidden"
            disabled={isLoading}
          />
          <span className="ml-3 text-muted-foreground truncate text-xs">
            {file ? file.name : "No file chosen"}
          </span>
        </div>
        <p className="mt-2 text-sm text-muted-foreground">
          Upload an image of your workout log (e.g., from another app or a notepad).
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

      <Button onClick={handleSubmit} disabled={!file || isLoading} className="w-full bg-accent hover:bg-accent/90 text-accent-foreground">
        {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <UploadCloud className="mr-2 h-4 w-4" />}
        Parse Screenshot
      </Button>

      {(file || parsedResult || error) && (
         <Button onClick={handleClearScreenshot} variant="outline" className="w-full mt-2">
            <RotateCcw className="mr-2 h-4 w-4" /> Clear Screenshot
        </Button>
      )}


      {error && (
        <Card className="mt-4 border-destructive bg-destructive/10">
          <CardHeader className="flex flex-row items-center gap-2 !pb-2">
            <XCircle className="h-5 w-5 text-destructive" />
            <CardTitle className="text-destructive !text-base">Parsing Error</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-destructive text-sm">{error}</p>
          </CardContent>
        </Card>
      )}

      {parsedResult && (
         <Card className="mt-4 border-green-500 bg-green-500/10">
          <CardHeader className="flex flex-row items-center gap-2 !pb-2">
            <CheckCircle className="h-5 w-5 text-green-600" />
            <CardTitle className="text-green-700 !text-base">Parsing Successful</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-green-700 mb-2">
              Workout Date: {parsedResult.workoutDate ? new Date(parsedResult.workoutDate + 'T00:00:00').toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric'}) : "Not found"}
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
