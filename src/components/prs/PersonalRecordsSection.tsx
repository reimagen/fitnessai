import { useMemo } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Trophy, Trash2, Loader2 } from "lucide-react";
import type { PersonalRecord, UserProfile } from "@/lib/types";
import { ErrorState } from "@/components/shared/ErrorState";
import { CATEGORY_ORDER } from "@/lib/constants";
import { PrCategorySection } from "@/components/prs/PrCategorySection";
import { usePrEdit } from "@/hooks/usePrEdit";
import { getBestRecords, groupRecordsByCategory } from "@/app/prs/pr-utils";
import { Button } from "@/components/ui/button";
import { useRecordUpdate } from "@/hooks/useRecordUpdate";
import { useClearRecords } from "@/hooks/useClearRecords";

type PersonalRecordsSectionProps = {
  userId: string;
  allRecords: PersonalRecord[] | undefined;
  userProfile: UserProfile | undefined;
  isLoading: boolean;
  isError: boolean;
};

export function PersonalRecordsSection({
  userId,
  allRecords,
  userProfile,
  isLoading,
  isError,
}: PersonalRecordsSectionProps) {
  const { editState, isEditing, startEdit, cancelEdit, updateWeight, updateDate } = usePrEdit();
  const { handleSaveEdit, isPending: isUpdating } = useRecordUpdate(userId, editState, { onSuccess: cancelEdit });
  const { handleClear, isPending: isClearing } = useClearRecords(userId);

  const bestRecords = useMemo(() => getBestRecords(allRecords || []), [allRecords]);
  const groupedRecords = useMemo(() => groupRecordsByCategory(bestRecords), [bestRecords]);
  const recordCount = allRecords?.length ?? 0;

  return (
    <Card className="shadow-lg">
      <CardHeader>
        <CardTitle className="font-headline flex items-center gap-2">
          <Trophy className="h-6 w-6 text-primary" />
          Personal Records
        </CardTitle>
        <CardDescription>
          Your top recorded lift (1RM) for each exercise. Levels are classified based on your personal stats.
          Body-weight based levels use ratios from strengthlevel.com. Otherwise, level calculations are based on
          your skeletal muscle mass.
        </CardDescription>
        {recordCount > 0 && (
          <Button
            variant="destructive"
            size="sm"
            className="w-full mt-4"
            onClick={() => handleClear(recordCount)}
            disabled={isClearing}
          >
            {isClearing ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Trash2 className="mr-2 h-4 w-4" />
            )}
            Clear All Records
          </Button>
        )}
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex justify-center items-center h-40">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : isError ? (
          <ErrorState message="Could not load your personal records. Please try again." />
        ) : bestRecords.length > 0 ? (
          <div className="space-y-8">
            {CATEGORY_ORDER.map(category =>
              groupedRecords[category] && groupedRecords[category].length > 0 ? (
                <PrCategorySection
                  key={category}
                  category={category}
                  records={groupedRecords[category]}
                  userProfile={userProfile}
                  isEditing={isEditing}
                  editedWeight={editState.weight}
                  editedDate={editState.date}
                  onEditClick={startEdit}
                  onSaveEdit={handleSaveEdit}
                  onCancelEdit={cancelEdit}
                  onWeightChange={updateWeight}
                  onDateChange={updateDate}
                  isUpdating={isUpdating}
                />
              ) : null
            )}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center h-40 text-center">
            <Trophy className="h-16 w-16 text-primary/30 mb-4" />
            <p className="text-muted-foreground">
              No personal records logged yet. Add a PR or upload a screenshot to get started!
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
