/**
 * @fileoverview E2E tests for TUI user workflows
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { spawn, ChildProcess } from 'child_process';
import { promises as fs } from 'fs';
import path from 'path';
import os from 'os';

describe('TUI E2E User Workflows', () => {
  let tempDir: string;
  let cliProcess: ChildProcess;
  let processOutput: string[];

  beforeEach(async () => {
    // Create temporary directory for test files
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'cli-coder-tui-test-'));
    processOutput = [];
    
    // Create test files
    await fs.writeFile(
      path.join(tempDir, 'test.ts'),
      'export const greeting = "Hello World";'
    );
    await fs.writeFile(
      path.join(tempDir, 'package.json'),
      JSON.stringify({ name: 'test-project', version: '1.0.0' }, null, 2)
    );
  });

  afterEach(async () => {
    // Clean up process
    if (cliProcess && !cliProcess.killed) {
      cliProcess.kill('SIGTERM');
    }

    // Clean up temp directory
    try {
      await fs.rm(tempDir, { recursive: true, force: true });
    } catch (error) {
      // Ignore cleanup errors
    }
  });

  describe('TUI Launch and Navigation', () => {
    it('should launch TUI mode successfully', async () => {
      // Arrange
      const promise = new Promise<boolean>((resolve, reject) => {
        const timeout = setTimeout(() => {
          reject(new Error('TUI launch timeout'));
        }, 10000);

        // Act
        cliProcess = spawn('node', ['./dist/index.js', 'chat', '--tui'], {
          cwd: process.cwd(),
          env: {
            ...process.env,
            CLI_CODER_TEST_MODE: 'true',
            CLI_CODER_API_KEY: 'test-key',
          },
        });

        cliProcess.stdout?.on('data', (data) => {
          const output = data.toString();
          processOutput.push(output);
          
          // Check for TUI elements
          if (output.includes('CLI Coder') && 
              output.includes('Chat') && 
              output.includes('Files') && 
              output.includes('Input')) {
            clearTimeout(timeout);
            resolve(true);
          }
        });

        cliProcess.stderr?.on('data', (data) => {
          const error = data.toString();
          if (!error.includes('warning') && !error.includes('info')) {
            clearTimeout(timeout);
            reject(new Error(`CLI process error: ${error}`));
          }
        });

        cliProcess.on('error', (error) => {
          clearTimeout(timeout);
          reject(error);
        });
      });

      // Assert
      await expect(promise).resolves.toBe(true);
    }, 15000);

    it('should navigate between panels with Tab key', async () => {
      // Arrange
      const promise = new Promise<boolean>((resolve, reject) => {
        const timeout = setTimeout(() => {
          reject(new Error('Panel navigation timeout'));
        }, 8000);

        cliProcess = spawn('node', ['./dist/index.js', 'chat', '--tui'], {
          cwd: process.cwd(),
          env: {
            ...process.env,
            CLI_CODER_TEST_MODE: 'true',
            CLI_CODER_API_KEY: 'test-key',
          },
        });

        let tuiStarted = false;
        let navigationTested = false;

        cliProcess.stdout?.on('data', (data) => {
          const output = data.toString();
          processOutput.push(output);

          if (!tuiStarted && output.includes('CLI Coder')) {
            tuiStarted = true;
            // Send Tab key to switch panels
            cliProcess.stdin?.write('\t');
            
            setTimeout(() => {
              if (!navigationTested) {
                navigationTested = true;
                // Check if active panel changed
                const fullOutput = processOutput.join('');
                if (fullOutput.includes('Active: ')) {
                  clearTimeout(timeout);
                  resolve(true);
                } else {
                  clearTimeout(timeout);
                  reject(new Error('Panel navigation not detected'));
                }
              }
            }, 1000);
          }
        });

        cliProcess.on('error', (error) => {
          clearTimeout(timeout);
          reject(error);
        });
      });

      // Act & Assert
      await expect(promise).resolves.toBe(true);
    }, 12000);

    it('should display help screen with Ctrl+H', async () => {
      // Arrange
      const promise = new Promise<boolean>((resolve, reject) => {
        const timeout = setTimeout(() => {
          reject(new Error('Help screen timeout'));
        }, 8000);

        cliProcess = spawn('node', ['./dist/index.js', 'chat', '--tui'], {
          cwd: process.cwd(),
          env: {
            ...process.env,
            CLI_CODER_TEST_MODE: 'true',
            CLI_CODER_API_KEY: 'test-key',
          },
        });

        let tuiStarted = false;

        cliProcess.stdout?.on('data', (data) => {
          const output = data.toString();
          processOutput.push(output);

          if (!tuiStarted && output.includes('CLI Coder')) {
            tuiStarted = true;
            // Send Ctrl+H to show help
            cliProcess.stdin?.write('\x08');
            
            setTimeout(() => {
              const fullOutput = processOutput.join('');
              if (fullOutput.includes('Keyboard Shortcuts') && 
                  fullOutput.includes('Global Shortcuts')) {
                clearTimeout(timeout);
                resolve(true);
              } else {
                clearTimeout(timeout);
                reject(new Error('Help screen not displayed'));
              }
            }, 1000);
          }
        });

        cliProcess.on('error', (error) => {
          clearTimeout(timeout);
          reject(error);
        });
      });

      // Act & Assert
      await expect(promise).resolves.toBe(true);
    }, 12000);
  });

  describe('File Management Workflow', () => {
    it('should display files in context when available', async () => {
      // Arrange
      const promise = new Promise<boolean>((resolve, reject) => {
        const timeout = setTimeout(() => {
          reject(new Error('File display timeout'));
        }, 10000);

        // Start CLI with files added to context
        cliProcess = spawn('node', [
          './dist/index.js', 
          'chat', 
          '--tui',
          '--add', path.join(tempDir, 'test.ts'),
          '--add', path.join(tempDir, 'package.json')
        ], {
          cwd: process.cwd(),
          env: {
            ...process.env,
            CLI_CODER_TEST_MODE: 'true',
            CLI_CODER_API_KEY: 'test-key',
          },
        });

        cliProcess.stdout?.on('data', (data) => {
          const output = data.toString();
          processOutput.push(output);

          if (output.includes('Files: 2') || output.includes('(2 files)')) {
            clearTimeout(timeout);
            resolve(true);
          }
        });

        cliProcess.on('error', (error) => {
          clearTimeout(timeout);
          reject(error);
        });
      });

      // Act & Assert
      await expect(promise).resolves.toBe(true);
    }, 15000);

    it('should navigate and preview files in file panel', async () => {
      // Arrange
      const promise = new Promise<boolean>((resolve, reject) => {
        const timeout = setTimeout(() => {
          reject(new Error('File navigation timeout'));
        }, 12000);

        cliProcess = spawn('node', [
          './dist/index.js', 
          'chat', 
          '--tui',
          '--add', path.join(tempDir, 'test.ts')
        ], {
          cwd: process.cwd(),
          env: {
            ...process.env,
            CLI_CODER_TEST_MODE: 'true',
            CLI_CODER_API_KEY: 'test-key',
          },
        });

        let tuiStarted = false;
        let inFilePanel = false;

        cliProcess.stdout?.on('data', (data) => {
          const output = data.toString();
          processOutput.push(output);

          if (!tuiStarted && output.includes('CLI Coder')) {
            tuiStarted = true;
            // Switch to file panel
            cliProcess.stdin?.write('\t\t'); // Tab twice to reach files panel
            
            setTimeout(() => {
              inFilePanel = true;
              // Press space to preview file
              cliProcess.stdin?.write(' ');
              
              setTimeout(() => {
                const fullOutput = processOutput.join('');
                if (fullOutput.includes('test.ts') && 
                    fullOutput.includes('Hello World')) {
                  clearTimeout(timeout);
                  resolve(true);
                } else {
                  clearTimeout(timeout);
                  reject(new Error('File preview not working'));
                }
              }, 1500);
            }, 1000);
          }
        });

        cliProcess.on('error', (error) => {
          clearTimeout(timeout);
          reject(error);
        });
      });

      // Act & Assert
      await expect(promise).resolves.toBe(true);
    }, 15000);
  });

  describe('Chat Interaction Workflow', () => {
    it('should send and receive messages through input panel', async () => {
      // Arrange
      const promise = new Promise<boolean>((resolve, reject) => {
        const timeout = setTimeout(() => {
          reject(new Error('Chat interaction timeout'));
        }, 15000);

        cliProcess = spawn('node', ['./dist/index.js', 'chat', '--tui'], {
          cwd: process.cwd(),
          env: {
            ...process.env,
            CLI_CODER_TEST_MODE: 'true',
            CLI_CODER_API_KEY: 'test-key',
            CLI_CODER_MOCK_LLM: 'true', // Use mock LLM for testing
          },
        });

        let tuiStarted = false;
        let messageSent = false;

        cliProcess.stdout?.on('data', (data) => {
          const output = data.toString();
          processOutput.push(output);

          if (!tuiStarted && output.includes('CLI Coder')) {
            tuiStarted = true;
            // Type a message
            cliProcess.stdin?.write('Hello, can you help me?');
            
            setTimeout(() => {
              // Send message with Ctrl+Enter
              cliProcess.stdin?.write('\x0d');
              messageSent = true;
              
              setTimeout(() => {
                const fullOutput = processOutput.join('');
                if (fullOutput.includes('Hello, can you help me?') && 
                    (fullOutput.includes('I\'m here to help') || 
                     fullOutput.includes('assistant') || 
                     fullOutput.includes('🤖'))) {
                  clearTimeout(timeout);
                  resolve(true);
                } else {
                  clearTimeout(timeout);
                  reject(new Error('Chat interaction not working'));
                }
              }, 3000);
            }, 1000);
          }
        });

        cliProcess.on('error', (error) => {
          clearTimeout(timeout);
          reject(error);
        });
      });

      // Act & Assert
      await expect(promise).resolves.toBe(true);
    }, 20000);

    it('should handle slash commands in input panel', async () => {
      // Arrange
      const promise = new Promise<boolean>((resolve, reject) => {
        const timeout = setTimeout(() => {
          reject(new Error('Slash command timeout'));
        }, 10000);

        cliProcess = spawn('node', ['./dist/index.js', 'chat', '--tui'], {
          cwd: process.cwd(),
          env: {
            ...process.env,
            CLI_CODER_TEST_MODE: 'true',
            CLI_CODER_API_KEY: 'test-key',
          },
        });

        let tuiStarted = false;

        cliProcess.stdout?.on('data', (data) => {
          const output = data.toString();
          processOutput.push(output);

          if (!tuiStarted && output.includes('CLI Coder')) {
            tuiStarted = true;
            // Type help command
            cliProcess.stdin?.write('/help');
            
            setTimeout(() => {
              // Send command with Ctrl+Enter
              cliProcess.stdin?.write('\x0d');
              
              setTimeout(() => {
                const fullOutput = processOutput.join('');
                if (fullOutput.includes('Available commands') || 
                    fullOutput.includes('/help') ||
                    fullOutput.includes('/clear')) {
                  clearTimeout(timeout);
                  resolve(true);
                } else {
                  clearTimeout(timeout);
                  reject(new Error('Slash command not working'));
                }
              }, 2000);
            }, 500);
          }
        });

        cliProcess.on('error', (error) => {
          clearTimeout(timeout);
          reject(error);
        });
      });

      // Act & Assert
      await expect(promise).resolves.toBe(true);
    }, 15000);
  });

  describe('Panel Resizing Workflow', () => {
    it('should resize chat panel with Ctrl+Arrow keys', async () => {
      // Arrange
      const promise = new Promise<boolean>((resolve, reject) => {
        const timeout = setTimeout(() => {
          reject(new Error('Panel resize timeout'));
        }, 8000);

        cliProcess = spawn('node', ['./dist/index.js', 'chat', '--tui'], {
          cwd: process.cwd(),
          env: {
            ...process.env,
            CLI_CODER_TEST_MODE: 'true',
            CLI_CODER_API_KEY: 'test-key',
          },
        });

        let tuiStarted = false;

        cliProcess.stdout?.on('data', (data) => {
          const output = data.toString();
          processOutput.push(output);

          if (!tuiStarted && output.includes('CLI Coder')) {
            tuiStarted = true;
            // Try to resize panel with Ctrl+Left Arrow
            cliProcess.stdin?.write('\x1b[1;5D'); // Ctrl+Left
            
            setTimeout(() => {
              // The layout should still be functional after resize
              const fullOutput = processOutput.join('');
              if (fullOutput.includes('Chat') && 
                  fullOutput.includes('Files') && 
                  fullOutput.includes('Input')) {
                clearTimeout(timeout);
                resolve(true);
              } else {
                clearTimeout(timeout);
                reject(new Error('Panel resize broke layout'));
              }
            }, 1000);
          }
        });

        cliProcess.on('error', (error) => {
          clearTimeout(timeout);
          reject(error);
        });
      });

      // Act & Assert
      await expect(promise).resolves.toBe(true);
    }, 12000);
  });

  describe('Exit and Cleanup Workflow', () => {
    it('should exit gracefully with Ctrl+C', async () => {
      // Arrange
      const promise = new Promise<boolean>((resolve, reject) => {
        const timeout = setTimeout(() => {
          reject(new Error('Exit timeout'));
        }, 8000);

        cliProcess = spawn('node', ['./dist/index.js', 'chat', '--tui'], {
          cwd: process.cwd(),
          env: {
            ...process.env,
            CLI_CODER_TEST_MODE: 'true',
            CLI_CODER_API_KEY: 'test-key',
          },
        });

        let tuiStarted = false;

        cliProcess.stdout?.on('data', (data) => {
          const output = data.toString();
          processOutput.push(output);

          if (!tuiStarted && output.includes('CLI Coder')) {
            tuiStarted = true;
            // Send Ctrl+C to exit
            cliProcess.stdin?.write('\x03');
          }
        });

        cliProcess.on('exit', (code, signal) => {
          clearTimeout(timeout);
          // Should exit cleanly with Ctrl+C (SIGINT)
          if (signal === 'SIGINT' || code === 0 || code === 130) {
            resolve(true);
          } else {
            reject(new Error(`Unexpected exit: code=${code}, signal=${signal}`));
          }
        });

        cliProcess.on('error', (error) => {
          clearTimeout(timeout);
          reject(error);
        });
      });

      // Act & Assert
      await expect(promise).resolves.toBe(true);
    }, 12000);
  });

  describe('Error Handling Workflow', () => {
    it('should handle invalid commands gracefully', async () => {
      // Arrange
      const promise = new Promise<boolean>((resolve, reject) => {
        const timeout = setTimeout(() => {
          reject(new Error('Error handling timeout'));
        }, 10000);

        cliProcess = spawn('node', ['./dist/index.js', 'chat', '--tui'], {
          cwd: process.cwd(),
          env: {
            ...process.env,
            CLI_CODER_TEST_MODE: 'true',
            CLI_CODER_API_KEY: 'test-key',
          },
        });

        let tuiStarted = false;

        cliProcess.stdout?.on('data', (data) => {
          const output = data.toString();
          processOutput.push(output);

          if (!tuiStarted && output.includes('CLI Coder')) {
            tuiStarted = true;
            // Send invalid slash command
            cliProcess.stdin?.write('/invalidcommand');
            
            setTimeout(() => {
              cliProcess.stdin?.write('\x0d'); // Ctrl+Enter
              
              setTimeout(() => {
                const fullOutput = processOutput.join('');
                if (fullOutput.includes('Unknown command') || 
                    fullOutput.includes('Error') ||
                    fullOutput.includes('not found')) {
                  // Should still be functional after error
                  if (fullOutput.includes('CLI Coder')) {
                    clearTimeout(timeout);
                    resolve(true);
                  }
                }
              }, 2000);
            }, 500);
          }
        });

        cliProcess.on('error', (error) => {
          clearTimeout(timeout);
          reject(error);
        });
      });

      // Act & Assert
      await expect(promise).resolves.toBe(true);
    }, 15000);
  });

  describe('Performance and Stability', () => {
    it('should remain responsive during rapid interactions', async () => {
      // Arrange
      const promise = new Promise<boolean>((resolve, reject) => {
        const timeout = setTimeout(() => {
          reject(new Error('Performance test timeout'));
        }, 15000);

        cliProcess = spawn('node', ['./dist/index.js', 'chat', '--tui'], {
          cwd: process.cwd(),
          env: {
            ...process.env,
            CLI_CODER_TEST_MODE: 'true',
            CLI_CODER_API_KEY: 'test-key',
          },
        });

        let tuiStarted = false;
        let interactionCount = 0;

        cliProcess.stdout?.on('data', (data) => {
          const output = data.toString();
          processOutput.push(output);

          if (!tuiStarted && output.includes('CLI Coder')) {
            tuiStarted = true;
            
            // Perform rapid interactions
            const rapidInteractions = () => {
              if (interactionCount < 10) {
                cliProcess.stdin?.write('\t'); // Panel switch
                setTimeout(() => {
                  cliProcess.stdin?.write('\x08'); // Help toggle
                  setTimeout(() => {
                    cliProcess.stdin?.write('\x1b'); // Help close
                    interactionCount++;
                    rapidInteractions();
                  }, 50);
                }, 50);
              } else {
                // Check if still responsive
                setTimeout(() => {
                  const fullOutput = processOutput.join('');
                  if (fullOutput.includes('CLI Coder') && 
                      !fullOutput.includes('crashed') &&
                      !fullOutput.includes('error')) {
                    clearTimeout(timeout);
                    resolve(true);
                  } else {
                    clearTimeout(timeout);
                    reject(new Error('TUI became unresponsive'));
                  }
                }, 1000);
              }
            };
            
            rapidInteractions();
          }
        });

        cliProcess.on('error', (error) => {
          clearTimeout(timeout);
          reject(error);
        });
      });

      // Act & Assert
      await expect(promise).resolves.toBe(true);
    }, 20000);
  });
});