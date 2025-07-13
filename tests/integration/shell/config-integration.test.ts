/**
 * @fileoverview Integration tests for shell configuration system
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ConfigManager } from '../../../src/config/manager';
import type { AppConfig, ShellConfig } from '../../../src/types';

// Mock file system operations
vi.mock('fs', () => ({
  existsSync: vi.fn(),
  readFileSync: vi.fn(),
  writeFileSync: vi.fn(),
  mkdirSync: vi.fn(),
}));

describe('Shell Configuration Integration', () => {
  let configManager: ConfigManager;
  let mockFs: any;

  beforeEach(async () => {
    const fs = await import('fs');
    mockFs = vi.mocked(fs);
    configManager = new ConfigManager();

    vi.clearAllMocks();
  });

  describe('Shell Configuration Loading', () => {
    it('should load default shell configuration', async () => {
      // Arrange
      mockFs.existsSync.mockReturnValue(false);

      // Act
      const config = await configManager.loadConfig();

      // Assert
      expect(config.shell).toEqual({
        allowDangerousCommands: false,
        defaultTimeout: 30000,
        confirmationRequired: true,
        historySize: 100,
      });
    });

    it('should load custom shell configuration from file', async () => {
      // Arrange
      const customConfig = {
        llm: {
          provider: 'openai',
          model: 'gpt-4',
          apiKey: 'test-key',
          maxTokens: 2000,
          temperature: 0.7,
        },
        shell: {
          allowDangerousCommands: true,
          defaultTimeout: 60000,
          confirmationRequired: false,
          workingDirectory: '/custom/dir',
          historySize: 200,
          customSafePatterns: ['my-tool', 'custom-script'],
          customDangerousPatterns: ['dangerous-tool'],
        },
      };

      mockFs.existsSync.mockReturnValue(true);
      mockFs.readFileSync.mockReturnValue(JSON.stringify(customConfig));

      // Act
      const config = await configManager.loadConfig();

      // Assert
      expect(config.shell).toEqual(customConfig.shell);
      expect(config.shell.allowDangerousCommands).toBe(true);
      expect(config.shell.defaultTimeout).toBe(60000);
      expect(config.shell.customSafePatterns).toEqual(['my-tool', 'custom-script']);
    });

    it('should validate shell configuration schema', async () => {
      // Arrange
      const invalidConfig = {
        llm: {
          provider: 'openai',
          model: 'gpt-4',
          apiKey: 'test-key',
        },
        shell: {
          allowDangerousCommands: 'not-boolean', // Invalid type
          defaultTimeout: 'not-number', // Invalid type
          historySize: -1, // Invalid value
        },
      };

      mockFs.existsSync.mockReturnValue(true);
      mockFs.readFileSync.mockReturnValue(JSON.stringify(invalidConfig));

      // Act & Assert
      await expect(configManager.loadConfig()).rejects.toThrow();
    });

    it('should merge partial shell configuration with defaults', async () => {
      // Arrange
      const partialConfig = {
        llm: {
          provider: 'openai',
          model: 'gpt-4',
          apiKey: 'test-key',
        },
        shell: {
          defaultTimeout: 45000,
          customSafePatterns: ['my-custom-tool'],
        },
      };

      mockFs.existsSync.mockReturnValue(true);
      mockFs.readFileSync.mockReturnValue(JSON.stringify(partialConfig));

      // Act
      const config = await configManager.loadConfig();

      // Assert
      expect(config.shell).toEqual({
        allowDangerousCommands: false, // Default
        defaultTimeout: 45000, // Custom
        confirmationRequired: true, // Default
        historySize: 100, // Default
        customSafePatterns: ['my-custom-tool'], // Custom
      });
    });
  });

  describe('Shell Configuration Saving', () => {
    it('should save shell configuration changes', async () => {
      // Arrange
      const config: AppConfig = {
        llm: {
          provider: 'openai',
          model: 'gpt-4',
          apiKey: 'test-key',
          maxTokens: 2000,
          temperature: 0.7,
        },
        shell: {
          allowDangerousCommands: true,
          defaultTimeout: 60000,
          confirmationRequired: false,
          workingDirectory: '/project',
          historySize: 150,
          customSafePatterns: ['project-tool'],
          customDangerousPatterns: ['risky-command'],
        },
      };

      // Act
      await configManager.saveConfig(config);

      // Assert
      expect(mockFs.writeFileSync).toHaveBeenCalledWith(
        expect.stringContaining('config.json'),
        JSON.stringify(config, null, 2),
        'utf8'
      );
    });

    it('should create config directory if it does not exist', async () => {
      // Arrange
      const config: AppConfig = {
        llm: {
          provider: 'openai',
          model: 'gpt-4',
          apiKey: 'test-key',
        },
        shell: {
          allowDangerousCommands: false,
          defaultTimeout: 30000,
          confirmationRequired: true,
          historySize: 100,
        },
      };

      mockFs.existsSync.mockReturnValue(false);

      // Act
      await configManager.saveConfig(config);

      // Assert
      expect(mockFs.mkdirSync).toHaveBeenCalledWith(
        expect.stringContaining('.cli-coder'),
        { recursive: true }
      );
    });
  });

  describe('Shell Configuration Updates', () => {
    it('should update shell timeout setting', async () => {
      // Arrange
      const initialConfig = {
        llm: { provider: 'openai', model: 'gpt-4', apiKey: 'key' },
        shell: { allowDangerousCommands: false, defaultTimeout: 30000, confirmationRequired: true, historySize: 100 },
      };
      mockFs.existsSync.mockReturnValue(true);
      mockFs.readFileSync.mockReturnValue(JSON.stringify(initialConfig));

      // Act
      const config = await configManager.loadConfig();
      config.shell.defaultTimeout = 60000;
      await configManager.saveConfig(config);

      // Assert
      const savedConfig = JSON.parse(mockFs.writeFileSync.mock.calls[0][1]);
      expect(savedConfig.shell.defaultTimeout).toBe(60000);
    });

    it('should update dangerous commands setting', async () => {
      // Arrange
      const initialConfig = {
        llm: { provider: 'openai', model: 'gpt-4', apiKey: 'key' },
        shell: { allowDangerousCommands: false, defaultTimeout: 30000, confirmationRequired: true, historySize: 100 },
      };
      mockFs.existsSync.mockReturnValue(true);
      mockFs.readFileSync.mockReturnValue(JSON.stringify(initialConfig));

      // Act
      const config = await configManager.loadConfig();
      config.shell.allowDangerousCommands = true;
      await configManager.saveConfig(config);

      // Assert
      const savedConfig = JSON.parse(mockFs.writeFileSync.mock.calls[0][1]);
      expect(savedConfig.shell.allowDangerousCommands).toBe(true);
    });

    it('should update custom patterns', async () => {
      // Arrange
      const initialConfig = {
        llm: { provider: 'openai', model: 'gpt-4', apiKey: 'key' },
        shell: { allowDangerousCommands: false, defaultTimeout: 30000, confirmationRequired: true, historySize: 100 },
      };
      mockFs.existsSync.mockReturnValue(true);
      mockFs.readFileSync.mockReturnValue(JSON.stringify(initialConfig));

      // Act
      const config = await configManager.loadConfig();
      config.shell.customSafePatterns = ['new-tool', 'safe-script'];
      config.shell.customDangerousPatterns = ['dangerous-tool'];
      await configManager.saveConfig(config);

      // Assert
      const savedConfig = JSON.parse(mockFs.writeFileSync.mock.calls[0][1]);
      expect(savedConfig.shell.customSafePatterns).toEqual(['new-tool', 'safe-script']);
      expect(savedConfig.shell.customDangerousPatterns).toEqual(['dangerous-tool']);
    });
  });

  describe('Environment Variable Integration', () => {
    it('should override config with environment variables', async () => {
      // Arrange
      const originalEnv = process.env;
      process.env = {
        ...originalEnv,
        CLI_CODER_SHELL_TIMEOUT: '45000',
        CLI_CODER_SHELL_ALLOW_DANGEROUS: 'true',
        CLI_CODER_SHELL_WORKING_DIR: '/env/project',
      };

      const config = {
        llm: { provider: 'openai', model: 'gpt-4', apiKey: 'key' },
        shell: { allowDangerousCommands: false, defaultTimeout: 30000, confirmationRequired: true, historySize: 100 },
      };
      mockFs.existsSync.mockReturnValue(true);
      mockFs.readFileSync.mockReturnValue(JSON.stringify(config));

      try {
        // Act
        const loadedConfig = await configManager.loadConfig();

        // Assert
        expect(loadedConfig.shell.defaultTimeout).toBe(45000);
        expect(loadedConfig.shell.allowDangerousCommands).toBe(true);
        expect(loadedConfig.shell.workingDirectory).toBe('/env/project');
      } finally {
        // Cleanup
        process.env = originalEnv;
      }
    });

    it('should validate environment variable types', async () => {
      // Arrange
      const originalEnv = process.env;
      process.env = {
        ...originalEnv,
        CLI_CODER_SHELL_TIMEOUT: 'invalid-number',
        CLI_CODER_SHELL_ALLOW_DANGEROUS: 'invalid-boolean',
      };

      const config = {
        llm: { provider: 'openai', model: 'gpt-4', apiKey: 'key' },
        shell: { allowDangerousCommands: false, defaultTimeout: 30000, confirmationRequired: true, historySize: 100 },
      };
      mockFs.existsSync.mockReturnValue(true);
      mockFs.readFileSync.mockReturnValue(JSON.stringify(config));

      try {
        // Act & Assert
        await expect(configManager.loadConfig()).rejects.toThrow();
      } finally {
        // Cleanup
        process.env = originalEnv;
      }
    });
  });

  describe('Configuration Validation', () => {
    it('should validate timeout bounds', async () => {
      // Arrange
      const invalidConfigs = [
        { shell: { defaultTimeout: -1 } }, // Negative timeout
        { shell: { defaultTimeout: 0 } }, // Zero timeout
        { shell: { defaultTimeout: 1000000 } }, // Too large timeout (>10 minutes)
      ];

      for (const invalidConfig of invalidConfigs) {
        mockFs.existsSync.mockReturnValue(true);
        mockFs.readFileSync.mockReturnValue(JSON.stringify({
          llm: { provider: 'openai', model: 'gpt-4', apiKey: 'key' },
          ...invalidConfig,
        }));

        // Act & Assert
        await expect(configManager.loadConfig()).rejects.toThrow();
      }
    });

    it('should validate history size bounds', async () => {
      // Arrange
      const invalidConfigs = [
        { shell: { historySize: -1 } }, // Negative size
        { shell: { historySize: 0 } }, // Zero size
        { shell: { historySize: 10001 } }, // Too large (>10000)
      ];

      for (const invalidConfig of invalidConfigs) {
        mockFs.existsSync.mockReturnValue(true);
        mockFs.readFileSync.mockReturnValue(JSON.stringify({
          llm: { provider: 'openai', model: 'gpt-4', apiKey: 'key' },
          ...invalidConfig,
        }));

        // Act & Assert
        await expect(configManager.loadConfig()).rejects.toThrow();
      }
    });

    it('should validate working directory format', async () => {
      // Arrange
      const validConfigs = [
        { shell: { workingDirectory: '/valid/absolute/path' } },
        { shell: { workingDirectory: '/home/user/project' } },
        { shell: { workingDirectory: '/opt/project' } },
      ];

      const invalidConfigs = [
        { shell: { workingDirectory: 'relative/path' } }, // Relative path
        { shell: { workingDirectory: '../../../etc' } }, // Traversal
        { shell: { workingDirectory: '' } }, // Empty string
      ];

      // Test valid configs
      for (const validConfig of validConfigs) {
        mockFs.existsSync.mockReturnValue(true);
        mockFs.readFileSync.mockReturnValue(JSON.stringify({
          llm: { provider: 'openai', model: 'gpt-4', apiKey: 'key' },
          ...validConfig,
        }));

        // Should not throw
        const config = await configManager.loadConfig();
        expect(config.shell.workingDirectory).toBe(validConfig.shell.workingDirectory);
      }

      // Test invalid configs
      for (const invalidConfig of invalidConfigs) {
        mockFs.existsSync.mockReturnValue(true);
        mockFs.readFileSync.mockReturnValue(JSON.stringify({
          llm: { provider: 'openai', model: 'gpt-4', apiKey: 'key' },
          ...invalidConfig,
        }));

        // Should throw
        await expect(configManager.loadConfig()).rejects.toThrow();
      }
    });

    it('should validate custom patterns format', async () => {
      // Arrange
      const validConfig = {
        llm: { provider: 'openai', model: 'gpt-4', apiKey: 'key' },
        shell: {
          allowDangerousCommands: false,
          defaultTimeout: 30000,
          confirmationRequired: true,
          historySize: 100,
          customSafePatterns: ['valid-tool', 'another-tool'],
          customDangerousPatterns: ['dangerous-tool'],
        },
      };

      mockFs.existsSync.mockReturnValue(true);
      mockFs.readFileSync.mockReturnValue(JSON.stringify(validConfig));

      // Act
      const config = await configManager.loadConfig();

      // Assert
      expect(config.shell.customSafePatterns).toEqual(['valid-tool', 'another-tool']);
      expect(config.shell.customDangerousPatterns).toEqual(['dangerous-tool']);
    });
  });
});