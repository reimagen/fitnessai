
import type { PersonalRecord } from "@/lib/types";
import { getNormalizedExerciseName } from "@/lib/strength-standards";

export type ImbalanceType = 'Horizontal Push vs. Pull' | 'Vertical Push vs. Pull' | 'Hamstring vs. Quad' | 'Adductor vs. Abductor';

export const IMBALANCE_TYPES: ImbalanceType[] = [
    'Horizontal Push vs. Pull',
    'Vertical Push vs. Pull',
    'Hamstring vs. Quad',
    'Adductor vs. Abductor',
];

export const IMBALANCE_CONFIG: Record<ImbalanceType, { lift1Options: string[], lift2Options: string[], ratioCalculation: (l1: number, l2: number) => number }> = {
    'Horizontal Push vs. Pull': { lift1Options: ['chest press'], lift2Options: ['seated row'], ratioCalculation: (l1, l2) => l1/l2 },
    'Vertical Push vs. Pull': { lift1Options: ['shoulder press'], lift2Options: ['lat pulldown'], ratioCalculation: (l1, l2) => l1/l2 },
    'Hamstring vs. Quad': { lift1Options: ['leg curl'], lift2Options: ['leg extension'], ratioCalculation: (l1, l2) => l1/l2 },
    'Adductor vs. Abductor': { lift1Options: ['adductor'], lift2Options: ['abductor'], ratioCalculation: (l1, l2) => l1/l2 },
};

// Helper to find the best PR for a given list of exercises (moved from page.tsx)
export function findBestPr(records: PersonalRecord[], exerciseNames: string[]): PersonalRecord | null {
    const searchNames = [...exerciseNames];
    
    const relevantRecords = records.filter(r => searchNames.some(name => getNormalizedExerciseName(r.exerciseName) === name.trim().toLowerCase()));
    if (relevantRecords.length === 0) return null;

    return relevantRecords.reduce((best, current) => {
        const bestWeightKg = best.weightUnit === 'lbs' ? best.weight * 0.453592 : best.weight;
        const currentWeightKg = current.weightUnit === 'lbs' ? current.weight * 0.453592 : current.weight;
        return currentWeightKg > bestWeightKg ? current : best;
    });
}

// Helper to convert a string to title case (moved from page.tsx)
