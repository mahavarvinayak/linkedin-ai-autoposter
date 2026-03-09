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
  caption: z.string().describe('The engaging LinkedIn post caption with SEO optimization.'),
  hashtags: z.string().describe('A comma-separated string of 8-12 relevant, trending hashtags for the post.'),
  imagePrompt: z.string().describe('A detailed prompt for generating a professional LinkedIn-appropriate image.'),
});
export type GenerateLinkedInPostOutput = z.infer<typeof GenerateLinkedInPostOutputSchema>;

// Prompt definition
const generateLinkedInPostPrompt = ai.definePrompt({
  name: 'generateLinkedInPostPrompt',
  input: { schema: GenerateLinkedInPostInputSchema },
  output: { schema: GenerateLinkedInPostOutputSchema },
  prompt: `Generate a highly engaging, SEO-optimized LinkedIn post about {{{topic}}}.

CRITICAL REQUIREMENTS:
1. **SEO Optimization**: 
   - Use power words and industry keywords naturally
   - Include your main topic keyword in the first sentence
   - Write for high searchability on LinkedIn algorithm
   - Target career growth, professional development, or industry trends

2. **Engaging Content**:
   - Start with a strong, curiosity-driven hook
   - Include actionable insights or valuable takeaways
   - Use short paragraphs (2-3 lines max) for readability
   - Add emojis strategically (2-3 relevant ones)
   - End with a call-to-action or question to boost engagement

3. **LinkedIn Formatting**:
   - Conversational, professional tone
   - Break content into digestible chunks
   - Maximum length: 1300 characters
   - Write as if speaking to a professional audience

4. **Hashtags** (IMPORTANT):
   - Generate 8-12 trending, relevant hashtags
   - Mix of broad (#Leadership, #AI, #Technology) and niche hashtags
   - Only use hashtags that are genuinely relevant
   - Format: #Hashtag (no spaces)
   - These hashtags directly boost post visibility

5. **Image Generation Prompt**:
   - Create a detailed, professional image prompt
   - Should be LinkedIn-appropriate (professional, clean, modern)
   - Include specific visual elements that match the topic
   - Specify style: modern, professional, minimalist, or relevant to the topic
   - Must enhance the post's message visually

Output format exactly as shown:
---
Caption: [Your engaging, SEO-optimized post here]

Hashtags: #Hashtag1 #Hashtag2 #Hashtag3 #Hashtag4 #Hashtag5 #Hashtag6 #Hashtag7 #Hashtag8

ImagePrompt: [Detailed prompt for generating a professional image matching this post]
---`,
});

// Flow definition
const generateLinkedInPostFlow = ai.defineFlow(
  {
    name: 'generateLinkedInPostFlow',
    inputSchema: GenerateLinkedInPostInputSchema,
    outputSchema: GenerateLinkedInPostOutputSchema,
  },
  async (input: GenerateLinkedInPostInput = { topic: 'technology' }) => {
    const { output } = await generateLinkedInPostPrompt(input);
    if (!output) {
      throw new Error('Failed to generate LinkedIn post content.');
    }
    return output;
  }
);

// Wrapper function
export async function generateLinkedInPost(
  input?: GenerateLinkedInPostInput
): Promise<GenerateLinkedInPostOutput> {
  const finalInput: GenerateLinkedInPostInput = input ?? { topic: 'technology' };
  return generateLinkedInPostFlow(finalInput);
}
