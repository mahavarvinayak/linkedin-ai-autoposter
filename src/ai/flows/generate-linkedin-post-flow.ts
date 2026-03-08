'use server';
/**
 * @fileOverview A Genkit flow that generates an engaging LinkedIn post with a caption and relevant hashtags.
 *
 * - generateLinkedInPost - A function that handles the AI post generation process.
 * - GenerateLinkedInPostInput - The input type for the generateLinkedInPost function.
 * - GenerateLinkedInPostOutput - The return type for the generateLinkedInPost function.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';

// Input Schema
const GenerateLinkedInPostInputSchema = z.object({
  topic: z.string().describe('The main topic or theme for the LinkedIn post.'),
});
export type GenerateLinkedInPostInput = z.infer<typeof GenerateLinkedInPostInputSchema>;

// Output Schema
const GenerateLinkedInPostOutputSchema = z.object({
  caption: z.string().describe('The engaging LinkedIn post caption.'),
  hashtags: z.string().describe('A comma-separated string of relevant hashtags for the post, e.g., "#AI, #Technology, #Innovation".'),
});
export type GenerateLinkedInPostOutput = z.infer<typeof GenerateLinkedInPostOutputSchema>;

// Prompt definition
const generateLinkedInPostPrompt = ai.definePrompt({
  name: 'generateLinkedInPostPrompt',
  input: { schema: GenerateLinkedInPostInputSchema },
  output: { schema: GenerateLinkedInPostOutputSchema },
  prompt: `Generate a highly engaging LinkedIn post about {{{topic}}}.

The post must include:
* a strong hook
* value or insight
* conversational tone
* optimized LinkedIn formatting
* relevant hashtags

Maximum length: 1500 characters.

Output format:

Caption
Hashtags`,
});

// Flow definition
const generateLinkedInPostFlow = ai.defineFlow(
  {
    name: 'generateLinkedInPostFlow',
    inputSchema: GenerateLinkedInPostInputSchema,
    outputSchema: GenerateLinkedInPostOutputSchema,
  },
  async (input) => {
    const { output } = await generateLinkedInPostPrompt(input);
    if (!output) {
      throw new Error('Failed to generate LinkedIn post content.');
    }
    return output;
  }
);

// Wrapper function
export async function generateLinkedInPost(
  input: GenerateLinkedInPostInput
): Promise<GenerateLinkedInPostOutput> {
  return generateLinkedInPostFlow(input);
}
