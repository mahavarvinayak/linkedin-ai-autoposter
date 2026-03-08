import { config } from 'dotenv';
config();

import '@/ai/flows/generate-linkedin-post-flow.ts';
import '@/ai/flows/schedule-daily-ai-post.ts';