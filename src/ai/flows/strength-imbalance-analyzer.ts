
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
import type { PersonalRecord, StrengthLevel, UserProfile } from '@/lib/types';

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

const IMBALANCE_FOCUS_TYPES = ['Balanced', 'Level Imbalance', 'Ratio Imbalance'] as const;

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
    imbalanceFocus: z.enum(IMBALANCE_FOCUS_TYPES).describe("The primary issue to focus on: a disparity in strength levels or an incorrect ratio between same-level lifts."),
    insight: z.string().describe("A concise, AI-generated explanation of what the imbalance means."),
    recommendation: z.string().describe("A simple, AI-generated, actionable recommendation to address the imbalance."),
});

const StrengthImbalanceOutputSchema = z.object({
    summary: z.string().describe("A brief, high-level summary of the user's overall strength balance."),
    findings: z.array(ImbalanceFindingSchema).describe("A list of specific strength imbalances found."),
});
export type StrengthImbalanceOutput = z.infer<typeof StrengthImbalanceOutputSchema>;

// Configuration for each imbalance type
const IMBALANCE_CONFIG: Record<(typeof IMBALANCE_TYPES)[number], { lift1Options: string[], lift2Options: string[], targetRatioDisplay: string, ratioCalculation: (l1: number, l2: number) => number }> = {
    'Horizontal Push vs. Pull': { lift1Options: ['bench press', 'chest press', 'butterfly'], lift2Options: ['seated row', 'reverse fly', 'reverse flys'], targetRatioDisplay: '1:1', ratioCalculation: (l1, l2) => l1/l2 },
    'Vertical Push vs. Pull': { lift1Options: ['overhead press', 'shoulder press'], lift2Options: ['lat pulldown'], targetRatioDisplay: '0.75:1', ratioCalculation: (l1, l2) => l1/l2 },
    'Quad vs. Hamstring': { lift1Options: ['leg extension'], lift2Options: ['leg curl'], targetRatioDisplay: '1.33:1', ratioCalculation: (l1, l2) => l1/l2 },
    'Adductor vs. Abductor': { lift1Options: ['adductor'], lift2Options: ['abductor'], targetRatioDisplay: '0.8:1', ratioCalculation: (l1, l2) => l1/l2 },
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

    // Start with the first record as the initial best and reduce from there
    const bestRecord = relevantRecords.slice(1).reduce((best, current) => {
        const bestWeightKg = best.weightUnit === 'lbs' ? best.weight * 0.453592 : best.weight;
        const currentWeightKg = current.weightUnit === 'lbs' ? current.weight * 0.453592 : current.weight;
        return currentWeightKg > bestWeightKg ? current : best;
    }, relevantRecords[0]);

    return {
      ...bestRecord,
      date: new Date(bestRecord.date),
      id: Math.random().toString(), // add dummy id
    };
}

const ImbalanceDataForAISchema = z.object({
    imbalanceType: z.enum(IMBALANCE_TYPES),
    imbalanceFocus: z.enum(IMBALANCE_FOCUS_TYPES),
    lift1Name: z.string(),
    lift1Level: z.custom<StrengthLevel>(),
    lift2Name: z.string(),
    lift2Level: z.custom<StrengthLevel>(),
    insightFocus: z.string().describe("A clear instruction for the AI, guiding its insight generation."),
    recommendationFocus: z.string().describe("A clear instruction for the AI, guiding its recommendation (e.g., 'focus on bringing the lagging lift to an Intermediate level for health, not matching the elite lift')."),
});

