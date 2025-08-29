
'use server';
/**
 * @fileOverview Analyzes a user's fitness goals for conflicts, specificity, and achievability.
 *
 * - analyzeFitnessGoals - A function that handles the goal analysis.
 * - AnalyzeFitnessGoalsInput - The input type for the function.
 * - AnalyzeFitnessGoalsOutput - The return type for the function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

// --- Zod Schemas and Types ---

const FitnessGoalForAnalysisSchema = z.object({
  description: z.string().describe("A specific fitness goal for the user."),
  isPrimary: z.boolean().optional().describe("Whether this is the user's primary goal."),
});

const UserProfileForAnalysisSchema = z.object({
    age: z.number().optional().describe("The user's age."),
    gender: z.enum(['Male', 'Female']).optional().describe("The user's gender."),
    weightValue: z.number().optional().describe("The user's weight value."),
    weightUnit: z.enum(['kg', 'lbs']).optional().describe("The user's weight unit."),
    bodyFatPercentage: z.number().optional().describe("The user's estimated body fat percentage."),
    experienceLevel: z.enum(['beginner', 'intermediate', 'advanced']).optional().describe("The user's self-reported experience level."),
    fitnessGoals: z.array(FitnessGoalForAnalysisSchema).describe("The user's active fitness goals."),
});

const AnalyzeFitnessGoalsInputSchema = z.object({
  userProfile: UserProfileForAnalysisSchema.describe("The user's personal statistics and goals."),
});
export type AnalyzeFitnessGoalsInput = z.infer<typeof AnalyzeFitnessGoalsInputSchema>;


const GoalInsightSchema = z.object({
  originalGoalDescription: z.string().describe("The exact description of the original goal this insight pertains to."),
  isConflicting: z.boolean().describe("Set to true if this goal directly conflicts with another goal (e.g., aggressive weight loss and significant muscle gain)."),
  isVague: z.boolean().describe("Set to true if the goal lacks specific, measurable targets (e.g., 'tone up', 'get fit')."),
  suggestedGoal: z.string().describe("A more specific, measurable, achievable, relevant, and time-bound (SMART) version of the original goal. This is your key output."),
  analysis: z.string().describe("A concise (1-2 sentences) explanation of why the suggestion is better, tailored to the user's stats. Explain the reasoning behind the numbers you suggest."),
});

const AnalyzeFitnessGoalsOutputSchema = z.object({
    overallSummary: z.string().describe("A brief, encouraging, high-level summary (2-3 sentences) of the user's goals. Mention if there are any major conflicts or areas for improvement."),
    goalInsights: z.array(GoalInsightSchema).describe("A list of specific insights, one for each of the user's original goals."),
});
export type AnalyzeFitnessGoalsOutput = z.infer<typeof AnalyzeFitnessGoalsOutputSchema>;

// --- Main Action Function ---

export async function analyzeFitnessGoals(input: AnalyzeFitnessGoalsInput): Promise<AnalyzeFitnessGoalsOutput> {
  if (!input.userProfile.fitnessGoals || input.userProfile.fitnessGoals.length === 0) {
    return {
      overallSummary: "No active goals found to analyze. Add some goals to get started!",
      goalInsights: [],
    };
  }
  return analyzeFitnessGoalsFlow(input);
}

// --- Genkit Flow Definition ---

const analyzeFitnessGoalsFlow = ai.defineFlow(
  {
    name: 'analyzeFitnessGoalsFlow',
    inputSchema: AnalyzeFitnessGoalsInputSchema,
    outputSchema: AnalyzeFitnessGoalsOutputSchema,
  },
  async (input) => {
    
    // --- AI Prompting Step ---
    const prompt = ai.definePrompt({
        name: 'goalAnalysisPrompt',
        output: { schema: AnalyzeFitnessGoalsOutputSchema },
        prompt: `You are an expert fitness and nutrition coach. Your task is to analyze a user's fitness goals based on their personal statistics. You must make their goals more specific, measurable, achievable, relevant, and time-bound (SMART).

        **User's Stats:**
        - Gender: {{{userProfile.gender}}}
        - Age: {{{userProfile.age}}}
        - Weight: {{{userProfile.weightValue}}} {{{userProfile.weightUnit}}}
        - Body Fat: {{{userProfile.bodyFatPercentage}}}%
        - Experience: {{{userProfile.experienceLevel}}}
        
        **User's Goals:**
        {{#each userProfile.fitnessGoals}}
        - {{#if this.isPrimary}}**Primary:** {{/if}}{{{this.description}}}
        {{/each}}

        **Your Task:**
        Your output MUST be a JSON object. For each goal, provide a detailed analysis.

        **CRITICAL INSTRUCTIONS FOR YOUR ANALYSIS:**
        1.  **Identify Conflicts**: First, check if any goals are in direct conflict. The most common conflict is aggressive fat loss simultaneously with significant muscle gain. If you find a conflict, set 'isConflicting' to true for the relevant goals and explain in the 'analysis' why they conflict and suggest prioritizing one.
        2.  **Make Vague Goals Specific**: Many goals will be vague (e.g., "build muscle", "lose body fat", "tone up"). You MUST make them specific using the user's stats.
            *   **For "Lose Body Fat"**: Use the provided body fat percentage. Suggest a realistic target. For a female with 28% body fat, a good initial goal is to aim for 24-25%. A male at 20% might aim for 15-16%. Your 'suggestedGoal' should be something like "Reduce body fat from 28% to 25% over the next 3 months." Your 'analysis' must explain *why* this is a healthy and sustainable target.
            *   **For "Build Muscle"**: This is often tied to weight gain. Suggest a realistic rate of weight gain. For a beginner, suggest gaining 0.5-1.0 lbs per week. Your 'suggestedGoal' should be "Gain 5-6 lbs of lean mass over the next 3 months by increasing weight to approximately [current weight + 5] lbs."
            *   **For "Tone Up"**: This is usually a combination of fat loss and slight muscle gain (body recomposition). Frame the 'suggestedGoal' around metrics, like "Decrease body fat by 2% and increase squat strength by 15 lbs in 10 weeks."
        3.  **Quantify Everything**: Always add numbers and timelines. Instead of "increase strength," say "Increase bench press by 20 lbs in 8 weeks."
        4.  **Tailor to Experience**: Adjust timelines and targets based on the user's experience level. Beginners make faster progress. Advanced lifters have slower, more incremental goals.
        5.  **Be Realistic**: Ensure the suggested goals are achievable. Do not suggest dangerously rapid weight loss or unrealistic strength gains.

        **Your Response Fields:**
        1.  **overallSummary**: A brief (2-3 sentence) high-level summary. Start with encouragement, then mention if there are conflicts or if goals could be more specific.
        2.  **goalInsights (Array)**: One object for EACH of the user's original goals.
            *   **originalGoalDescription**: The user's exact goal description.
            *   **isConflicting**: boolean
            *   **isVague**: boolean
            *   **suggestedGoal**: Your SMART version of the goal.
            *   **analysis**: Your 1-2 sentence rationale for the suggestion.
        `,
    });

    const { output } = await prompt(input);
    
    if (!output) {
      throw new Error("AI failed to generate a response for the goal analysis.");
    }
    
    return output;
  }
);
