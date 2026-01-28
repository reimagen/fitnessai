import { Info } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import type { PersonalRecord, StrengthLevel, UserProfile } from "@/lib/types";
import { getStrengthStandardType, getStrengthThresholds } from "@/lib/strength-standards";

type PrProgressProps = {
  record: PersonalRecord;
  userProfile: UserProfile | undefined;
  level: StrengthLevel;
};

export function PrProgress({ record, userProfile, level }: PrProgressProps) {
  const standardType = getStrengthStandardType(record.exerciseName);
  const isSmmExercise = standardType === "smm";
  const needsSmmData = isSmmExercise && (!userProfile?.skeletalMuscleMassValue || !userProfile.gender);
  const thresholds = userProfile && !needsSmmData ? getStrengthThresholds(record.exerciseName, userProfile, record.weightUnit) : null;
  const isTricepsExercise = ["tricep extension", "tricep pushdown", "triceps"].includes(
    record.exerciseName.trim().toLowerCase()
  );

  let progressData: { value: number; text?: string } | null = null;
  if (level !== "N/A" && level !== "Elite" && thresholds) {
    const levelOrder: StrengthLevel[] = ["Beginner", "Intermediate", "Advanced", "Elite"];
    const currentLevelIndex = levelOrder.indexOf(level);
    const nextLevel = levelOrder[currentLevelIndex + 1];

    const currentThreshold = level === "Beginner" ? 0 : thresholds[level.toLowerCase() as keyof typeof thresholds];
    const nextThreshold = thresholds[nextLevel.toLowerCase() as keyof typeof thresholds];

    if (record.weight < nextThreshold) {
      const range = nextThreshold - currentThreshold;
      const progress = record.weight - currentThreshold;
      const percentage = range > 0 ? (progress / range) * 100 : 0;

      progressData = { value: percentage };

      if (record.weight >= nextThreshold * 0.9) {
        const weightToGo = nextThreshold - record.weight;
        progressData.text = `Only ${weightToGo} ${record.weightUnit} to ${nextLevel}!`;
      }
    }
  }

  return (
    <>
      <div className="flex-grow my-3">
        {needsSmmData ? (
          <div className="p-2 my-2 text-center text-xs text-muted-foreground bg-background/50 border rounded-md">
            <Info className="h-4 w-4 mx-auto mb-1" />
            <p>This exercise requires your Skeletal Muscle Mass to classify your strength level. Please update your profile.</p>
          </div>
        ) : progressData ? (
          <div className="space-y-1.5">
            <Progress value={progressData.value} className="h-2 [&>div]:bg-accent" />
            {progressData.text && <p className="text-xs font-medium text-center text-accent">{progressData.text}</p>}
          </div>
        ) : null}
      </div>

      {thresholds && level !== "N/A" && (
        <div className="mt-auto pt-3 border-t border-muted/20 text-xs space-y-1">
          {level !== "Elite" && level !== "Advanced" && (
            <div className="flex justify-between items-center">
              <span className="font-medium text-muted-foreground">Intermediate</span>
              <span className="font-semibold text-foreground">
                {thresholds.intermediate} {record.weightUnit}
              </span>
            </div>
          )}
          {level !== "Elite" && (
            <div className="flex justify-between items-center">
              <span className="font-medium text-muted-foreground">Advanced</span>
              <span className="font-semibold text-foreground">
                {thresholds.advanced} {record.weightUnit}
              </span>
            </div>
          )}
          <div className="flex justify-between items-center">
            <span className="font-medium text-muted-foreground">Elite</span>
            <span className="font-semibold text-foreground">
              {thresholds.elite} {record.weightUnit}
            </span>
          </div>
          {standardType && (
            <div className="text-center text-muted-foreground/80 text-[10px] pt-2">
              <p className="uppercase tracking-wider">
                Based on {standardType === "smm" ? "Skeletal Muscle Mass" : "Bodyweight"}
              </p>
              {isTricepsExercise && <p className="normal-case italic tracking-normal">*Machine is Seated Dip</p>}
            </div>
          )}
        </div>
      )}
    </>
  );
}
