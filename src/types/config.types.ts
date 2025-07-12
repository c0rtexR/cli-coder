import type { LLMConfig, FileContext } from './llm.types';

/**
 * Main application configuration
 */
export interface AppConfig {
  /** LLM provider configuration */
  llm: LLMConfig;
  /** Git-related configuration */
  git: GitConfig;
  /** Editor configuration */
  editor: EditorConfig;
  /** Session management configuration */
  session: SessionConfig;
}

/**
 * Git-related configuration options
 */
export interface GitConfig {
  /** Whether to automatically commit changes */
  autoCommit: boolean;
  /** Template for commit messages */
  commitMessageTemplate: string;
  /** Files to exclude from Git operations */
  excludeFiles: string[];
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