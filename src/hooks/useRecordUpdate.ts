import { startOfDay } from "date-fns";
import { useToast } from "@/hooks/useToast";
import { useUpdatePersonalRecord } from "@/lib/firestore.service";
import type { EditState } from "@/hooks/usePrEdit";

type UseRecordUpdateOptions = {
  onSuccess?: () => void;
};

export function useRecordUpdate(userId: string, editState: EditState, options?: UseRecordUpdateOptions) {
  const { toast } = useToast();
  const updateRecordMutation = useUpdatePersonalRecord();

  const handleSaveEdit = (recordId: string) => {
    const weight = editState.weight;
    if (isNaN(weight) || weight <= 0) {
      toast({
        title: "Invalid Weight",
        description: "Please enter a valid positive number for weight.",
        variant: "destructive",
      });
      return;
    }

    const date = new Date(editState.date.replace(/-/g, "/"));
    if (isNaN(date.getTime())) {
      toast({ title: "Invalid Date", description: "Please enter a valid date.", variant: "destructive" });
      return;
    }

    updateRecordMutation.mutate(
      { userId, id: recordId, data: { weight, date: startOfDay(date) } },
      {
        onSuccess: () => {
          toast({ title: "PR Updated!", description: "Your personal record has been successfully updated." });
          options?.onSuccess?.();
        },
        onError: error => {
          toast({ title: "Update Failed", description: error.message, variant: "destructive" });
        },
      }
    );
  };

  return {
    handleSaveEdit,
    isPending: updateRecordMutation.isPending,
  };
}
