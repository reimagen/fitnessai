import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ImageUp, X } from "lucide-react";
import { ScreenshotParserForm } from "@/components/history/ScreenshotParserForm";
import type { ParseWorkoutScreenshotOutput } from "@/ai/flows/screenshot-workout-parser";

type HistoryParserCardProps = {
  isOpen: boolean;
  onClose: () => void;
  onParse: (userId: string, data: { photoDataUri: string }) => Promise<{ success: boolean; data?: ParseWorkoutScreenshotOutput; error?: string }>;
  onParsedData: (parsedData: ParseWorkoutScreenshotOutput) => void;
};

export function HistoryParserCard({ isOpen, onClose, onParse, onParsedData }: HistoryParserCardProps) {
  if (!isOpen) return null;

  return (
    <Card className="shadow-lg">
      <CardHeader className="relative">
        <Button
          variant="ghost"
          size="icon"
          onClick={onClose}
          className="absolute top-4 right-4 text-muted-foreground hover:bg-secondary"
          aria-label="Close form"
        >
          <X className="h-5 w-5" />
        </Button>
        <CardTitle className="font-headline flex items-center gap-2">
          <ImageUp className="h-6 w-6 text-primary" />
          Parse Workout from Screenshot
        </CardTitle>
        <CardDescription>Upload an image of your workout log and let our AI extract the data.</CardDescription>
      </CardHeader>
      <CardContent>
        <ScreenshotParserForm onParse={onParse} onParsedData={onParsedData} />
      </CardContent>
    </Card>
  );
}
