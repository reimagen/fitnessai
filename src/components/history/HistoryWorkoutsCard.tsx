import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, Loader2 } from "lucide-react";
import { WorkoutList } from "@/components/history/WorkoutList";
import { ErrorState } from "@/components/shared/ErrorState";
import type { WorkoutLog } from "@/lib/types";

type HistoryWorkoutsCardProps = {
  isLoading: boolean;
  isError: boolean;
  workoutLogs: WorkoutLog[];
  isCurrentMonthInView: boolean;
  onEdit: (logId: string) => void;
  onDelete: (logId: string) => void;
  onPreviousMonth: () => void;
  onNextMonth: () => void;
};

export function HistoryWorkoutsCard({
  isLoading,
  isError,
  workoutLogs,
  isCurrentMonthInView,
  onEdit,
  onDelete,
  onPreviousMonth,
  onNextMonth,
}: HistoryWorkoutsCardProps) {
  const renderWorkoutContent = () => {
    if (isLoading) {
      return (
        <div className="flex justify-center items-center h-40">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      );
    }

    if (isError) {
      return <ErrorState message="Could not load workout history. Please try refreshing." />;
    }

    return <WorkoutList workoutLogs={workoutLogs} onEdit={onEdit} onDelete={onDelete} />;
  };

  return (
    <Card className="shadow-lg">
      <CardHeader>
        <CardTitle className="font-headline">Logged Workouts</CardTitle>
        <div className="flex justify-between items-center">
          <CardDescription>Review your workout history by month.</CardDescription>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="icon" onClick={onPreviousMonth}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="icon" onClick={onNextMonth} disabled={isCurrentMonthInView}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>{renderWorkoutContent()}</CardContent>
    </Card>
  );
}
