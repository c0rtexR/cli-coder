/**
 * Application configuration and settings types
 */

import type { LLMConfig } from './llm.types';

export interface AppConfig {
  /** LLM provider configuration */
  llm: LLMConfig;
  /** Shell command configuration */
  shell: ShellConfig;
  /** Editor integration configuration */
  editor: EditorConfig;
  /** Session management configuration */
  session: SessionConfig;
}

export interface ShellConfig {
  /** Allow potentially dangerous commands */
  allowDangerousCommands: boolean;
  /** Default command timeout in milliseconds */
  defaultTimeout: number;
  /** Require confirmation before command execution */
  confirmationRequired: boolean;
  /** Default working directory for commands */
  workingDirectory?: string;
  /** Number of command executions to keep in history */
  historySize: number;
}

export interface EditorConfig {
  /** Preferred text editor command */
  defaultEditor: string;
  /** Temporary file directory */
  tempDir: string;
}

export interface SessionConfig {
  /** Whether to save chat history */
  saveHistory: boolean;
  /** Maximum number of messages to keep */
  maxHistorySize: number;
  /** File path for history storage */
  historyPath: string;
}

export interface FileContext {
  /** File system path */
  path: string;
  /** File text content */
  content: string;
  /** Programming language identifier */
  language: string;
  /** File size in bytes */
  size: number;
  /** Last modification timestamp */
  lastModified: Date;
}