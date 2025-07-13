/**
 * @fileoverview Secure shell command execution service
 */

import { spawn, exec } from 'child_process';
import { promisify } from 'util';
import chalk from 'chalk';
import inquirer from 'inquirer';
import { CLIErrorClass } from '../../utils/errors';
import type { ShellOptions, ShellResult } from '../../types/shell.types';

const execAsync = promisify(exec);

export class ShellService {
  private readonly DANGEROUS_COMMANDS = [
    'rm -rf',
    'sudo',
    'chmod 777',
    'dd if=',
    'mkfs',
    'fdisk',
    '> /dev/',
    'shutdown',
    'reboot',
    'kill -9',
    'killall',
    'chown -R',
    'chmod -R 777',
    'format',
    'diskpart',
    'del /f /s /q',
    'rd /s /q',
  ];

  private readonly SAFE_COMMANDS = [
    'git',
    'npm',
    'yarn',
    'pnpm',
    'node',
    'python',
    'pip',
    'docker',
    'kubectl',
    'ls',
    'cat',
    'grep',
    'find',
    'which',
    'echo',
    'pwd',
    'whoami',
    'curl',
    'wget',
    'tar',
    'unzip',
    'head',
    'tail',
    'sort',
    'awk',
    'sed',
    'wc',
  ];

  async execute(command: string, options: ShellOptions = {}): Promise<ShellResult> {
    const startTime = Date.now();
    
    // Validate command safety
    this.validateCommand(command);

    // Show user what will be executed
    if (options.requireConfirmation !== false) {
      const shouldExecute = await this.confirmExecution(command, options);
      if (!shouldExecute) {
        throw new CLIErrorClass('COMMAND_CANCELLED', 'Command execution cancelled by user');
      }
    }

    try {
      console.log(chalk.blue(`🔧 Executing: ${command}`));
      
      const result = await this.executeCommand(command, options);
      const duration = Date.now() - startTime;

      if (options.showOutput !== false) {
        if (result.stdout) {
          console.log(chalk.green('✓ Output:'));
          console.log(result.stdout);
        }
        if (result.stderr) {
          console.log(chalk.yellow('⚠ Stderr:'));
          console.log(result.stderr);
        }
      }

      return {
        ...result,
        duration,
        command,
      };

    } catch (error) {
      const duration = Date.now() - startTime;
      
      // Re-throw CLIErrorClass errors without wrapping
      if (error instanceof CLIErrorClass) {
        throw error;
      }
      
      throw new CLIErrorClass('SHELL_EXECUTION_ERROR', 
        `Command failed: ${command}`, 
        { error, duration }
      );
    }
  }

  validateCommand(command: string): void {
    // Check for dangerous commands
    const lowerCommand = command.toLowerCase();
    for (const dangerous of this.DANGEROUS_COMMANDS) {
      if (lowerCommand.includes(dangerous)) {
        throw new CLIErrorClass('DANGEROUS_COMMAND', 
          `Potentially dangerous command detected: ${dangerous}`);
      }
    }

    // Prevent command injection
    if (command.includes('$(') || command.includes('`') || command.includes('&&rm') || command.includes(';rm')) {
      throw new CLIErrorClass('COMMAND_INJECTION', 
        'Command appears to contain injection attempts');
    }

    // Check for shell metacharacters that could be dangerous
    const suspiciousPatterns = [
      /;[\s]*rm/,
      /\|[\s]*rm/,
      /&&[\s]*rm/,
      /\$\([^)]*rm/,
      /`[^`]*rm/,
      /;[\s]*sudo/,
      /\|[\s]*sudo/,
      /&&[\s]*sudo/,
    ];

