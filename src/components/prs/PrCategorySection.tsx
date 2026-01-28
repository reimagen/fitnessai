import type { ExerciseCategory, PersonalRecord, UserProfile } from "@/lib/types";
import { PrCard } from "@/components/prs/PrCard";

type PrCategorySectionProps = {
  category: ExerciseCategory;
  records: PersonalRecord[];
  userProfile: UserProfile | undefined;
  isEditing: (id: string) => boolean;
  editedWeight: number;
  editedDate: string;
  onEditClick: (record: PersonalRecord) => void;
  onSaveEdit: (recordId: string) => void;
  onCancelEdit: () => void;
  onWeightChange: (value: number) => void;
  onDateChange: (value: string) => void;
  isUpdating: boolean;
};

export function PrCategorySection({
  category,
  records,
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
}: PrCategorySectionProps) {
  if (!records.length) return null;

  return (
    <div>
      <h3 className="text-xl font-headline font-semibold mb-4 text-primary border-b pb-2">{category}</h3>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 pt-2">
        {records.map(record => (
          <PrCard
            key={record.id}
            record={record}
            userProfile={userProfile}
            isEditing={isEditing(record.id)}
            editedWeight={editedWeight}
            editedDate={editedDate}
            onEditClick={onEditClick}
            onSaveEdit={onSaveEdit}
            onCancelEdit={onCancelEdit}
            onWeightChange={onWeightChange}
            onDateChange={onDateChange}
            isUpdating={isUpdating}
          />
        ))}
      </div>
    </div>
  );
}
