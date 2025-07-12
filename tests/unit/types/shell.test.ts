/**
 * @fileoverview Unit tests for Shell integration type definitions
 */

import { describe, it, expect } from 'vitest';
import type { 
  ShellCommand, 
  ShellResult, 
  ShellOptions,
  ShellExecution,
  ShellHistory
} from '../../../src/types/shell.types';

describe('Shell Integration Types', () => {
  describe('ShellCommand', () => {
    it('should validate ShellCommand structure', () => {
      const command: ShellCommand = {
        command: 'ls',
        args: ['-la', '/tmp'],
        workingDirectory: '/home/user',
        timeout: 5000,
        requireConfirmation: true
      };

      expect(command.command).toBe('ls');
      expect(command.args).toEqual(['-la', '/tmp']);
      expect(command.workingDirectory).toBe('/home/user');
      expect(command.timeout).toBe(5000);
      expect(command.requireConfirmation).toBe(true);
    });

    it('should allow minimal command structure', () => {
      const command: ShellCommand = {
        command: 'pwd'
      };

      expect(command.command).toBe('pwd');
      expect(command.args).toBeUndefined();
      expect(command.workingDirectory).toBeUndefined();
      expect(command.timeout).toBeUndefined();
      expect(command.requireConfirmation).toBeUndefined();
    });

    it('should handle empty args array', () => {
      const command: ShellCommand = {
        command: 'git',
        args: []
      };

      expect(command.command).toBe('git');
      expect(Array.isArray(command.args)).toBe(true);
      expect(command.args).toHaveLength(0);
    });
  });

  describe('ShellResult', () => {
    it('should validate ShellResult with all fields', () => {
      const result: ShellResult = {
        success: true,
        stdout: 'Command output',
        stderr: '',
        exitCode: 0,
        command: 'echo "hello"',
        duration: 150
      };

      expect(result.success).toBe(true);
      expect(result.stdout).toBe('Command output');
      expect(result.stderr).toBe('');
      expect(result.exitCode).toBe(0);
      expect(result.command).toBe('echo "hello"');
      expect(result.duration).toBe(150);
    });

    it('should validate failed ShellResult', () => {
      const result: ShellResult = {
        success: false,
        stdout: '',
        stderr: 'Command not found',
        exitCode: 127,
        command: 'nonexistent-command',
        duration: 50
      };

      expect(result.success).toBe(false);
      expect(result.stderr).toBe('Command not found');
      expect(result.exitCode).toBe(127);
    });

    it('should validate duration is positive number', () => {
      const result: ShellResult = {
        success: true,
        stdout: 'output',
        stderr: '',
        exitCode: 0,
        command: 'test',
        duration: 1250.5
      };

      expect(typeof result.duration).toBe('number');
      expect(result.duration).toBeGreaterThan(0);
    });
  });

  describe('ShellOptions', () => {
    it('should validate ShellOptions structure', () => {
      const options: ShellOptions = {
        workingDirectory: '/project',
        timeout: 10000,
        requireConfirmation: false,
        showOutput: true,
        environmentVars: {
          'NODE_ENV': 'test',
          'DEBUG': '1'
        }
      };

      expect(options.workingDirectory).toBe('/project');
      expect(options.timeout).toBe(10000);
      expect(options.requireConfirmation).toBe(false);
      expect(options.showOutput).toBe(true);
      expect(options.environmentVars).toEqual({
        'NODE_ENV': 'test',
        'DEBUG': '1'
      });
    });

    it('should allow empty options', () => {
      const options: ShellOptions = {};

      expect(Object.keys(options)).toHaveLength(0);
    });

    it('should validate environment variables structure', () => {
      const options: ShellOptions = {
        environmentVars: {
          'VAR1': 'value1',
          'VAR2': 'value2',
          'VAR3': ''
        }
      };

      expect(typeof options.environmentVars).toBe('object');
      expect(options.environmentVars!['VAR1']).toBe('value1');
      expect(options.environmentVars!['VAR3']).toBe('');
    });
  });

  describe('ShellExecution', () => {
    it('should validate ShellExecution status enum', () => {
      const runningExecution: ShellExecution = {
        id: 'exec-1',
        command: 'npm install',
        startTime: new Date('2024-01-01T10:00:00Z'),
        status: 'running'
      };

      const completedExecution: ShellExecution = {
        id: 'exec-2',
        command: 'npm test',
        startTime: new Date('2024-01-01T10:00:00Z'),
        endTime: new Date('2024-01-01T10:05:00Z'),
        status: 'completed',
        result: {
          success: true,
          stdout: 'All tests passed',
          stderr: '',
          exitCode: 0,
          command: 'npm test',
          duration: 300000
        }
      };

      const failedExecution: ShellExecution = {
        id: 'exec-3',
        command: 'invalid-command',
        startTime: new Date('2024-01-01T10:00:00Z'),
        endTime: new Date('2024-01-01T10:00:01Z'),
        status: 'failed',
        result: {
          success: false,
          stdout: '',
          stderr: 'Command not found',
          exitCode: 127,
          command: 'invalid-command',
          duration: 1000
        }
      };

      const cancelledExecution: ShellExecution = {
        id: 'exec-4',
        command: 'long-running-task',
        startTime: new Date('2024-01-01T10:00:00Z'),
        endTime: new Date('2024-01-01T10:02:30Z'),
        status: 'cancelled'
      };

      expect(runningExecution.status).toBe('running');
      expect(completedExecution.status).toBe('completed');
      expect(failedExecution.status).toBe('failed');
      expect(cancelledExecution.status).toBe('cancelled');

      // Validate running execution has no end time or result
      expect(runningExecution.endTime).toBeUndefined();
      expect(runningExecution.result).toBeUndefined();

      // Validate completed execution has result
      expect(completedExecution.result).toBeDefined();
      expect(completedExecution.result!.success).toBe(true);
    });

    it('should validate execution timing', () => {
      const execution: ShellExecution = {
        id: 'timing-test',
        command: 'echo test',
        startTime: new Date('2024-01-01T10:00:00Z'),
        endTime: new Date('2024-01-01T10:00:05Z'),
        status: 'completed'
      };

      expect(execution.startTime).toBeInstanceOf(Date);
      expect(execution.endTime).toBeInstanceOf(Date);
      expect(execution.endTime!.getTime()).toBeGreaterThan(execution.startTime.getTime());
    });
  });

  describe('ShellHistory', () => {
    it('should validate ShellHistory array constraints', () => {
      const history: ShellHistory = {
        executions: [
          {
            id: 'exec-1',
            command: 'ls',
            startTime: new Date('2024-01-01T10:00:00Z'),
            status: 'completed'
          },
          {
            id: 'exec-2',
            command: 'pwd',
            startTime: new Date('2024-01-01T10:01:00Z'),
            status: 'completed'
          }
        ],
        maxEntries: 100
      };

      expect(Array.isArray(history.executions)).toBe(true);
      expect(history.executions).toHaveLength(2);
      expect(history.maxEntries).toBe(100);
      expect(typeof history.maxEntries).toBe('number');
    });

    it('should handle empty execution history', () => {
      const history: ShellHistory = {
        executions: [],
        maxEntries: 50
      };

      expect(history.executions).toHaveLength(0);
      expect(history.maxEntries).toBe(50);
    });

    it('should validate maxEntries is positive', () => {
      const history: ShellHistory = {
        executions: [],
        maxEntries: 1
      };

      expect(history.maxEntries).toBeGreaterThan(0);
    });

    it('should handle large execution history', () => {
      const executions: ShellExecution[] = Array.from({ length: 10 }, (_, i) => ({
        id: `exec-${i}`,
        command: `command-${i}`,
        startTime: new Date(),
        status: 'completed' as const
      }));

      const history: ShellHistory = {
        executions,
        maxEntries: 1000
      };

      expect(history.executions).toHaveLength(10);
      expect(history.maxEntries).toBe(1000);
      expect(history.executions.every(exec => exec.status === 'completed')).toBe(true);
    });
  });
});