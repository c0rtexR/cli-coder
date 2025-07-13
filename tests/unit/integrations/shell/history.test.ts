/**
 * @fileoverview Unit tests for ShellHistory - command execution history
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import type { ShellExecution, ShellResult, ShellHistory } from '../../../../src/types/shell.types';

describe('ShellHistory', () => {
  let ShellHistoryManager: any;
  let historyManager: any;
  let mockDate: any;

  beforeEach(async () => {
    // Mock Date to have consistent timestamps
    mockDate = new Date('2024-01-01T10:00:00Z');
    vi.useFakeTimers();
    vi.setSystemTime(mockDate);

    // Import after mocks are set up
    const module = await import('../../../../src/integrations/shell/history');
    ShellHistoryManager = module.ShellHistoryManager;
    historyManager = new ShellHistoryManager();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('History Tracking', () => {
    it('should record command executions', () => {
      // Arrange
      const command = 'git status';
      const workingDirectory = '/project';

      // Act
      const executionId = historyManager.recordExecution(command, { workingDirectory });

      // Assert
      expect(executionId).toBeTruthy();
      const execution = historyManager.getExecution(executionId);
      expect(execution).toEqual({
        id: executionId,
        command,
        startTime: mockDate,
        status: 'running',
        workingDirectory,
      });
    });

    it('should track execution time accurately', () => {
      // Arrange
      const command = 'npm test';
      const executionId = historyManager.recordExecution(command);

      // Act - simulate 5 seconds passing
      vi.advanceTimersByTime(5000);
      const result: ShellResult = {
        success: true,
        stdout: 'All tests passed',
        stderr: '',
        exitCode: 0,
        command,
        duration: 5000,
      };
      historyManager.completeExecution(executionId, result);

      // Assert
      const execution = historyManager.getExecution(executionId);
      expect(execution.endTime).toEqual(new Date('2024-01-01T10:00:05Z'));
      expect(execution.status).toBe('completed');
      expect(execution.result).toEqual(result);
    });

    it('should store command results correctly', () => {
      // Arrange
      const command = 'ls -la';
      const result: ShellResult = {
        success: true,
        stdout: 'total 8\ndrwxr-xr-x 2 user user 4096 Jan 1 10:00 .\ndrwxr-xr-x 3 user user 4096 Jan 1 09:00 ..',
        stderr: '',
        exitCode: 0,
        command,
        duration: 150,
      };
      const executionId = historyManager.recordExecution(command);

      // Act
      historyManager.completeExecution(executionId, result);

      // Assert
      const execution = historyManager.getExecution(executionId);
      expect(execution.result).toEqual(result);
      expect(execution.status).toBe('completed');
    });

    it('should handle failed executions', () => {
      // Arrange
      const command = 'git invalid-command';
      const result: ShellResult = {
        success: false,
        stdout: '',
        stderr: 'git: invalid-command is not a git command',
        exitCode: 1,
        command,
        duration: 100,
      };
      const executionId = historyManager.recordExecution(command);

      // Act
      historyManager.completeExecution(executionId, result);

      // Assert
      const execution = historyManager.getExecution(executionId);
      expect(execution.result).toEqual(result);
      expect(execution.status).toBe('failed');
    });

    it('should handle cancelled executions', () => {
      // Arrange
      const command = 'long-running-command';
      const executionId = historyManager.recordExecution(command);

      // Act
      historyManager.cancelExecution(executionId, 'User cancelled');

      // Assert
      const execution = historyManager.getExecution(executionId);
      expect(execution.status).toBe('cancelled');
      expect(execution.endTime).toEqual(mockDate);
    });
  });

  describe('History Limits', () => {
    it('should maintain history limits', () => {
      // Arrange
      const maxEntries = 5;
      const limitedHistoryManager = new ShellHistoryManager({ maxEntries });

      // Act - add more entries than the limit
      const executionIds: string[] = [];
      for (let i = 0; i < 8; i++) {
        const id = limitedHistoryManager.recordExecution(`command-${i}`);
        executionIds.push(id);
      }

      // Assert
      const history = limitedHistoryManager.getHistory();
      expect(history.executions).toHaveLength(maxEntries);
      
      // Should keep the most recent entries
      expect(history.executions[0].command).toBe('command-7');
      expect(history.executions[4].command).toBe('command-3');
      
      // Older entries should be removed
      expect(limitedHistoryManager.getExecution(executionIds[0])).toBeUndefined();
      expect(limitedHistoryManager.getExecution(executionIds[1])).toBeUndefined();
      expect(limitedHistoryManager.getExecution(executionIds[2])).toBeUndefined();
    });

    it('should handle default history size', () => {
      // Arrange
      const defaultHistoryManager = new ShellHistoryManager();

      // Act - add entries up to default limit
      for (let i = 0; i < 100; i++) {
        defaultHistoryManager.recordExecution(`command-${i}`);
      }

      // Assert
      const history = defaultHistoryManager.getHistory();
      expect(history.executions).toHaveLength(100);
      expect(history.maxEntries).toBe(100);
    });

    it('should remove oldest entries when limit exceeded', () => {
      // Arrange
      const maxEntries = 3;
      const limitedHistoryManager = new ShellHistoryManager({ maxEntries });

      // Act
      const id1 = limitedHistoryManager.recordExecution('first-command');
      const id2 = limitedHistoryManager.recordExecution('second-command');
      const id3 = limitedHistoryManager.recordExecution('third-command');
      const id4 = limitedHistoryManager.recordExecution('fourth-command'); // Should remove first

      // Assert
      expect(limitedHistoryManager.getExecution(id1)).toBeUndefined();
      expect(limitedHistoryManager.getExecution(id2)).toBeTruthy();
      expect(limitedHistoryManager.getExecution(id3)).toBeTruthy();
      expect(limitedHistoryManager.getExecution(id4)).toBeTruthy();
    });
  });

  describe('History Queries', () => {
    beforeEach(() => {
      // Set up test data
      const commands = [
        'git status',
        'npm test',
        'git commit -m "message"',
        'docker ps',
        'npm install express',
        'git push origin main',
      ];

      commands.forEach((command, index) => {
        vi.setSystemTime(new Date(`2024-01-01T10:0${index}:00Z`));
        const id = historyManager.recordExecution(command);
        
        // Complete some executions
        if (index % 2 === 0) {
          const result: ShellResult = {
            success: true,
            stdout: `output for ${command}`,
            stderr: '',
            exitCode: 0,
            command,
            duration: 1000,
          };
          historyManager.completeExecution(id, result);
        }
      });
    });

    it('should find executions by command pattern', () => {
      // Act
      const gitCommands = historyManager.findExecutions((exec: ShellExecution) => 
        exec.command.startsWith('git')
      );

      // Assert
      expect(gitCommands).toHaveLength(3);
      expect(gitCommands.every(exec => exec.command.startsWith('git'))).toBe(true);
    });

    it('should find executions by status', () => {
      // Act
      const completedExecutions = historyManager.findExecutions((exec: ShellExecution) => 
        exec.status === 'completed'
      );
      const runningExecutions = historyManager.findExecutions((exec: ShellExecution) => 
        exec.status === 'running'
      );

      // Assert
      expect(completedExecutions).toHaveLength(3);
      expect(runningExecutions).toHaveLength(3);
    });

    it('should find executions by time range', () => {
      // Act
      const startTime = new Date('2024-01-01T10:02:00Z');
      const endTime = new Date('2024-01-01T10:04:00Z');
      const executionsInRange = historyManager.findExecutions((exec: ShellExecution) => 
        exec.startTime >= startTime && exec.startTime <= endTime
      );

      // Assert
      expect(executionsInRange).toHaveLength(3);
      // Since items are stored newest first, the order will be reversed
      expect(executionsInRange.map(e => e.command)).toContain('git commit -m "message"');
      expect(executionsInRange.map(e => e.command)).toContain('docker ps');
      expect(executionsInRange.map(e => e.command)).toContain('npm install express');
    });

    it('should get recent executions', () => {
      // Act
      const recentExecutions = historyManager.getRecentExecutions(3);

      // Assert
      expect(recentExecutions).toHaveLength(3);
      expect(recentExecutions[0].command).toBe('git push origin main');
      expect(recentExecutions[1].command).toBe('npm install express');
      expect(recentExecutions[2].command).toBe('docker ps');
    });

    it('should get executions by command type', () => {
      // Act
      const npmCommands = historyManager.getExecutionsByType('npm');
      const gitCommands = historyManager.getExecutionsByType('git');

      // Assert
      expect(npmCommands).toHaveLength(2);
      expect(gitCommands).toHaveLength(3);
      expect(npmCommands.every(exec => exec.command.startsWith('npm'))).toBe(true);
      expect(gitCommands.every(exec => exec.command.startsWith('git'))).toBe(true);
    });
  });

  describe('Statistics', () => {
    beforeEach(() => {
      // Set up test data with varied execution times and results
      const testData = [
        { command: 'git status', duration: 100, success: true },
        { command: 'npm test', duration: 5000, success: true },
        { command: 'git commit -m "test"', duration: 200, success: true },
        { command: 'npm build', duration: 15000, success: false },
        { command: 'docker ps', duration: 500, success: true },
        { command: 'git push', duration: 2000, success: false },
      ];

      testData.forEach((data, index) => {
        vi.setSystemTime(new Date(`2024-01-01T10:0${index}:00Z`));
        const id = historyManager.recordExecution(data.command);
        
        const result: ShellResult = {
          success: data.success,
          stdout: data.success ? `success output` : '',
          stderr: data.success ? '' : 'error message',
          exitCode: data.success ? 0 : 1,
          command: data.command,
          duration: data.duration,
        };
        historyManager.completeExecution(id, result);
      });
    });

    it('should calculate success rate', () => {
      // Act
      const stats = historyManager.getStatistics();

      // Assert
      expect(stats.totalExecutions).toBe(6);
      expect(stats.successfulExecutions).toBe(4);
      expect(stats.failedExecutions).toBe(2);
      expect(stats.successRate).toBeCloseTo(66.67, 2);
    });

    it('should calculate average execution time', () => {
      // Act
      const stats = historyManager.getStatistics();

      // Assert
      const expectedAverage = (100 + 5000 + 200 + 15000 + 500 + 2000) / 6;
      expect(stats.averageExecutionTime).toBeCloseTo(expectedAverage, 2);
    });

    it('should identify most used commands', () => {
      // Arrange - add duplicate commands
      historyManager.recordExecution('git status');
      historyManager.recordExecution('git status');
      historyManager.recordExecution('npm test');

      // Act
      const stats = historyManager.getStatistics();

      // Assert
      // The statistics function counts base commands (first word)
      expect(stats.mostUsedCommands.length).toBeGreaterThan(0);
      expect(stats.mostUsedCommands.find(cmd => cmd.command === 'git')).toBeTruthy();
      expect(stats.mostUsedCommands.find(cmd => cmd.command === 'npm')).toBeTruthy();
    });

    it('should calculate command type distribution', () => {
      // Act
      const stats = historyManager.getStatistics();

      // Assert
      expect(stats.commandTypeDistribution).toEqual({
        git: 3,
        npm: 2,
        docker: 1,
      });
    });
  });

  describe('History Persistence', () => {
    it('should export history as JSON', () => {
      // Arrange
      historyManager.recordExecution('test command');

      // Act
      const exported = historyManager.exportHistory();

      // Assert
      expect(exported).toBeTruthy();
      const parsed = JSON.parse(exported);
      expect(parsed.executions).toHaveLength(1);
      expect(parsed.executions[0].command).toBe('test command');
      expect(parsed.maxEntries).toBe(100);
    });

    it('should import history from JSON', () => {
      // Arrange
      const historyData = {
        executions: [
          {
            id: 'test-id',
            command: 'imported command',
            startTime: new Date('2024-01-01T10:00:00Z'),
            status: 'completed',
            result: {
              success: true,
              stdout: 'output',
              stderr: '',
              exitCode: 0,
              command: 'imported command',
              duration: 1000,
            },
          },
        ],
        maxEntries: 50,
      };

      // Act
      historyManager.importHistory(JSON.stringify(historyData));

      // Assert
      const execution = historyManager.getExecution('test-id');
      expect(execution).toBeTruthy();
      expect(execution.command).toBe('imported command');
      expect(historyManager.getHistory().maxEntries).toBe(50);
    });

    it('should handle invalid import data gracefully', () => {
      // Arrange
      const invalidData = 'invalid json';

      // Act & Assert
      expect(() => {
        historyManager.importHistory(invalidData);
      }).toThrow('Invalid history data format');
    });

    it('should clear history', () => {
      // Arrange
      historyManager.recordExecution('command 1');
      historyManager.recordExecution('command 2');
      expect(historyManager.getHistory().executions).toHaveLength(2);

      // Act
      historyManager.clearHistory();

      // Assert
      expect(historyManager.getHistory().executions).toHaveLength(0);
    });
  });

  describe('Concurrent Access', () => {
    it('should handle multiple simultaneous executions', () => {
      // Act
      const id1 = historyManager.recordExecution('command 1');
      const id2 = historyManager.recordExecution('command 2');
      const id3 = historyManager.recordExecution('command 3');

      // Assert
      expect(id1).not.toBe(id2);
      expect(id2).not.toBe(id3);
      expect(id1).not.toBe(id3);
      
      const history = historyManager.getHistory();
      expect(history.executions).toHaveLength(3);
    });

    it('should handle completing executions out of order', () => {
      // Arrange
      const id1 = historyManager.recordExecution('first');
      const id2 = historyManager.recordExecution('second');
      const id3 = historyManager.recordExecution('third');

      const result1: ShellResult = { success: true, stdout: '1', stderr: '', exitCode: 0, command: 'first', duration: 100 };
      const result2: ShellResult = { success: true, stdout: '2', stderr: '', exitCode: 0, command: 'second', duration: 200 };
      const result3: ShellResult = { success: true, stdout: '3', stderr: '', exitCode: 0, command: 'third', duration: 300 };

      // Act - complete in reverse order
      historyManager.completeExecution(id3, result3);
      historyManager.completeExecution(id1, result1);
      historyManager.completeExecution(id2, result2);

      // Assert
      expect(historyManager.getExecution(id1).status).toBe('completed');
      expect(historyManager.getExecution(id2).status).toBe('completed');
      expect(historyManager.getExecution(id3).status).toBe('completed');
    });
  });
});