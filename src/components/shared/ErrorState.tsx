import { AlertCircle } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

interface ErrorStateProps {
  message: string;
  details?: string;
}

export function ErrorState({ message, details }: ErrorStateProps) {
  return (
    <Card className="shadow-sm border-destructive bg-destructive/10">
      <CardContent className="pt-6">
        <div className="flex flex-col items-center justify-center text-center text-destructive">
          <AlertCircle className="h-10 w-10 mb-3" />
          <p className="font-semibold">{message}</p>
          {details && <p className="text-sm mt-1">{details}</p>}
        </div>
      </CardContent>
    </Card>
  );
}
