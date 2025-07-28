import type { GenerateInterviewQuestionsOutput } from "@/ai/flows/generate-interview-questions";
import type { EvaluateUserAnswerOutput } from "@/ai/flows/evaluate-user-answer";

export type UserDetails = {
  name: string;
  jobRole: string;
  experience: string;
  interviewType: 'HR' | 'Technical';
  resumeText: string;
}

export type InterviewQuestion = GenerateInterviewQuestionsOutput[0];

export type InterviewResult = {
  question: InterviewQuestion;
  userAnswer: string;
  evaluation: EvaluateUserAnswerOutput;
}

export type InterviewSession = {
  userDetails: UserDetails;
  questions: InterviewQuestion[];
  results: InterviewResult[];
}
