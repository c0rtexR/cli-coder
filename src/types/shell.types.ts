/**
 * Represents a shell command to be executed
 */
export interface ShellCommand {
  /** The command to execute */
  command: string;
  /** Optional command arguments */
  args?: string[];
  /** Working directory for command execution */
  workingDirectory?: string;
  /** Timeout in milliseconds */
  timeout?: number;
  /** Whether to require user confirmation before execution */
  requireConfirmation?: boolean;
}

/**
 * Result of a shell command execution
 */
export interface ShellResult {
  /** Whether the command executed successfully */
  success: boolean;
  /** Standard output from the command */
  stdout: string;
  /** Standard error from the command */
  stderr: string;
  /** Exit code returned by the command */
  exitCode: number;
  /** The full command that was executed */
  command: string;
  /** Duration of execution in milliseconds */
  duration: number;
}

/**
 * Options for shell command execution
 */
export interface ShellOptions {
  /** Working directory for command execution */
  workingDirectory?: string;
  /** Timeout in milliseconds */
  timeout?: number;
  /** Whether to require user confirmation before execution */
  requireConfirmation?: boolean;
  /** Whether to show command output in real-time */
  showOutput?: boolean;
  /** Environment variables to set for the command */
  environmentVars?: Record<string, string>;
}

/**
 * Represents an ongoing or completed shell execution
 */
export interface ShellExecution {
  /** Unique identifier for this execution */
  id: string;
  /** The command that was/is being executed */
  command: string;
  /** When the execution started */
  startTime: Date;
  /** When the execution ended (if completed) */
  endTime?: Date;
  /** Result of the execution (if completed) */
  result?: ShellResult;
  /** Current status of the execution */
  status: 'running' | 'completed' | 'failed' | 'cancelled';
}

/**
 * History of shell command executions
 */
export interface ShellHistory {
  /** Array of all shell executions */
  executions: ShellExecution[];
  /** Maximum number of entries to keep in history */
  maxEntries: number;
}