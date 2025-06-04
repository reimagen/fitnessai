
"use client";

import { useState, type ChangeEvent } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { ParseWorkoutScreenshotOutput } from "@/ai/flows/screenshot-workout-parser";
import { Loader2, UploadCloud, CheckCircle, XCircle } from "lucide-react";
import Image from "next/image";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

type ScreenshotParserFormProps = {
  onParse: (data: { photoDataUri: string }) => Promise<{ success: boolean; data?: ParseWorkoutScreenshotOutput; error?: string }>;
  onParsedData: (data: ParseWorkoutScreenshotOutput) => void; // Callback to pass parsed data to parent
};

export function ScreenshotParserForm({ onParse, onParsedData }: ScreenshotParserFormProps) {
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [parsedResult, setParsedResult] = useState<ParseWorkoutScreenshotOutput | null>(null);

  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const selectedFile = event.target.files?.[0];
    if (selectedFile) {
      setFile(selectedFile);
      setError(null);
      setParsedResult(null);
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
      onParsedData(result.data); // Pass data to parent
    } else {
      setError(result.error || "Failed to parse screenshot.");
    }
    setIsLoading(false);
  };

  return (
    <div className="space-y-6">
      <div>
        <Label htmlFor="screenshot-upload" className="text-base font-medium">Upload Workout Screenshot</Label>
        <Input
          id="screenshot-upload"
          type="file"
          accept="image/*"
          onChange={handleFileChange}
          className="mt-2"
          disabled={isLoading}
        />
        <p className="mt-1 text-sm text-muted-foreground">
          Upload an image of your workout log (e.g., from another app or a notepad).
        </p>
      </div>

      {previewUrl && (
        <div className="mt-4">
          <p className="text-sm font-medium mb-2">Image Preview:</p>
          <Image src={previewUrl} alt="Screenshot preview" width={300} height={200} className="rounded-md border object-contain" data-ai-hint="mobile screen" />
        </div>
      )}

      <Button onClick={handleSubmit} disabled={!file || isLoading} className="w-full bg-accent hover:bg-accent/90 text-accent-foreground">
        {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <UploadCloud className="mr-2 h-4 w-4" />}
        Parse Screenshot
      </Button>

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
            <p className="text-sm text-green-700 mb-2">Exercises found: {parsedResult.exercises.length}</p>
            <ul className="space-y-1 text-xs text-muted-foreground">
              {parsedResult.exercises.map((ex, index) => (
                <li key={index}>
                  <strong>{ex.name}:</strong> {ex.sets} sets, {ex.reps} reps @ {ex.weight}{ex.weightUnit || 'kg'}
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

