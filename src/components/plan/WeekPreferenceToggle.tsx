import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import type { PlanWeekPreference } from "@/hooks/usePlanGeneration";

type WeekPreferenceToggleProps = {
  planWeekPreference: PlanWeekPreference;
  onChange: (value: PlanWeekPreference) => void;
  currentWeekStartDate: string;
  disabled?: boolean;
};

export function WeekPreferenceToggle({
  planWeekPreference,
  onChange,
  currentWeekStartDate,
  disabled = false,
}: WeekPreferenceToggleProps) {
  return (
    <div className="space-y-2">
      <Label htmlFor="plan-week-preference">Select Plan Week</Label>
      <p className="text-sm text-muted-foreground" suppressHydrationWarning>
        {`This will generate a plan for the week starting Sunday, ${format(
          new Date(currentWeekStartDate.replace(/-/g, "/")),
          "MMMM d, yyyy"
        )}.`}
      </p>
      <div className="flex flex-wrap gap-2">
        <Button
          id="plan-week-preference"
          type="button"
          variant={planWeekPreference === "current" ? "default" : "outline"}
          onClick={() => onChange("current")}
          disabled={disabled}
        >
          This week
        </Button>
        <Button
          type="button"
          variant={planWeekPreference === "next" ? "default" : "outline"}
          onClick={() => onChange("next")}
          disabled={disabled}
        >
          Next week
        </Button>
      </div>
    </div>
  );
}
