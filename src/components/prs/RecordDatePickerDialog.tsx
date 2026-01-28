import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { ParsePersonalRecordsOutput } from "@/ai/flows/personal-record-parser";

type ParsedRecord = ParsePersonalRecordsOutput["records"][number];

type RecordDatePickerDialogProps = {
  isOpen: boolean;
  onClose: () => void;
  records: ParsedRecord[];
  selectedDate: string;
  onDateChange: (value: string) => void;
  onConfirm: () => void;
  isSaving?: boolean;
};

export function RecordDatePickerDialog({
  isOpen,
  onClose,
  records,
  selectedDate,
  onDateChange,
  onConfirm,
  isSaving = false,
}: RecordDatePickerDialogProps) {
  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[520px]">
        <DialogHeader>
          <DialogTitle>Confirm PR Date</DialogTitle>
          <DialogDescription>
            These records were tagged as &quot;Today&quot; in the screenshot. Please choose the correct date to save them.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label htmlFor="pr-confirm-date" className="font-semibold">PR Date</Label>
            <Input
              id="pr-confirm-date"
              type="date"
              value={selectedDate}
              onChange={(event) => onDateChange(event.target.value)}
              className="mt-1"
              disabled={isSaving}
            />
          </div>
          <div>
            <p className="text-sm font-semibold mb-2">Records needing a date ({records.length}):</p>
            <ul className="space-y-1 text-xs text-muted-foreground max-h-40 overflow-y-auto pr-2">
              {records.map((record, index) => (
                <li key={`${record.exerciseName}-${index}`} className="truncate">
                  <strong>{record.exerciseName}</strong> {record.weight}{record.weightUnit}
                </li>
              ))}
            </ul>
          </div>
        </div>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={onClose} disabled={isSaving}>
            Cancel
          </Button>
          <Button type="button" onClick={onConfirm} disabled={!selectedDate || isSaving}>
            Save Records
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