    for (const pattern of suspiciousPatterns) {
      if (pattern.test(command)) {
        throw new CLIErrorClass('SUSPICIOUS_COMMAND', 
          'Command contains suspicious patterns');
      }
    }
  }

  private async confirmExecution(command: string, options: ShellOptions): Promise<boolean> {
    // If requireConfirmation is explicitly set to true, always require confirmation
    if (options.requireConfirmation === true) {
      // Skip auto-approval, go to confirmation prompt
    } else {
      const isKnownSafe = this.SAFE_COMMANDS.some(safe => command.startsWith(safe));
      
      if (isKnownSafe && !this.isDangerousFlags(command)) {
        // Auto-approve safe commands without confirmation
        return true;
      }
    }

    console.log(chalk.yellow('⚠️  Command requires confirmation'));
    console.log(chalk.gray(`Command: ${command}`));
    if (options.workingDirectory) {
      console.log(chalk.gray(`Working Directory: ${options.workingDirectory}`));
    }

    const answer = await inquirer.prompt([{
      type: 'confirm',
      name: 'proceed',
      message: 'Execute this command?',
      default: false,
    }]);

    return answer.proceed;
  }

  isDangerousFlags(command: string): boolean {
    const dangerousFlags = [
      '--force',
      '-f',
      '--delete',
      '--remove',
      '--reset --hard',
      '--prune',
      '--recursive',
      '-R',
      '-rf',
      '--hard',
    ];

    return dangerousFlags.some(flag => command.includes(flag));
  }

  private async executeCommand(command: string, options: ShellOptions): Promise<Omit<ShellResult, 'duration' | 'command'>> {
    const execOptions = {
      cwd: options.workingDirectory || process.cwd(),
      timeout: options.timeout || 30000, // 30 second default timeout
      env: {
        ...process.env,
        ...options.environmentVars,
      },
      maxBuffer: 1024 * 1024, // 1MB buffer
    };

    try {
      const { stdout, stderr } = await execAsync(command, execOptions);
      
      return {
        success: true,
        stdout: stdout.toString(),
        stderr: stderr.toString(),
        exitCode: 0,
      };
    } catch (error: any) {
      // Check if it's a timeout error
      if (error.signal === 'SIGTERM' || error.killed || error.code === 'ETIMEDOUT') {
        throw new CLIErrorClass('COMMAND_TIMEOUT', 
          `Command timed out after ${execOptions.timeout}ms`);
      }
      
      // If error has stdout/stderr, it's a command execution failure (exit code != 0)
      if (error.stdout !== undefined || error.stderr !== undefined) {
        return {
          success: false,
          stdout: error.stdout?.toString() || '',
          stderr: error.stderr?.toString() || error.message,
          exitCode: error.code || 1,
        };
      }
      
      // Otherwise it's a spawn/system error, should throw
      throw new CLIErrorClass('SHELL_EXECUTION_ERROR', 
        `SHELL_EXECUTION_ERROR: Process spawn failed: ${error.message}`, 
        { originalError: error }
      );
    }
  }

  // Predefined safe command helpers
  async git(subcommand: string, options?: ShellOptions): Promise<ShellResult> {
    return this.execute(`git ${subcommand}`, { 
      requireConfirmation: false, 
      ...options 
    });
  }

  async npm(subcommand: string, options?: ShellOptions): Promise<ShellResult> {
    const needsConfirmation = subcommand.includes('install') || 
                             subcommand.includes('uninstall') || 
                             subcommand.includes('update');
    
    return this.execute(`npm ${subcommand}`, { 
      requireConfirmation: needsConfirmation, 
      ...options 
    });
  }

  async docker(subcommand: string, options?: ShellOptions): Promise<ShellResult> {
    return this.execute(`docker ${subcommand}`, { 
      requireConfirmation: true, 
      ...options 
    });
  }

  // Check if command exists
  async commandExists(command: string): Promise<boolean> {
    try {
      const result = await this.execute(`which ${command}`, { 
        requireConfirmation: false, 
        showOutput: false 
      });
      return result.success;
    } catch {
      return false;
    }
  }

  // Get command version
  async getCommandVersion(command: string): Promise<string | null> {
    try {
      const result = await this.execute(`${command} --version`, { 
        requireConfirmation: false, 
        showOutput: false 
      });
      return result.success ? result.stdout.trim() : null;
    } catch {
      return null;
    }
  }
}

export const shellService = new ShellService();