/**
 * Command-line interface types for CLI coder application
 */

export interface CLICommand {
  /** Unique command name */
  name: string;
  /** Human-readable description for help text */
  description: string;
  /** Alternative command names */
  aliases?: string[];
  /** Command execution function */
  execute: (_args: string[], _options: CommandOptions) => Promise<void>;
}

export interface CommandOptions {
  [key: string]: unknown;
}

export interface CLIError {
  /** Error code for programmatic handling */
  code: string;
  /** Human-readable error message */
  message: string;
  /** Additional error context */
  details?: unknown;
}

export interface CLIErrorClass extends Error {
  code: string;
  details?: unknown;
}