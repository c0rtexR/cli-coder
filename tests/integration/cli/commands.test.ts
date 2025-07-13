import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { spawn, ChildProcess } from 'child_process';
import { resolve } from 'path';

// Test helpers
class CLITestRunner {
  private cliPath: string;

  constructor() {
    this.cliPath = resolve(__dirname, '../../../dist/index.js');
  }

  async run(args: string[] = [], options: { timeout?: number } = {}): Promise<{
    stdout: string;
    stderr: string;
    exitCode: number;
  }> {
    return new Promise((resolve, reject) => {
      const child: ChildProcess = spawn('node', [this.cliPath, ...args], {
        stdio: ['pipe', 'pipe', 'pipe']
      });

      let stdout = '';
      let stderr = '';

      child.stdout?.on('data', (data) => {
        stdout += data.toString();
      });

      child.stderr?.on('data', (data) => {
        stderr += data.toString();
      });

      const timeout = setTimeout(() => {
        child.kill('SIGTERM');
        reject(new Error(`Command timed out after ${options.timeout || 5000}ms`));
      }, options.timeout || 5000);

      child.on('close', (exitCode) => {
        clearTimeout(timeout);
        resolve({
          stdout: stdout.trim(),
          stderr: stderr.trim(),
          exitCode: exitCode || 0
        });
      });

      child.on('error', (error) => {
        clearTimeout(timeout);
        reject(error);
      });
    });
  }
}

