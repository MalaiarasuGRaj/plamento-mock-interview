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
        userAnswer: z.string().describe("The user's answer to the question."),
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

const GeneratePerformanceReportOutputSchema = z.object({
  report: z.string().describe('A plain text report summarizing the interview performance.'),
});
export type GeneratePerformanceReportOutput = z.infer<typeof GeneratePerformanceReportOutputSchema>;

export async function generatePerformanceReport(input: GeneratePerformanceReportInput): Promise<string> {
  const result = await generatePerformanceReportFlow(input);
  return result.report;
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

Return a JSON object containing a 'report' field with a plain text report including:
- Summary of performance
- Average score
- Personalized feedback
- Tips for improvement

Example output:
"""json
{
  "report": "Mock Interview Report for Raj\\nJob Role: Data Analyst | Experience: 1-3 years\\n\\nSummary:\\nRaj demonstrated strong communication and relevant technical knowledge. He was confident in explaining projects and answered most questions fluently.\\n\\nAverage Score: 8.1 / 10\\n\\nRecommendations:\\n- Include more real-world examples in answers\\n- Slow down slightly to improve fluency\\n- Practice STAR format for HR questions\\n\\nKeep practicing!"
}
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
    // Handle the case where the model might return a nullish value.
    if (!output) {
      return { report: "We were unable to generate a report for this session. Please try again." };
    }
    return output;
  }
);
