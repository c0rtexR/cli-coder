/**
 * Shell command execution and integration types
 */

export interface ShellCommand {
  /** Command to execute */
  command: string;
  /** Command arguments */
  args?: string[];
  /** Execution directory */
  workingDirectory?: string;
  /** Execution timeout in milliseconds */
  timeout?: number;
  /** Whether to prompt user before execution */
  requireConfirmation?: boolean;
}

export interface ShellResult {
  /** Whether command succeeded */
  success: boolean;
  /** Standard output content */
  stdout: string;
  /** Standard error content */
  stderr: string;
  /** Process exit code */
  exitCode: number;
  /** Original command executed */
  command: string;
  /** Execution duration in milliseconds */
  duration: number;
}

export interface ShellOptions {
  /** Working directory for command execution */
  workingDirectory?: string;
  /** Command timeout in milliseconds */
  timeout?: number;
  /** Require user confirmation before execution */
  requireConfirmation?: boolean;
  /** Display command output in real-time */
  showOutput?: boolean;
  /** Environment variables for command */
  environmentVars?: Record<string, string>;
}

export interface ShellExecution {
  /** Unique execution identifier */
  id: string;
  /** Command being executed */
  command: string;
  /** Execution start time */
  startTime: Date;
  /** Execution completion time */
  endTime?: Date;
  /** Execution result */
  result?: ShellResult;
  /** Current execution status */
  status: 'running' | 'completed' | 'failed' | 'cancelled';
}

export interface ShellHistory {
  /** List of command executions */
  executions: ShellExecution[];
  /** Maximum number of entries to keep */
  maxEntries: number;
}