import { format } from "date-fns";
import { Edit2, Check, X, Loader2 } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { StepperInput } from "@/components/ui/stepper-input";
import type { PersonalRecord, UserProfile } from "@/lib/types";
import { StrengthLevelBadge } from "@/components/prs/StrengthLevelBadge";
import { PrProgress } from "@/components/prs/PrProgress";

type PrCardProps = {
  record: PersonalRecord;
  userProfile: UserProfile | undefined;
  isEditing: boolean;
  editedWeight: number;
  editedDate: string;
  onEditClick: (record: PersonalRecord) => void;
  onSaveEdit: (recordId: string) => void;
  onCancelEdit: () => void;
  onWeightChange: (value: number) => void;
  onDateChange: (value: string) => void;
  isUpdating: boolean;
};

export function PrCard({
  record,
  userProfile,
  isEditing,
  editedWeight,
  editedDate,
  onEditClick,
  onSaveEdit,
  onCancelEdit,
  onWeightChange,
  onDateChange,
  isUpdating,
}: PrCardProps) {
  const level = record.strengthLevel || "N/A";

  return (
    <Card className="bg-secondary/50 flex flex-col justify-between p-4 transition-all hover:-translate-y-0.5 hover:bg-secondary/70 hover:shadow-xl hover:shadow-primary/15">
      {isEditing ? (
        <div className="flex flex-col gap-2 h-full">
          <p className="font-bold text-lg text-primary capitalize">{record.exerciseName}</p>
          <div className="flex items-center gap-2">
            <StepperInput
              value={editedWeight}
              onChange={onWeightChange}
              step={1}
              className="w-full"
              aria-label="Edit weight"
            />
            <span className="text-lg font-bold text-muted-foreground">{record.weightUnit}</span>
          </div>
          <Input type="date" value={editedDate} onChange={event => onDateChange(event.target.value)} aria-label="Edit date" />
          <div className="flex justify-end items-center gap-2 mt-auto pt-2">
            <Button variant="ghost" size="icon" onClick={onCancelEdit} aria-label="Cancel edit">
              <X className="h-4 w-4" />
            </Button>
            <Button size="icon" onClick={() => onSaveEdit(record.id)} aria-label="Save changes" disabled={isUpdating}>
              {isUpdating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
            </Button>
          </div>
        </div>
      ) : (
        <div className="flex flex-col h-full">
          <div>
            <div className="flex justify-between items-start">
              <div>
                <div className="flex items-center gap-2 flex-wrap mb-1">
                  <p className="font-bold text-lg text-primary capitalize">{record.exerciseName}</p>
                  <StrengthLevelBadge level={level} />
                </div>
                <p className="text-2xl font-black text-accent">
                  {record.weight} <span className="text-lg font-bold text-muted-foreground">{record.weightUnit}</span>
                </p>
              </div>
              <Button variant="ghost" size="icon" onClick={() => onEditClick(record)} aria-label={`Edit ${record.exerciseName} PR`}>
                <Edit2 className="h-4 w-4" />
              </Button>
            </div>
            <p className="text-xs text-muted-foreground mt-1">Achieved on: {format(record.date, "MMM d, yyyy")}</p>
          </div>

          <PrProgress record={record} userProfile={userProfile} level={level} />
        </div>
      )}
    </Card>
  );
}
