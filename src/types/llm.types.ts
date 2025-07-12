/**
 * Interface for LLM provider implementations
 */
export interface LLMProvider {
  /** Human-readable name of the provider */
  name: string;
  /** Generate a response from the LLM */
  generateResponse(prompt: string, context: ChatContext): Promise<LLMResponse>;
  /** Validate the provider configuration */
  validateConfig(config: LLMConfig): boolean;
}

/**
 * Configuration for LLM providers
 */
export interface LLMConfig {
  /** The LLM provider to use */
  provider: 'openai' | 'anthropic' | 'gemini';
  /** API key for the provider */
  apiKey: string;
  /** Model name/identifier */
  model: string;
  /** Temperature for response generation (0-1) */
  temperature?: number;
  /** Maximum tokens to generate */
  maxTokens?: number;
}

/**
 * Response from an LLM provider
 */
export interface LLMResponse {
  /** The generated content */
  content: string;
  /** Token usage information */
  usage: {
    /** Tokens used in the prompt */
    promptTokens: number;
    /** Tokens used in the completion */
    completionTokens: number;
    /** Total tokens used */
    totalTokens: number;
  };
  /** Model that generated the response */
  model: string;
}

/**
 * A single message in a chat conversation
 */
export interface ChatMessage {
  /** Role of the message sender */
  role: 'user' | 'assistant' | 'system';
  /** Content of the message */
  content: string;
  /** When the message was created */
  timestamp: Date;
}

/**
 * Context for a chat conversation
 */
export interface ChatContext {
  /** Array of messages in the conversation */
  messages: ChatMessage[];
  /** Files that are part of the context */
  files: FileContext[];
  /** Optional system prompt for the conversation */
  systemPrompt?: string;
}

/**
 * Represents a file in the chat context
 */
export interface FileContext {
  /** Absolute path to the file */
  path: string;
  /** File contents */
  content: string;
  /** Programming language/file type */
  language: string;
  /** File size in bytes */
  size: number;
  /** Last modification timestamp */
  lastModified: Date;
}