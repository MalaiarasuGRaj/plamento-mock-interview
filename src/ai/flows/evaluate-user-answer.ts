'use server';

/**
 * @fileOverview A flow to evaluate user answers during a mock interview.
 *
 * - evaluateUserAnswer - A function that evaluates the user's answer.
 * - EvaluateUserAnswerInput - The input type for the evaluateUserAnswer function.
 * - EvaluateUserAnswerOutput - The return type for the evaluateUserAnswer function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const EvaluateUserAnswerInputSchema = z.object({
  question: z.string().describe('The interview question asked.'),
  expectedKeywords: z.string().describe('Expected keywords in the answer.'),
  answerTranscript: z.string().describe('The transcript of the user\'s answer.'),
});
export type EvaluateUserAnswerInput = z.infer<typeof EvaluateUserAnswerInputSchema>;

const EvaluateUserAnswerOutputSchema = z.object({
  relevance_score: z.number().describe('Relevance score (out of 10).'),
  fluency_score: z.number().describe('Fluency score (out of 10).'),
  confidence_score: z.number().describe('Confidence score (out of 10).'),
  total_score: z.number().describe('Total score (average of the above).'),
  feedback: z.string().describe('Short suggestion for improvement.'),
});
export type EvaluateUserAnswerOutput = z.infer<typeof EvaluateUserAnswerOutputSchema>;

export async function evaluateUserAnswer(input: EvaluateUserAnswerInput): Promise<EvaluateUserAnswerOutput> {
  return evaluateUserAnswerFlow(input);
}

const evaluateUserAnswerPrompt = ai.definePrompt({
  name: 'evaluateUserAnswerPrompt',
  input: {schema: EvaluateUserAnswerInputSchema},
  output: {schema: EvaluateUserAnswerOutputSchema},
  prompt: `You are an interview evaluator. Rate the following answer:\n\nQuestion:\n{{QUESTION}}\n\nExpected Keywords:\n{{EXPECTED_KEYWORDS}}\n\nUser’s Answer:\n"""\n{{ANSWER_TRANSCRIPT}}\n"""\n\nEvaluate:\n- Relevance (out of 10)\n- Fluency (out of 10)\n- Confidence (out of 10)\n- Total Score (average)\n- Feedback (short suggestion)\n\nReturn:\n{
  "relevance_score": 8,
  "fluency_score": 9,
  "confidence_score": 7,
  "total_score": 8.0,
  "feedback": "Good clarity and content. Try answering with a little more detail."
}`,
});

const evaluateUserAnswerFlow = ai.defineFlow(
  {
    name: 'evaluateUserAnswerFlow',
    inputSchema: EvaluateUserAnswerInputSchema,
    outputSchema: EvaluateUserAnswerOutputSchema,
  },
  async input => {
    const {output} = await evaluateUserAnswerPrompt(input);
    return output!;
  }
);
