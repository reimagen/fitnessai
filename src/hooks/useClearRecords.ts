import { useToast } from "@/hooks/useToast";
import { useClearAllPersonalRecords } from "@/lib/firestore.service";

export function useClearRecords(userId: string) {
  const { toast } = useToast();
  const clearAllRecordsMutation = useClearAllPersonalRecords();

  const handleClear = (recordCount: number) => {
    if (recordCount <= 0) return;

    clearAllRecordsMutation.mutate(userId, {
      onSuccess: () => {
        toast({
          title: "Records Cleared",
          description: "All personal records have been removed.",
          variant: "destructive",
        });
      },
      onError: error => {
        toast({
          title: "Clear Failed",
          description: `Could not clear records: ${error.message}`,
          variant: "destructive",
        });
      },
    });
  };

  return {
    handleClear,
    isPending: clearAllRecordsMutation.isPending,
  };
}
