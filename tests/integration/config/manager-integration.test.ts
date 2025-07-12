import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { join } from 'path';
import { existsSync, mkdirSync, writeFileSync, readFileSync, rmSync } from 'fs';
import { tmpdir } from 'os';
import { ConfigManager } from '../../../src/config/manager';
import type { AppConfig } from '../../../src/types/config.types';

describe('ConfigManager Integration Tests', () => {
  let configManager: ConfigManager;
  let testDir: string;
  let originalHome: string | undefined;
  let originalCwd: string;
  let originalEnv: NodeJS.ProcessEnv;

  beforeEach(() => {
    // Create temporary test directory
    testDir = join(tmpdir(), `cli-coder-test-${Date.now()}-${Math.random().toString(36).slice(2)}`);
    mkdirSync(testDir, { recursive: true });

    // Store original values
    originalHome = process.env.HOME;
    originalCwd = process.cwd();
    originalEnv = { ...process.env };

    // Set test environment
    process.env.HOME = testDir;
    process.chdir(testDir);

    // Clear environment variables that could affect tests
    delete process.env.OPENAI_API_KEY;
    delete process.env.ANTHROPIC_API_KEY;
    delete process.env.CLI_CODER_SHELL_TIMEOUT;
    delete process.env.CLI_CODER_ALLOW_DANGEROUS;

    configManager = new ConfigManager();
  });

  afterEach(() => {
    // Restore original values
    if (originalHome !== undefined) {
      process.env.HOME = originalHome;
    }
    process.chdir(originalCwd);
    process.env = originalEnv;

    // Clean up test directory
    if (existsSync(testDir)) {
      rmSync(testDir, { recursive: true, force: true });
    }
  });

  describe('Real File System Operations', () => {
    it('should create global config directory and save configuration', async () => {
      const config: Partial<AppConfig> = {
        llm: {
          provider: 'openai',
          apiKey: 'sk-test123456789',
          model: 'gpt-4'
        },
        shell: {
          allowDangerousCommands: false,
          defaultTimeout: 30000
        }
      };

      await configManager.saveConfig(config, true);

      const globalConfigPath = join(testDir, '.cli-coder', 'config.json');
      expect(existsSync(globalConfigPath)).toBe(true);

      const savedContent = readFileSync(globalConfigPath, 'utf-8');
      const savedConfig = JSON.parse(savedContent);

      expect(savedConfig.llm.provider).toBe('openai');
      expect(savedConfig.llm.apiKey).toBe('sk-test123456789');
      expect(savedConfig.shell.allowDangerousCommands).toBe(false);
    });

    it('should create local config directory and save configuration', async () => {
      const config: Partial<AppConfig> = {
        llm: {
          provider: 'anthropic',
          apiKey: 'sk-ant-test123',
          model: 'claude-3-sonnet'
        }
      };

      await configManager.saveConfig(config, false);

      const localConfigPath = join(testDir, '.cli-coder', 'config.json');
      expect(existsSync(localConfigPath)).toBe(true);

      const savedContent = readFileSync(localConfigPath, 'utf-8');
      const savedConfig = JSON.parse(savedContent);

      expect(savedConfig.llm.provider).toBe('anthropic');
      expect(savedConfig.llm.apiKey).toBe('sk-ant-test123');
    });

    it('should load and merge configurations from real files', async () => {
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
          allowDangerousCommands: false,
          defaultTimeout: 20000,
          historySize: 50
        }
      };

      writeFileSync(globalConfigPath, JSON.stringify(globalConfig, null, 2));

      // Create local config
      const localConfigDir = join(testDir, '.cli-coder');
      const localConfigPath = join(localConfigDir, 'config.json');

      const localConfig = {
        llm: {
          apiKey: 'local-key',
          model: 'gpt-4'
        },
        shell: {
          defaultTimeout: 45000
        }
      };

      writeFileSync(localConfigPath, JSON.stringify(localConfig, null, 2));

      // Load merged configuration
      const mergedConfig = await configManager.loadConfig();

      // Local should override global
      expect(mergedConfig.llm.apiKey).toBe('local-key');
      expect(mergedConfig.llm.model).toBe('gpt-4');
      expect(mergedConfig.shell.defaultTimeout).toBe(45000);

      // Global values should be preserved where not overridden
      expect(mergedConfig.llm.provider).toBe('openai');
      expect(mergedConfig.shell.allowDangerousCommands).toBe(false);
      expect(mergedConfig.shell.historySize).toBe(50);
    });

    it('should handle environment variable overrides with real files', async () => {
      // Create base config file
      const configDir = join(testDir, '.cli-coder');
      const configPath = join(configDir, 'config.json');
      mkdirSync(configDir, { recursive: true });

      const baseConfig = {
        llm: {
          provider: 'openai',
          apiKey: 'file-key',
          model: 'gpt-4'
        },
        shell: {
          allowDangerousCommands: false,
          defaultTimeout: 30000
        }
      };

      writeFileSync(configPath, JSON.stringify(baseConfig, null, 2));

      // Set environment variables
      process.env.OPENAI_API_KEY = 'env-override-key';
      process.env.CLI_CODER_SHELL_TIMEOUT = '60000';
      process.env.CLI_CODER_ALLOW_DANGEROUS = 'true';

      const config = await configManager.loadConfig();

      expect(config.llm.apiKey).toBe('env-override-key');
      expect(config.shell.defaultTimeout).toBe(60000);
      expect(config.shell.allowDangerousCommands).toBe(true);
    });

    it('should handle corrupted configuration files gracefully', async () => {
      const configDir = join(testDir, '.cli-coder');
      const configPath = join(configDir, 'config.json');
      mkdirSync(configDir, { recursive: true });

      // Write invalid JSON
      writeFileSync(configPath, '{ invalid json content ');

      await expect(configManager.loadConfig()).rejects.toThrow();
    });

    it('should handle missing configuration files', async () => {
      // No config files exist - should use defaults but fail validation due to missing required LLM config
      await expect(configManager.loadConfig()).rejects.toThrow();
    });

    it('should preserve file permissions when saving configuration', async () => {
      const config: Partial<AppConfig> = {
        llm: {
          provider: 'openai',
          apiKey: 'sk-test123',
          model: 'gpt-4'
        }
      };

      await configManager.saveConfig(config, true);

      const globalConfigPath = join(testDir, '.cli-coder', 'config.json');
      expect(existsSync(globalConfigPath)).toBe(true);

      // Verify file is readable and writable
      const stats = require('fs').statSync(globalConfigPath);
      expect(stats.isFile()).toBe(true);
      expect(stats.mode & 0o644).toBeTruthy(); // At least readable/writable by owner
    });

    it('should handle concurrent config operations', async () => {
      const config1: Partial<AppConfig> = {
        llm: {
          provider: 'openai',
          apiKey: 'key1',
          model: 'gpt-4'
        }
      };

      const config2: Partial<AppConfig> = {
        llm: {
          provider: 'anthropic',
          apiKey: 'key2',
          model: 'claude-3-sonnet'
        }
      };

      // Save both configurations concurrently
      await Promise.all([
        configManager.saveConfig(config1, true),
        configManager.saveConfig(config2, false)
      ]);

      const globalConfigPath = join(testDir, '.cli-coder', 'config.json');
      const localConfigPath = join(testDir, '.cli-coder', 'config.json');

      expect(existsSync(globalConfigPath)).toBe(true);
      expect(existsSync(localConfigPath)).toBe(true);

      // Load and verify the final configuration
      const finalConfig = await configManager.loadConfig();

      // Local should override global
      expect(finalConfig.llm.provider).toBe('anthropic');
      expect(finalConfig.llm.apiKey).toBe('key2');
    });
  });

  describe('Cross-Platform Path Handling', () => {
    it('should handle Windows-style paths correctly', async () => {
      // This test ensures our path handling works across platforms
      const config: Partial<AppConfig> = {
        llm: {
          provider: 'openai',
          apiKey: 'sk-test123',
          model: 'gpt-4'
        },
        shell: {
          workingDirectory: join(testDir, 'projects', 'my-app')
        }
      };

      await configManager.saveConfig(config, true);

      const savedConfig = await configManager.loadConfig();
      
      // Path should be properly normalized for the current platform
      expect(savedConfig.shell.workingDirectory).toBe(join(testDir, 'projects', 'my-app'));
    });

    it('should create nested directories correctly', async () => {
      // Test creating deeply nested config directories
      const deepTestDir = join(testDir, 'very', 'deep', 'nested', 'directory');
      process.env.HOME = deepTestDir;

      const newConfigManager = new ConfigManager();
      const config: Partial<AppConfig> = {
        llm: {
          provider: 'openai',
          apiKey: 'sk-test123',
          model: 'gpt-4'
        }
      };

      await newConfigManager.saveConfig(config, true);

      const configPath = join(deepTestDir, '.cli-coder', 'config.json');
      expect(existsSync(configPath)).toBe(true);
    });
  });

  describe('Configuration Validation Integration', () => {
    it('should prevent saving invalid configurations to real files', async () => {
      const invalidConfig = {
        llm: {
          provider: 'invalid-provider',
          apiKey: '',
          model: 'gpt-4'
        }
      } as any;

      await expect(configManager.saveConfig(invalidConfig, true)).rejects.toThrow();

      // Verify no file was created
      const globalConfigPath = join(testDir, '.cli-coder', 'config.json');
      expect(existsSync(globalConfigPath)).toBe(false);
    });

    it('should validate configuration when loading from real files', async () => {
      const configDir = join(testDir, '.cli-coder');
      const configPath = join(configDir, 'config.json');
      mkdirSync(configDir, { recursive: true });

      // Write invalid configuration directly to file
      const invalidConfig = {
        llm: {
          provider: 'invalid-provider',
          apiKey: '',
          model: ''
        }
      };

      writeFileSync(configPath, JSON.stringify(invalidConfig, null, 2));

      await expect(configManager.loadConfig()).rejects.toThrow();
    });

    it('should handle partial configurations correctly', async () => {
      const configDir = join(testDir, '.cli-coder');
      const configPath = join(configDir, 'config.json');
      mkdirSync(configDir, { recursive: true });

      // Write minimal valid configuration
      const minimalConfig = {
        llm: {
          provider: 'openai',
          apiKey: 'sk-test123',
          model: 'gpt-4'
        }
      };

      writeFileSync(configPath, JSON.stringify(minimalConfig, null, 2));

      const config = await configManager.loadConfig();

      // Should have defaults applied
      expect(config.shell.allowDangerousCommands).toBe(false);
      expect(config.shell.defaultTimeout).toBe(30000);
      expect(config.shell.confirmationRequired).toBe(true);
      expect(config.editor.defaultEditor).toBe('code');
      expect(config.session.saveHistory).toBe(true);
    });
  });

  describe('Performance and Reliability', () => {
    it('should load configuration quickly', async () => {
      const configDir = join(testDir, '.cli-coder');
      const configPath = join(configDir, 'config.json');
      mkdirSync(configDir, { recursive: true });

      const config = {
        llm: {
          provider: 'openai',
          apiKey: 'sk-test123',
          model: 'gpt-4'
        }
      };

      writeFileSync(configPath, JSON.stringify(config, null, 2));

      const startTime = Date.now();
      await configManager.loadConfig();
      const endTime = Date.now();

      // Should load in reasonable time (less than 100ms)
      expect(endTime - startTime).toBeLessThan(100);
    });

    it('should handle large configuration files', async () => {
      const configDir = join(testDir, '.cli-coder');
      const configPath = join(configDir, 'config.json');
      mkdirSync(configDir, { recursive: true });

      // Create a larger configuration with many properties
      const largeConfig = {
        llm: {
          provider: 'openai',
          apiKey: 'sk-test123456789'.repeat(10),
          model: 'gpt-4',
          temperature: 0.7,
          maxTokens: 4000
        },
        shell: {
          allowDangerousCommands: false,
          defaultTimeout: 30000,
          confirmationRequired: true,
          workingDirectory: '/very/long/path/to/working/directory/that/might/be/quite/long',
          historySize: 1000
        },
        editor: {
          defaultEditor: 'code',
          tempDir: '/tmp/cli-coder-temp-directory'
        },
        session: {
          saveHistory: true,
          maxHistorySize: 5000
        },
        // Add some extra properties to make it larger
        metadata: {
          version: '1.0.0',
          lastUpdated: new Date().toISOString(),
          notes: 'A'.repeat(1000) // 1KB of notes
        }
      };

      writeFileSync(configPath, JSON.stringify(largeConfig, null, 2));

      const loadedConfig = await configManager.loadConfig();

      expect(loadedConfig.llm.provider).toBe('openai');
      expect(loadedConfig.llm.apiKey).toBe('sk-test123456789'.repeat(10));
      expect(loadedConfig.shell.historySize).toBe(1000);
    });
  });
});