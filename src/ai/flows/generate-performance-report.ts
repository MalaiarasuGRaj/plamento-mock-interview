'use server';

/**
 * @fileOverview Generates a performance report for the mock interview.
 *
 * - generatePerformanceReport - A function that handles the generation of the performance report.
 * - GeneratePerformanceReportInput - The input type for the generatePerformanceReport function.
 * - GeneratePerformanceReportOutput - The return type for the generatePerformanceReport function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const GeneratePerformanceReportInputSchema = z.object({
  userName: z.string().describe('The name of the user.'),
  jobRole: z.string().describe('The job role the user is interviewing for.'),
  experience: z.string().describe('The experience level of the user.'),
  interviewSummary: z
    .array(
      z.object({
        question: z.string().describe('The interview question.'),
        userAnswer: z.string().describe('The user\'s answer to the question.'),
        relevanceScore: z.number().describe('The relevance score for the answer.'),
        fluencyScore: z.number().describe('The fluency score for the answer.'),
        confidenceScore: z.number().describe('The confidence score for the answer.'),
        totalScore: z.number().describe('The total score for the answer.'),
        feedback: z.string().describe('The feedback for the answer.'),
      })
    )
    .describe('A summary of the interview, including questions, answers, and scores.'),
});
export type GeneratePerformanceReportInput = z.infer<typeof GeneratePerformanceReportInputSchema>;

const GeneratePerformanceReportOutputSchema = z.string().describe('A plain text report summarizing the interview performance.');
export type GeneratePerformanceReportOutput = z.infer<typeof GeneratePerformanceReportOutputSchema>;

export async function generatePerformanceReport(input: GeneratePerformanceReportInput): Promise<GeneratePerformanceReportOutput> {
  return generatePerformanceReportFlow(input);
}

const prompt = ai.definePrompt({
  name: 'generatePerformanceReportPrompt',
  input: {schema: GeneratePerformanceReportInputSchema},
  output: {schema: GeneratePerformanceReportOutputSchema},
  prompt: `Generate a performance report for the mock interview:

Candidate Name: {{{userName}}}
Job Role: {{{jobRole}}}
Experience: {{{experience}}}

Interview Summary:
{{#each interviewSummary}}
  Question: {{{question}}}
  User Answer: {{{userAnswer}}}
  Relevance Score: {{{relevanceScore}}}
  Fluency Score: {{{fluencyScore}}}
  Confidence Score: {{{confidenceScore}}}
  Total Score: {{{totalScore}}}
  Feedback: {{{feedback}}}
{{/each}}

Return a plain text report including:
- Summary of performance
- Average score
- Personalized feedback
- Tips for improvement

Example output:
"""
Mock Interview Report for Raj
Job Role: Data Analyst | Experience: 1-3 years

Summary:
Raj demonstrated strong communication and relevant technical knowledge. He was confident in explaining projects and answered most questions fluently.

Average Score: 8.1 / 10

Recommendations:
- Include more real-world examples in answers
- Slow down slightly to improve fluency
- Practice STAR format for HR questions

Keep practicing!
"""
`,
});

const generatePerformanceReportFlow = ai.defineFlow(
  {
    name: 'generatePerformanceReportFlow',
    inputSchema: GeneratePerformanceReportInputSchema,
    outputSchema: GeneratePerformanceReportOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