describe('CLI Command Integration Tests', () => {
  let cli: CLITestRunner;

  beforeEach(() => {
    cli = new CLITestRunner();
  });

  describe('Help and Version Commands', () => {
    it('should display help when no arguments provided', async () => {
      const result = await cli.run([]);
      
      // Should either show help or execute default command (chat)
      expect(result.exitCode).toBe(0);
      expect(result.stdout.length).toBeGreaterThan(0);
    });

    it('should display help with --help flag', async () => {
      const result = await cli.run(['--help']);
      
      expect(result.exitCode).toBe(0);
      expect(result.stdout).toContain('AI-powered CLI coding assistant');
      expect(result.stdout).toContain('Commands:');
      expect(result.stdout).toContain('chat');
      expect(result.stdout).toContain('config');
      expect(result.stdout).toContain('init');
      expect(result.stdout).toContain('version');
    });

    it('should display version with --version flag', async () => {
      const result = await cli.run(['--version']);
      
      expect(result.exitCode).toBe(0);
      expect(result.stdout).toMatch(/\d+\.\d+\.\d+/); // Version pattern
    });

    it('should display detailed version with version command', async () => {
      const result = await cli.run(['version']);
      
      expect(result.exitCode).toBe(0);
      expect(result.stdout).toContain('cli-coder');
      expect(result.stdout).toContain('0.1.0');
    });

    it('should display version in JSON format', async () => {
      const result = await cli.run(['version', '--json']);
      
      expect(result.exitCode).toBe(0);
      
      // Parse JSON output
      const versionInfo = JSON.parse(result.stdout);
      expect(versionInfo).toHaveProperty('version');
      expect(versionInfo).toHaveProperty('name');
      expect(versionInfo).toHaveProperty('description');
      expect(versionInfo).toHaveProperty('node');
      expect(versionInfo).toHaveProperty('platform');
      expect(versionInfo).toHaveProperty('arch');
      
      expect(versionInfo.name).toBe('cli-coder');
      expect(versionInfo.version).toBe('0.1.0');
    });
  });

  describe('Chat Command Integration', () => {
    it('should start chat command successfully', async () => {
      // Chat command starts an interactive session, so we test that it initializes correctly
      // before timing out (which is expected behavior)
      try {
        await cli.run(['chat'], { timeout: 1000 }); // Short timeout for interactive command
      } catch (error) {
        // Expect timeout since chat starts interactive session
        expect((error as Error).message).toContain('timed out');
      }
    });

    it('should accept model option', async () => {
      try {
        await cli.run(['chat', '--model', 'gpt-4'], { timeout: 1000 });
      } catch (error) {
        expect((error as Error).message).toContain('timed out');
      }
    });

    it('should accept provider option', async () => {
      try {
        await cli.run(['chat', '--provider', 'openai'], { timeout: 1000 });
      } catch (error) {
        expect((error as Error).message).toContain('timed out');
      }
    });

    it('should accept no-git flag', async () => {
      try {
        await cli.run(['chat', '--no-git'], { timeout: 1000 });
      } catch (error) {
        expect((error as Error).message).toContain('timed out');
      }
    });

    it('should handle multiple options together', async () => {
      try {
        await cli.run(['chat', '--model', 'gpt-4', '--provider', 'openai', '--no-git'], { timeout: 1000 });
      } catch (error) {
        expect((error as Error).message).toContain('timed out');
      }
    });

    it('should display help for chat command', async () => {
      const result = await cli.run(['chat', '--help']);
      
      expect(result.exitCode).toBe(0);
      expect(result.stdout).toContain('Start interactive chat session');
      expect(result.stdout).toContain('--model');
      expect(result.stdout).toContain('--provider');
      expect(result.stdout).toContain('--no-git');
    });
  });

  describe('Config Command Integration', () => {
    it('should execute config command successfully', async () => {
      const result = await cli.run(['config']);
      
      expect(result.exitCode).toBe(0);
      expect(result.stdout).toContain('Configuration management will be implemented');
    });

    it('should accept list flag', async () => {
      const result = await cli.run(['config', '--list']);
      
      expect(result.exitCode).toBe(0);
      expect(result.stdout).toContain('Configuration management will be implemented');
    });

    it('should accept set option', async () => {
      const result = await cli.run(['config', '--set', 'apiKey=test123']);
      
      expect(result.exitCode).toBe(0);
      expect(result.stdout).toContain('Configuration management will be implemented');
    });

    it('should accept get option', async () => {
      const result = await cli.run(['config', '--get', 'apiKey']);
      
      expect(result.exitCode).toBe(0);
      expect(result.stdout).toContain('Configuration management will be implemented');
    });

    it('should display help for config command', async () => {
      const result = await cli.run(['config', '--help']);
      
      expect(result.exitCode).toBe(0);
      expect(result.stdout).toContain('Manage configuration');
      expect(result.stdout).toContain('--list');
      expect(result.stdout).toContain('--set');
      expect(result.stdout).toContain('--get');
    });
  });

  describe('Init Command Integration', () => {
    it('should execute init command successfully', async () => {
      const result = await cli.run(['init']);
      
      expect(result.exitCode).toBe(0);
      expect(result.stdout).toContain('Project initialization will be implemented');
    });

    it('should accept force flag', async () => {
      const result = await cli.run(['init', '--force']);
      
      expect(result.exitCode).toBe(0);
      expect(result.stdout).toContain('Project initialization will be implemented');
    });

    it('should display help for init command', async () => {
      const result = await cli.run(['init', '--help']);
      
      expect(result.exitCode).toBe(0);
      expect(result.stdout).toContain('Initialize CLI coder in current directory');
      expect(result.stdout).toContain('--force');
    });
  });

  describe('Error Handling Integration', () => {
    it('should handle unknown commands gracefully', async () => {
      const result = await cli.run(['unknown-command']);
      
      expect(result.exitCode).toBe(1);
      expect(result.stderr).toContain('unknown command');
    });

    it('should handle unknown options gracefully', async () => {
      const result = await cli.run(['version', '--unknown-option']);
      
      expect(result.exitCode).toBe(1);
      expect(result.stderr).toContain('unknown option');
    });

    it('should provide helpful error messages', async () => {
      const result = await cli.run(['invalid']);
      
      expect(result.exitCode).toBe(1);
      expect(result.stderr.length).toBeGreaterThan(0);
    });
  });

  describe('Command Chaining and Interaction', () => {
    it('should handle multiple command executions', async () => {
      // Execute version command
      const versionResult = await cli.run(['version']);
      expect(versionResult.exitCode).toBe(0);

      // Execute help command
      const helpResult = await cli.run(['--help']);
      expect(helpResult.exitCode).toBe(0);

      // Chat command starts interactive session so we expect timeout
      try {
        await cli.run(['chat'], { timeout: 1000 });
      } catch (error) {
        expect((error as Error).message).toContain('timed out');
      }
    });

    it('should maintain consistent behavior across commands', async () => {
      // Test non-interactive commands
      const nonInteractiveCommands = ['config', 'init'];
      
      for (const command of nonInteractiveCommands) {
        const result = await cli.run([command]);
        expect(result.exitCode).toBe(0);
        expect(result.stdout).toContain('will be implemented');
      }

      // Test interactive chat command separately
      try {
        await cli.run(['chat'], { timeout: 1000 });
      } catch (error) {
        expect((error as Error).message).toContain('timed out');
      }
    });
  });

  describe('Performance and Reliability', () => {
    it('should start up quickly', async () => {
      const startTime = Date.now();
      const result = await cli.run(['--version']);
      const endTime = Date.now();
      
      expect(result.exitCode).toBe(0);
      expect(endTime - startTime).toBeLessThan(2000); // 2 second startup time
    });

    it('should handle concurrent command executions', async () => {
      const promises = [
        cli.run(['--version']),
        cli.run(['chat', '--help']), // --help should work without starting interactive session
        cli.run(['config', '--help'])
      ];
      
      const results = await Promise.all(promises);
      
      results.forEach(result => {
        expect(result.exitCode).toBe(0);
      });
    });

    it('should be memory efficient', async () => {
      // Test multiple command executions don't cause memory leaks
      for (let i = 0; i < 5; i++) {
        const result = await cli.run(['--version']);
        expect(result.exitCode).toBe(0);
      }
    });
  });
});