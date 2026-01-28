import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Edit, ImageUp } from "lucide-react";

type HistoryFormSelectorProps = {
  onSelect: (value: "manual" | "parse") => void;
};

export function HistoryFormSelector({ onSelect }: HistoryFormSelectorProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      <Card className="shadow-lg hover:shadow-xl transition-shadow cursor-pointer" onClick={() => onSelect("manual")}>
        <CardHeader>
          <CardTitle className="font-headline flex items-center gap-2">
            <Edit className="h-6 w-6 text-primary" />
            Log Workout Manually
          </CardTitle>
          <CardDescription>Enter your workout details.</CardDescription>
        </CardHeader>
      </Card>
      <Card className="shadow-lg hover:shadow-xl transition-shadow cursor-pointer" onClick={() => onSelect("parse")}>
        <CardHeader>
          <CardTitle className="font-headline flex items-center gap-2">
            <ImageUp className="h-6 w-6 text-primary" />
            Upload Screenshot
          </CardTitle>
          <CardDescription>Upload an image of your workout log and let AI extract the data.</CardDescription>
        </CardHeader>
      </Card>
    </div>
  );
}
