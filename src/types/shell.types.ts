export interface ShellCommand {
  command: string;
  args?: string[];
  workingDirectory?: string;
  timeout?: number;
  requireConfirmation?: boolean;
}

export interface ShellExecution {
  id: string;
  command: string;
  startTime: Date;
  endTime?: Date;
  result?: ShellResult;
  status: 'running' | 'completed' | 'failed' | 'cancelled';
}

export interface ShellHistory {
  executions: ShellExecution[];
  maxEntries: number;
}

export interface ShellResult {
  success: boolean;
  stdout: string;
  stderr: string;
  exitCode: number;
  command: string;
  duration: number;
}

export interface ShellOptions {
  workingDirectory?: string;
  timeout?: number;
  requireConfirmation?: boolean;
  showOutput?: boolean;
  environmentVars?: Record<string, string>;
}