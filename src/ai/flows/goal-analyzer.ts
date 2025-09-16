
'use server';
/**
 * @fileOverview Analyzes a user's fitness goals for conflicts, specificity, and achievability, using their performance history for context.
 *
 * - analyzeFitnessGoals - A function that handles the goal analysis.
 * - AnalyzeFitnessGoalsInput - The input type for the function.
 * - AnalyzeFitnessGoalsOutput - The return type for the function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

// --- Zod Schemas and Types ---

const AnalyzeFitnessGoalsInputSchema = z.object({
  userProfileContext: z.string().describe("A comprehensive string containing the user's fitness goals, personal statistics, relevant personal records, recent workout history summaries, and recently achieved goals to be used for the goal analysis."),
});
export type AnalyzeFitnessGoalsInput = z.infer<typeof AnalyzeFitnessGoalsInputSchema>;


const GoalInsightSchema = z.object({
  originalGoalDescription: z.string().describe("The exact description of the original goal this insight pertains to."),
  isConflicting: z.boolean().describe("Set to true if this goal directly conflicts with another goal (e.g., aggressive weight loss and significant muscle gain)."),
  relationshipToPrimary: z.enum(['Primary', 'Supports', 'Neutral', 'Conflicts']).optional().describe("How this goal relates to the primary goal. Set to 'Primary' for the main goal. For other goals, specify if they support, conflict with, or are neutral to the primary goal."),
  isVague: z.boolean().describe("Set to true if the goal lacks specific, measurable targets (e.g., 'tone up', 'get fit')."),
  suggestedGoal: z.string().describe("A more specific, measurable, achievable, relevant, and time-bound (SMART) version of the original goal. This is your key output."),
  analysis: z.string().describe("A concise (2-3 sentences) explanation of why the suggestion is a better-defined goal, tailored to the user's stats and performance history. You MUST explicitly mention the user's gender, experience level, or recent performance data in your reasoning if they are provided."),
  suggestedTimelineInDays: z.number().optional().describe("If your 'suggestedGoal' includes a timeline (e.g., 'in 8 weeks', 'over 3 months'), you MUST calculate the total number of days and provide it here. Assume 1 month = 30 days and 1 week = 7 days. If no timeline is mentioned, omit this field."),
});

const AnalyzeFitnessGoalsOutputSchema = z.object({
    overallSummary: z.string().describe("A brief, encouraging, high-level summary (2-3 sentences) of the user's goals. You MUST acknowledge their primary goal. Mention if there are any major conflicts or areas for improvement."),
    goalInsights: z.array(GoalInsightSchema).describe("A list of specific insights, one for each of the user's original goals."),
});
export type AnalyzeFitnessGoalsOutput = z.infer<typeof AnalyzeFitnessGoalsOutputSchema>;

// --- Main Action Function ---

export async function analyzeFitnessGoals(input: AnalyzeFitnessGoalsInput): Promise<AnalyzeFitnessGoalsOutput> {
  if (!input.userProfileContext) {
    return {
      overallSummary: "No user context provided. Cannot perform analysis.",
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

        **User's Profile and Performance Context:**
        {{{userProfileContext}}}

        **Your Task:**
        Your output MUST be a JSON object. For each goal, provide a detailed analysis.

        **CRITICAL INSTRUCTIONS FOR YOUR ANALYSIS:**
        1.  **Prioritize Recent Achievements**: Before any other data, you MUST check the 'Recently Achieved Goals' section. If an active goal is a direct progression from a recently achieved one (e.g., active goal "do 5 pull-ups" and recent achievement "do 1 pull-up"), you MUST propose a significantly shorter and more aggressive timeline. It is a major failure to suggest a long, beginner-style timeline in this scenario. Your 'analysis' text MUST explicitly state that the shorter timeline is due to their recent success.
        2.  **Use Performance Data Second**: If no recent achievement is relevant, your next most important task is to base your timeline and goal suggestions on the user's actual performance data provided in the context (Personal Records and Workout History).
            *   **Timeline Calculation**: If the context includes a relevant PR (e.g., a "Lat Pulldown" PR for a "do a pull-up" goal) or a recent workout summary (e.g., "average run distance 3.5 miles" for a "run 5 miles" goal), you **MUST** use this information to create a realistic timeline. A user who is closer to their goal should have a shorter timeline.
            *   **Reference the Data**: In your 'analysis' text, you **MUST** explicitly reference the performance data you used. For example: "Since your Lat Pulldown PR is already close to your bodyweight, achieving your first pull-up is a realistic short-term goal." or "Based on your consistent 3.5-mile runs, progressing to 5 miles over the next 6 weeks is an achievable target."
        3.  **Respect The User's Original Intent**: Your primary directive is to make the user's goal SMART, not to change its fundamental nature.
            *   **Milestone Goals**: If a user's goal is to achieve a single milestone (e.g., "Do 1 pull-up", "Run a 5k"), your 'suggestedGoal' MUST focus on that single achievement. DO NOT escalate it to a volume-based goal.
                *   **GOOD Example**: Original: "Do a pull up". Suggested: "Achieve 1 strict, unassisted pull-up in 12 weeks."
                *   **BAD Example**: Original: "Do a pull up". Suggested: "Complete 3 sets of 5 pull-ups." This is incorrect as it changes the user's core objective from a milestone to a workout routine.
            *   **Vague Goals**: If a goal is vague like "Tone up", you should make it more concrete and measurable, like "Decrease body fat by 2% and increase squat strength by 15 lbs in 10 weeks."
        4.  **Handle Missing Data Gracefully**: If an optional field like 'Body Fat' is "Not Provided", you MUST still provide the best analysis possible with the available information. In your 'analysis' text, you can mention that providing more optional stats will yield even more personalized advice.
        5.  **Acknowledge Primary Goal**: In the 'overallSummary', you MUST start by acknowledging the user's primary goal.
        6.  **Determine Goal Relationships**: For each goal, you MUST determine its relationship to the primary goal.
            *   For the primary goal itself, you **MUST** set 'relationshipToPrimary' to "Primary".
            *   For other goals, you **MUST** set 'relationshipToPrimary' to "Supports", "Neutral", or "Conflicts". For example, "increase bench press" *Supports* a primary goal of "build muscle". "Improve flexibility" is likely *Neutral* to a primary goal of "lose 10 lbs".
        7.  **Provide Expanded Explanations**: In the 'analysis' for each suggestion, you MUST provide the "why" behind your numbers by referencing industry or science-backed data. Crucially, your analysis MUST explicitly incorporate the user's gender and/or experience level (if they are provided) to make it personal.
            *   **For "Lose Body Fat"**: If the user has provided a body fat percentage, use it. Your 'suggestedGoal' should be something like "Reduce body fat from 28% to 25% over the next 3 months." Your 'analysis' MUST then explain this by explicitly mentioning their gender (if available). Example for a Female user: "For women, a healthy body fat range is typically 25-31%. A 3% drop over 3 months is a safe, sustainable rate of fat loss, which is why aiming for 25% is an excellent and achievable first step for you." Example for a Male user: "For men, a healthy body fat range is 18-24%. Reducing your body fat by 3% over 3 months is a sustainable rate of fat loss that aligns with your intermediate level."
            *   **For "Build Muscle" - CRITICAL**: You MUST tailor your suggestion and analysis based on the user's gender and experience level (if provided).
                *   **Example for a Male User (Intermediate)**: 'suggestedGoal': "Gain 5-6 lbs of lean mass over the next 3 months." 'analysis': "As an intermediate male lifter, gaining 0.5 lbs per week is a realistic rate for lean muscle growth without excessive fat gain. This target of 5-6 lbs over 12 weeks aligns perfectly with that evidence-based approach."
                *   **Example for a Female User (Intermediate)**: 'suggestedGoal': "Gain 2-3 lbs of lean mass over the next 3 months." 'analysis': "For an intermediate female lifter, a sustainable rate of muscle gain is about 0.5-1 lb per month. This target of 2-3 lbs over 3 months is an excellent, evidence-based goal that prioritizes lean growth."
        8.  **Quantify Everything**: Always add numbers and timelines. Instead of "increase strength," say "Increase bench press by 20 lbs in 8 weeks."
        9.  **Calculate Timeline in Days**: If your 'suggestedGoal' includes a time frame (e.g., "in 8 weeks", "over 3 months"), you **MUST** calculate the total number of days for that timeline and put it in the 'suggestedTimelineInDays' field. Use the conversion: 1 week = 7 days, 1 month = 30 days. For example, "8 weeks" is 56 days. "3 months" is 90 days. "10 weeks" is 70 days. If your goal has no timeline, you must omit this field.
        10. **Tailor to Experience**: Adjust timelines and targets based on the user's experience level (if provided). Beginners make faster progress. Advanced lifters have slower, more incremental goals. 

        **Your Response Fields:**
        1.  **overallSummary**: A brief (2-3 sentence) high-level summary. Start with encouragement, acknowledge the primary goal, then mention if there are conflicts.
        2.  **goalInsights (Array)**: One object for EACH of the user's original goals.
            *   **originalGoalDescription**: The user's exact goal description.
            *   **isConflicting**: boolean
            *   **relationshipToPrimary**: 'Primary', 'Supports', 'Neutral', or 'Conflicts'.
            *   **isVague**: boolean
            *   **suggestedGoal**: Your SMART version of the goal.
            *   **analysis**: Your 2-3 sentence rationale for the suggestion, including scientific/industry context and explicit mention of the user's gender, experience, or performance data if available.
            *   **suggestedTimelineInDays**: (Optional) number.
        `,
        config: {
          safetySettings: [
            { category: 'HARM_CATEGORY_DANGEROUS_CONTENT', threshold: 'BLOCK_ONLY_HIGH' },
            { category: 'HARM_CATEGORY_HATE_SPEECH', threshold: 'BLOCK_ONLY_HIGH' },
            { category: 'HARM_CATEGORY_HARASSMENT', threshold: 'BLOCK_ONLY_HIGH' },
            { category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT', threshold: 'BLOCK_ONLY_HIGH' },
          ],
        },
    });

    const { output } = await prompt(input);
    
    if (!output) {
      throw new Error("AI failed to generate a response for the goal analysis.");
    }
    
    return output;
  }
);
