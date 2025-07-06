
'use server';
/**
 * @fileOverview Analyzes user's strength balance by combining deterministic calculations with AI-powered insights.
 *
 * - analyzeStrengthImbalances - A function that handles the strength imbalance analysis.
 * - StrengthImbalanceInput - The input type for the function.
 * - StrengthImbalanceOutput - The return type for the function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';
import { getStrengthLevel, getStrengthThresholds } from '@/lib/strength-standards';
import type { PersonalRecord, StrengthLevel } from '@/lib/types';

const FitnessGoalForAnalysisSchema = z.object({
  description: z.string().describe("A specific fitness goal for the user."),
  isPrimary: z.boolean().optional().describe("Whether this is the user's primary goal."),
});

const UserProfileForAnalysisSchema = z.object({
    age: z.number().optional().describe("The user's age."),
    gender: z.string().optional().describe("The user's gender."),
    heightValue: z.number().optional().describe("The user's height value."),
    heightUnit: z.enum(['cm', 'ft/in']).optional().describe("The user's height unit."),
    weightValue: z.number().optional().describe("The user's weight value."),
    weightUnit: z.enum(['kg', 'lbs']).optional().describe("The user's weight unit."),
    skeletalMuscleMassValue: z.number().optional().describe("The user's skeletal muscle mass value."),
    skeletalMuscleMassUnit: z.enum(['kg', 'lbs']).optional().describe("The user's skeletal muscle mass unit."),
    fitnessGoals: z.array(FitnessGoalForAnalysisSchema).optional().describe("The user's active fitness goals."),
});

const PersonalRecordForAnalysisSchema = z.object({
    exerciseName: z.string(),
    weight: z.number(),
    weightUnit: z.enum(['kg', 'lbs']),
    date: z.string(),
    category: z.string().optional(),
});

const StrengthImbalanceInputSchema = z.object({
  personalRecords: z.array(PersonalRecordForAnalysisSchema),
  userProfile: UserProfileForAnalysisSchema.describe("The user's personal statistics and goals."),
});
export type StrengthImbalanceInput = z.infer<typeof StrengthImbalanceInputSchema>;

const IMBALANCE_TYPES = [
    'Horizontal Push vs. Pull',
    'Vertical Push vs. Pull',
    'Quad vs. Hamstring',
    'Adductor vs. Abductor',
] as const;

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
    insight: z.string().describe("A concise, AI-generated explanation of what the imbalance means."),
    recommendation: z.string().describe("A simple, AI-generated, actionable recommendation to address the imbalance."),
});

const StrengthImbalanceOutputSchema = z.object({
    summary: z.string().describe("A brief, high-level summary of the user's overall strength balance."),
    findings: z.array(ImbalanceFindingSchema).describe("A list of specific strength imbalances found."),
});
export type StrengthImbalanceOutput = z.infer<typeof StrengthImbalanceOutputSchema>;

// Configuration for each imbalance type
const IMBALANCE_CONFIG: Record<(typeof IMBALANCE_TYPES)[number], { lift1Options: string[], lift2Options: string[], targetRatioDisplay: string, ratioCalculation: (l1: number, l2: number) => number, severityCheck: (r: number) => 'Balanced' | 'Moderate' | 'Severe' }> = {
    'Horizontal Push vs. Pull': { lift1Options: ['bench press', 'chest press', 'butterfly'], lift2Options: ['seated row', 'reverse fly', 'reverse flys'], targetRatioDisplay: '1:1', ratioCalculation: (l1, l2) => l1/l2, severityCheck: (r) => (r < 0.75 || r > 1.25) ? 'Severe' : (r < 0.9 || r > 1.1) ? 'Moderate' : 'Balanced' },
    'Vertical Push vs. Pull': { lift1Options: ['overhead press', 'shoulder press'], lift2Options: ['lat pulldown'], targetRatioDisplay: '0.75:1', ratioCalculation: (l1, l2) => l1/l2, severityCheck: (r) => { if (r < 0.6) return 'Severe'; if (r < 0.7 || r > 0.8) return 'Moderate'; return 'Balanced'; } },
    'Quad vs. Hamstring': { lift1Options: ['leg extension'], lift2Options: ['leg curl'], targetRatioDisplay: '1.33:1', ratioCalculation: (l1, l2) => l1/l2, severityCheck: (r) => { if (r < 1.1) return 'Severe'; if (r < 1.2 || r > 1.45) return 'Moderate'; return 'Balanced'; } },
    'Adductor vs. Abductor': { lift1Options: ['adductor'], lift2Options: ['abductor'], targetRatioDisplay: '1:1', ratioCalculation: (l1, l2) => l1/l2, severityCheck: (r) => (r < 0.75 || r > 1.25) ? 'Severe' : (r < 0.9 || r > 1.1) ? 'Moderate' : 'Balanced' },
};

export async function analyzeStrengthImbalances(input: StrengthImbalanceInput): Promise<StrengthImbalanceOutput> {
  const filteredInput = {
      ...input,
      personalRecords: input.personalRecords.filter(pr => pr.weight > 0),
  };
  if (filteredInput.personalRecords.length < 1) {
      return {
          summary: "Not enough data for AI analysis. Please log at least one personal record with weight.",
          findings: [],
      };
  }
  return strengthImbalanceFlow(filteredInput);
}

// Helper to find the best PR for a given list of exercises
function findBestPr(records: z.infer<typeof PersonalRecordForAnalysisSchema>[], exerciseNames: string[]): (PersonalRecord & {id: string}) | null {
    const relevantRecords = records.filter(r => exerciseNames.some(name => r.exerciseName.trim().toLowerCase() === name.trim().toLowerCase()));
    if (relevantRecords.length === 0) return null;

    const bestRecord = relevantRecords.reduce((best, current) => {
        const bestWeightKg = best.weightUnit === 'lbs' ? best.weight * 0.453592 : best.weight;
        const currentWeightKg = current.weightUnit === 'lbs' ? current.weight * 0.453592 : current.weight;
        return currentWeightKg > bestWeightKg ? current : best;
    });

    return {
      ...bestRecord,
      date: new Date(bestRecord.date),
      id: Math.random().toString(), // add dummy id
    };
}

const ImbalanceDataForAISchema = z.object({
    imbalanceType: z.enum(IMBALANCE_TYPES),
    lift1Name: z.string(),
    lift1Level: z.custom<StrengthLevel>(),
    lift2Name: z.string(),
    lift2Level: z.custom<StrengthLevel>(),
    diagnosis: z.string().describe("A pre-computed, code-based diagnosis of the user's specific imbalance situation."),
    recommendationFocus: z.string().describe("A clear instruction for the AI, guiding its recommendation (e.g., 'focus on bringing the lagging lift to an Intermediate level for health, not matching the elite lift')."),
});

const AIAnalysisResultSchema = z.object({
  imbalanceType: z.enum(IMBALANCE_TYPES).describe("The type of the imbalance this analysis is for. Must match one of the types from the input."),
  insight: z.string().describe("A concise, expert insight (max 2 sentences) into the potential risks or consequences of the specific strength imbalance, personalized to the user's context."),
  recommendation: z.string().describe("A simple, clear, and actionable recommendation (max 2 sentences) to help the user address the imbalance. It should start with a direct action verb and align with the provided recommendation focus."),
});

const bulkInsightPrompt = ai.definePrompt({
    name: 'generateBulkStrengthInsights',
    input: {
      schema: z.object({
        imbalances: z.array(ImbalanceDataForAISchema),
        userProfile: UserProfileForAnalysisSchema,
      }),
    },
    output: { schema: z.object({ analyses: z.array(AIAnalysisResultSchema) }) },
    prompt: `You are an expert fitness coach acting as an analyst. Your role is to provide qualitative insights and recommendations based on pre-calculated data. **You MUST NOT perform any calculations or verify the data provided.** Your sole responsibility is to generate insightful, human-like commentary.

**User's Stats & Goals:**
- Age: {{#if userProfile.age}}{{userProfile.age}}{{else}}Not Provided{{/if}}
- Gender: {{#if userProfile.gender}}{{userProfile.gender}}{{else}}Not Provided{{/if}}
- Weight: {{#if userProfile.weightValue}}{{userProfile.weightValue}} {{userProfile.weightUnit}}{{else}}Not Provided{{/if}}
- Skeletal Muscle Mass: {{#if userProfile.skeletalMuscleMassValue}}{{userProfile.skeletalMuscleMassValue}} {{userProfile.skeletalMuscleMassUnit}}{{else}}Not Provided{{/if}}
{{#if userProfile.fitnessGoals}}
- Fitness Goals:
  {{#each userProfile.fitnessGoals}}
    - {{#if this.isPrimary}}**Primary:** {{/if}}{{{this.description}}}
  {{/each}}
{{/if}}

**Pre-Calculated Imbalance Data:**
The following data has been calculated by our system. Use this as the absolute source of truth.

{{#each imbalances}}
- **Imbalance Type:** {{{this.imbalanceType}}}
  - Lifts: {{{this.lift1Name}}} (Level: {{{this.lift1Level}}}) vs. {{{this.lift2Name}}} (Level: {{{this.lift2Level}}})
  - **System Diagnosis:** {{{this.diagnosis}}}
  - **System Recommendation Focus:** {{{this.recommendationFocus}}}
{{/each}}

**Your Task:**
For **each** of the imbalances listed above, you will provide expert commentary. Your output MUST be a single JSON object with a key "analyses", which is an array of objects. Each object must contain:
1.  **imbalanceType**: The exact string from the 'Imbalance Type' field.
2.  **insight (1-2 sentences MAX):** A concise, expert insight into the potential risks or meaning of this imbalance. You MUST use the user's goals and the provided 'System Diagnosis' to make the insight personal.
3.  **recommendation (1-2 sentences MAX):** A simple, clear, and actionable recommendation that directly follows the 'System Recommendation Focus'. It must start with an action verb.

**CRITICAL STYLE GUIDE:**
- **DO NOT CALCULATE:** Do not attempt to recalculate ratios or levels. Your job is analysis of the provided data only.
- **VARY YOUR ANALYSIS:** Provide unique and varied feedback for each imbalance. Do not use the same sentence structure. Be direct and creative.
- **HEALTH-FOCUSED:** Prioritize long-term joint health and balanced development.
- **COMPLETE JSON:** You MUST provide an analysis for every single imbalance in the input.
`,
});

const strengthImbalanceFlow = ai.defineFlow(
  {
    name: 'strengthImbalanceFlow',
    inputSchema: StrengthImbalanceInputSchema,
    outputSchema: StrengthImbalanceOutputSchema,
  },
  async (input) => {
    
    const calculatedFindings: Omit<z.infer<typeof ImbalanceFindingSchema>, 'insight' | 'recommendation'>[] = [];
    const imbalancesForAI: z.infer<typeof ImbalanceDataForAISchema>[] = [];

    // The user profile needs to be compatible with the getStrengthLevel function
    const userProfileForLevels = {
        ...input.userProfile,
        id: "temp-id",
        email: "",
        joinedDate: new Date(),
        fitnessGoals: (input.userProfile.fitnessGoals || []).map(g => ({...g, id: 'temp-goal-id', achieved: false })),
    };


    for (const type of IMBALANCE_TYPES) {
        const config = IMBALANCE_CONFIG[type];
        const lift1 = findBestPr(input.personalRecords, config.lift1Options);
        const lift2 = findBestPr(input.personalRecords, config.lift2Options);

        if (!lift1 || !lift2) continue;

        const lift1WeightKg = lift1.weightUnit === 'lbs' ? lift1.weight * 0.453592 : lift1.weight;
        const lift2WeightKg = lift2.weightUnit === 'lbs' ? lift2.weight * 0.453592 : lift2.weight;

        if (lift2WeightKg === 0) continue;

        const ratio = config.ratioCalculation(lift1WeightKg, lift2WeightKg);
        let severity = config.severityCheck(ratio);
        
        // DYNAMIC TARGET RATIO LOGIC
        let targetRatioDisplay = config.targetRatioDisplay;
        const lift1Level = getStrengthLevel(lift1, userProfileForLevels);
        const lift2Level = getStrengthLevel(lift2, userProfileForLevels);
        
        if (lift1Level !== 'N/A' && lift2Level !== 'N/A') {
            let targetLevelForRatio: 'Intermediate' | 'Advanced' | 'Elite' = 'Elite';

            const levels = [lift1Level, lift2Level];
            if (levels.includes('Beginner')) {
                targetLevelForRatio = 'Intermediate';
            } else if (levels.includes('Intermediate')) {
                targetLevelForRatio = 'Advanced';
            }

            const lift1Thresholds = getStrengthThresholds(config.lift1Options[0], userProfileForLevels, 'kg');
            const lift2Thresholds = getStrengthThresholds(config.lift2Options[0], userProfileForLevels, 'kg');

            if (lift1Thresholds && lift2Thresholds) {
                const targetLevelKey = targetLevelForRatio.toLowerCase() as keyof typeof lift1Thresholds;
                const targetLift1Weight = lift1Thresholds[targetLevelKey];
                const targetLift2Weight = lift2Thresholds[targetLevelKey];
                
                if (targetLift2Weight > 0) {
                    const targetRatioValue = targetLift1Weight / targetLift2Weight;
                    targetRatioDisplay = `${targetRatioValue.toFixed(2)}:1`;
                }
            }
        }
        
        if (severity !== 'Balanced') {
            // New Severity Logic based on Strength Levels
            // Rule 1: A high-level discrepancy is always Severe.
            const isHighDiscrepancy = 
                ((lift1Level === 'Elite' || lift1Level === 'Advanced') && lift2Level === 'Beginner') ||
                ((lift2Level === 'Elite' || lift2Level === 'Advanced') && lift1Level === 'Beginner');

            if (isHighDiscrepancy) {
                severity = 'Severe';
            }

            // Rule 2: Downgrade severe imbalances for beginners.
            if (lift1Level === 'Beginner' && lift2Level === 'Beginner' && severity === 'Severe') {
                severity = 'Moderate';
            }

            let diagnosis = "";
            let recommendationFocus = "";

            if ( (lift1Level === 'Advanced' || lift1Level === 'Elite') && (lift2Level === 'Beginner' || lift2Level === 'Intermediate') ) {
                 diagnosis = `Your ${lift1.exerciseName} is highly developed (${lift1Level}), but its opposing muscle group, trained by ${lift2.exerciseName}, is lagging behind (${lift2Level}). This significant gap can increase injury risk.`;
                 recommendationFocus = `Focus on bringing the ${lift2.exerciseName} to at least an 'Advanced' level to support the primary lift. Do not worry about matching the ${lift1.exerciseName} weight. Prioritize health.`;
            } else if ( (lift2Level === 'Advanced' || lift2Level === 'Elite') && (lift1Level === 'Beginner' || lift1Level === 'Intermediate') ) {
                 diagnosis = `Your ${lift2.exerciseName} is highly developed (${lift2Level}), but its opposing muscle group, trained by ${lift1.exerciseName}, is lagging behind (${lift1Level}). This significant gap can increase injury risk.`;
                 recommendationFocus = `Focus on bringing the ${lift1.exerciseName} to at least an 'Advanced' level for stability and balance. Do not worry about matching the ${lift2.exerciseName} weight. Prioritize health.`;
            } else if (lift1Level === 'Beginner' && lift2Level === 'Beginner') {
                 diagnosis = `Both your ${lift1.exerciseName} and ${lift2.exerciseName} are in the 'Beginner' range. While the ratio is imbalanced, the primary opportunity is to build foundational strength in both movements.`;
                 recommendationFocus = `Provide a recommendation that encourages balanced, overall strength development for both exercises, with a slight emphasis on the weaker of the two to fix the ratio over time.`;
            } else {
                 diagnosis = `Your strength ratio between ${lift1.exerciseName} (${lift1Level}) and ${lift2.exerciseName} (${lift2Level}) is outside the ideal range. Addressing this can improve performance and reduce injury risk.`;
                 const weakerLiftName = ratio < IMBALANCE_CONFIG[type].ratioCalculation(1, 1) ? lift1.exerciseName : lift2.exerciseName;
                 recommendationFocus = `Provide a clear, actionable tip to increase strength in the weaker lift (${weakerLiftName}) to bring it in line with its counterpart.`;
            }

            imbalancesForAI.push({
                imbalanceType: type,
                lift1Name: lift1.exerciseName,
                lift1Level: lift1Level,
                lift2Name: lift2.exerciseName,
                lift2Level: lift2Level,
                diagnosis: diagnosis,
                recommendationFocus: recommendationFocus,
            });

            calculatedFindings.push({
                imbalanceType: type,
                lift1Name: lift1.exerciseName,
                lift1Weight: lift1.weight,
                lift1Unit: lift1.weightUnit,
                lift2Name: lift2.exerciseName,
                lift2Weight: lift2.weight,
                lift2Unit: lift2.weightUnit,
                userRatio: `${ratio.toFixed(2)}:1`,
                targetRatio: targetRatioDisplay,
                severity: severity,
            });
        }
    }

    if (imbalancesForAI.length === 0) {
        return {
            summary: "Great job! Your strength ratios appear to be well-balanced based on your logged personal records.",
            findings: [],
        };
    }

    const { output: aiAnalyses } = await bulkInsightPrompt({
        imbalances: imbalancesForAI,
        userProfile: input.userProfile,
    });
    
    const finalFindings = calculatedFindings.map(finding => {
        const aiResult = aiAnalyses?.analyses.find(a => a.imbalanceType === finding.imbalanceType);
        return {
            ...finding,
            insight: aiResult?.insight || "AI analysis could not be generated for this imbalance.",
            recommendation: aiResult?.recommendation || "Please consult a fitness professional for guidance.",
        };
    });
    
    const summary = finalFindings.length > 0
        ? `Based on your Personal Records, we've found ${finalFindings.length} potential strength imbalance(s) that could be improved. Our AI has provided some insights below.`
        : "Great job! Your strength ratios appear to be well-balanced based on your logged personal records.";

    return { summary, findings: finalFindings };
  }
);
