import { format } from "date-fns";
import type { ExerciseCategory, PersonalRecord } from "@/lib/types";
import type { ExerciseDocument } from "@/lib/exercise-types";

type ParsedRecord = {
  exerciseName: string;
  weight: number;
  weightUnit: "kg" | "lbs";
  dateString: string;
  category: ExerciseCategory;
};

const toKg = (weight: number, unit: "kg" | "lbs") => (unit === "lbs" ? weight * 0.453592 : weight);

/**
 * Normalizes exercise name for lookup (removes EGYM/Machine prefix and extra characters)
 */
const normalizeForLookup = (name: string): string =>
  name
    .trim()
    .toLowerCase()
    .replace(/^(egym|machine)\s+/, '')
    .replace(/[()]/g, '')
    .replace(/\s+/g, ' ');

/**
 * Resolves exercise name to its canonical name using the exercise library.
 * If the normalized name matches a legacyName, uses the canonical exercise name.
 */
const resolveCanonicalName = (exerciseName: string, exerciseLibrary: ExerciseDocument[]): string => {
  const normalized = normalizeForLookup(exerciseName);

  // Try to find the exercise by normalized name or in legacyNames
  const exercise = exerciseLibrary.find(e => {
    if (e.normalizedName.toLowerCase() === normalized) return true;
    if (e.legacyNames?.some(ln => normalizeForLookup(ln) === normalized)) return true;
    return false;
  });

  return exercise?.name || exerciseName;
};

/**
 * Returns the best personal record per exercise, sorted by most recent date.
 * Uses the exercise library to resolve legacy names to canonical names.
 */
export const getBestRecords = (records: PersonalRecord[], exerciseLibrary: ExerciseDocument[] = []): PersonalRecord[] => {
  if (!records || records.length === 0) return [];

  const bestRecordsMap = new Map<string, PersonalRecord>();

  records.forEach(record => {
    const canonicalName = resolveCanonicalName(record.exerciseName, exerciseLibrary);
    const key = canonicalName.trim().toLowerCase();
    const existingBest = bestRecordsMap.get(key);

    if (!existingBest) {
      bestRecordsMap.set(key, { ...record, exerciseName: canonicalName });
      return;
    }

    const bestWeightKg = toKg(existingBest.weight, existingBest.weightUnit);
    const currentWeightKg = toKg(record.weight, record.weightUnit);
    if (currentWeightKg > bestWeightKg) {
      bestRecordsMap.set(key, { ...record, exerciseName: canonicalName });
    }
  });

  return Array.from(bestRecordsMap.values()).sort((a, b) => b.date.getTime() - a.date.getTime());
};

/**
 * Groups personal records by their exercise category.
 */
export const groupRecordsByCategory = (records: PersonalRecord[]): Record<string, PersonalRecord[]> =>
  records.reduce((acc, record) => {
    const category = record.category || "Other";
    if (!acc[category]) {
      acc[category] = [];
    }
    acc[category].push(record);
    return acc;
  }, {} as Record<string, PersonalRecord[]>);

/**
 * Deduplicates parsed records against existing records and within the current batch.
 */
export const deduplicateParsedRecords = (
  existingRecords: PersonalRecord[],
  parsedRecords: ParsedRecord[]
): Omit<PersonalRecord, "id" | "userId">[] => {
  const existingKeys = new Set(
    existingRecords.map(record => `${record.exerciseName.trim().toLowerCase()}|${format(record.date, "yyyy-MM-dd")}`)
  );

  const newRecords: Omit<PersonalRecord, "id" | "userId">[] = [];

  parsedRecords.forEach(record => {
    const key = `${record.exerciseName.trim().toLowerCase()}|${record.dateString}`;
    if (existingKeys.has(key)) return;

    newRecords.push({
      exerciseName: record.exerciseName,
      weight: record.weight,
      weightUnit: record.weightUnit,
      date: new Date(`${record.dateString}T00:00:00Z`),
      category: record.category,
    });
    existingKeys.add(key);
  });

  return newRecords;
};
