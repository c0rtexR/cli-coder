import { z } from 'zod';

export const LLMConfigSchema = z.object({
  provider: z.enum(['openai', 'anthropic', 'gemini']),
  apiKey: z.string().min(1, 'API key is required'),
  model: z.string().min(1, 'Model is required'),
  temperature: z.number().min(0).max(2).optional(),
  maxTokens: z.number().positive().optional(),
});

export const ShellConfigSchema = z.object({
  allowDangerousCommands: z.boolean().default(false),
  defaultTimeout: z.number().default(30000),
  confirmationRequired: z.boolean().default(true),
  workingDirectory: z.string().optional(),
  historySize: z.number().default(100),
}).default({});

export const AppConfigSchema = z.object({
  llm: LLMConfigSchema,
  shell: ShellConfigSchema,
  editor: z.object({
    defaultEditor: z.string().default('code'),
    tempDir: z.string().default('/tmp'),
  }).default({}),
  session: z.object({
    saveHistory: z.boolean().default(true),
    maxHistorySize: z.number().positive().default(100),
    historyPath: z.string().default('.cli-coder/history'),
  }).default({}),
});

export type ValidatedAppConfig = z.infer<typeof AppConfigSchema>;