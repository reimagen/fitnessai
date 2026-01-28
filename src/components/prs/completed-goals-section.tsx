import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { CheckCircle, Flag } from "lucide-react";
import { format } from "date-fns";
import type { FitnessGoal } from "@/lib/types";

type CompletedGoalsSectionProps = {
  completedGoals: FitnessGoal[];
};

export function CompletedGoalsSection({ completedGoals }: CompletedGoalsSectionProps) {
  return (
    <Card className="shadow-lg">
      <CardHeader>
        <CardTitle className="font-headline flex items-center gap-2">
          <Flag className="h-6 w-6 text-primary" />
          Completed Goals
        </CardTitle>
        <CardDescription>All the goals you&apos;ve set and conquered.</CardDescription>
      </CardHeader>
      <CardContent>
        {completedGoals.length > 0 ? (
          <div className="space-y-3">
            {completedGoals.map(goal => (
              <div key={goal.id} className="flex items-center justify-between p-3 rounded-md bg-secondary/50">
                <div className="flex flex-col">
                  <p className="font-semibold text-primary">{goal.description}</p>
                  <p className="text-xs text-muted-foreground">Target: {format(goal.targetDate, "MMM d, yyyy")}</p>
                  {goal.dateAchieved && (
                    <p className="text-xs text-muted-foreground">
                      Achieved on: {format(goal.dateAchieved, "MMM d, yyyy")}
                    </p>
                  )}
                </div>
                <div className="flex items-center gap-2 text-green-600">
                  <CheckCircle className="h-5 w-5" />
                  <span className="text-sm font-bold">Done!</span>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center h-40 text-center">
            <Flag className="h-16 w-16 text-primary/30 mb-4" />
            <p className="text-muted-foreground">No completed goals yet. Set and achieve goals on your profile!</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
