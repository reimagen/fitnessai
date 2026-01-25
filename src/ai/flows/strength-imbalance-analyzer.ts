
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
import type { StrengthLevel } from '@/lib/types';

const FitnessGoalForAnalysisSchema = z.object({
  description: z.string().describe("A specific fitness goal for the user."),
  isPrimary: z.boolean().optional().describe("Whether this is the user's primary goal."),
});

const UserProfileForAnalysisSchema = z.object({
    age: z.number().optional().describe("The user's age."),
    gender: z.string().optional().describe("The user's gender."),
    weightValue: z.number().optional().describe("The user's weight value."),
    weightUnit: z.enum(['kg', 'lbs']).optional().describe("The user's weight unit."),
    skeletalMuscleMassValue: z.number().optional().describe("The user's skeletal muscle mass value."),
    skeletalMuscleMassUnit: z.enum(['kg', 'lbs']).optional().describe("The user's skeletal muscle mass unit."),
    fitnessGoals: z.array(FitnessGoalForAnalysisSchema).optional().describe("The user's active fitness goals."),
});

const IMBALANCE_TYPES = [
    'Horizontal Push vs. Pull',
    'Vertical Push vs. Pull',
    'Hamstring vs. Quad',
    'Adductor vs. Abductor',
] as const;

const IMBALANCE_FOCUS_TYPES = ['Balanced', 'Level Imbalance', 'Ratio Imbalance'] as const;

const ClientSideFindingSchema = z.object({
    imbalanceType: z.enum(IMBALANCE_TYPES),
    lift1Name: z.string(),
    lift1Weight: z.number(),
    lift1Unit: z.enum(['kg', 'lbs']),
    lift1Level: z.custom<StrengthLevel>(),
    lift2Name: z.string(),
    lift2Weight: z.number(),
    lift2Unit: z.enum(['kg', 'lbs']),
    lift2Level: z.custom<StrengthLevel>(),
    userRatio: z.string(),
    targetRatio: z.string(),
    balancedRange: z.string(),
    imbalanceFocus: z.enum(IMBALANCE_FOCUS_TYPES),
});

const StrengthImbalanceInputSchema = z.object({
  userProfile: UserProfileForAnalysisSchema.describe("The user's personal statistics and goals."),
  clientSideFindings: z.array(ClientSideFindingSchema).describe("The pre-calculated strength balance findings from the client-side application. This is the source of truth."),
});
export type StrengthImbalanceInput = z.infer<typeof StrengthImbalanceInputSchema>;


const ImbalanceFindingSchema = z.object({
    imbalanceType: z.enum(IMBALANCE_TYPES).describe("The type of strength imbalance. Must be one of the predefined types."),
    lift1Name: z.string().describe("The name of the first exercise in the comparison."),
    lift1Weight: z.number().describe("The weight of the first exercise PR."),
    lift1Unit: z.enum(['kg', 'lbs']).describe("The weight unit for the first exercise."),
    lift2Name: z.string().describe("The name of the second, opposing exercise in the comparison."),
    lift2Weight: z.number().describe("The weight of the second exercise PR."),
    lift2Unit: z.enum(['kg', 'lbs']).describe("The weight unit for the second exercise."),
    userRatio: z.string().describe("The user's calculated strength ratio, formatted as 'X : Y'."),
    targetRatio: z.string().describe("The target or ideal ratio, formatted as 'X:1'."),
    balancedRange: z.string().describe("The ideal or target strength ratio, formatted as 'X-Y:1'."),
    imbalanceFocus: z.enum(IMBALANCE_FOCUS_TYPES).describe("The primary issue to focus on: a disparity in strength levels or an incorrect ratio between same-level lifts."),
    insight: z.string().describe("A concise, AI-generated explanation of what the imbalance means."),
    recommendation: z.string().describe("A simple, AI-generated, actionable recommendation to address the imbalance."),
});

const StrengthImbalanceOutputSchema = z.object({
    summary: z.string().describe("A brief, high-level summary of the user's overall strength balance."),
    findings: z.array(ImbalanceFindingSchema).describe("A list of specific strength imbalances found."),
});
export type StrengthImbalanceOutput = z.infer<typeof StrengthImbalanceOutputSchema>;


export async function analyzeStrengthImbalances(input: StrengthImbalanceInput): Promise<StrengthImbalanceOutput> {
  if (input.clientSideFindings.length < 1) {
      return {
          summary: "Not enough data for AI analysis. Please log at least one personal record with weight.",
          findings: [],
      };
  }
  return strengthImbalanceFlow(input);
}


