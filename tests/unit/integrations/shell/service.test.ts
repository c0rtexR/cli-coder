/**
 * @fileoverview Unit tests for ShellService - secure command execution
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { exec } from 'child_process';
import { promisify } from 'util';
import inquirer from 'inquirer';
import { CLIErrorClass } from '../../../../src/utils/errors';
import type { ShellOptions, ShellResult } from '../../../../src/types/shell.types';

// Mock dependencies
vi.mock('child_process');
vi.mock('util');
vi.mock('inquirer');
vi.mock('chalk', () => ({
  default: Object.assign(
    (text: string) => text,
    {
      blue: vi.fn((text) => text),
      green: vi.fn((text) => text),
      yellow: vi.fn((text) => text),
      red: vi.fn((text) => text),
      gray: vi.fn((text) => text),
    }
  ),
}));

const mockExec = vi.mocked(exec);
const mockPromisify = vi.mocked(promisify);
const mockInquirer = vi.mocked(inquirer);

// Mock execAsync
const mockExecAsync = vi.fn();
mockPromisify.mockReturnValue(mockExecAsync);

describe('ShellService', () => {
  let ShellService: any;
  let shellService: any;
  let originalConsoleLog: any;

  beforeEach(async () => {
    // Import after mocks are set up
    const module = await import('../../../../src/integrations/shell/service');
    ShellService = module.ShellService;
    shellService = new ShellService();

    // Mock console.log
    originalConsoleLog = console.log;
    console.log = vi.fn();

    vi.clearAllMocks();
  });

  afterEach(() => {
    console.log = originalConsoleLog;
  });

  describe('Command Validation', () => {
    it('should validate safe commands', async () => {
      // Arrange
      const safeCommands = [
        'git status',
        'npm test',
        'ls -la',
        'cat package.json',
        'pwd',
        'whoami',
        'echo "hello"',
        'node --version',
        'python --version',
        'docker ps',
      ];

      // Act & Assert
      for (const command of safeCommands) {
        expect(() => {
          shellService.validateCommand(command);
        }).not.toThrow();
      }
    });

    it('should block dangerous commands', async () => {
      // Arrange
      const dangerousCommands = [
        'rm -rf /',
        'sudo rm -rf /',
        'dd if=/dev/zero of=/dev/sda',
        'mkfs.ext4 /dev/sda1',
        'chmod 777 /etc/passwd',
        'shutdown -h now',
        'reboot',
        'kill -9 1',
        'killall -9',
        'fdisk /dev/sda',
      ];

      // Act & Assert
      for (const command of dangerousCommands) {
        expect(() => {
          shellService.validateCommand(command);
        }).toThrow(CLIErrorClass);
      }
    });

    it('should detect command injection attempts', async () => {
      // Arrange
      const injectionCommands = [
        'ls; rm -rf /',
        'echo test && rm important-file',
        'cat file | rm -rf /',
        'ls $(rm -rf /)',
        'echo `rm -rf /`',
        'ls &&rm -rf /',
      ];

      // Act & Assert
      for (const command of injectionCommands) {
        expect(() => {
          shellService.validateCommand(command);
        }).toThrow(CLIErrorClass);
      }
    });

    it('should handle suspicious patterns', async () => {
      // Arrange
      const suspiciousCommands = [
        'find . -name "*.log" ; rm -rf /',
        'grep pattern file | rm important',
        'awk "{print $1}" && rm file',
        'sed "s/old/new/" $(rm file)',
        'sort file `rm other`',
      ];

      // Act & Assert
      for (const command of suspiciousCommands) {
        expect(() => {
          shellService.validateCommand(command);
        }).toThrow(CLIErrorClass);
      }
    });

    it('should validate shell metacharacters', async () => {
      // Arrange
      const validCommands = [
        'find . -name "*.js"',
        'grep "pattern" file.txt',
        'ls | grep test',
        'echo "hello world"',
      ];

      const invalidCommands = [
        'ls; rm file',
        'echo test && rm file',
        'cat file | rm other',
      ];

      // Act & Assert
      for (const command of validCommands) {
        expect(() => {
          shellService.validateCommand(command);
        }).not.toThrow();
      }

      for (const command of invalidCommands) {
        expect(() => {
          shellService.validateCommand(command);
        }).toThrow();
      }
    });
  });

  describe('Command Execution', () => {
    it('should execute valid commands successfully', async () => {
      // Arrange
      const command = 'git status';
      const expectedOutput = 'On branch main\nnothing to commit, working tree clean';
      mockExecAsync.mockResolvedValue({
        stdout: expectedOutput,
        stderr: '',
      });

      // Act
      const result = await shellService.execute(command, {
        requireConfirmation: false,
        showOutput: false,
      });

      // Assert
      expect(result).toEqual({
        success: true,
        stdout: expectedOutput,
        stderr: '',
        exitCode: 0,
        command,
        duration: expect.any(Number),
      });
      expect(mockExecAsync).toHaveBeenCalledWith(command, {
        cwd: process.cwd(),
        timeout: 30000,
        env: process.env,
        maxBuffer: 1024 * 1024,
      });
    });

    it('should handle command failures gracefully', async () => {
      // Arrange
      const command = 'git invalid-command';
      const errorMessage = 'git: invalid-command is not a git command';
      mockExecAsync.mockRejectedValue({
        stdout: '',
        stderr: errorMessage,
        code: 1,
      });

      // Act
      const result = await shellService.execute(command, {
        requireConfirmation: false,
        showOutput: false,
      });

      // Assert
      expect(result).toEqual({
        success: false,
        stdout: '',
        stderr: errorMessage,
        exitCode: 1,
        command,
        duration: expect.any(Number),
      });
    });

    it('should respect timeout limits', async () => {
      // Arrange
      const command = 'sleep 60';
      const options: ShellOptions = {
        timeout: 1000,
        requireConfirmation: false,
        showOutput: false,
      };
      
      // Mock timeout error
      mockExecAsync.mockRejectedValue({
        killed: true,
        code: 'ETIMEDOUT',
        signal: 'SIGTERM',
      });

      // Act & Assert
      await expect(shellService.execute(command, options)).rejects.toThrow('Command timed out');
      expect(mockExecAsync).toHaveBeenCalledWith(command, {
        cwd: process.cwd(),
        timeout: 1000,
        env: process.env,
        maxBuffer: 1024 * 1024,
      });
    });

    it('should capture stdout and stderr', async () => {
      // Arrange
      const command = 'node test.js';
      const stdout = 'Test passed';
      const stderr = 'Warning: deprecated feature';
      mockExecAsync.mockResolvedValue({ stdout, stderr });

      // Act
      const result = await shellService.execute(command, {
        requireConfirmation: false,
        showOutput: false,
      });

      // Assert
      expect(result.stdout).toBe(stdout);
      expect(result.stderr).toBe(stderr);
      expect(result.success).toBe(true);
    });

    it('should use custom working directory', async () => {
      // Arrange
      const command = 'ls';
      const workingDirectory = '/tmp';
      mockExecAsync.mockResolvedValue({ stdout: 'file1.txt\nfile2.txt', stderr: '' });

      // Act
      await shellService.execute(command, {
        workingDirectory,
        requireConfirmation: false,
        showOutput: false,
      });

      // Assert
      expect(mockExecAsync).toHaveBeenCalledWith(command, {
        cwd: workingDirectory,
        timeout: 30000,
        env: process.env,
        maxBuffer: 1024 * 1024,
      });
    });

    it('should use custom environment variables', async () => {
      // Arrange
      const command = 'echo $TEST_VAR';
      const environmentVars = { TEST_VAR: 'test_value' };
      mockExecAsync.mockResolvedValue({ stdout: 'test_value', stderr: '' });

      // Act
      await shellService.execute(command, {
        environmentVars,
        requireConfirmation: false,
        showOutput: false,
      });

      // Assert
      expect(mockExecAsync).toHaveBeenCalledWith(command, {
        cwd: process.cwd(),
        timeout: 30000,
        env: { ...process.env, ...environmentVars },
        maxBuffer: 1024 * 1024,
      });
    });
  });

  describe('User Confirmation', () => {
    it('should auto-approve safe commands', async () => {
      // Arrange
      const command = 'git status';
      mockExecAsync.mockResolvedValue({ stdout: 'status output', stderr: '' });

      // Act
      await shellService.execute(command);

      // Assert
      expect(mockInquirer.prompt).not.toHaveBeenCalled();
      expect(mockExecAsync).toHaveBeenCalled();
    });

    it('should require confirmation for potentially dangerous commands', async () => {
      // Arrange
      const command = 'some-unknown-tool --force --delete';
      mockInquirer.prompt.mockResolvedValue({ proceed: true });
      mockExecAsync.mockResolvedValue({ stdout: 'command executed', stderr: '' });

      // Act
      await shellService.execute(command);

      // Assert
      expect(mockInquirer.prompt).toHaveBeenCalledWith([{
        type: 'confirm',
        name: 'proceed',
        message: 'Execute this command?',
        default: false,
      }]);
    });

    it('should handle user cancellation', async () => {
      // Arrange
      const command = 'unknown-dangerous-tool --force';
      mockInquirer.prompt.mockResolvedValue({ proceed: false });

      // Act & Assert
      await expect(shellService.execute(command)).rejects.toThrow('Command execution cancelled');
      expect(mockExecAsync).not.toHaveBeenCalled();
    });

    it('should respect requireConfirmation option', async () => {
      // Arrange
      const command = 'ls -la';
      mockExecAsync.mockResolvedValue({ stdout: 'file list', stderr: '' });

      // Act
      await shellService.execute(command, { requireConfirmation: false });

      // Assert
      expect(mockInquirer.prompt).not.toHaveBeenCalled();
      expect(mockExecAsync).toHaveBeenCalled();
    });

    it('should show command details in confirmation', async () => {
      // Arrange
      const command = 'dangerous-unknown-tool --force';
      const workingDirectory = '/project';
      mockInquirer.prompt.mockResolvedValue({ proceed: true });
      mockExecAsync.mockResolvedValue({ stdout: 'build output', stderr: '' });

      // Act
      await shellService.execute(command, { workingDirectory });

      // Assert
      expect(console.log).toHaveBeenCalledWith(expect.stringContaining('Command requires confirmation'));
      expect(console.log).toHaveBeenCalledWith(expect.stringContaining(command));
      expect(console.log).toHaveBeenCalledWith(expect.stringContaining(workingDirectory));
    });
  });

  describe('Tool-Specific Methods', () => {
    describe('git method', () => {
      it('should execute git commands without confirmation', async () => {
        // Arrange
        const subcommand = 'status';
        mockExecAsync.mockResolvedValue({ stdout: 'git output', stderr: '' });

        // Act
        await shellService.git(subcommand);

        // Assert
        expect(mockExecAsync).toHaveBeenCalledWith('git status', expect.any(Object));
        expect(mockInquirer.prompt).not.toHaveBeenCalled();
      });

      it('should pass options to git commands', async () => {
        // Arrange
        const subcommand = 'log --oneline';
        const options: ShellOptions = { workingDirectory: '/repo' };
        mockExecAsync.mockResolvedValue({ stdout: 'commit log', stderr: '' });

        // Act
        await shellService.git(subcommand, options);

        // Assert
        expect(mockExecAsync).toHaveBeenCalledWith('git log --oneline', {
          cwd: '/repo',
          timeout: 30000,
          env: process.env,
          maxBuffer: 1024 * 1024,
        });
      });
    });

    describe('npm method', () => {
      it('should execute npm test without confirmation', async () => {
        // Arrange
        const subcommand = 'test';
        mockExecAsync.mockResolvedValue({ stdout: 'test results', stderr: '' });

        // Act
        await shellService.npm(subcommand);

        // Assert
        expect(mockExecAsync).toHaveBeenCalledWith('npm test', expect.any(Object));
        expect(mockInquirer.prompt).not.toHaveBeenCalled();
      });

      it('should require confirmation for npm install', async () => {
        // Arrange
        const subcommand = 'install express';
        mockInquirer.prompt.mockResolvedValue({ proceed: true });
        mockExecAsync.mockResolvedValue({ stdout: 'package installed', stderr: '' });

        // Act
        await shellService.npm(subcommand);

        // Assert
        // npm install should require confirmation due to needsConfirmation logic
        expect(mockInquirer.prompt).toHaveBeenCalled();
        expect(mockExecAsync).toHaveBeenCalledWith('npm install express', expect.any(Object));
      });

      it('should require confirmation for npm uninstall', async () => {
        // Arrange
        const subcommand = 'uninstall express';
        mockInquirer.prompt.mockResolvedValue({ proceed: true });
        mockExecAsync.mockResolvedValue({ stdout: 'package removed', stderr: '' });

        // Act
        await shellService.npm(subcommand);

        // Assert
        expect(mockInquirer.prompt).toHaveBeenCalled();
      });
    });

    describe('docker method', () => {
      it('should always require confirmation for docker commands', async () => {
        // Arrange
        const subcommand = 'ps';
        mockInquirer.prompt.mockResolvedValue({ proceed: true });
        mockExecAsync.mockResolvedValue({ stdout: 'container list', stderr: '' });

        // Act
        await shellService.docker(subcommand);

        // Assert
        expect(mockInquirer.prompt).toHaveBeenCalled();
        expect(mockExecAsync).toHaveBeenCalledWith('docker ps', expect.any(Object));
      });
    });
  });

  describe('Utility Methods', () => {
    describe('commandExists', () => {
      it('should return true for existing commands', async () => {
        // Arrange
        const command = 'git';
        mockExecAsync.mockResolvedValue({ stdout: '/usr/bin/git', stderr: '' });

        // Act
        const exists = await shellService.commandExists(command);

        // Assert
        expect(exists).toBe(true);
        expect(mockExecAsync).toHaveBeenCalledWith('which git', {
          cwd: process.cwd(),
          timeout: 30000,
          env: process.env,
          maxBuffer: 1024 * 1024,
        });
      });

      it('should return false for non-existing commands', async () => {
        // Arrange
        const command = 'nonexistent-command';
        mockExecAsync.mockRejectedValue(new Error('Command not found'));

        // Act
        const exists = await shellService.commandExists(command);

        // Assert
        expect(exists).toBe(false);
      });
    });

    describe('getCommandVersion', () => {
      it('should return version for commands that support --version', async () => {
        // Arrange
        const command = 'node';
        const version = 'v18.17.0';
        mockExecAsync.mockResolvedValue({ stdout: version, stderr: '' });

        // Act
        const result = await shellService.getCommandVersion(command);

        // Assert
        expect(result).toBe(version);
        expect(mockExecAsync).toHaveBeenCalledWith('node --version', {
          cwd: process.cwd(),
          timeout: 30000,
          env: process.env,
          maxBuffer: 1024 * 1024,
        });
      });

      it('should return null for commands without version support', async () => {
        // Arrange
        const command = 'invalidcommand';
        mockExecAsync.mockRejectedValue(new Error('Command failed'));

        // Act
        const result = await shellService.getCommandVersion(command);

        // Assert
        expect(result).toBeNull();
      });
    });
  });

  describe('Dangerous Flag Detection', () => {
    it('should detect dangerous flags in safe commands', () => {
      // Arrange
      const commandsWithDangerousFlags = [
        'git reset --hard HEAD~10',
        'npm install --force',
        'rm file -f',
        'git clean --force',
        'docker rmi --force image',
      ];

      // Act & Assert
      for (const command of commandsWithDangerousFlags) {
        const result = shellService.isDangerousFlags(command);
        expect(result).toBe(true);
      }
    });

    it('should not flag safe command variations', () => {
      // Arrange
      const safeCommands = [
        'git status',
        'npm test',
        'ls -la',
        'docker ps',
        'git log --oneline',
      ];

      // Act & Assert
      for (const command of safeCommands) {
        const result = shellService.isDangerousFlags(command);
        expect(result).toBe(false);
      }
    });
  });

  describe('Error Handling', () => {
    it('should throw CLIErrorClass for dangerous commands', async () => {
      // Arrange
      const dangerousCommand = 'rm -rf /';

      // Act & Assert
      await expect(shellService.execute(dangerousCommand)).rejects.toThrow(CLIErrorClass);
    });

    it('should throw CLIErrorClass for command injection', async () => {
      // Arrange
      const injectionCommand = 'ls; rm important-file';

      // Act & Assert
      await expect(shellService.execute(injectionCommand)).rejects.toThrow(CLIErrorClass);
    });

    it('should handle execution errors gracefully', async () => {
      // Arrange
      const command = 'git status';
      mockExecAsync.mockRejectedValue(new Error('Process spawn failed'));

      // Act & Assert
      await expect(shellService.execute(command, { requireConfirmation: false }))
        .rejects.toThrow('SHELL_EXECUTION_ERROR');
    });
  });

  describe('Output Display', () => {
    it('should show output when showOutput is true', async () => {
      // Arrange
      const command = 'echo "hello world"';
      const stdout = 'hello world';
      const stderr = 'warning message';
      mockExecAsync.mockResolvedValue({ stdout, stderr });

      // Act
      await shellService.execute(command, {
        requireConfirmation: false,
        showOutput: true,
      });

      // Assert
      expect(console.log).toHaveBeenCalledWith(expect.stringContaining('Output:'));
      expect(console.log).toHaveBeenCalledWith(stdout);
      expect(console.log).toHaveBeenCalledWith(expect.stringContaining('Stderr:'));
      expect(console.log).toHaveBeenCalledWith(stderr);
    });

    it('should not show output when showOutput is false', async () => {
      // Arrange
      const command = 'echo "hello world"';
      mockExecAsync.mockResolvedValue({ stdout: 'hello world', stderr: '' });

      // Act
      await shellService.execute(command, {
        requireConfirmation: false,
        showOutput: false,
      });

      // Assert
      expect(console.log).not.toHaveBeenCalledWith(expect.stringContaining('Output:'));
    });
  });
});