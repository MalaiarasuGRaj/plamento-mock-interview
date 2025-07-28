'use server';

/**
 * @fileOverview A flow to generate interview questions based on the user's resume, job role, experience level, and interview type.
 *
 * - generateInterviewQuestions - A function that generates interview questions.
 * - GenerateInterviewQuestionsInput - The input type for the generateInterviewQuestions function.
 * - GenerateInterviewQuestionsOutput - The return type for the generateInterviewQuestions function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const GenerateInterviewQuestionsInputSchema = z.object({
  resumeText: z
    .string()
    .describe('The text content of the user resume.'),
  jobRole: z.string().describe('The job role for which the user is interviewing.'),
  experience: z.string().describe('The experience level of the user.'),
  interviewType: z.enum(['HR', 'Technical']).describe('The type of interview (HR or Technical).'),
});
export type GenerateInterviewQuestionsInput = z.infer<typeof GenerateInterviewQuestionsInputSchema>;

const GenerateInterviewQuestionsOutputSchema = z.array(
  z.object({
    question: z.string().describe('The interview question.'),
    category: z.string().describe('The category of the question (e.g., behavioral, technical).'),
    expected_keywords: z.array(z.string()).describe('Keywords expected in the answer.'),
  })
);
export type GenerateInterviewQuestionsOutput = z.infer<typeof GenerateInterviewQuestionsOutputSchema>;

export async function generateInterviewQuestions(
  input: GenerateInterviewQuestionsInput
): Promise<GenerateInterviewQuestionsOutput> {
  return generateInterviewQuestionsFlow(input);
}

const generateInterviewQuestionsPrompt = ai.definePrompt({
  name: 'generateInterviewQuestionsPrompt',
  input: {schema: GenerateInterviewQuestionsInputSchema},
  output: {schema: GenerateInterviewQuestionsOutputSchema},
  prompt: `You are a smart virtual interviewer. Generate 8-10 questions tailored to the following:\n\nResume:\n"""\n{{{resumeText}}}\n"""\n\nJob Role: {{{jobRole}}}\nExperience: {{{experience}}}\nInterview Type: {{{interviewType}}} (HR or Technical)\n\nReturn JSON list like:\n[
  {
    "question": "Tell me about a time you overcame a challenge.",
    "category": "behavioral",
    "expected_keywords": ["challenge", "problem-solving", "teamwork"]
  },
  ...
]
`,
});

const generateInterviewQuestionsFlow = ai.defineFlow(
  {
    name: 'generateInterviewQuestionsFlow',
    inputSchema: GenerateInterviewQuestionsInputSchema,
    outputSchema: GenerateInterviewQuestionsOutputSchema,
  },
  async input => {
    const {output} = await generateInterviewQuestionsPrompt(input);
    return output!;
  }
);
