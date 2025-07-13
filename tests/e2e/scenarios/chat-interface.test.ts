/**
 * @fileoverview E2E tests for chat interface - complete user interaction flows
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { spawn, ChildProcess } from 'child_process';
import { join } from 'path';
import { mkdirSync, writeFileSync, rmSync, existsSync } from 'fs';
import { tmpdir } from 'os';

describe('Chat Interface E2E', () => {
  let testDir: string;
  let originalHome: string | undefined;
  let originalCwd: string;
  let cliPath: string;

  beforeEach(() => {
    // Create unique temporary test directory
    const timestamp = Date.now();
    const random = Math.random().toString(36).slice(2);
    testDir = join(tmpdir(), `cli-coder-e2e-${timestamp}-${random}`);
    mkdirSync(testDir, { recursive: true });

    // Store original values
    originalHome = process.env.HOME;
    originalCwd = process.cwd();

    // Set test environment
    process.env.HOME = testDir;
    process.chdir(testDir);

    // Path to built CLI
    cliPath = join(__dirname, '../../../dist/index.js');
  });

  afterEach(async () => {
    try {
      if (existsSync(testDir)) {
        rmSync(testDir, { recursive: true, force: true });
      }
    } catch (error) {
      // Ignore cleanup errors
    }

    // Restore environment
    if (originalHome !== undefined) {
      process.env.HOME = originalHome;
    } else {
      delete process.env.HOME;
    }

    try {
      process.chdir(originalCwd);
    } catch (error) {
      // Ignore if original directory no longer exists
    }

    await new Promise(resolve => setTimeout(resolve, 10));
  });

  function createMockConfig() {
    const configDir = join(testDir, '.cli-coder');
    const configPath = join(configDir, 'config.json');
    mkdirSync(configDir, { recursive: true });

    const config = {
      llm: {
        provider: 'openai',
        apiKey: 'sk-test123456789',
        model: 'gpt-4',
      },
      shell: {
        allowDangerousCommands: false,
        defaultTimeout: 30000,
      },
    };

    writeFileSync(configPath, JSON.stringify(config, null, 2));
  }

  function runCLICommand(args: string[], timeout = 5000): Promise<{
    stdout: string;
    stderr: string;
    exitCode: number;
  }> {
    return new Promise((resolve, reject) => {
      const child = spawn('node', [cliPath, ...args], {
        stdio: 'pipe',
        env: {
          ...process.env,
          NODE_ENV: 'test',
        },
      });

      let stdout = '';
      let stderr = '';

      child.stdout?.on('data', (data) => {
        stdout += data.toString();
      });

      child.stderr?.on('data', (data) => {
        stderr += data.toString();
      });

      child.on('close', (code) => {
        resolve({
          stdout,
          stderr,
          exitCode: code || 0,
        });
      });

      child.on('error', (error) => {
        reject(error);
      });

      // Kill process after timeout
      setTimeout(() => {
        child.kill('SIGTERM');
        resolve({
          stdout,
          stderr,
          exitCode: 1,
        });
      }, timeout);
    });
  }

  function runInteractiveCLI(args: string[]): {
    process: ChildProcess;
    sendInput: (input: string) => void;
    waitForOutput: (pattern: string | RegExp, timeout?: number) => Promise<string>;
    cleanup: () => void;
  } {
    const child = spawn('node', [cliPath, ...args], {
      stdio: 'pipe',
      env: {
        ...process.env,
        NODE_ENV: 'test',
      },
    });

    let output = '';

    child.stdout?.on('data', (data) => {
      output += data.toString();
    });

    child.stderr?.on('data', (data) => {
      output += data.toString();
    });

    return {
      process: child,
      sendInput: (input: string) => {
        child.stdin?.write(input + '\n');
      },
      waitForOutput: (pattern: string | RegExp, timeout = 3000) => {
        return new Promise((resolve, reject) => {
          const startTime = Date.now();
          
          const check = () => {
            if (typeof pattern === 'string' ? output.includes(pattern) : pattern.test(output)) {
              resolve(output);
            } else if (Date.now() - startTime > timeout) {
              reject(new Error(`Timeout waiting for pattern: ${pattern}. Got: ${output}`));
            } else {
              setTimeout(check, 50);
            }
          };
          
          check();
        });
      },
      cleanup: () => {
        child.kill('SIGTERM');
      },
    };
  }

  describe('Chat Command Basic Flow', () => {
    it('should show help when no config exists', async () => {
      const result = await runCLICommand(['chat']);
      
      expect(result.exitCode).not.toBe(0);
      expect(result.stderr).toContain('config');
    });

    it('should start chat session with valid config', async () => {
      createMockConfig();
      
      const cli = runInteractiveCLI(['chat']);
      
      try {
        // Wait for welcome message
        await cli.waitForOutput('CLI Coder Chat');
        
        // Should show provider info
        await cli.waitForOutput('Provider:');
        
        // Should show prompt
        await cli.waitForOutput('>');
        
        // Send exit command
        cli.sendInput('/exit');
        
        // Wait for goodbye message
        await cli.waitForOutput('Goodbye');
        
      } finally {
        cli.cleanup();
      }
    });

    it('should handle help command', async () => {
      createMockConfig();
      
      const cli = runInteractiveCLI(['chat']);
      
      try {
        await cli.waitForOutput('>');
        
        cli.sendInput('/help');
        
        await cli.waitForOutput('Available Commands:');
        await cli.waitForOutput('/help');
        await cli.waitForOutput('/clear');
        await cli.waitForOutput('/context');
        await cli.waitForOutput('/exit');
        
        cli.sendInput('/exit');
        
      } finally {
        cli.cleanup();
      }
    });

    it('should handle clear command', async () => {
      createMockConfig();
      
      const cli = runInteractiveCLI(['chat']);
      
      try {
        await cli.waitForOutput('>');
        
        cli.sendInput('/clear');
        
        await cli.waitForOutput('Chat history cleared');
        
        cli.sendInput('/exit');
        
      } finally {
        cli.cleanup();
      }
    });

    it('should handle context command with no files', async () => {
      createMockConfig();
      
      const cli = runInteractiveCLI(['chat']);
      
      try {
        await cli.waitForOutput('>');
        
        cli.sendInput('/context');
        
        await cli.waitForOutput('No files in context');
        
        cli.sendInput('/exit');
        
      } finally {
        cli.cleanup();
      }
    });

    it('should handle unknown commands', async () => {
      createMockConfig();
      
      const cli = runInteractiveCLI(['chat']);
      
      try {
        await cli.waitForOutput('>');
        
        cli.sendInput('/unknown');
        
        await cli.waitForOutput('Unknown command: /unknown');
        await cli.waitForOutput('Type /help for available commands');
        
        cli.sendInput('/exit');
        
      } finally {
        cli.cleanup();
      }
    });
  });

  describe('Chat Message Flow', () => {
    it('should handle regular chat messages (mocked)', async () => {
      createMockConfig();
      
      // This test would require mocking the LLM service response
      // In a real E2E test, you might use a test LLM endpoint
      
      const cli = runInteractiveCLI(['chat']);
      
      try {
        await cli.waitForOutput('>');
        
        // Send a regular message
        cli.sendInput('Hello, how are you?');
        
        // Should show thinking indicator
        await cli.waitForOutput('Thinking...');
        
        // In a real implementation, this would wait for LLM response
        // For testing, we'd need to mock the response
        
        cli.sendInput('/exit');
        
      } finally {
        cli.cleanup();
      }
    });

    it('should handle empty input gracefully', async () => {
      createMockConfig();
      
      const cli = runInteractiveCLI(['chat']);
      
      try {
        await cli.waitForOutput('>');
        
        // Send empty input
        cli.sendInput('');
        
        // Should show prompt again
        await cli.waitForOutput('>');
        
        cli.sendInput('/exit');
        
      } finally {
        cli.cleanup();
      }
    });
  });

  describe('Command Line Options', () => {
    it('should accept model override option', async () => {
      createMockConfig();
      
      const cli = runInteractiveCLI(['chat', '--model', 'gpt-3.5-turbo']);
      
      try {
        await cli.waitForOutput('CLI Coder Chat');
        cli.sendInput('/exit');
      } finally {
        cli.cleanup();
      }
    });

    it('should accept provider override option', async () => {
      createMockConfig();
      
      const cli = runInteractiveCLI(['chat', '--provider', 'anthropic']);
      
      try {
        await cli.waitForOutput('CLI Coder Chat');
        cli.sendInput('/exit');
      } finally {
        cli.cleanup();
      }
    });
  });

  describe('Error Handling', () => {
    it('should handle Ctrl+C gracefully', async () => {
      createMockConfig();
      
      const cli = runInteractiveCLI(['chat']);
      
      try {
        await cli.waitForOutput('>');
        
        // Simulate Ctrl+C
        cli.process.kill('SIGINT');
        
        // Should exit gracefully
        await new Promise(resolve => {
          cli.process.on('close', () => resolve(undefined));
        });
        
      } finally {
        cli.cleanup();
      }
    });

    it('should handle invalid configuration gracefully', async () => {
      const configDir = join(testDir, '.cli-coder');
      const configPath = join(configDir, 'config.json');
      mkdirSync(configDir, { recursive: true });

      // Create invalid config
      writeFileSync(configPath, '{ invalid json }');
      
      const result = await runCLICommand(['chat']);
      
      expect(result.exitCode).not.toBe(0);
      expect(result.stderr).toContain('error');
    });
  });
});