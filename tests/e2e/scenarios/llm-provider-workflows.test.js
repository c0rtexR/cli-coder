import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { spawn } from 'child_process';
import { promises as fs } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';

describe('LLM Provider E2E Workflows', () => {
  let tempDir;
  let tempConfigPath;
  let cliPath;

  beforeEach(async () => {
    // Setup temporary directory
    tempDir = join(tmpdir(), `cli-coder-e2e-${Date.now()}`);
    await fs.mkdir(tempDir, { recursive: true });
    
    tempConfigPath = join(tempDir, '.cli-coder');
    await fs.mkdir(tempConfigPath, { recursive: true });

    // CLI executable path
    cliPath = join(process.cwd(), 'bin', 'cli-coder');
  });

  afterEach(async () => {
    // Cleanup
    try {
      await fs.rm(tempDir, { recursive: true, force: true });
    } catch {
      // Ignore cleanup errors
    }
  });

  describe('Configuration Management Workflow', () => {
    it('should display helpful message when no LLM configuration exists', async () => {
      const result = await runCLI(['config', '--list'], {
        cwd: tempDir,
        timeout: 5000
      });

      // Should fail gracefully when no config exists
      expect(result.exitCode).not.toBe(0);
      expect(result.stderr).toContain('Config not found');
    });

    it('should validate configuration display with valid LLM config', async () => {
      // Create valid configuration
      const config = {
        llm: {
          provider: 'openai',
          apiKey: 'sk-test123456789',
          model: 'gpt-4',
          temperature: 0.7,
          maxTokens: 1000
        },
        shell: {
          confirmationRequired: true,
          defaultTimeout: 30000,
          allowDangerousCommands: false,
          historySize: 100
        },
        editor: {
          defaultEditor: 'code',
          tempDir: '/tmp'
        },
        session: {
          saveHistory: true,
          maxHistorySize: 100
        }
      };

      await fs.writeFile(
        join(tempConfigPath, 'config.json'),
        JSON.stringify(config, null, 2)
      );

      const result = await runCLI(['config', '--list'], {
        cwd: tempDir,
        timeout: 5000
      });

      expect(result.exitCode).toBe(0);
      expect(result.stdout).toContain('Current Configuration');
      expect(result.stdout).toContain('Provider: openai');
      expect(result.stdout).toContain('Model: gpt-4');
      
      // API key should be masked
      expect(result.stdout).toContain('API Key: sk-test1...');
      expect(result.stdout).not.toContain('sk-test123456789');
    });

    it('should handle invalid LLM provider configuration', async () => {
      // Create invalid configuration
      const config = {
        llm: {
          provider: 'openai',
          apiKey: 'invalid-key',
          model: 'gpt-4'
        },
        shell: {},
        editor: {},
        session: {}
      };

      await fs.writeFile(
        join(tempConfigPath, 'config.json'),
        JSON.stringify(config, null, 2)
      );

      const result = await runCLI(['config', '--list'], {
        cwd: tempDir,
        timeout: 5000
      });

      // Should still display config even if invalid
      // (validation happens during actual LLM usage)
      expect(result.exitCode).toBe(0);
      expect(result.stdout).toContain('Provider: openai');
    });
  });

  describe('Provider Switching Workflow', () => {
    it('should handle multiple provider configurations', async () => {
      // Test OpenAI config
      const openaiConfig = {
        llm: {
          provider: 'openai',
          apiKey: 'sk-test123',
          model: 'gpt-4'
        },
        shell: {},
        editor: {},
        session: {}
      };

      await fs.writeFile(
        join(tempConfigPath, 'config.json'),
        JSON.stringify(openaiConfig, null, 2)
      );

      let result = await runCLI(['config', '--list'], {
        cwd: tempDir,
        timeout: 5000
      });

      expect(result.exitCode).toBe(0);
      expect(result.stdout).toContain('Provider: openai');
      expect(result.stdout).toContain('Model: gpt-4');

      // Switch to Anthropic config
      const anthropicConfig = {
        llm: {
          provider: 'anthropic',
          apiKey: 'sk-ant-test123',
          model: 'claude-3-sonnet-20240229'
        },
        shell: {},
        editor: {},
        session: {}
      };

      await fs.writeFile(
        join(tempConfigPath, 'config.json'),
        JSON.stringify(anthropicConfig, null, 2)
      );

      result = await runCLI(['config', '--list'], {
        cwd: tempDir,
        timeout: 5000
      });

      expect(result.exitCode).toBe(0);
      expect(result.stdout).toContain('Provider: anthropic');
      expect(result.stdout).toContain('Model: claude-3-sonnet-20240229');
    });
  });

  describe('Environment Override Workflow', () => {
    it('should respect environment variable overrides', async () => {
      // Create base configuration
      const config = {
        llm: {
          provider: 'openai',
          apiKey: 'sk-config123',
          model: 'gpt-4'
        },
        shell: {},
        editor: {},
        session: {}
      };

      await fs.writeFile(
        join(tempConfigPath, 'config.json'),
        JSON.stringify(config, null, 2)
      );

      // Run with environment override
      const result = await runCLI(['config', '--list'], {
        cwd: tempDir,
        env: {
          ...process.env,
          OPENAI_API_KEY: 'sk-env-override123'
        },
        timeout: 5000
      });

      expect(result.exitCode).toBe(0);
      expect(result.stdout).toContain('Provider: openai');
      // Should show masked environment key
      expect(result.stdout).toContain('API Key: sk-env-o...');
    });

    it('should handle Anthropic environment override', async () => {
      // Create base configuration
      const config = {
        llm: {
          provider: 'anthropic',
          apiKey: 'sk-ant-config123',
          model: 'claude-3-sonnet-20240229'
        },
        shell: {},
        editor: {},
        session: {}
      };

      await fs.writeFile(
        join(tempConfigPath, 'config.json'),
        JSON.stringify(config, null, 2)
      );

      // Run with environment override
      const result = await runCLI(['config', '--list'], {
        cwd: tempDir,
        env: {
          ...process.env,
          ANTHROPIC_API_KEY: 'sk-ant-env-override123'
        },
        timeout: 5000
      });

      expect(result.exitCode).toBe(0);
      expect(result.stdout).toContain('Provider: anthropic');
      // Should show masked environment key
      expect(result.stdout).toContain('API Key: sk-ant-e...');
    });
  });

  describe('Error Handling Workflow', () => {
    it('should handle malformed configuration files', async () => {
      // Write invalid JSON
      await fs.writeFile(
        join(tempConfigPath, 'config.json'),
        'invalid json content'
      );

      const result = await runCLI(['config', '--list'], {
        cwd: tempDir,
        timeout: 5000
      });

      expect(result.exitCode).not.toBe(0);
      expect(result.stderr).toContain('Configuration error');
    });

    it('should handle missing required LLM fields', async () => {
      // Create configuration missing required fields
      const config = {
        llm: {
          provider: 'openai'
          // Missing apiKey and model
        },
        shell: {},
        editor: {},
        session: {}
      };

      await fs.writeFile(
        join(tempConfigPath, 'config.json'),
        JSON.stringify(config, null, 2)
      );

      const result = await runCLI(['config', '--list'], {
        cwd: tempDir,
        timeout: 5000
      });

      expect(result.exitCode).not.toBe(0);
      expect(result.stderr).toContain('Configuration error');
    });
  });

  describe('Global vs Local Configuration Workflow', () => {
    it('should prioritize local over global configuration', async () => {
      // Create global config directory
      const globalConfigPath = join(tempDir, '.cli-coder-global');
      await fs.mkdir(globalConfigPath, { recursive: true });

      // Create global configuration
      const globalConfig = {
        llm: {
          provider: 'openai',
          apiKey: 'sk-global123',
          model: 'gpt-3.5-turbo'
        },
        shell: {},
        editor: {},
        session: {}
      };

      await fs.writeFile(
        join(globalConfigPath, 'config.json'),
        JSON.stringify(globalConfig, null, 2)
      );

      // Create local configuration (should override global)
      const localConfig = {
        llm: {
          provider: 'anthropic',
          apiKey: 'sk-ant-local123',
          model: 'claude-3-sonnet-20240229'
        }
      };

      await fs.writeFile(
        join(tempConfigPath, 'config.json'),
        JSON.stringify(localConfig, null, 2)
      );

      const result = await runCLI(['config', '--list'], {
        cwd: tempDir,
        timeout: 5000
      });

      expect(result.exitCode).toBe(0);
      // Local config should take precedence
      expect(result.stdout).toContain('Provider: anthropic');
      expect(result.stdout).toContain('Model: claude-3-sonnet-20240229');
    });
  });
});

// Helper function to run CLI commands
function runCLI(args, options = {}) {
  return new Promise((resolve) => {
    const { timeout = 10000, cwd = process.cwd(), env = process.env } = options;
    
    const child = spawn('node', [cliPath, ...args], {
      cwd,
      env,
      stdio: 'pipe'
    });

    let stdout = '';
    let stderr = '';

    child.stdout?.on('data', (data) => {
      stdout += data.toString();
    });

    child.stderr?.on('data', (data) => {
      stderr += data.toString();
    });

    const timeoutId = setTimeout(() => {
      child.kill('SIGTERM');
      resolve({
        exitCode: -1,
        stdout,
        stderr: stderr + '\\nTimeout exceeded',
        timedOut: true
      });
    }, timeout);

    child.on('close', (exitCode) => {
      clearTimeout(timeoutId);
      resolve({
        exitCode: exitCode || 0,
        stdout,
        stderr,
        timedOut: false
      });
    });

    child.on('error', (error) => {
      clearTimeout(timeoutId);
      resolve({
        exitCode: 1,
        stdout,
        stderr: stderr + error.message,
        timedOut: false
      });
    });
  });
}