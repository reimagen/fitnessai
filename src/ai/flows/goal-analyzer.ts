
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
  relationshipToPrimary: z.enum(['Primary', 'Supports', 'Neutral', 'Conflicts']).optional().describe("How this goal relates to the primary goal. Set to 'Primary' for the main goal. For other goals, specify if they support, conflict with, or are neutral to the primary goal."),
  isVague: z.boolean().describe("Set to true if the goal lacks specific, measurable targets (e.g., 'tone up', 'get fit')."),
  suggestedGoal: z.string().describe("A more specific, measurable, achievable, relevant, and time-bound (SMART) version of the original goal. This is your key output."),
  analysis: z.string().describe("A concise (2-3 sentences) explanation of why the suggestion is a better-defined goal, tailored to the user's stats. You MUST explicitly mention the user's gender and/or experience level in your reasoning if they are provided."),
  suggestedTimelineInDays: z.number().optional().describe("If your 'suggestedGoal' includes a timeline (e.g., 'in 8 weeks', 'over 3 months'), you MUST calculate the total number of days and provide it here. Assume 1 month = 30 days and 1 week = 7 days. If no timeline is mentioned, omit this field."),
});

const AnalyzeFitnessGoalsOutputSchema = z.object({
    overallSummary: z.string().describe("A brief, encouraging, high-level summary (2-3 sentences) of the user's goals. You MUST acknowledge their primary goal. Mention if there are any major conflicts or areas for improvement."),
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
        prompt: `You are an expert fitness and nutrition coach specializing in GOAL SETTING. Your task is to analyze a user's fitness goals and refine them to be specific, measurable, achievable, relevant, and time-bound (SMART). You are NOT creating a workout plan; you are only refining the goal itself.

        **User's Stats (only use the data provided):**
        {{#if userProfile.gender}}- Gender: {{{userProfile.gender}}}{{else}}- Gender: Not Provided{{/if}}
        {{#if userProfile.age}}- Age: {{{userProfile.age}}}{{else}}- Age: Not Provided{{/if}}
        {{#if userProfile.weightValue}}- Weight: {{{userProfile.weightValue}}} {{{userProfile.weightUnit}}}{{else}}- Weight: Not Provided{{/if}}
        {{#if userProfile.bodyFatPercentage}}- Body Fat: {{{userProfile.bodyFatPercentage}}}%{{else}}- Body Fat: Not Provided{{/if}}
        {{#if userProfile.experienceLevel}}- Experience: {{{userProfile.experienceLevel}}}{{else}}- Experience: Not Provided{{/if}}
        
        **User's Goals:**
        {{#each userProfile.fitnessGoals}}
        - {{#if this.isPrimary}}**Primary:** {{/if}}{{{this.description}}}
        {{/each}}

        **Your Task:**
        Your output MUST be a JSON object. For each goal, provide a detailed analysis.

        **CRITICAL INSTRUCTIONS FOR YOUR ANALYSIS:**
        1.  **Respect The User's Original Intent**: Your primary directive is to make the user's goal SMART, not to change its fundamental nature.
            *   **Milestone Goals**: If a user's goal is to achieve a single milestone (e.g., "Do 1 pull-up", "Run a 5k"), your 'suggestedGoal' MUST focus on that single achievement. DO NOT escalate it to a volume-based goal.
                *   **GOOD Example**: Original: "Do a pull up". Suggested: "Achieve 1 strict, unassisted pull-up in 12 weeks."
                *   **BAD Example**: Original: "Do a pull up". Suggested: "Complete 3 sets of 5 pull-ups." This is incorrect as it changes the user's core objective from a milestone to a workout routine.
            *   **Vague Goals**: If a goal is vague like "Tone up", you should make it more concrete and measurable, like "Decrease body fat by 2% and increase squat strength by 15 lbs in 10 weeks."
        2.  **Handle Missing Data Gracefully**: If an optional field like 'Body Fat' is "Not Provided", you MUST still provide the best analysis possible with the available information. In your 'analysis' text, you can mention that providing more optional stats will yield even more personalized advice.
        3.  **Acknowledge Primary Goal**: In the 'overallSummary', you MUST start by acknowledging the user's primary goal.
        4.  **Determine Goal Relationships**: For each goal, you MUST determine its relationship to the primary goal.
            *   For the primary goal itself, you **MUST** set 'relationshipToPrimary' to "Primary".
            *   For other goals, you **MUST** set 'relationshipToPrimary' to "Supports", "Neutral", or "Conflicts". For example, "increase bench press" *Supports* a primary goal of "build muscle". "Improve flexibility" is likely *Neutral* to a primary goal of "lose 10 lbs".
        5.  **Provide Expanded Explanations**: In the 'analysis' for each suggestion, you MUST provide the "why" behind your numbers by referencing industry or science-backed data. Crucially, your analysis MUST explicitly incorporate the user's gender and/or experience level (if they are provided) to make it personal.
            *   **For "Lose Body Fat"**: If the user has provided a body fat percentage, use it. Your 'suggestedGoal' should be something like "Reduce body fat from 28% to 25% over the next 3 months." Your 'analysis' MUST then explain this by explicitly mentioning their gender (if available). Example for a Female user: "For women, a healthy body fat range is typically 25-31%. A 3% drop over 3 months is a safe, sustainable rate of fat loss, which is why aiming for 25% is an excellent and achievable first step for you." Example for a Male user: "For men, a healthy body fat range is 18-24%. Reducing your body fat by 3% over 3 months is a sustainable rate of fat loss that aligns with your intermediate level."
            *   **For "Build Muscle" - CRITICAL**: You MUST tailor your suggestion and analysis based on the user's gender and experience level (if provided).
                *   **Example for a Male User (Intermediate)**: 'suggestedGoal': "Gain 5-6 lbs of lean mass over the next 3 months." 'analysis': "As an intermediate male lifter, gaining 0.5 lbs per week is a realistic rate for lean muscle growth without excessive fat gain. This target of 5-6 lbs over 12 weeks aligns perfectly with that evidence-based approach."
                *   **Example for a Female User (Intermediate)**: 'suggestedGoal': "Gain 2-3 lbs of lean mass over the next 3 months." 'analysis': "For an intermediate female lifter, a sustainable rate of muscle gain is about 0.5-1 lb per month. This target of 2-3 lbs over 3 months is an excellent, evidence-based goal that prioritizes lean growth."
        6.  **Quantify Everything**: Always add numbers and timelines. Instead of "increase strength," say "Increase bench press by 20 lbs in 8 weeks."
        7.  **Calculate Timeline in Days**: If your 'suggestedGoal' includes a time frame (e.g., "in 8 weeks", "over 3 months"), you **MUST** calculate the total number of days for that timeline and put it in the 'suggestedTimelineInDays' field. Use the conversion: 1 week = 7 days, 1 month = 30 days. For example, "8 weeks" is 56 days. "3 months" is 90 days. "10 weeks" is 70 days. If your goal has no timeline, you must omit this field.
        8.  **Tailor to Experience**: Adjust timelines and targets based on the user's experience level (if provided). Beginners make faster progress. Advanced lifters have slower, more incremental goals.

        **Your Response Fields:**
        1.  **overallSummary**: A brief (2-3 sentence) high-level summary. Start with encouragement, acknowledge the primary goal, then mention if there are conflicts.
        2.  **goalInsights (Array)**: One object for EACH of the user's original goals.
            *   **originalGoalDescription**: The user's exact goal description.
            *   **isConflicting**: boolean
            *   **relationshipToPrimary**: 'Primary', 'Supports', 'Neutral', or 'Conflicts'.
            *   **isVague**: boolean
            *   **suggestedGoal**: Your SMART version of the goal.
            *   **analysis**: Your 2-3 sentence rationale for the suggestion, including scientific/industry context and explicit mention of the user's gender/experience if available.
            *   **suggestedTimelineInDays**: (Optional) number.
        `,
    });

    const { output } = await prompt(input);
    
    if (!output) {
      throw new Error("AI failed to generate a response for the goal analysis.");
    }
    
    return output;
  }
);
