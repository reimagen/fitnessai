import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

type PlanFeedbackSectionProps = {
  value: string;
  onChange: (value: string) => void;
  charLimit: number;
  disabled?: boolean;
};

export function PlanFeedbackSection({ value, onChange, charLimit, disabled = false }: PlanFeedbackSectionProps) {
  return (
    <div className="space-y-2">
      <Label htmlFor="regeneration-feedback">
        Not quite right? Tell AI what to change for this week&apos;s plan. Note: long-term preferences should be stored in your
        profile.
      </Label>
      <Textarea
        id="regeneration-feedback"
        placeholder="e.g., 'Twisted my ankle last week, need to take it easy' or 'Can you add more cardio this week?'"
        value={value}
        onChange={event => onChange(event.target.value)}
        className="min-h-[80px]"
        disabled={disabled}
        maxLength={charLimit}
      />
      <p
        className={cn(
          "text-xs text-right",
          value.length > charLimit ? "text-destructive" : "text-muted-foreground"
        )}
      >
        {value.length} / {charLimit}
      </p>
    </div>
  );
}