const ImbalanceDataForAISchema = z.object({
    imbalanceType: z.enum(IMBALANCE_TYPES),
    imbalanceFocus: z.enum(IMBALANCE_FOCUS_TYPES),
    proximity: z.enum(['Significant', 'Close', 'Balanced']).describe("How close the user's ratio is to the balanced range."),
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
  - **Proximity to Balance:** {{{this.proximity}}}
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
- **TAILOR TONE TO PROXIMITY - CRITICAL**: You MUST adjust your tone based on the 'Proximity to Balance' field.
    - If Proximity is **'Significant'**, your tone should be direct about the risks of the imbalance and the importance of addressing it. Example: "A significant imbalance like this can increase injury risk..."
    - If Proximity is **'Close'**, your tone MUST be encouraging and motivational. Acknowledge their progress. Example: "You're very close to achieving a healthy balance! A small focus on..."
    - If Proximity is **'Balanced'**, your tone should be positive and reinforcing. Congratulate the user. Example: "Excellent work maintaining this balance..."
`,
});

const strengthLevelRanks: Record<StrengthLevel, number> = {
    'Beginner': 0,
    'Intermediate': 1,
    'Advanced': 2,
    'Elite': 3,
    'N/A': -1,
};

const strengthImbalanceFlow = ai.defineFlow(
  {
    name: 'strengthImbalanceFlow',
    inputSchema: StrengthImbalanceInputSchema,
    outputSchema: StrengthImbalanceOutputSchema,
  },
  async (input) => {
    
    const imbalancesForAI: z.infer<typeof ImbalanceDataForAISchema>[] = [];

    for (const finding of input.clientSideFindings) {
        let recommendationFocus = "";
        let insightFocus = "";
        let proximity: 'Significant' | 'Close' | 'Balanced' = 'Balanced';

        if (finding.imbalanceFocus === 'Ratio Imbalance') {
             const userRatioNum = parseFloat(finding.userRatio.split(':')[0]);
             const rangeParts = finding.balancedRange.replace(':1', '').split('-');
             const lowerBound = parseFloat(rangeParts[0]);
             const upperBound = parseFloat(rangeParts[1]);
             
             const distanceToLower = Math.abs(userRatioNum - lowerBound);
             const distanceToUpper = Math.abs(userRatioNum - upperBound);
             const minDistance = Math.min(distanceToLower, distanceToUpper);

             if (userRatioNum < lowerBound || userRatioNum > upperBound) {
                 proximity = minDistance <= 0.05 ? 'Close' : 'Significant';
             }
             
             const weakerLiftByRatio = userRatioNum < lowerBound ? finding.lift1Name : finding.lift2Name;

             if (proximity === 'Close') {
                insightFocus = `The user is very close to a balanced ratio. Explain why achieving this final bit of balance is key for optimal performance and injury prevention.`;
                recommendationFocus = `Adopt a motivational tone. Encourage the user that they are almost there. Suggest a small, focused increase on the proportionally weaker lift (${weakerLiftByRatio}) to close the final gap.`;
             } else { // Significant
                insightFocus = `The user has a significant ratio imbalance. Explain the potential risks (e.g., joint stress, performance plateaus) associated with this specific imbalance.`;
                recommendationFocus = `Prioritize correcting the imbalance. Recommend focusing on strengthening the proportionally weaker lift (${weakerLiftByRatio}) to bring it into the balanced range.`;
             }
        } else if (finding.imbalanceFocus === 'Level Imbalance') {
             proximity = 'Significant'; // Level imbalances are always considered significant
             const isLift1Weaker = strengthLevelRanks[finding.lift1Level] < strengthLevelRanks[finding.lift2Level];
             const weakerLiftName = isLift1Weaker ? finding.lift1Name : finding.lift2Name;
             const weakerLevel = isLift1Weaker ? finding.lift1Level : finding.lift2Level;
             const strongerLevel = isLift1Weaker ? finding.lift2Level : finding.lift1Level;
             
             insightFocus = `Explain the risks of having a strength level disparity between these two lifts. Emphasize joint health.`;
             recommendationFocus = `The primary goal is to close the gap between strength tiers. Focus on bringing the weaker lift (${weakerLiftName}, currently ${weakerLevel}) up to the ${strongerLevel} level for better joint stability and balanced development.`;
        } else { // Balanced
            const currentLevel = finding.lift1Level;
            proximity = 'Balanced';
            if (currentLevel === 'Elite') {
                insightFocus = `These lifts are balanced at an Elite level. Explain the importance of maintaining this balance for peak performance and longevity.`;
                recommendationFocus = `The goal is to maintain this high level of strength and balance through consistent training.`;
            } else if (currentLevel !== 'N/A') {
                let nextLevel: string | null = null;
                if (currentLevel === 'Beginner') nextLevel = 'Intermediate';
                else if (currentLevel === 'Intermediate') nextLevel = 'Advanced';
                else if (currentLevel === 'Advanced') nextLevel = 'Elite';

                insightFocus = `The user's lifts are well-balanced with an excellent ratio. Explain that this is a great foundation for progressing to the next strength level.`;
                recommendationFocus = `The goal is to maintain this healthy ratio while using progressive overload to advance both lifts towards the ${nextLevel} level.`;
            } else { // N/A
                insightFocus = `These lifts appear balanced, but their strength level could not be determined. Explain the importance of balance in general.`;
                recommendationFocus = `Focus on consistency and proper form.`;
            }
        }

        imbalancesForAI.push({
            imbalanceType: finding.imbalanceType,
            imbalanceFocus: finding.imbalanceFocus,
            proximity: proximity,
            lift1Name: finding.lift1Name,
            lift1Level: finding.lift1Level,
            lift2Name: finding.lift2Name,
            lift2Level: finding.lift2Level,
            insightFocus,
            recommendationFocus,
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
    
    const finalFindings = input.clientSideFindings.map(finding => {
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
