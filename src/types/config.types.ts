import type { LLMConfig, FileContext } from './llm.types';

/**
 * Main application configuration
 */
export interface AppConfig {
  /** LLM provider configuration */
  llm: LLMConfig;
  /** Shell integration configuration */
  shell: ShellConfig;
  /** Editor configuration */
  editor: EditorConfig;
  /** Session management configuration */
  session: SessionConfig;
}

/**
 * Shell integration configuration options
 */
export interface ShellConfig {
  /** Whether to allow execution of potentially dangerous commands */
  allowDangerousCommands: boolean;
  /** Default timeout for shell commands in milliseconds */
  defaultTimeout: number;
  /** Whether confirmation is required before executing commands */
  confirmationRequired: boolean;
  /** Default working directory for shell commands */
  workingDirectory?: string;
  /** Number of shell command executions to keep in history */
  historySize: number;
}

/**
 * Editor configuration options
 */
export interface EditorConfig {
  /** Default editor command */
  defaultEditor: string;
  /** Directory for temporary files */
  tempDir: string;
}

/**
 * Session management configuration
 */
export interface SessionConfig {
  /** Whether to save chat history */
  saveHistory: boolean;
  /** Maximum number of history items to keep */
  maxHistorySize: number;
  /** Path to store history files */
  historyPath: string;
}

/**
 * Re-export FileContext for convenience
 */
export type { FileContext };