const AIAnalysisResultSchema = z.object({
  imbalanceType: z.enum(IMBALANCE_TYPES).describe("The type of the imbalance this analysis is for. Must match one of the types from the input."),
  imbalanceFocus: z.enum(IMBALANCE_FOCUS_TYPES).describe("The type of focus for this analysis."),
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
    prompt: `You are an expert fitness coach acting as an analyst. Your role is to provide qualitative insights and recommendations based on pre-calculated data. **You MUST NOT perform any calculations or verify the data provided.** Your sole responsibility is to generate insightful, human-like commentary based on the data given to you.

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
  - **Focus Area:** {{{this.imbalanceFocus}}}
  - Lifts: {{{this.lift1Name}}} (Level: {{{this.lift1Level}}}) vs. {{{this.lift2Name}}} (Level: {{{this.lift2Level}}})
  - **System Insight Focus:** {{{this.insightFocus}}}
  - **System Recommendation Focus:** {{{this.recommendationFocus}}}
{{/each}}

**Your Task:**
For **each** of the imbalances listed above, you will provide expert commentary. Your output MUST be a single JSON object with a key "analyses", which is an array of objects. Each object must contain:
1.  **imbalanceType**: The exact string from the 'Imbalance Type' field.
2.  **imbalanceFocus**: The exact string from the 'Focus Area' field.
3.  **insight (1-2 sentences MAX):** A concise, expert insight that directly follows the 'System Insight Focus'. You MUST use the user's goals and the provided 'Focus Area' to make the insight personal.
4.  **recommendation (1-2 sentences MAX):** A simple, clear, and actionable recommendation that directly follows the 'System Recommendation Focus'. It must start with an action verb.

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
    const userProfileForLevels: UserProfile = {
        ...input.userProfile,
        id: "temp-id",
        name: "temp-user",
        email: "",
        joinedDate: new Date(),
        fitnessGoals: (input.userProfile.fitnessGoals || []).map(g => ({...g, id: 'temp-goal-id', achieved: false })),
        avatarUrl: undefined,
        strengthAnalysis: undefined,
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
        const lift1Level = getStrengthLevel(lift1, userProfileForLevels);
        const lift2Level = getStrengthLevel(lift2, userProfileForLevels);
        
        let targetRatioDisplay = config.targetRatioDisplay;
        let targetRatioValue: number | null = null;
        
        const staticRatioParts = config.targetRatioDisplay.split(':');
        if(staticRatioParts.length === 2 && !isNaN(parseFloat(staticRatioParts[0])) && !isNaN(parseFloat(staticRatioParts[1])) && parseFloat(staticRatioParts[1]) !== 0) {
            targetRatioValue = parseFloat(staticRatioParts[0]) / parseFloat(staticRatioParts[1]);
        }
        
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
                    targetRatioValue = targetLift1Weight / targetLift2Weight;
                    targetRatioDisplay = `${targetRatioValue.toFixed(2)}:1`;
                }
            }
        }

        let imbalanceFocus: 'Balanced' | 'Level Imbalance' | 'Ratio Imbalance' = 'Balanced';

        let ratioIsUnbalanced = false;
        if (targetRatioValue !== null) {
            const deviation = Math.abs(ratio - targetRatioValue);
            const tolerance = targetRatioValue * 0.10; // 10% tolerance
            ratioIsUnbalanced = deviation > tolerance;
        }

        if (lift1Level !== 'N/A' && lift2Level !== 'N/A' && lift1Level !== lift2Level) {
            imbalanceFocus = 'Level Imbalance';
        } else if (ratioIsUnbalanced) {
            imbalanceFocus = 'Ratio Imbalance';
        }
        
        let recommendationFocus = "";
        let insightFocus = "";

        if (imbalanceFocus === 'Level Imbalance') {
             const weakerLift = lift1WeightKg < lift2WeightKg ? lift1 : lift2; // Simplistic but ok for focus
             const weakerLevel = lift1WeightKg < lift2WeightKg ? lift1Level : lift2Level;
             const strongerLevel = lift1WeightKg < lift2WeightKg ? lift2Level : lift1Level;
             insightFocus = `Explain the risks of having a strength level disparity between these two lifts. Emphasize joint health.`;
             recommendationFocus = `The primary goal is to close the gap between strength tiers. Focus on bringing the weaker lift (${weakerLift.exerciseName}, currently ${weakerLevel}) up to the ${strongerLevel} level for better joint stability and balanced development.`;
        } else if (imbalanceFocus === 'Ratio Imbalance') { 
             const weakerLiftByRatio = ratio < targetRatioValue! ? lift1.exerciseName : lift2.exerciseName;
             insightFocus = `Both lifts are in the same tier, but their strength relationship is off. Explain why this specific ratio is important for performance and injury prevention.`;
             recommendationFocus = `Concentrate on improving the proportionally weaker lift (${weakerLiftByRatio}) to establish a healthy ratio before pushing both to the next strength level.`;
        } else { // Balanced
            const currentLevel = lift1Level; // They are the same level
            let nextLevel: string | null = null;
            if (currentLevel === 'Beginner') nextLevel = 'Intermediate';
            else if (currentLevel === 'Intermediate') nextLevel = 'Advanced';
            else if (currentLevel === 'Advanced') nextLevel = 'Elite';
            
            if (nextLevel && currentLevel !== 'Elite') {
                insightFocus = `The user's lifts are well-balanced with an excellent ratio. Explain that this is a great foundation for progressing to the next strength level.`;
                recommendationFocus = `The goal is to maintain this healthy ratio while using progressive overload to advance both lifts towards the ${nextLevel} level.`;
            } else if (currentLevel === 'Elite') {
                insightFocus = `These lifts are balanced at an Elite level. Explain the importance of maintaining this balance for peak performance and longevity.`;
                recommendationFocus = `The goal is to maintain this high level of strength and balance through consistent training.`;
            } else { // N/A
                insightFocus = `These lifts appear balanced, but their strength level could not be determined. Explain the importance of balance in general.`;
                recommendationFocus = `Focus on consistency and proper form.`;
            }
        }

        imbalancesForAI.push({
            imbalanceType: type,
            imbalanceFocus: imbalanceFocus,
            lift1Name: lift1.exerciseName,
            lift1Level: lift1Level,
            lift2Name: lift2.exerciseName,
            lift2Level: lift2Level,
            insightFocus,
            recommendationFocus,
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
            imbalanceFocus: imbalanceFocus,
        });
    }

    if (imbalancesForAI.length === 0) {
        return {
            summary: "Not enough data for AI analysis. Log personal records for opposing muscle groups (e.g., a push and a pull exercise) to get started.",
            findings: [],
        };
    }

    const { output: aiAnalyses } = await bulkInsightPrompt({
        imbalances: imbalancesForAI,
        userProfile: input.userProfile,
    });
    
    const finalFindings = calculatedFindings.map(finding => {
        const aiResult = aiAnalyses?.analyses.find(a => a.imbalanceType === finding.imbalanceType && a.imbalanceFocus === finding.imbalanceFocus);
        return {
            ...finding,
            insight: aiResult?.insight || "AI analysis could not be generated for this pair.",
            recommendation: aiResult?.recommendation || "Please consult a fitness professional for guidance.",
        };
    });
    
    let summary: string;
    if (finalFindings.some(f => f.imbalanceFocus !== 'Balanced')) {
        summary = "Analysis complete. Some potential strength imbalances were identified. See recommendations below.";
    } else {
        summary = "Great job! Your strength ratios appear to be well-balanced based on your logged personal records.";
    }

    return { summary, findings: finalFindings };
  }
);
