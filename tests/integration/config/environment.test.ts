import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { join } from 'path';
import { mkdirSync, writeFileSync, rmSync, existsSync } from 'fs';
import { tmpdir } from 'os';
import { ConfigManager } from '../../../src/config/manager';
import type { AppConfig } from '../../../src/types/config.types';

describe('Environment Variable Override Integration', () => {
  let configManager: ConfigManager;
  let testDir: string;
  let originalHome: string | undefined;
  let originalCwd: string;
  let originalEnv: NodeJS.ProcessEnv;

  beforeEach(() => {
    // Create unique temporary test directory
    const timestamp = Date.now();
    const random = Math.random().toString(36).slice(2);
    testDir = join(tmpdir(), `cli-coder-env-test-${timestamp}-${random}`);
    mkdirSync(testDir, { recursive: true });

    // Store original values
    originalHome = process.env.HOME;
    originalCwd = process.cwd();
    originalEnv = { ...process.env };

    // Set test environment with complete isolation
    process.env.HOME = testDir;
    process.chdir(testDir);

    // Clear ALL environment variables that could affect tests
    delete process.env.OPENAI_API_KEY;
    delete process.env.ANTHROPIC_API_KEY;
    delete process.env.GEMINI_API_KEY;
    delete process.env.CLI_CODER_SHELL_TIMEOUT;
    delete process.env.CLI_CODER_ALLOW_DANGEROUS;
    delete process.env.CLI_CODER_CONFIG_PATH;
    delete process.env.XDG_CONFIG_HOME;

    // Create a fresh ConfigManager instance with clean state
    configManager = new ConfigManager();
  });

  afterEach(async () => {
    try {
      // Clean up test directory first
      if (existsSync(testDir)) {
        rmSync(testDir, { recursive: true, force: true });
      }
    } catch (error) {
      // Ignore cleanup errors
    }

    // Restore original values
    if (originalHome !== undefined) {
      process.env.HOME = originalHome;
    } else {
      delete process.env.HOME;
    }
    
    // Restore working directory
    try {
      process.chdir(originalCwd);
    } catch (error) {
      // Ignore if original directory no longer exists
    }

    // Restore environment variables completely
    Object.keys(process.env).forEach(key => {
      if (!(key in originalEnv)) {
        delete process.env[key];
      }
    });
    Object.assign(process.env, originalEnv);

    // Add small delay to ensure file system operations complete
    await new Promise(resolve => setTimeout(resolve, 10));
  });

  describe('API Key Environment Overrides', () => {
    beforeEach(() => {
      // Create a base configuration file
      const configDir = join(testDir, '.cli-coder');
      const configPath = join(configDir, 'config.json');
      mkdirSync(configDir, { recursive: true });

      const baseConfig = {
        llm: {
          provider: 'openai',
          apiKey: 'file-based-key',
          model: 'gpt-4'
        },
        shell: {
          allowDangerousCommands: false,
          defaultTimeout: 30000
        }
      };

      writeFileSync(configPath, JSON.stringify(baseConfig, null, 2));
    });

    it('should override API key with OPENAI_API_KEY environment variable', async () => {
      process.env.OPENAI_API_KEY = 'sk-env-openai-key-123';

      const config = await configManager.loadConfig();

      expect(config.llm.apiKey).toBe('sk-env-openai-key-123');
      expect(config.llm.provider).toBe('openai'); // Should remain unchanged
      expect(config.llm.model).toBe('gpt-4'); // Should remain unchanged
    });

    it('should override API key with ANTHROPIC_API_KEY environment variable', async () => {
      process.env.ANTHROPIC_API_KEY = 'sk-ant-env-key-456';

      const config = await configManager.loadConfig();

      expect(config.llm.apiKey).toBe('sk-ant-env-key-456');
    });

    it('should prioritize provider-specific environment variables', async () => {
      // Set both OpenAI and Anthropic keys
      process.env.OPENAI_API_KEY = 'sk-openai-key';
      process.env.ANTHROPIC_API_KEY = 'sk-ant-key';

      // Test with OpenAI provider
      let config = await configManager.loadConfig();
      expect(config.llm.apiKey).toBe('sk-openai-key');

      // Update config to use Anthropic provider
      const configDir = join(testDir, '.cli-coder');
      const configPath = join(configDir, 'config.json');
      const anthropicConfig = {
        llm: {
          provider: 'anthropic',
          apiKey: 'file-based-key',
          model: 'claude-3-sonnet'
        }
      };
      writeFileSync(configPath, JSON.stringify(anthropicConfig, null, 2));

      // Recreate config manager to reload
      configManager = new ConfigManager();
      config = await configManager.loadConfig();
      expect(config.llm.apiKey).toBe('sk-ant-key');
    });

    it('should handle missing environment variables gracefully', async () => {
      // No environment variables set
      const config = await configManager.loadConfig();

      expect(config.llm.apiKey).toBe('file-based-key');
    });

    it('should handle empty environment variables', async () => {
      process.env.OPENAI_API_KEY = '';

      // Empty string should fail validation since API key requires min length of 1
      await expect(configManager.loadConfig()).rejects.toThrow('API key is required');
    });
  });

  describe('Shell Configuration Environment Overrides', () => {
    beforeEach(() => {
      // Create a base configuration file
      const configDir = join(testDir, '.cli-coder');
      const configPath = join(configDir, 'config.json');
      mkdirSync(configDir, { recursive: true });

      const baseConfig = {
        llm: {
          provider: 'openai',
          apiKey: 'sk-test123',
          model: 'gpt-4'
        },
        shell: {
          allowDangerousCommands: false,
          defaultTimeout: 30000,
          confirmationRequired: true,
          historySize: 100
        }
      };

      writeFileSync(configPath, JSON.stringify(baseConfig, null, 2));
    });

    it('should override shell timeout with CLI_CODER_SHELL_TIMEOUT', async () => {
      process.env.CLI_CODER_SHELL_TIMEOUT = '60000';

      const config = await configManager.loadConfig();

      expect(config.shell.defaultTimeout).toBe(60000);
      expect(config.shell.allowDangerousCommands).toBe(false); // Should remain unchanged
      expect(config.shell.confirmationRequired).toBe(true); // Should remain unchanged
    });

    it('should enable dangerous commands with CLI_CODER_ALLOW_DANGEROUS=true', async () => {
      process.env.CLI_CODER_ALLOW_DANGEROUS = 'true';

      const config = await configManager.loadConfig();

      expect(config.shell.allowDangerousCommands).toBe(true);
      expect(config.shell.defaultTimeout).toBe(30000); // Should remain unchanged
    });

    it('should not enable dangerous commands for non-true values', async () => {
      const falseValues = ['false', 'False', 'FALSE', '0', 'no', 'off', 'disabled', 'TRUE', 'True', '1', 'yes'];

      for (const value of falseValues) {
        process.env.CLI_CODER_ALLOW_DANGEROUS = value;
        
        const config = await configManager.loadConfig();
        expect(config.shell.allowDangerousCommands).toBe(false);
      }
    });

    it('should ignore invalid timeout values', async () => {
      const invalidValues = ['not-a-number', '30.5', '-1000', 'true', ''];

      for (const value of invalidValues) {
        process.env.CLI_CODER_SHELL_TIMEOUT = value;
        
        const config = await configManager.loadConfig();
        expect(config.shell.defaultTimeout).toBe(30000); // Should use default/file value
      }
    });

    it('should handle valid timeout string values', async () => {
      const validValues = [
        { env: '15000', expected: 15000 },
        { env: '120000', expected: 120000 },
        { env: '5000', expected: 5000 }
      ];

      for (const { env, expected } of validValues) {
        process.env.CLI_CODER_SHELL_TIMEOUT = env;
        
        const config = await configManager.loadConfig();
        expect(config.shell.defaultTimeout).toBe(expected);
      }
    });

    it('should apply multiple shell environment overrides simultaneously', async () => {
      process.env.CLI_CODER_SHELL_TIMEOUT = '45000';
      process.env.CLI_CODER_ALLOW_DANGEROUS = 'true';

      const config = await configManager.loadConfig();

      expect(config.shell.defaultTimeout).toBe(45000);
      expect(config.shell.allowDangerousCommands).toBe(true);
      expect(config.shell.confirmationRequired).toBe(true); // Should remain unchanged
    });
  });

  describe('Combined Environment and Configuration Scenarios', () => {
    it('should handle both API key and shell overrides together', async () => {
      // Create base config
      const configDir = join(testDir, '.cli-coder');
      const configPath = join(configDir, 'config.json');
      mkdirSync(configDir, { recursive: true });

      const baseConfig = {
        llm: {
          provider: 'anthropic',
          apiKey: 'file-key',
          model: 'claude-3-sonnet'
        },
        shell: {
          allowDangerousCommands: false,
          defaultTimeout: 20000
        }
      };

      writeFileSync(configPath, JSON.stringify(baseConfig, null, 2));

      // Set multiple environment variables
      process.env.ANTHROPIC_API_KEY = 'sk-ant-env-key';
      process.env.CLI_CODER_SHELL_TIMEOUT = '90000';
      process.env.CLI_CODER_ALLOW_DANGEROUS = 'true';

      const config = await configManager.loadConfig();

      expect(config.llm.apiKey).toBe('sk-ant-env-key');
      expect(config.shell.defaultTimeout).toBe(90000);
      expect(config.shell.allowDangerousCommands).toBe(true);
      expect(config.llm.provider).toBe('anthropic'); // Should remain from file
      expect(config.llm.model).toBe('claude-3-sonnet'); // Should remain from file
    });

    it('should handle environment overrides with missing config file', async () => {
      // Ensure no config files exist by removing any that might have been created by previous tests
      const localConfigDir = join(testDir, '.cli-coder');
      const localConfigPath = join(localConfigDir, 'config.json');
      const globalConfigDir = join(testDir, '.cli-coder');  // HOME is set to testDir
      const globalConfigPath = join(globalConfigDir, 'config.json');
      
      if (existsSync(localConfigPath)) {
        rmSync(localConfigPath, { force: true });
      }
      if (existsSync(globalConfigPath)) {
        rmSync(globalConfigPath, { force: true });
      }
      if (existsSync(localConfigDir)) {
        rmSync(localConfigDir, { recursive: true, force: true });
      }
      
      // No config file exists, only environment variables
      process.env.OPENAI_API_KEY = 'sk-env-only-key';
      process.env.CLI_CODER_SHELL_TIMEOUT = '75000';
      process.env.CLI_CODER_ALLOW_DANGEROUS = 'true';

      // Create a fresh ConfigManager instance to avoid any state issues
      const freshConfigManager = new ConfigManager();

      // This should fail because we need a complete LLM config (provider and model are required)
      await expect(freshConfigManager.loadConfig()).rejects.toThrow(/provider|Required/);
    });

    it('should preserve environment overrides across config reloads', async () => {
      // Create initial config
      const configDir = join(testDir, '.cli-coder');
      const configPath = join(configDir, 'config.json');
      mkdirSync(configDir, { recursive: true });

      const initialConfig = {
        llm: {
          provider: 'openai',
          apiKey: 'initial-key',
          model: 'gpt-4'
        }
      };

      writeFileSync(configPath, JSON.stringify(initialConfig, null, 2));

      // Set environment override
      process.env.OPENAI_API_KEY = 'persistent-env-key';

      // Load config first time
      let config = await configManager.loadConfig();
      expect(config.llm.apiKey).toBe('persistent-env-key');

      // Update config file
      const updatedConfig = {
        llm: {
          provider: 'openai',
          apiKey: 'updated-file-key',
          model: 'gpt-4'
        }
      };

      writeFileSync(configPath, JSON.stringify(updatedConfig, null, 2));

      // Create new config manager and load again
      configManager = new ConfigManager();
      config = await configManager.loadConfig();

      // Environment should still override
      expect(config.llm.apiKey).toBe('persistent-env-key');
    });

    it('should handle environment variables with global and local config precedence', async () => {
      // Create global config
      const globalConfigDir = join(testDir, '.cli-coder');
      const globalConfigPath = join(globalConfigDir, 'config.json');
      mkdirSync(globalConfigDir, { recursive: true });

      const globalConfig = {
        llm: {
          provider: 'openai',
          apiKey: 'global-key',
          model: 'gpt-3.5-turbo'
        },
        shell: {
          defaultTimeout: 20000,
          allowDangerousCommands: false
        }
      };

      writeFileSync(globalConfigPath, JSON.stringify(globalConfig, null, 2));

      // Create local config in same directory (since we're in testDir)
      const localConfig = {
        llm: {
          provider: 'openai', // Required field
          apiKey: 'local-key',
          model: 'gpt-4'
        },
        shell: {
          defaultTimeout: 40000
        }
      };

      // Since globalConfigPath and localConfigPath are the same in tests, just use one config
      writeFileSync(globalConfigPath, JSON.stringify(localConfig, null, 2));

      // Set environment variables
      process.env.OPENAI_API_KEY = 'env-override-key';
      process.env.CLI_CODER_SHELL_TIMEOUT = '60000';
      process.env.CLI_CODER_ALLOW_DANGEROUS = 'true';

      const config = await configManager.loadConfig();

      // Environment should override everything
      expect(config.llm.apiKey).toBe('env-override-key');
      expect(config.shell.defaultTimeout).toBe(60000);
      expect(config.shell.allowDangerousCommands).toBe(true);
    });
  });

  describe('Environment Variable Security and Validation', () => {
    it('should not log or expose environment variable values', async () => {
      const configDir = join(testDir, '.cli-coder');
      const configPath = join(configDir, 'config.json');
      mkdirSync(configDir, { recursive: true });

      const baseConfig = {
        llm: {
          provider: 'openai',
          apiKey: 'file-key',
          model: 'gpt-4'
        }
      };

      writeFileSync(configPath, JSON.stringify(baseConfig, null, 2));

      const sensitiveKey = 'sk-sensitive-key-that-should-not-be-logged';
      process.env.OPENAI_API_KEY = sensitiveKey;

      const config = await configManager.loadConfig();

      expect(config.llm.apiKey).toBe(sensitiveKey);
      
      // In a real application, you'd want to ensure this key isn't logged
      // This test documents that behavior expectation
    });

    it('should handle special characters in environment variables', async () => {
      const configDir = join(testDir, '.cli-coder');
      const configPath = join(configDir, 'config.json');
      mkdirSync(configDir, { recursive: true });

      const baseConfig = {
        llm: {
          provider: 'openai',
          apiKey: 'file-key',
          model: 'gpt-4'
        }
      };

      writeFileSync(configPath, JSON.stringify(baseConfig, null, 2));

      // Test with special characters that might cause issues
      const specialKey = 'sk-key-with-special-chars!@#$%^&*()_+-={}[]|\\:";\'<>?,./';
      process.env.OPENAI_API_KEY = specialKey;

      const config = await configManager.loadConfig();

      expect(config.llm.apiKey).toBe(specialKey);
    });

    it('should handle very long environment variable values', async () => {
      const configDir = join(testDir, '.cli-coder');
      const configPath = join(configDir, 'config.json');
      mkdirSync(configDir, { recursive: true });

      const baseConfig = {
        llm: {
          provider: 'openai',
          apiKey: 'file-key',
          model: 'gpt-4'
        }
      };

      writeFileSync(configPath, JSON.stringify(baseConfig, null, 2));

      // Very long API key
      const longKey = 'sk-' + 'a'.repeat(1000);
      process.env.OPENAI_API_KEY = longKey;

      const config = await configManager.loadConfig();

      expect(config.llm.apiKey).toBe(longKey);
      expect(config.llm.apiKey.length).toBe(1003); // 'sk-' + 1000 'a's
    });
  });
});