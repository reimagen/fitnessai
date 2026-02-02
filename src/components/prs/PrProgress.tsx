import { Info } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { useMemo } from "react";
import type { PersonalRecord, StrengthLevel, UserProfile } from "@/lib/types";
import { LBS_TO_KG } from "@/lib/constants";
import { useExercises } from "@/lib/firestore.service";
import { getStrengthStandardType, getStrengthThresholds } from "@/lib/strength-standards";

type PrProgressProps = {
  record: PersonalRecord;
  userProfile: UserProfile | undefined;
  level: StrengthLevel;
};

export function PrProgress({ record, userProfile, level }: PrProgressProps) {
  const { data: exerciseLibrary = [] } = useExercises();
  const normalizeForLookup = (value: string) =>
    value
      .trim()
      .toLowerCase()
      .replace(/^egym\s+/, "")
      .replace(/[()]/g, "")
      .replace(/\s+/g, " ");

  const exercise = useMemo(() => {
    const normalizedName = normalizeForLookup(record.exerciseName);
    return exerciseLibrary.find(
      item => item.normalizedName.toLowerCase() === normalizedName
    );
  }, [exerciseLibrary, record.exerciseName]);

  const standardType = exercise?.strengthStandards?.baseType || getStrengthStandardType(record.exerciseName);
  const isSmmExercise = standardType === "smm";
  const needsSmmData = isSmmExercise && (!userProfile?.skeletalMuscleMassValue || !userProfile.gender);

  const thresholds = useMemo(() => {
    if (!userProfile || needsSmmData) return null;
    if (exercise?.strengthStandards) {
      const standards = exercise.strengthStandards.standards;
      const genderKey = userProfile.gender as "Male" | "Female";
      const genderStandards = standards[genderKey];
      if (!genderStandards) return null;

      let baseValueInKg: number;
      if (exercise.strengthStandards.baseType === "bw") {
        if (!userProfile.weightValue || !userProfile.weightUnit) return null;
        baseValueInKg =
          userProfile.weightUnit === "lbs"
            ? userProfile.weightValue * LBS_TO_KG
            : userProfile.weightValue;
      } else {
        if (!userProfile.skeletalMuscleMassValue || !userProfile.skeletalMuscleMassUnit) return null;
        baseValueInKg =
          userProfile.skeletalMuscleMassUnit === "lbs"
            ? userProfile.skeletalMuscleMassValue * LBS_TO_KG
            : userProfile.skeletalMuscleMassValue;
      }

      if (baseValueInKg <= 0) return null;

      let ageFactor = 1.0;
      if (userProfile.age && userProfile.age > 40) {
        ageFactor = 1 + (userProfile.age - 40) * 0.01;
      }

      const convertToOutput = (ratio: number) => {
        const weightInKg = (ratio * baseValueInKg) / ageFactor;
        const finalWeight =
          record.weightUnit === "lbs" ? weightInKg / LBS_TO_KG : weightInKg;
        return Math.ceil(finalWeight);
      };

      return {
        intermediate: convertToOutput(genderStandards.intermediate),
        advanced: convertToOutput(genderStandards.advanced),
        elite: convertToOutput(genderStandards.elite),
      };
    }

    return getStrengthThresholds(record.exerciseName, userProfile, record.weightUnit);
  }, [exercise, needsSmmData, record.exerciseName, record.weightUnit, userProfile]);
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
