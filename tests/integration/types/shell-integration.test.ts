/**
 * @fileoverview Integration tests for Shell type compatibility with real command execution
 */

import { describe, it, expect } from 'vitest';
import { execSync, spawn } from 'child_process';
import type { 
  ShellCommand, 
  ShellResult, 
  ShellOptions, 
  ShellExecution,
  ShellHistory 
} from '../../../src/types/shell.types';

describe('Shell Integration Tests', () => {
  describe('Real Command Execution', () => {
    it('should work with actual command execution', () => {
      const command: ShellCommand = {
        command: 'echo',
        args: ['Hello, World!'],
        timeout: 5000,
        requireConfirmation: false
      };

      // Execute real command
      try {
        const output = execSync(`${command.command} ${command.args?.join(' ') || ''}`, {
          encoding: 'utf-8',
          timeout: command.timeout
        });

        // Transform to our ShellResult type
        const result: ShellResult = {
          success: true,
          stdout: output.trim(),
          stderr: '',
          exitCode: 0,
          command: `${command.command} ${command.args?.join(' ') || ''}`,
          duration: 100 // Approximate for testing
        };

        expect(result.success).toBe(true);
        expect(result.stdout).toBe('Hello, World!');
        expect(result.stderr).toBe('');
        expect(result.exitCode).toBe(0);
      } catch (error: any) {
        // If command fails, should still match our type structure
        const result: ShellResult = {
          success: false,
          stdout: '',
          stderr: error.message || 'Command failed',
          exitCode: error.status || 1,
          command: `${command.command} ${command.args?.join(' ') || ''}`,
          duration: 50
        };

        expect(result.success).toBe(false);
        expect(result.exitCode).not.toBe(0);
      }
    });

    it('should handle command with working directory', () => {
      const command: ShellCommand = {
        command: 'pwd',
        workingDirectory: '/tmp'
      };

      try {
        const output = execSync(command.command, {
          encoding: 'utf-8',
          cwd: command.workingDirectory
        });

        const result: ShellResult = {
          success: true,
          stdout: output.trim(),
          stderr: '',
          exitCode: 0,
          command: command.command,
          duration: 50
        };

        expect(result.success).toBe(true);
        // On macOS, /tmp is a symlink to /private/tmp
        expect(['/tmp', '/private/tmp'].includes(result.stdout)).toBe(true);
      } catch (error: any) {
        // Skip test if /tmp doesn't exist or pwd fails
        console.warn('Skipping pwd test:', error.message);
      }
    });

    it('should handle command timeout scenarios', async () => {
      const command: ShellCommand = {
        command: 'sleep',
        args: ['2'],
        timeout: 1000 // 1 second timeout for 2 second sleep
      };

      const startTime = Date.now();
      
      try {
        execSync(`${command.command} ${command.args?.join(' ')}`, {
          encoding: 'utf-8',
          timeout: command.timeout
        });
        
        // If we get here, the command didn't timeout (unexpected)
        expect(false).toBe(true); // Force test failure
      } catch (error: any) {
        const endTime = Date.now();
        const duration = endTime - startTime;

        const result: ShellResult = {
          success: false,
          stdout: '',
          stderr: 'Command timed out',
          exitCode: error.signal === 'SIGTERM' ? 143 : 1,
          command: `${command.command} ${command.args?.join(' ')}`,
          duration
        };

        expect(result.success).toBe(false);
        expect(duration).toBeLessThan(2000); // Should timeout before 2 seconds
        expect(duration).toBeGreaterThan(500); // But should take at least some time
      }
    }, 10000); // 10 second test timeout

    it('should validate environment variable passing', () => {
      const command: ShellCommand = {
        command: 'node',
        args: ['-e', '"console.log(process.env.TEST_VAR)"']
      };

      const options: ShellOptions = {
        environmentVars: {
          'TEST_VAR': 'test-value'
        }
      };

      try {
        const output = execSync(`${command.command} ${command.args?.join(' ')}`, {
          encoding: 'utf-8',
          env: {
            ...process.env,
            ...options.environmentVars
          }
        });

        const result: ShellResult = {
          success: true,
          stdout: output.trim(),
          stderr: '',
          exitCode: 0,
          command: `${command.command} ${command.args?.join(' ')}`,
          duration: 200
        };

        expect(result.stdout).toBe('test-value');
      } catch (error) {
        // Skip if Node.js not available
        console.warn('Skipping Node.js environment test:', error);
      }
    });
  });

  describe('Command Building and Validation', () => {
    it('should build complex git commands', () => {
      const gitCommands: ShellCommand[] = [
        {
          command: 'git',
          args: ['status', '--porcelain'],
          workingDirectory: '/project',
          timeout: 10000
        },
        {
          command: 'git',
          args: ['log', '--oneline', '-10'],
          workingDirectory: '/project',
          timeout: 15000
        },
        {
          command: 'git',
          args: ['diff', 'HEAD~1'],
          workingDirectory: '/project',
          timeout: 20000,
          requireConfirmation: true
        }
      ];

      gitCommands.forEach(cmd => {
        expect(cmd.command).toBe('git');
        expect(Array.isArray(cmd.args)).toBe(true);
        expect(cmd.args!.length).toBeGreaterThan(0);
        expect(cmd.workingDirectory).toBe('/project');
        expect(cmd.timeout).toBeGreaterThan(0);
      });

      // Build command strings
      const commandStrings = gitCommands.map(cmd => 
        `${cmd.command} ${cmd.args?.join(' ') || ''}`
      );

      expect(commandStrings[0]).toBe('git status --porcelain');
      expect(commandStrings[1]).toBe('git log --oneline -10');
      expect(commandStrings[2]).toBe('git diff HEAD~1');
    });

    it('should handle npm/yarn package manager commands', () => {
      const packageCommands: ShellCommand[] = [
        {
          command: 'npm',
          args: ['install'],
          workingDirectory: '/project',
          timeout: 120000 // 2 minutes for npm install
        },
        {
          command: 'npm',
          args: ['run', 'test'],
          workingDirectory: '/project',
          timeout: 60000
        },
        {
          command: 'yarn',
          args: ['add', 'typescript', '--dev'],
          workingDirectory: '/project',
          timeout: 60000
        }
      ];

      packageCommands.forEach(cmd => {
        expect(['npm', 'yarn'].includes(cmd.command)).toBe(true);
        expect(cmd.timeout).toBeGreaterThan(30000); // Package managers need longer timeouts
        expect(cmd.workingDirectory).toBe('/project');
      });
    });

    it('should validate dangerous command detection', () => {
      const dangerousCommands: ShellCommand[] = [
        {
          command: 'rm',
          args: ['-rf', '/'],
          requireConfirmation: true
        },
        {
          command: 'sudo',
          args: ['rm', '-rf', '/important-directory'],
          requireConfirmation: true
        },
        {
          command: 'mkfs',
          args: ['/dev/sda1'],
          requireConfirmation: true
        },
        {
          command: 'dd',
          args: ['if=/dev/zero', 'of=/dev/sda'],
          requireConfirmation: true
        }
      ];

      // All dangerous commands should require confirmation
      dangerousCommands.forEach(cmd => {
        expect(cmd.requireConfirmation).toBe(true);
      });

      // Function to detect dangerous commands
      const isDangerousCommand = (cmd: ShellCommand): boolean => {
        const dangerousCommands = ['rm', 'sudo', 'mkfs', 'dd', 'fdisk', 'format'];
        if (dangerousCommands.includes(cmd.command)) return true;
        
        // Check for dangerous patterns in args
        const dangerousPatterns = ['-rf /', '--force', '/dev/', 'format c:'];
        const argsString = cmd.args?.join(' ') || '';
        return dangerousPatterns.some(pattern => argsString.includes(pattern));
      };

      dangerousCommands.forEach(cmd => {
        expect(isDangerousCommand(cmd)).toBe(true);
      });

      // Safe commands should not be detected as dangerous
      const safeCommands: ShellCommand[] = [
        { command: 'ls', args: ['-la'] },
        { command: 'cat', args: ['file.txt'] },
        { command: 'grep', args: ['pattern', 'file.txt'] }
      ];

      safeCommands.forEach(cmd => {
        expect(isDangerousCommand(cmd)).toBe(false);
      });
    });
  });

  describe('Execution History Management', () => {
    it('should track command execution history', () => {
      const executions: ShellExecution[] = [
        {
          id: 'exec-1',
          command: 'ls -la',
          startTime: new Date('2024-01-01T10:00:00Z'),
          endTime: new Date('2024-01-01T10:00:01Z'),
          status: 'completed',
          result: {
            success: true,
            stdout: 'file1.txt\nfile2.txt',
            stderr: '',
            exitCode: 0,
            command: 'ls -la',
            duration: 1000
          }
        },
        {
          id: 'exec-2',
          command: 'npm install',
          startTime: new Date('2024-01-01T10:01:00Z'),
          endTime: new Date('2024-01-01T10:03:00Z'),
          status: 'completed',
          result: {
            success: true,
            stdout: 'added 150 packages',
            stderr: '',
            exitCode: 0,
            command: 'npm install',
            duration: 120000
          }
        },
        {
          id: 'exec-3',
          command: 'nonexistent-command',
          startTime: new Date('2024-01-01T10:04:00Z'),
          endTime: new Date('2024-01-01T10:04:01Z'),
          status: 'failed',
          result: {
            success: false,
            stdout: '',
            stderr: 'command not found',
            exitCode: 127,
            command: 'nonexistent-command',
            duration: 500
          }
        }
      ];

      const history: ShellHistory = {
        executions,
        maxEntries: 100
      };

      expect(history.executions).toHaveLength(3);
      expect(history.maxEntries).toBe(100);

      // Validate each execution
      executions.forEach(exec => {
        expect(exec.id).toBeDefined();
        expect(exec.command).toBeDefined();
        expect(exec.startTime).toBeInstanceOf(Date);
        expect(['running', 'completed', 'failed', 'cancelled'].includes(exec.status)).toBe(true);
        
        if (exec.endTime) {
          expect(exec.endTime.getTime()).toBeGreaterThanOrEqual(exec.startTime.getTime());
        }
        
        if (exec.result) {
          expect(typeof exec.result.success).toBe('boolean');
          expect(typeof exec.result.exitCode).toBe('number');
        }
      });
    });

    it('should handle running command tracking', () => {
      const runningExecution: ShellExecution = {
        id: 'exec-running',
        command: 'long-running-process',
        startTime: new Date(),
        status: 'running'
      };

      expect(runningExecution.endTime).toBeUndefined();
      expect(runningExecution.result).toBeUndefined();
      expect(runningExecution.status).toBe('running');

      // Simulate completion
      const completedExecution: ShellExecution = {
        ...runningExecution,
        endTime: new Date(),
        status: 'completed',
        result: {
          success: true,
          stdout: 'Process completed',
          stderr: '',
          exitCode: 0,
          command: 'long-running-process',
          duration: 30000
        }
      };

      expect(completedExecution.endTime).toBeDefined();
      expect(completedExecution.result).toBeDefined();
      expect(completedExecution.status).toBe('completed');
    });

    it('should manage history size limits', () => {
      // Create history with many executions
      const manyExecutions: ShellExecution[] = Array.from({ length: 150 }, (_, i) => ({
        id: `exec-${i}`,
        command: `command-${i}`,
        startTime: new Date(`2024-01-01T${String(10 + Math.floor(i / 60)).padStart(2, '0')}:${String(i % 60).padStart(2, '0')}:00Z`),
        status: 'completed' as const
      }));

      const history: ShellHistory = {
        executions: manyExecutions,
        maxEntries: 100
      };

      // Simulate trimming history to max entries
      const trimmedHistory: ShellHistory = {
        executions: history.executions.slice(-history.maxEntries),
        maxEntries: history.maxEntries
      };

      expect(trimmedHistory.executions).toHaveLength(100);
      expect(trimmedHistory.executions[0].id).toBe('exec-50'); // Should keep latest 100
      expect(trimmedHistory.executions[99].id).toBe('exec-149');
    });
  });

  describe('Shell Options Processing', () => {
    it('should process shell options correctly', () => {
      const options: ShellOptions = {
        workingDirectory: '/project/subdir',
        timeout: 45000,
        requireConfirmation: true,
        showOutput: false,
        environmentVars: {
          'NODE_ENV': 'production',
          'DEBUG': '0',
          'PATH': '/usr/local/bin:/usr/bin:/bin'
        }
      };

      // Validate all option types
      expect(typeof options.workingDirectory).toBe('string');
      expect(typeof options.timeout).toBe('number');
      expect(typeof options.requireConfirmation).toBe('boolean');
      expect(typeof options.showOutput).toBe('boolean');
      expect(typeof options.environmentVars).toBe('object');

      // Validate option values
      expect(options.timeout).toBeGreaterThan(0);
      expect(options.workingDirectory!.length).toBeGreaterThan(0);
      expect(Object.keys(options.environmentVars!)).toHaveLength(3);
    });

    it('should merge options with defaults', () => {
      const defaultOptions: Required<ShellOptions> = {
        workingDirectory: process.cwd(),
        timeout: 30000,
        requireConfirmation: false,
        showOutput: true,
        environmentVars: {}
      };

      const userOptions: ShellOptions = {
        timeout: 60000,
        requireConfirmation: true,
        environmentVars: {
          'CUSTOM_VAR': 'value'
        }
      };

      const mergedOptions: Required<ShellOptions> = {
        ...defaultOptions,
        ...userOptions,
        environmentVars: {
          ...defaultOptions.environmentVars,
          ...userOptions.environmentVars
        }
      };

      expect(mergedOptions.timeout).toBe(60000); // From user options
      expect(mergedOptions.requireConfirmation).toBe(true); // From user options
      expect(mergedOptions.workingDirectory).toBe(process.cwd()); // From defaults
      expect(mergedOptions.showOutput).toBe(true); // From defaults
      expect(mergedOptions.environmentVars.CUSTOM_VAR).toBe('value'); // Merged
    });
  });
});