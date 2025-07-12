/**
 * CLI Command interface defining the structure for all CLI commands
 */
export interface CLICommand {
  /** The primary name of the command */
  name: string;
  /** Human-readable description of what the command does */
  description: string;
  /** Optional alternative names for the command */
  aliases?: string[];
  /** Function that executes the command logic */
  execute: (args: string[], options: CommandOptions) => Promise<void>;
}

/**
 * Options that can be passed to CLI commands
 */
export interface CommandOptions {
  [key: string]: unknown;
}

/**
 * Standardized error structure for CLI operations
 */
export interface CLIError {
  /** Error code for programmatic handling */
  code: string;
  /** Human-readable error message */
  message: string;
  /** Additional error details */
  details?: unknown;
}