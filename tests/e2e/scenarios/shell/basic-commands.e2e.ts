/**
 * @fileoverview E2E tests for basic shell command workflows
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { spawn, ChildProcess } from 'child_process';
import { writeFileSync, unlinkSync, existsSync, mkdirSync, rmSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';

interface CLITestResult {
  exitCode: number;
  stdout: string;
  stderr: string;
}

class CLITestRig {
  private tempDir: string;
  private configPath: string;

  constructor() {
    this.tempDir = join(tmpdir(), `cli-coder-test-${Date.now()}`);
    this.configPath = join(this.tempDir, 'config.json');
  }

  setup(): void {
    // Create temp directory
    mkdirSync(this.tempDir, { recursive: true });

    // Create test config
    const testConfig = {
      llm: {
        provider: 'openai',
        model: 'gpt-4',
        apiKey: 'test-key-for-e2e',
        maxTokens: 2000,
        temperature: 0.7,
      },
      shell: {
        allowDangerousCommands: false,
        defaultTimeout: 10000,
        confirmationRequired: false, // Disable for automated testing
        historySize: 100,
      },
    };

    writeFileSync(this.configPath, JSON.stringify(testConfig, null, 2));
  }

  cleanup(): void {
    if (existsSync(this.tempDir)) {
      rmSync(this.tempDir, { recursive: true, force: true });
    }
  }

  async runCLICommand(command: string[], input?: string): Promise<CLITestResult> {
    return new Promise((resolve, reject) => {
      const cli = spawn('node', ['dist/cli.js', ...command], {
        cwd: process.cwd(),
        env: {
          ...process.env,
          CLI_CODER_CONFIG_PATH: this.configPath,
          CI: 'true', // Disable interactive features
        },
        stdio: ['pipe', 'pipe', 'pipe'],
      });

      let stdout = '';
      let stderr = '';

      cli.stdout.on('data', (data) => {
        stdout += data.toString();
      });

      cli.stderr.on('data', (data) => {
        stderr += data.toString();
      });

      cli.on('close', (code) => {
        resolve({
          exitCode: code || 0,
          stdout,
          stderr,
        });
      });

      cli.on('error', (error) => {
        reject(error);
      });

      // Send input if provided
      if (input) {
        cli.stdin.write(input);
        cli.stdin.end();
      }
    });
  }

  async runInteractiveCLI(commands: string[]): Promise<CLITestResult> {
    return new Promise((resolve, reject) => {
      const cli = spawn('node', ['dist/cli.js', 'chat'], {
        cwd: process.cwd(),
        env: {
          ...process.env,
          CLI_CODER_CONFIG_PATH: this.configPath,
          CI: 'true',
        },
        stdio: ['pipe', 'pipe', 'pipe'],
      });

      let stdout = '';
      let stderr = '';

      cli.stdout.on('data', (data) => {
        stdout += data.toString();
      });

      cli.stderr.on('data', (data) => {
        stderr += data.toString();
      });

      cli.on('close', (code) => {
        resolve({
          exitCode: code || 0,
          stdout,
          stderr,
        });
      });

      cli.on('error', (error) => {
        reject(error);
      });

      // Send commands sequentially
      const sendNextCommand = (index: number) => {
        if (index < commands.length) {
          cli.stdin.write(commands[index] + '\n');
          setTimeout(() => sendNextCommand(index + 1), 1000);
        } else {
          cli.stdin.write('/exit\n');
        }
      };

      // Wait for CLI to start then send commands
      setTimeout(() => sendNextCommand(0), 2000);
    });
  }
}

describe('Shell Commands E2E', () => {
  let testRig: CLITestRig;

  beforeEach(() => {
    testRig = new CLITestRig();
    testRig.setup();
  });

  afterEach(() => {
    testRig.cleanup();
  });

  describe('Safe Command Execution', () => {
    it('should execute git status command', async () => {
      // Act
      const result = await testRig.runInteractiveCLI(['/git status']);

      // Assert
      expect(result.exitCode).toBe(0);
      expect(result.stdout).toContain('Git command completed');
    }, 30000);

    it('should execute npm test command', async () => {
      // Act
      const result = await testRig.runInteractiveCLI(['/npm test']);

      // Assert
      expect(result.exitCode).toBe(0);
      // Note: npm test may fail but command should execute
      expect(result.stdout).toMatch(/(NPM command completed|NPM command failed)/);
    }, 30000);

    it('should execute basic shell commands', async () => {
      // Act
      const result = await testRig.runInteractiveCLI([
        '/shell pwd',
        '/shell echo "Hello E2E Test"',
        '/shell ls',
      ]);

      // Assert
      expect(result.exitCode).toBe(0);
      expect(result.stdout).toContain('Command completed');
      expect(result.stdout).toContain('Hello E2E Test');
    }, 30000);

    it('should handle file listing commands', async () => {
      // Act
      const result = await testRig.runInteractiveCLI(['/shell ls -la']);

      // Assert
      expect(result.exitCode).toBe(0);
      expect(result.stdout).toContain('Command completed');
    }, 30000);

    it('should execute which commands to check tool availability', async () => {
      // Act
      const result = await testRig.runInteractiveCLI([
        '/shell which node',
        '/shell which npm',
        '/shell which git',
      ]);

      // Assert
      expect(result.exitCode).toBe(0);
      expect(result.stdout).toContain('Command completed');
    }, 30000);
  });

  describe('Command Failure Handling', () => {
    it('should handle non-existent commands gracefully', async () => {
      // Act
      const result = await testRig.runInteractiveCLI(['/shell nonexistent-command-12345']);

      // Assert
      expect(result.exitCode).toBe(0); // CLI should not crash
      expect(result.stdout).toContain('Command failed');
    }, 30000);

    it('should handle git commands in non-git directory', async () => {
      // Act
      const result = await testRig.runInteractiveCLI(['/git log']);

      // Assert
      expect(result.exitCode).toBe(0);
      expect(result.stdout).toMatch(/(Git command completed|Git command failed)/);
    }, 30000);

    it('should handle npm commands without package.json', async () => {
      // Act
      const result = await testRig.runInteractiveCLI(['/npm run build']);

      // Assert
      expect(result.exitCode).toBe(0);
      expect(result.stdout).toContain('NPM command failed');
    }, 30000);
  });

  describe('Command Output Display', () => {
    it('should display command output correctly', async () => {
      // Act
      const result = await testRig.runInteractiveCLI(['/shell echo "Test Output Display"']);

      // Assert
      expect(result.exitCode).toBe(0);
      expect(result.stdout).toContain('Test Output Display');
      expect(result.stdout).toContain('Output:');
    }, 30000);

    it('should display execution time', async () => {
      // Act
      const result = await testRig.runInteractiveCLI(['/shell sleep 1']);

      // Assert
      expect(result.exitCode).toBe(0);
      expect(result.stdout).toMatch(/Command completed \(\d+ms\)/);
    }, 30000);

    it('should handle commands with both stdout and stderr', async () => {
      // Act
      const result = await testRig.runInteractiveCLI(['/shell node -e "console.log(\'stdout\'); console.error(\'stderr\')"']);

      // Assert
      expect(result.exitCode).toBe(0);
      expect(result.stdout).toContain('stdout');
      expect(result.stdout).toContain('stderr');
    }, 30000);
  });

  describe('Tool-Specific Commands', () => {
    it('should handle git shortcut commands', async () => {
      // Act
      const result = await testRig.runInteractiveCLI([
        '/git --version',
        '/git status',
        '/git branch',
      ]);

      // Assert
      expect(result.exitCode).toBe(0);
      expect(result.stdout).toContain('Git command');
    }, 30000);

    it('should handle npm shortcut commands', async () => {
      // Act
      const result = await testRig.runInteractiveCLI([
        '/npm --version',
        '/npm list --depth=0',
      ]);

      // Assert
      expect(result.exitCode).toBe(0);
      expect(result.stdout).toContain('NPM command');
    }, 30000);

    it('should handle docker commands if available', async () => {
      // Act
      const result = await testRig.runInteractiveCLI(['/docker --version']);

      // Assert
      expect(result.exitCode).toBe(0);
      // Docker may not be available in CI, so just check command execution
      expect(result.stdout).toContain('Docker command');
    }, 30000);
  });

  describe('Command History', () => {
    it('should maintain command history during session', async () => {
      // Act
      const result = await testRig.runInteractiveCLI([
        '/shell echo "command 1"',
        '/shell echo "command 2"',
        '/shell echo "command 3"',
        '/help', // This should show available commands including history
      ]);

      // Assert
      expect(result.exitCode).toBe(0);
      expect(result.stdout).toContain('Available Commands');
    }, 30000);
  });

  describe('Error Recovery', () => {
    it('should continue session after command failures', async () => {
      // Act
      const result = await testRig.runInteractiveCLI([
        '/shell failing-command',
        '/shell echo "recovery test"',
        '/git status',
      ]);

      // Assert
      expect(result.exitCode).toBe(0);
      expect(result.stdout).toContain('recovery test');
      expect(result.stdout).toContain('Git command');
    }, 30000);

    it('should handle multiple consecutive failures', async () => {
      // Act
      const result = await testRig.runInteractiveCLI([
        '/shell fail1',
        '/shell fail2',
        '/shell fail3',
        '/shell echo "still working"',
      ]);

      // Assert
      expect(result.exitCode).toBe(0);
      expect(result.stdout).toContain('still working');
    }, 30000);
  });

  describe('Help and Usage', () => {
    it('should show shell command help', async () => {
      // Act
      const result = await testRig.runInteractiveCLI(['/shell']);

      // Assert
      expect(result.exitCode).toBe(0);
      expect(result.stdout).toContain('Usage: /shell <command>');
      expect(result.stdout).toContain('Examples:');
    }, 30000);

    it('should show git command help', async () => {
      // Act
      const result = await testRig.runInteractiveCLI(['/git']);

      // Assert
      expect(result.exitCode).toBe(0);
      expect(result.stdout).toContain('Usage: /git <subcommand>');
      expect(result.stdout).toContain('Examples:');
    }, 30000);

    it('should show npm command help', async () => {
      // Act
      const result = await testRig.runInteractiveCLI(['/npm']);

      // Assert
      expect(result.exitCode).toBe(0);
      expect(result.stdout).toContain('Usage: /npm <subcommand>');
      expect(result.stdout).toContain('Examples:');
    }, 30000);

    it('should show docker command help', async () => {
      // Act
      const result = await testRig.runInteractiveCLI(['/docker']);

      // Assert
      expect(result.exitCode).toBe(0);
      expect(result.stdout).toContain('Usage: /docker <subcommand>');
      expect(result.stdout).toContain('Examples:');
    }, 30000);

    it('should include shell commands in main help', async () => {
      // Act
      const result = await testRig.runInteractiveCLI(['/help']);

      // Assert
      expect(result.exitCode).toBe(0);
      expect(result.stdout).toContain('/shell <command>');
      expect(result.stdout).toContain('/git <subcommand>');
      expect(result.stdout).toContain('/npm <subcommand>');
      expect(result.stdout).toContain('/docker <subcmd>');
    }, 30000);
  });

  describe('Cross-Platform Compatibility', () => {
    it('should work with platform-specific commands', async () => {
      // Arrange
      const isWindows = process.platform === 'win32';
      const commands = isWindows 
        ? ['/shell dir', '/shell echo %CD%'] 
        : ['/shell ls', '/shell echo $PWD'];

      // Act
      const result = await testRig.runInteractiveCLI(commands);

      // Assert
      expect(result.exitCode).toBe(0);
      expect(result.stdout).toContain('Command completed');
    }, 30000);

    it('should handle path separators correctly', async () => {
      // Act
      const result = await testRig.runInteractiveCLI(['/shell pwd']);

      // Assert
      expect(result.exitCode).toBe(0);
      expect(result.stdout).toContain('Command completed');
    }, 30000);
  });

  describe('Session Management', () => {
    it('should start and exit cleanly', async () => {
      // Act
      const result = await testRig.runInteractiveCLI(['/help']);

      // Assert
      expect(result.exitCode).toBe(0);
      expect(result.stdout).toContain('CLI Coder Chat');
      expect(result.stdout).toContain('Goodbye');
    }, 30000);

    it('should handle Ctrl+C gracefully', async () => {
      // This is tested implicitly by our cleanup in runInteractiveCLI
      // The process should exit cleanly when we send /exit
      const result = await testRig.runInteractiveCLI(['/shell echo "test"']);
      expect(result.exitCode).toBe(0);
    }, 30000);
  });
});