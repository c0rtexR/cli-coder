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

export const EditorConfigSchema = z.object({
  defaultEditor: z.string().default('code'),
  tempDir: z.string().default('/tmp'),
}).default({});

export const SessionConfigSchema = z.object({
  saveHistory: z.boolean().default(true),
  maxHistorySize: z.number().positive().default(100),
}).default({});

export const AppConfigSchema = z.object({
  llm: LLMConfigSchema,
  shell: ShellConfigSchema,
  editor: EditorConfigSchema,
  session: SessionConfigSchema,
});

export type LLMConfig = z.infer<typeof LLMConfigSchema>;
export type ShellConfig = z.infer<typeof ShellConfigSchema>;
export type EditorConfig = z.infer<typeof EditorConfigSchema>;
export type SessionConfig = z.infer<typeof SessionConfigSchema>;
export type ValidatedAppConfig = z.infer<typeof AppConfigSchema>;