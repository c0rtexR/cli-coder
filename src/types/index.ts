export interface BaseConfig {
  logLevel: 'debug' | 'info' | 'warn' | 'error';
  configDir: string;
}

export interface LLMProvider {
  type: 'openai' | 'anthropic';
  apiKey: string;
  model?: string;
}

export interface CLICommand {
  name: string;
  description: string;
  execute: () => Promise<void>;
}

export type LogLevel = 'debug' | 'info' | 'warn' | 'error';