import { useMemo, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Trophy, Trash2, Loader2 } from "lucide-react";
import type { ExerciseCategory, PersonalRecord, UserProfile } from "@/lib/types";
import { ErrorState } from "@/components/shared/ErrorState";
import { CATEGORY_ORDER } from "@/lib/constants";
import { PrCategorySection } from "@/components/prs/PrCategorySection";
import { usePrEdit } from "@/hooks/usePrEdit";
import { getBestRecords, groupRecordsByCategory } from "@/app/prs/pr-utils";
import { Button } from "@/components/ui/button";
import { useRecordUpdate } from "@/hooks/useRecordUpdate";
import { useClearRecords } from "@/hooks/useClearRecords";
import { useExercises } from "@/lib/firestore.service";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

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
  const [showClearDialog, setShowClearDialog] = useState(false);
  const { data: exerciseLibrary = [] } = useExercises();
  const { editState, isEditing, startEdit, cancelEdit, updateWeight, updateDate } = usePrEdit();
  const { handleSaveEdit, isPending: isUpdating } = useRecordUpdate(userId, editState, { onSuccess: cancelEdit });
  const { handleClear, isPending: isClearing } = useClearRecords(userId);

  const normalizeForLookup = (value: string) =>
    value
      .trim()
      .toLowerCase()
      .replace(/^egym\s+/, '')
      .replace(/[()]/g, '')
      .replace(/\s+/g, ' ');

  const categoryByExercise = useMemo(() => {
    return exerciseLibrary.reduce<Record<string, ExerciseCategory>>((acc, exercise) => {
      acc[exercise.normalizedName.toLowerCase()] = exercise.category;
      return acc;
    }, {});
  }, [exerciseLibrary]);

  const bestRecords = useMemo(() => getBestRecords(allRecords || [], exerciseLibrary), [allRecords, exerciseLibrary]);
  const categorizedRecords = useMemo(() => {
    return bestRecords.map(record => {
      const normalizedName = normalizeForLookup(record.exerciseName);
      const category = categoryByExercise[normalizedName] || record.category;
      if (category === record.category) {
        return record;
      }
      return { ...record, category };
    });
  }, [bestRecords, categoryByExercise]);
  const groupedRecords = useMemo(() => groupRecordsByCategory(categorizedRecords), [categorizedRecords]);
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
        {recordCount > 0 && (
          <div className="pt-6 mt-6 border-t">
            <AlertDialog open={showClearDialog} onOpenChange={setShowClearDialog}>
              <AlertDialogTrigger asChild>
                <Button
                  variant="destructive"
                  size="sm"
                  className="w-full"
                  disabled={isClearing}
                >
                  {isClearing ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Trash2 className="mr-2 h-4 w-4" />
                  )}
                  Clear All Records
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This will permanently delete all {recordCount} of your personal records. This action cannot be undone.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <div className="flex gap-2 justify-end">
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={() => {
                      handleClear(recordCount);
                      setShowClearDialog(false);
                    }}
                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  >
                    Delete All
                  </AlertDialogAction>
                </div>
              </AlertDialogContent>
            </AlertDialog>
            <p className="mt-2 text-xs text-muted-foreground">This action cannot be undone.</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
