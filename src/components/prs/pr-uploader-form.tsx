
"use client";

import { useState, type ChangeEvent, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { ParsePersonalRecordsOutput } from "@/ai/flows/personal-record-parser";
import { Loader2, UploadCloud, CheckCircle, XCircle, RotateCcw } from "lucide-react";
import Image from "next/image";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { format, parseISO } from 'date-fns';

type PrUploaderFormProps = {
  onParse: (data: { photoDataUri: string }) => Promise<{ success: boolean; data?: ParsePersonalRecordsOutput; error?: string }>;
  onParsedData: (data: ParsePersonalRecordsOutput) => void;
};

export function PrUploaderForm({ onParse, onParsedData }: PrUploaderFormProps) {
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [parsedResult, setParsedResult] = useState<ParsePersonalRecordsOutput | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const selectedFile = event.target.files?.[0];
    if (selectedFile) {
      handleClear();
      setFile(selectedFile);
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreviewUrl(reader.result as string);
      };
      reader.readAsDataURL(selectedFile);
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
  
  const handleClear = () => {
    setFile(null);
    setPreviewUrl(null);
    setError(null);
    setParsedResult(null);
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
            onChange={handleFileChange}
            className="hidden"
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
      
      <Button onClick={handleSubmit} disabled={!file || isLoading} className="w-full bg-accent hover:bg-accent/90 text-accent-foreground">
        {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <UploadCloud className="mr-2 h-4 w-4" />}
        Parse PRs
      </Button>

      {(file || parsedResult || error) && (
         <Button onClick={handleClear} variant="outline" className="w-full mt-2">
            <RotateCcw className="mr-2 h-4 w-4" />
            Clear and Reset
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
            <p className="text-sm text-green-700 mb-2">Found {parsedResult.records.length} records. These have been added to your PR history below.</p>
            <ul className="space-y-1 text-xs text-muted-foreground max-h-40 overflow-y-auto pr-2">
              {parsedResult.records.map((rec, index) => (
                <li key={index} className="truncate">
                  <strong>{rec.exerciseName}:</strong> {rec.weight}{rec.weightUnit} on {format(new Date(rec.dateString.replace(/-/g, '/')), "MMM d, yyyy")}
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
