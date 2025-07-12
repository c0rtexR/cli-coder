/**
 * Large Language Model provider integration types
 */

// FileContext is imported from config.types.ts to avoid circular dependencies
import type { FileContext } from './config.types';

export interface LLMProvider {
  /** Provider identifier */
  name: string;
  /** Generate response from prompt and context */
  generateResponse(_prompt: string, _context: ChatContext): Promise<LLMResponse>;
  /** Validate provider configuration */
  validateConfig(_config: LLMConfig): boolean;
}

export interface LLMConfig {
  /** LLM provider selection */
  provider: 'openai' | 'anthropic' | 'gemini';
  /** API authentication key */
  apiKey: string;
  /** Model identifier */
  model: string;
  /** Response randomness (0-2) */
  temperature?: number;
  /** Maximum response tokens */
  maxTokens?: number;
}

export interface LLMResponse {
  /** Generated response content */
  content: string;
  /** Token usage statistics */
  usage: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
  /** Model used for generation */
  model: string;
}

export interface ChatMessage {
  /** Message sender role */
  role: 'user' | 'assistant' | 'system';
  /** Message text content */
  content: string;
  /** Message creation timestamp */
  timestamp: Date;
}

export interface ChatContext {
  /** Conversation message history */
  messages: ChatMessage[];
  /** File context for code understanding */
  files: FileContext[];
  /** System-level instructions */
  systemPrompt?: string;
}