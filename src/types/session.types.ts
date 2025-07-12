/**
 * Chat session and command handling types
 */

import type { ChatMessage } from './llm.types';
import type { AppConfig, FileContext } from './config.types';

export interface ChatSession {
  /** Unique session identifier */
  id: string;
  /** User-defined session name */
  name?: string;
  /** Conversation message history */
  messages: ChatMessage[];
  /** File context for current session */
  context: FileContext[];
  /** Session-specific configuration overrides */
  config: Partial<AppConfig>;
  /** Session creation timestamp */
  createdAt: Date;
  /** Last session update timestamp */
  updatedAt: Date;
  /** Additional session metadata */
  metadata?: SessionMetadata;
}

export interface SessionMetadata {
  /** Project directory path */
  projectPath?: string;
  /** Total LLM tokens used in session */
  totalTokensUsed: number;
  /** List of files modified during session */
  filesModified: string[];
  /** Last user activity timestamp */
  lastActivity: Date;
  /** Number of shell commands executed */
  shellCommandsExecuted: number;
}

export interface SlashCommand {
  /** Command name (without /) */
  name: string;
  /** Human-readable description */
  description: string;
  /** Usage example string */
  usage: string;
  /** Command execution function */
  execute: (_args: string[], _session: ChatSession) => Promise<void>;
}