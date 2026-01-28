"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import MarkdownRenderer from "@/components/shared/MarkdownRenderer";
import type { StoredWeeklyPlan } from "@/lib/types";
import { format } from "date-fns";

type GeneratedPlanSectionProps = {
  generatedPlan: StoredWeeklyPlan;
};

export function GeneratedPlanSection({ generatedPlan }: GeneratedPlanSectionProps) {
  return (
    <Card className="shadow-lg">
      <CardHeader>
        <CardTitle className="font-headline text-primary">Current Weekly Plan</CardTitle>
        <CardDescription>
          Generated on: {format(generatedPlan.generatedDate, "MMMM d, yyyy 'at' h:mm a")} for week starting{" "}
          {format(new Date(generatedPlan.weekStartDate.replace(/-/g, "/")), "MMMM d, yyyy")}.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="prose prose-sm max-w-none dark:prose-invert">
          <MarkdownRenderer text={generatedPlan.plan} />
        </div>
        <div className="mt-6 pt-6 border-t text-sm text-muted-foreground space-y-4">
          <p>
            <strong className="font-semibold text-foreground">A General Safety Reminder:</strong> Always prioritize proper form
            over lifting heavy weights. If you experience any pain, stop the exercise and consult a healthcare professional.
          </p>
          <p>
            <strong className="font-semibold text-foreground">A Note on Weights:</strong> Suggested weights for exercises with a
            logged Personal Record (PR) are calculated at 75% of your PR. For other exercises, weights are estimated based on
            your general profile. Keep your PRs updated for the most accurate recommendations.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
