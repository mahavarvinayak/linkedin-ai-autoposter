'use server';
/**
 * @fileOverview A Genkit flow for generating engaging LinkedIn posts using AI.
 *
 * - scheduleDailyAIPost - A function that triggers the AI generation of a LinkedIn post.
 * - ScheduleDailyAIPostInput - The input type for the scheduleDailyAIPost function.
 * - ScheduleDailyAIPostOutput - The return type for the scheduleDailyAIPost function.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';

const ScheduleDailyAIPostInputSchema = z.object({
  postCategory: z
    .string()
    .describe('The category or topic for the LinkedIn post generation (e.g., technology, startups, AI).'),
});
export type ScheduleDailyAIPostInput = z.infer<typeof ScheduleDailyAIPostInputSchema>;

const ScheduleDailyAIPostOutputSchema = z.object({
  caption: z.string().describe('The engaging LinkedIn post caption, maximum 1500 characters.'),
  hashtags: z.array(z.string()).describe('A list of 5-10 relevant hashtags for the post.'),
});
export type ScheduleDailyAIPostOutput = z.infer<typeof ScheduleDailyAIPostOutputSchema>;

export async function scheduleDailyAIPost(
  input: ScheduleDailyAIPostInput
): Promise<ScheduleDailyAIPostOutput> {
  return scheduleDailyAIPostFlow(input);
}

const scheduleDailyAIPostPrompt = ai.definePrompt({
  name: 'scheduleDailyAIPostPrompt',
  input: { schema: ScheduleDailyAIPostInputSchema },
  output: { schema: ScheduleDailyAIPostOutputSchema },
  prompt: `As an expert LinkedIn content creator, generate a highly engaging LinkedIn post focusing on the category: "{{{postCategory}}}".

The post must:
- Start with a strong, attention-grabbing hook.
- Provide valuable industry insight or a thought-provoking idea.
- Maintain a conversational yet professional tone.
- Be optimized for LinkedIn formatting (e.g., concise paragraphs).
- Have a maximum caption length of 1500 characters.
- Include 5-10 highly relevant hashtags.

Respond strictly in JSON format with two keys: "caption" for the post text and "hashtags" as a JSON array of strings.`,
});

const scheduleDailyAIPostFlow = ai.defineFlow(
  {
    name: 'scheduleDailyAIPostFlow',
    inputSchema: ScheduleDailyAIPostInputSchema,
    outputSchema: ScheduleDailyAIPostOutputSchema,
  },
  async (input) => {
    const { output } = await scheduleDailyAIPostPrompt(input);
    // Genkit expects the model to return JSON directly when an output schema is provided.
    // The prompt guides the model to produce the correct JSON structure.
    return output!;
  }
);
