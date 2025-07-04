
'use server';
/**
 * @fileOverview Analyzes user's strength balance based on personal records.
 *
 * - analyzeStrengthImbalances - A function that handles the strength imbalance analysis.
 * - StrengthImbalanceInput - The input type for the function.
 * - StrengthImbalanceOutput - The return type for the function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const PersonalRecordForAnalysisSchema = z.object({
    exerciseName: z.string(),
    weight: z.number(),
    weightUnit: z.enum(['kg', 'lbs']),
    date: z.string(),
    category: z.string().optional(),
});

const StrengthImbalanceInputSchema = z.object({
  personalRecords: z.array(PersonalRecordForAnalysisSchema),
});
export type StrengthImbalanceInput = z.infer<typeof StrengthImbalanceInputSchema>;

const IMBALANCE_TYPES = [
    'Horizontal Push vs. Pull',
    'Vertical Push vs. Pull',
    'Quad vs. Hamstring',
    'Adductor vs. Abductor',
    'Reverse Fly vs. Butterfly',
    'Biceps vs. Triceps',
    'Back Extension vs. Abdominal Crunch',
    'Glute Development',
] as const;
type ImbalanceType = (typeof IMBALANCE_TYPES)[number];


const ImbalanceFindingSchema = z.object({
    imbalanceType: z.enum(IMBALANCE_TYPES).describe("The type of strength imbalance. Must be one of the predefined types."),
    lift1Name: z.string().describe("The name of the first exercise in the comparison."),
    lift1Weight: z.number().describe("The weight of the first exercise PR."),
    lift1Unit: z.enum(['kg', 'lbs']).describe("The weight unit for the first exercise."),
    lift2Name: z.string().describe("The name of the second, opposing exercise in the comparison."),
    lift2Weight: z.number().describe("The weight of the second exercise PR."),
    lift2Unit: z.enum(['kg', 'lbs']).describe("The weight unit for the second exercise."),
    userRatio: z.string().describe("The user's calculated strength ratio, formatted as 'X : Y'."),
    targetRatio: z.string().describe("The ideal or target strength ratio, formatted as 'X : Y'."),
    severity: z.enum(['Balanced', 'Moderate', 'Severe']).describe("The severity of the imbalance. Must be 'Balanced' for ideal ratios, 'Moderate' for noticeable issues, or 'Severe' for significant imbalances."),
    insight: z.string().describe("A concise explanation of what the imbalance means."),
    recommendation: z.string().describe("A simple, actionable recommendation to address the imbalance."),
});
type ImbalanceFinding = z.infer<typeof ImbalanceFindingSchema>;

const StrengthImbalanceOutputSchema = z.object({
    summary: z.string().describe("A brief, high-level summary of the user's overall strength balance."),
    findings: z.array(ImbalanceFindingSchema).describe("A list of specific strength imbalances found."),
});
export type StrengthImbalanceOutput = z.infer<typeof StrengthImbalanceOutputSchema>;

// Configuration for each imbalance type
const IMBALANCE_CONFIG: Record<ImbalanceType, { lift1Options: string[], lift2Options: string[] }> = {
    'Horizontal Push vs. Pull': { lift1Options: ['Bench Press', 'Chest Press'], lift2Options: ['Barbell Row', 'Seated Row'] },
    'Vertical Push vs. Pull': { lift1Options: ['Overhead Press', 'Shoulder Press'], lift2Options: ['Lat Pulldown', 'Pull-ups'] },
    'Quad vs. Hamstring': { lift1Options: ['Leg Extension', 'Squat'], lift2Options: ['Leg Curl'] },
    'Adductor vs. Abductor': { lift1Options: ['Adductor'], lift2Options: ['Abductor'] },
    'Reverse Fly vs. Butterfly': { lift1Options: ['Reverse Fly'], lift2Options: ['Butterfly'] },
    'Biceps vs. Triceps': { lift1Options: ['Bicep Curl'], lift2Options: ['Tricep Extension'] },
    'Back Extension vs. Abdominal Crunch': { lift1Options: ['Back Extension'], lift2Options: ['Abdominal Crunch'] },
    'Glute Development': { lift1Options: ['Hip Thrust'], lift2Options: ['Glutes'] },
};


export async function analyzeStrengthImbalances(input: StrengthImbalanceInput): Promise<StrengthImbalanceOutput> {
  // Filter out records with 0 weight as they can't be used for ratio analysis
  const filteredInput = {
      ...input,
      personalRecords: input.personalRecords.filter(pr => pr.weight > 0),
  };
  if (filteredInput.personalRecords.length < 2) {
      return {
          summary: "Not enough data to perform a strength analysis. Please log more personal records for opposing muscle groups.",
          findings: [],
      };
  }
  return strengthImbalanceFlow(filteredInput);
}

// Helper function to find the best PR from a list of exercise names
function findBestPr(records: z.infer<typeof PersonalRecordForAnalysisSchema>[], exerciseNames: string[]): z.infer<typeof PersonalRecordForAnalysisSchema> | null {
    const relevantRecords = records.filter(r => exerciseNames.some(name => r.exerciseName.toLowerCase() === name.toLowerCase()));
    if (relevantRecords.length === 0) return null;

    return relevantRecords.reduce((best, current) => {
        const bestWeightKg = best.weightUnit === 'lbs' ? best.weight * 0.453592 : best.weight;
        const currentWeightKg = current.weightUnit === 'lbs' ? current.weight * 0.453592 : current.weight;
        return currentWeightKg > bestWeightKg ? current : best;
    });
}

const strengthImbalanceFlow = ai.defineFlow(
  {
    name: 'strengthImbalanceFlow',
    inputSchema: StrengthImbalanceInputSchema,
    outputSchema: StrengthImbalanceOutputSchema,
  },
  async (input) => {
    const findings: ImbalanceFinding[] = [];

    for (const type of IMBALANCE_TYPES) {
        const config = IMBALANCE_CONFIG[type];
        const lift1 = findBestPr(input.personalRecords, config.lift1Options);
        const lift2 = findBestPr(input.personalRecords, config.lift2Options);

        if (!lift1 || !lift2) continue;

        const lift1WeightKg = lift1.weightUnit === 'lbs' ? lift1.weight * 0.453592 : lift1.weight;
        const lift2WeightKg = lift2.weightUnit === 'lbs' ? lift2.weight * 0.453592 : lift2.weight;

        if (lift2WeightKg === 0) continue; // Avoid division by zero

        let ratio: number;
        let severity: 'Balanced' | 'Moderate' | 'Severe' | null = null;
        let targetRatio: string = '';
        let insight: string = '';
        let recommendation: string = '';
        let finalRatioString: string = '';

        switch (type) {
            case 'Horizontal Push vs. Pull':
                ratio = lift1WeightKg / lift2WeightKg;
                targetRatio = '1.00 : 1';
                if (ratio < 0.75 || ratio > 1.25) severity = 'Severe';
                else if (ratio < 0.9 || ratio > 1.1) severity = 'Moderate';
                else severity = 'Balanced';
                
                if (ratio < 1.0) { // Push is weaker
                    insight = "Your pressing strength is imbalanced with your pulling strength. This can increase risk of shoulder injury and poor posture if not addressed.";
                    recommendation = "Focus on strengthening your chest, shoulders, and triceps with more pressing exercises to close the gap.";
                } else { // Pull is weaker
                    insight = "Your pulling strength is imbalanced with your pressing strength. This 'push-dominant' imbalance can lead to rounded shoulders and potential shoulder impingement.";
                    recommendation = "Focus on strengthening your back and rear deltoids. Ensure your routine has enough volume of rowing exercises to balance your pressing.";
                }
                finalRatioString = `${ratio.toFixed(2)} : 1`;
                break;
            
            case 'Vertical Push vs. Pull':
                if (lift2WeightKg === 0) continue;
                ratio = lift1WeightKg / lift2WeightKg;
                targetRatio = '0.67 - 0.77 : 1'; 
                if (ratio < 0.60 || ratio > 0.85) severity = 'Severe';
                else if (ratio < 0.67 || ratio > 0.77) severity = 'Moderate';
                else severity = 'Balanced';
                insight = "An imbalance between your overhead pressing and pulling can affect shoulder health and stability. Your vertical press should ideally be around 2/3 of your vertical pull.";
                recommendation = "Ensure you are training both vertical pulling (like lat pulldowns) and vertical pressing (like overhead press) with appropriate intensity to achieve a better balance.";
                finalRatioString = `${ratio.toFixed(2)} : 1`;
                break;

            case 'Quad vs. Hamstring':
                ratio = lift1WeightKg / lift2WeightKg;
                targetRatio = '1.50 : 1';
                if (ratio < 1.2 || ratio > 2.0) severity = 'Severe';
                else if (ratio < 1.4 || ratio > 1.7) severity = 'Moderate';
                else severity = 'Balanced';
                insight = "A significant difference between quadriceps and hamstring strength is a major risk factor for knee injuries and ACL tears.";
                recommendation = "Incorporate more hamstring-focused exercises like leg curls, glute-ham raises, or Romanian deadlifts.";
                finalRatioString = `${ratio.toFixed(2)} : 1`;
                break;

            case 'Biceps vs. Triceps':
                if (lift2WeightKg === 0) continue;
                ratio = lift1WeightKg / lift2WeightKg;
                targetRatio = '1.00 : 1';
                if (ratio < 0.75 || ratio > 1.25) severity = 'Severe';
                else if (ratio < 0.9 || ratio > 1.1) severity = 'Moderate';
                else severity = 'Balanced';
                insight = "Imbalance between biceps and triceps can affect elbow stability and overall pressing and pulling performance. Note: this compares two isolation exercises for a direct comparison.";
                recommendation = "Ensure you are dedicating sufficient volume to both bicep curls and tricep extension movements.";
                finalRatioString = `${ratio.toFixed(2)} : 1`;
                break;

            case 'Adductor vs. Abductor':
                ratio = lift1WeightKg / lift2WeightKg;
                targetRatio = '1.00 : 1';
                if (ratio < 0.75 || ratio > 1.25) severity = 'Severe';
                else if (ratio < 0.9 || ratio > 1.1) severity = 'Moderate';
                else severity = 'Balanced';
                if(ratio < 1.0) { // Adductor is weaker
                    insight = "Your inner thigh (adductor) muscles are weaker than your outer thigh (abductor) muscles. This can affect hip stability and knee tracking.";
                    recommendation = "Focus on strengthening your adductors to improve hip joint stability and prevent potential knee pain.";
                } else { // Abductor is weaker
                    insight = "Your outer thigh (abductor) muscles are weaker than your inner thigh (adductor) muscles. Weak abductors can lead to poor knee control during squats and running.";
                    recommendation = "Focus on strengthening your abductors (like the gluteus medius) to improve lower body alignment and reduce injury risk.";
                }
                finalRatioString = `${ratio.toFixed(2)} : 1`;
                break;

            case 'Reverse Fly vs. Butterfly':
                ratio = lift1WeightKg / lift2WeightKg;
                targetRatio = '1.00 : 1';
                if (ratio < 0.75 || ratio > 1.25) severity = 'Severe';
                else if (ratio < 0.9 || ratio > 1.1) severity = 'Moderate';
                else severity = 'Balanced';
                if (ratio < 1.0) { // Reverse Fly (upper back) is weaker
                    insight = "Your upper back (rear delts) is weaker than your chest. This common imbalance can lead to rounded shoulders and poor posture.";
                    recommendation = "Focus on strengthening your rear deltoids and upper back. Incorporate more reverse flys, face pulls, or band pull-aparts into your routine.";
                } else { // Butterfly (chest) is weaker
                    insight = "Your chest strength is weaker than your upper back strength in these isolation movements. This is less common but should be addressed for balanced development.";
                    recommendation = "Ensure you are including enough volume for chest flys or presses to maintain a balanced and strong upper body.";
                }
                finalRatioString = `${ratio.toFixed(2)} : 1`;
                break;

            case 'Back Extension vs. Abdominal Crunch':
                ratio = lift1WeightKg / lift2WeightKg;
                targetRatio = '1.00 : 1';
                if (ratio < 0.75 || ratio > 1.25) severity = 'Severe';
                else if (ratio < 0.9 || ratio > 1.1) severity = 'Moderate';
                else severity = 'Balanced';
                if (ratio < 1.0) { // Back Extension is weaker
                    insight = "Your lower back (erector spinae) is weaker than your abdominal muscles. A strong lower back is critical for core stability and preventing lower back pain.";
                    recommendation = "Incorporate controlled back extensions or supermans to strengthen your posterior chain and balance your core.";
                } else { // Ab Crunch is weaker
                    insight = "Your abdominal muscles are weaker than your lower back muscles. A strong anterior core is vital for protecting your spine during heavy lifts.";
                    recommendation = "Focus on strengthening your abs. Incorporate exercises like crunches, planks, or leg raises into your routine.";
                }
                finalRatioString = `${ratio.toFixed(2)} : 1`;
                break;

            case 'Glute Development':
                ratio = lift1WeightKg / lift2WeightKg;
                targetRatio = '1.00 : 1';
                if (ratio < 0.75 || ratio > 1.25) severity = 'Severe';
                else if (ratio < 0.9 || ratio > 1.1) severity = 'Moderate';
                else severity = 'Balanced';
                if (ratio < 1.0) { // Hip Thrust (compound) is weaker
                    insight = "Your compound glute strength (Hip Thrust) is weaker than your isolation strength. This might indicate an opportunity to build more overall glute power.";
                    recommendation = "Focus on progressive overload with your Hip Thrusts. Ensure your form is solid to maximize glute activation and strength gains.";
                } else { // Glute machine (isolation) is weaker
                    insight = "Your glute isolation strength is weaker than your compound strength. This could suggest a need to improve glute activation or mind-muscle connection.";
                    recommendation = "Consider adding more glute isolation work (like the machine or cable kickbacks) to target the glutes more directly and ensure full development.";
                }
                finalRatioString = `${ratio.toFixed(2)} : 1`;
                break;
        }

        if (severity && severity !== 'Balanced') {
            findings.push({
                imbalanceType: type,
                lift1Name: lift1.exerciseName,
                lift1Weight: lift1.weight,
                lift1Unit: lift1.weightUnit,
                lift2Name: lift2.exerciseName,
                lift2Weight: lift2.weight,
                lift2Unit: lift2.weightUnit,
                userRatio: finalRatioString,
                targetRatio: targetRatio,
                severity: severity,
                insight: insight,
                recommendation: recommendation,
            });
        }
    }

    const summary = findings.length > 0
        ? `We found ${findings.length} potential strength imbalance(s). See below for details and recommendations.`
        : "Great job! Your strength ratios appear to be well-balanced based on your logged personal records.";

    return { summary, findings };
  }
);
