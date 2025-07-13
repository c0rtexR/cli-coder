/**
 * @fileoverview Shell command execution history management
 */

import type { ShellExecution, ShellResult, ShellHistory } from '../../types/shell.types';

interface HistoryOptions {
  maxEntries?: number;
}

interface ExecutionStatistics {
  totalExecutions: number;
  successfulExecutions: number;
  failedExecutions: number;
  successRate: number;
  averageExecutionTime: number;
  mostUsedCommands: Array<{ command: string; count: number }>;
  commandTypeDistribution: Record<string, number>;
}

export class ShellHistoryManager {
  private history: ShellHistory;
  private executionMap: Map<string, ShellExecution>;

  constructor(options: HistoryOptions = {}) {
    this.history = {
      executions: [],
      maxEntries: options.maxEntries || 100,
    };
    this.executionMap = new Map();
  }

  recordExecution(command: string, options?: { workingDirectory?: string }): string {
    const execution: ShellExecution = {
      id: this.generateId(),
      command,
      startTime: new Date(),
      status: 'running',
      ...(options?.workingDirectory && { workingDirectory: options.workingDirectory }),
    };

    this.addExecution(execution);
    return execution.id;
  }

  completeExecution(executionId: string, result: ShellResult): void {
    const execution = this.executionMap.get(executionId);
    if (!execution) {
      throw new Error(`Execution not found: ${executionId}`);
    }

    execution.endTime = new Date();
    execution.result = result;
    execution.status = result.success ? 'completed' : 'failed';

    this.updateExecution(execution);
  }

  cancelExecution(executionId: string, reason?: string): void {
    const execution = this.executionMap.get(executionId);
    if (!execution) {
      throw new Error(`Execution not found: ${executionId}`);
    }

    execution.endTime = new Date();
    execution.status = 'cancelled';

    this.updateExecution(execution);
  }

  getExecution(executionId: string): ShellExecution | undefined {
    return this.executionMap.get(executionId);
  }

  getHistory(): ShellHistory {
    return {
      executions: [...this.history.executions],
      maxEntries: this.history.maxEntries,
    };
  }

  findExecutions(predicate: (execution: ShellExecution) => boolean): ShellExecution[] {
    return this.history.executions.filter(predicate);
  }

  getRecentExecutions(count: number): ShellExecution[] {
    return this.history.executions
      .sort((a, b) => b.startTime.getTime() - a.startTime.getTime())
      .slice(0, count);
  }

  getExecutionsByType(commandType: string): ShellExecution[] {
    return this.history.executions.filter(execution => 
      execution.command.startsWith(commandType)
    );
  }

  getStatistics(): ExecutionStatistics {
    const completedExecutions = this.history.executions.filter(e => e.status === 'completed' || e.status === 'failed');
    const successfulExecutions = this.history.executions.filter(e => e.status === 'completed');
    const failedExecutions = this.history.executions.filter(e => e.status === 'failed');

    // Calculate average execution time
    const executionsWithDuration = completedExecutions.filter(e => e.result?.duration);
    const averageExecutionTime = executionsWithDuration.length > 0
      ? executionsWithDuration.reduce((sum, e) => sum + (e.result?.duration || 0), 0) / executionsWithDuration.length
      : 0;

    // Calculate most used commands
    const commandCounts = new Map<string, number>();
    this.history.executions.forEach(execution => {
      const command = execution.command.split(' ')[0]; // Get base command
      commandCounts.set(command, (commandCounts.get(command) || 0) + 1);
    });

    const mostUsedCommands = Array.from(commandCounts.entries())
      .map(([command, count]) => ({ command, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    // Calculate command type distribution
    const commandTypeDistribution: Record<string, number> = {};
    this.history.executions.forEach(execution => {
      const commandType = execution.command.split(' ')[0];
      commandTypeDistribution[commandType] = (commandTypeDistribution[commandType] || 0) + 1;
    });

    return {
      totalExecutions: this.history.executions.length,
      successfulExecutions: successfulExecutions.length,
      failedExecutions: failedExecutions.length,
      successRate: completedExecutions.length > 0 
        ? (successfulExecutions.length / completedExecutions.length) * 100 
        : 0,
      averageExecutionTime,
      mostUsedCommands,
      commandTypeDistribution,
    };
  }

  exportHistory(): string {
    return JSON.stringify(this.history, null, 2);
  }

  importHistory(historyData: string): void {
    try {
      const parsed = JSON.parse(historyData);
      
      if (!parsed.executions || !Array.isArray(parsed.executions)) {
        throw new Error('Invalid history format');
      }

      // Validate and convert date strings back to Date objects
      const executions = parsed.executions.map((exec: any) => ({
        ...exec,
        startTime: new Date(exec.startTime),
        endTime: exec.endTime ? new Date(exec.endTime) : undefined,
      }));

      this.history = {
        executions,
        maxEntries: parsed.maxEntries || 100,
      };

      // Rebuild execution map
      this.executionMap.clear();
      executions.forEach((execution: ShellExecution) => {
        this.executionMap.set(execution.id, execution);
      });

    } catch (error) {
      throw new Error('Invalid history data format');
    }
  }

  clearHistory(): void {
    this.history.executions = [];
    this.executionMap.clear();
  }

  private addExecution(execution: ShellExecution): void {
    // Add to map
    this.executionMap.set(execution.id, execution);

    // Add to history array (newest first)
    this.history.executions.unshift(execution);

    // Enforce size limit
    if (this.history.executions.length > this.history.maxEntries) {
      const removed = this.history.executions.pop();
      if (removed) {
        this.executionMap.delete(removed.id);
      }
    }
  }

  private updateExecution(execution: ShellExecution): void {
    // Update in map
    this.executionMap.set(execution.id, execution);

    // Update in array
    const index = this.history.executions.findIndex(e => e.id === execution.id);
    if (index !== -1) {
      this.history.executions[index] = execution;
    }
  }

  private generateId(): string {
    return `exec_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}