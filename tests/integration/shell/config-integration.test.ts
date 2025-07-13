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
      // Arrange - provide a minimal valid config since schema requires llm section
      const minimalConfig = {
        llm: {
          provider: 'openai',
          model: 'gpt-4',
          apiKey: 'test-key',
        },
      };
      mockFs.existsSync.mockReturnValue(true);
      mockFs.readFileSync.mockReturnValue(JSON.stringify(minimalConfig));

      // Act
      const config = await configManager.loadConfig();

      // Assert - default shell config should be applied
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
      expect(config.shell.workingDirectory).toBe('/custom/dir');
      expect(config.shell.historySize).toBe(200);
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
      });
      expect(config.editor).toEqual({
        defaultEditor: 'code',
        tempDir: '/tmp',
      });
      expect(config.session).toEqual({
        saveHistory: true,
        maxHistorySize: 100,
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
        },
        editor: {
          defaultEditor: 'code',
          tempDir: '/tmp',
        },
        session: {
          saveHistory: true,
          maxHistorySize: 100,
        },
      };

      // Act
      await configManager.saveConfig(config);

      // Assert
      expect(mockFs.writeFileSync).toHaveBeenCalledWith(
        expect.stringContaining('config.json'),
        expect.stringContaining('"allowDangerousCommands": true')
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
        editor: {
          defaultEditor: 'code',
          tempDir: '/tmp',
        },
        session: {
          saveHistory: true,
          maxHistorySize: 100,
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

    it('should update working directory setting', async () => {
      // Arrange
      const initialConfig = {
        llm: { provider: 'openai', model: 'gpt-4', apiKey: 'key' },
        shell: { allowDangerousCommands: false, defaultTimeout: 30000, confirmationRequired: true, historySize: 100 },
      };
      mockFs.existsSync.mockReturnValue(true);
      mockFs.readFileSync.mockReturnValue(JSON.stringify(initialConfig));

      // Act
      const config = await configManager.loadConfig();
      config.shell.workingDirectory = '/new/working/dir';
      await configManager.saveConfig(config);

      // Assert
      const savedConfig = JSON.parse(mockFs.writeFileSync.mock.calls[0][1]);
      expect(savedConfig.shell.workingDirectory).toBe('/new/working/dir');
    });
  });

  describe('Environment Variable Integration', () => {
    it('should override config with environment variables', async () => {
      // Arrange
      const originalEnv = process.env;
      process.env = {
        ...originalEnv,
        CLI_CODER_SHELL_TIMEOUT: '45000',
        CLI_CODER_ALLOW_DANGEROUS: 'true',
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
      } finally {
        // Cleanup
        process.env = originalEnv;
      }
    });

    it('should ignore invalid environment variable types', async () => {
      // Arrange
      const originalEnv = process.env;
      process.env = {
        ...originalEnv,
        CLI_CODER_SHELL_TIMEOUT: 'invalid-number',
        CLI_CODER_ALLOW_DANGEROUS: 'invalid-boolean',
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

        // Assert - invalid environment variables should be ignored, config should use file values
        expect(loadedConfig.shell.defaultTimeout).toBe(30000); // File value, not env value
        expect(loadedConfig.shell.allowDangerousCommands).toBe(false); // File value, not env value
      } finally {
        // Cleanup
        process.env = originalEnv;
      }
    });
  });

  describe('Configuration Validation', () => {
    it('should accept valid timeout values', async () => {
      // Arrange
      const validConfigs = [
        { shell: { defaultTimeout: 1000 } }, // 1 second
        { shell: { defaultTimeout: 30000 } }, // 30 seconds (default)
        { shell: { defaultTimeout: 300000 } }, // 5 minutes
      ];

      for (const validConfig of validConfigs) {
        mockFs.existsSync.mockReturnValue(true);
        mockFs.readFileSync.mockReturnValue(JSON.stringify({
          llm: { provider: 'openai', model: 'gpt-4', apiKey: 'key' },
          ...validConfig,
        }));

        // Act
        const config = await configManager.loadConfig();

        // Assert
        expect(config.shell.defaultTimeout).toBe(validConfig.shell.defaultTimeout);
      }
    });

    it('should accept valid history size values', async () => {
      // Arrange
      const validConfigs = [
        { shell: { historySize: 1 } }, // Minimum
        { shell: { historySize: 100 } }, // Default
        { shell: { historySize: 1000 } }, // Large but reasonable
      ];

      for (const validConfig of validConfigs) {
        mockFs.existsSync.mockReturnValue(true);
        mockFs.readFileSync.mockReturnValue(JSON.stringify({
          llm: { provider: 'openai', model: 'gpt-4', apiKey: 'key' },
          ...validConfig,
        }));

        // Act
        const config = await configManager.loadConfig();

        // Assert
        expect(config.shell.historySize).toBe(validConfig.shell.historySize);
      }
    });

    it('should accept valid working directory format', async () => {
      // Arrange
      const validConfigs = [
        { shell: { workingDirectory: '/valid/absolute/path' } },
        { shell: { workingDirectory: '/home/user/project' } },
        { shell: { workingDirectory: '/opt/project' } },
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
    });

    it('should load shell config with all valid fields', async () => {
      // Arrange
      const validConfig = {
        llm: { provider: 'openai', model: 'gpt-4', apiKey: 'key' },
        shell: {
          allowDangerousCommands: false,
          defaultTimeout: 30000,
          confirmationRequired: true,
          historySize: 100,
          workingDirectory: '/test/dir',
        },
      };

      mockFs.existsSync.mockReturnValue(true);
      mockFs.readFileSync.mockReturnValue(JSON.stringify(validConfig));

      // Act
      const config = await configManager.loadConfig();

      // Assert
      expect(config.shell.allowDangerousCommands).toBe(false);
      expect(config.shell.defaultTimeout).toBe(30000);
      expect(config.shell.confirmationRequired).toBe(true);
      expect(config.shell.historySize).toBe(100);
      expect(config.shell.workingDirectory).toBe('/test/dir');
    });
  });
});