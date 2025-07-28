'use server';

/**
 * @fileOverview A flow to convert speech to text.
 *
 * - speechToText - A function that converts audio data to text.
 * - SpeechToTextInput - The input type for the speechToText function.
 * - SpeechToTextOutput - The return type for the speechToText function.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';

export const SpeechToTextInputSchema = z.string().describe(
  "A base64 encoded audio file as a data URI that must include a MIME type. Expected format: 'data:<mimetype>;base64,<encoded_data>'."
);
export type SpeechToTextInput = z.infer<typeof SpeechToTextInputSchema>;

export const SpeechToTextOutputSchema = z.object({
  transcript: z.string().optional().describe('The transcribed text.'),
  error: z.string().optional().describe('An error message if transcription fails.'),
});
export type SpeechToTextOutput = z.infer<typeof SpeechToTextOutputSchema>;

export async function speechToText(
  input: SpeechToTextInput
): Promise<SpeechToTextOutput> {
  return speechToTextFlow(input);
}

const speechToTextFlow = ai.defineFlow(
  {
    name: 'speechToTextFlow',
    inputSchema: SpeechToTextInputSchema,
    outputSchema: SpeechToTextOutputSchema,
  },
  async (audioDataUri) => {
    try {
      const { text } = await ai.generate({
        model: 'googleai/gemini-2.0-flash',
        prompt: [
          {
            text: 'Transcribe the following audio. Only return the transcribed text, with no additional commentary.',
          },
          { media: { url: audioDataUri } },
        ],
      });
      return { transcript: text };
    } catch (e) {
      console.error('Speech-to-text failed', e);
      const errorMessage = e instanceof Error ? e.message : 'An unknown error occurred during transcription.';
      return { error: errorMessage };
    }
  }
);
