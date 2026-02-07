"use client";

import { Target } from "lucide-react";
import Link from "next/link";
import { format } from "date-fns";
import { getLapsedGoals, sortGoalsByUrgency } from "./goal-utils";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useGoals } from "@/lib/firestore.service";

export function LapsedGoalBanner() {
  const { data: goals = [] } = useGoals();
  const lapsedGoals = getLapsedGoals(goals);

  // Don't render if no lapsed goals
  if (lapsedGoals.length === 0) {
    return null;
  }

  const sortedLapsed = sortGoalsByUrgency(lapsedGoals);
  const displayGoals = sortedLapsed.slice(0, 2);
  const remainingCount = sortedLapsed.length - 2;
  const hasMultiple = lapsedGoals.length > 1;

  return (
    <Card className="border-primary/20 shadow-lg">
      <CardHeader>
        <CardTitle className="font-headline flex items-center gap-2">
          <Target className="h-5 w-5 text-primary" />
          {hasMultiple ? "Goals Need Attention" : "Goal Deadline Passed"}
        </CardTitle>
        <CardDescription>
          {hasMultiple
            ? `${lapsedGoals.length} of your fitness goals have passed their target dates.`
            : "Your fitness goal has passed its target date."}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-3 mb-4">
          {displayGoals.map((goal) => (
            <div key={goal.id} className="flex items-start gap-2">
              <div className="w-2 h-2 rounded-full bg-primary mt-1.5 flex-shrink-0" />
              <div className="min-w-0 flex-1">
                <p className="font-medium text-foreground">{goal.description}</p>
                {goal.targetDate && (
                  <p className="text-sm text-muted-foreground">
                    Due: {format(new Date(goal.targetDate), "MMM d, yyyy")}
                  </p>
                )}
              </div>
            </div>
          ))}
          {remainingCount > 0 && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <div className="w-2 h-2 rounded-full bg-primary/50" />
              <p>and {remainingCount} more {remainingCount === 1 ? "goal" : "goals"}</p>
            </div>
          )}
        </div>
        <Link
          href="/profile#goals"
          className="inline-flex items-center text-sm font-medium text-primary hover:text-primary/80 transition-colors"
        >
          Update Goals →
        </Link>
      </CardContent>
    </Card>
  );
}
