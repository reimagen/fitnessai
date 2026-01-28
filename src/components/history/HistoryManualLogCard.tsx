import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Edit, X } from "lucide-react";
import { WorkoutLogForm } from "@/components/history/WorkoutLogForm";
import type { WorkoutLog } from "@/lib/types";

type HistoryManualLogCardProps = {
  isOpen: boolean;
  editingLogId: string | null;
  logBeingEdited: WorkoutLog | undefined;
  isSubmitting: boolean;
  onClose: () => void;
  onSubmitLog: (data: Omit<WorkoutLog, "id" | "userId">) => void;
  onCancelEdit: () => void;
};

export function HistoryManualLogCard({
  isOpen,
  editingLogId,
  logBeingEdited,
  isSubmitting,
  onClose,
  onSubmitLog,
  onCancelEdit,
}: HistoryManualLogCardProps) {
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
          <Edit className="h-6 w-6 text-primary" />
          {editingLogId ? "Edit Workout Log" : "Log New Workout"}
        </CardTitle>
        <CardDescription>
          {editingLogId ? "Update the details of your workout session." : "Manually enter the details of your workout session."}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <WorkoutLogForm
          onSubmitLog={onSubmitLog}
          initialData={logBeingEdited}
          editingLogId={editingLogId}
          onCancelEdit={onCancelEdit}
          isSubmitting={isSubmitting}
        />
      </CardContent>
    </Card>
  );
}
