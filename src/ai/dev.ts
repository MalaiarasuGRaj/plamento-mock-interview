import { config } from 'dotenv';
config();

import '@/ai/flows/generate-performance-report.ts';
import '@/ai/flows/evaluate-user-answer.ts';
import '@/ai/flows/generate-interview-questions.ts';
import '@/ai/flows/speech-to-text.ts';
