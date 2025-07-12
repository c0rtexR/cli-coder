import type { ChatMessage, FileContext } from './llm.types';
import type { AppConfig } from './config.types';

/**
 * Represents a chat session
 */
export interface ChatSession {
  /** Unique identifier for the session */
  id: string;
  /** Optional human-readable name for the session */
  name?: string;
  /** All messages in the session */
  messages: ChatMessage[];
  /** Files included in the session context */
  context: FileContext[];
  /** Session-specific configuration overrides */
  config: Partial<AppConfig>;
  /** When the session was created */
  createdAt: Date;
  /** When the session was last updated */
  updatedAt: Date;
  /** Additional session metadata */
  metadata?: SessionMetadata;
}

/**
 * Metadata associated with a chat session
 */
export interface SessionMetadata {
  /** Path to the project/workspace */
  projectPath?: string;
  /** Total tokens used in this session */
  totalTokensUsed: number;
  /** Files that have been modified during the session */
  filesModified: string[];
  /** Timestamp of last activity */
  lastActivity: Date;
}

/**
 * Represents a slash command that can be executed in chat
 */
export interface SlashCommand {
  /** Command name (without the /) */
  name: string;
  /** Description of what the command does */
  description: string;
  /** Usage example */
  usage: string;
  /** Function to execute the command */
  execute: (args: string[], session: ChatSession) => Promise<void>;
}