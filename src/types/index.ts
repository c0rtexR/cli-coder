/**
 * Shared type definitions for CLI Coder
 */

export interface CLIConfig {
  apiKeys: {
    openai?: string;
    anthropic?: string;
  };
  preferences: {
    defaultModel: string;
    outputFormat: 'text' | 'json' | 'markdown';
    verbose: boolean;
  };
  paths: {
    configDir: string;
    cacheDir: string;
  };
}

export interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: Date;
}

export interface LLMProvider {
  name: string;
  models: string[];
  isConfigured: boolean;
}

export interface CommandResult<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  executionTime?: number;
}

export interface FileOperation {
  type: 'read' | 'write' | 'delete' | 'create';
  path: string;
  content?: string;
  timestamp: Date;
}

export interface SessionContext {
  id: string;
  startTime: Date;
  messages: ChatMessage[];
  fileOperations: FileOperation[];
  currentWorkingDirectory: string;
}

// Re-export commonly used types
export type Result<T, E = Error> = 
  | { success: true; data: T }
  | { success: false; error: E };