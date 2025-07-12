import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { join, dirname } from 'path';
import { homedir } from 'os';
import { existsSync, mkdirSync, readFileSync, writeFileSync, rmSync } from 'fs';
import { ConfigManager } from '../../../src/config/manager';
import { CLIErrorClass } from '../../../src/utils/errors';
import type { AppConfig } from '../../../src/types/config.types';

// Mock file system operations for isolated testing
vi.mock('fs', () => ({
  existsSync: vi.fn(),
  mkdirSync: vi.fn(),
  readFileSync: vi.fn(),
  writeFileSync: vi.fn(),
  rmSync: vi.fn()
}));

vi.mock('os', () => ({
  homedir: vi.fn(() => '/home/testuser')
}));

describe('ConfigManager', () => {
  let configManager: ConfigManager;
  let originalEnv: NodeJS.ProcessEnv;
  
  const mockExistsSync = vi.mocked(existsSync);
  const mockMkdirSync = vi.mocked(mkdirSync);
  const mockReadFileSync = vi.mocked(readFileSync);
  const mockWriteFileSync = vi.mocked(writeFileSync);

  beforeEach(() => {
    // Reset all mocks
    vi.clearAllMocks();
    
    // Store and clear environment
    originalEnv = { ...process.env };
    
    // Clear environment variables that could affect tests
    delete process.env.OPENAI_API_KEY;
    delete process.env.ANTHROPIC_API_KEY;
    delete process.env.CLI_CODER_SHELL_TIMEOUT;
    delete process.env.CLI_CODER_ALLOW_DANGEROUS;
    
    configManager = new ConfigManager();
  });

  afterEach(() => {
    // Restore environment
    process.env = originalEnv;
  });

  describe('constructor', () => {
    it('should set correct global and local config paths', () => {
      expect(configManager['globalConfigPath']).toBe('/home/testuser/.cli-coder/config.json');
      expect(configManager['localConfigPath']).toBe(join(process.cwd(), '.cli-coder', 'config.json'));
    });
  });

  describe('loadConfig', () => {
    it('should load and merge global and local configurations', async () => {
      const globalConfig = {
        llm: {
          provider: 'openai' as const,
          apiKey: 'global-key',
          model: 'gpt-4'
        },
        shell: {
          allowDangerousCommands: false,
          defaultTimeout: 30000
        }
      };

      const localConfig = {
        llm: {
          provider: 'anthropic' as const,
          apiKey: 'local-key',
          model: 'claude-3-sonnet'
        }
      };

      // Mock global config exists and load
      mockExistsSync.mockImplementation((path) => {
        if (path === '/home/testuser/.cli-coder/config.json') return true;
        if (path === join(process.cwd(), '.cli-coder', 'config.json')) return true;
        return false;
      });

      mockReadFileSync.mockImplementation((path) => {
        if (path === '/home/testuser/.cli-coder/config.json') {
          return JSON.stringify(globalConfig);
        }
        if (path === join(process.cwd(), '.cli-coder', 'config.json')) {
          return JSON.stringify(localConfig);
        }
        throw new Error('File not found');
      });

      const config = await configManager.loadConfig();

      // Local config should override global config
      expect(config.llm.provider).toBe('anthropic');
      expect(config.llm.apiKey).toBe('local-key');
      expect(config.llm.model).toBe('claude-3-sonnet');
      
      // Global config values should be preserved where not overridden
      expect(config.shell.allowDangerousCommands).toBe(false);
      expect(config.shell.defaultTimeout).toBe(30000);
    });

    it('should use only global config when local config does not exist', async () => {
      const globalConfig = {
        llm: {
          provider: 'openai' as const,
          apiKey: 'global-key',
          model: 'gpt-4'
        }
      };

      mockExistsSync.mockImplementation((path) => {
        return path === '/home/testuser/.cli-coder/config.json';
      });

      mockReadFileSync.mockImplementation((path) => {
        if (path === '/home/testuser/.cli-coder/config.json') {
          return JSON.stringify(globalConfig);
        }
        throw new Error('File not found');
      });

      const config = await configManager.loadConfig();

      expect(config.llm.provider).toBe('openai');
      expect(config.llm.apiKey).toBe('global-key');
      expect(config.llm.model).toBe('gpt-4');
    });

    it('should use defaults when no config files exist', async () => {
      mockExistsSync.mockReturnValue(false);

      // This should throw because LLM config is required
      await expect(configManager.loadConfig()).rejects.toThrow();
    });

    it('should handle corrupted config files gracefully', async () => {
      mockExistsSync.mockReturnValue(true);
      mockReadFileSync.mockReturnValue('invalid-json{');

      // Should throw due to invalid JSON
      await expect(configManager.loadConfig()).rejects.toThrow();
    });

    it('should apply environment variable overrides', async () => {
      const baseConfig = {
        llm: {
          provider: 'openai' as const,
          apiKey: 'base-key',
          model: 'gpt-4'
        }
      };

      // Set environment variables
      process.env.OPENAI_API_KEY = 'env-api-key';
      process.env.CLI_CODER_SHELL_TIMEOUT = '60000';
      process.env.CLI_CODER_ALLOW_DANGEROUS = 'true';

      mockExistsSync.mockReturnValue(true);
      mockReadFileSync.mockReturnValue(JSON.stringify(baseConfig));

      const config = await configManager.loadConfig();

      expect(config.llm.apiKey).toBe('env-api-key');
      expect(config.shell.defaultTimeout).toBe(60000);
      expect(config.shell.allowDangerousCommands).toBe(true);
    });

    it('should prioritize ANTHROPIC_API_KEY for anthropic provider', async () => {
      const baseConfig = {
        llm: {
          provider: 'anthropic' as const,
          apiKey: 'base-key',
          model: 'claude-3-sonnet'
        }
      };

      process.env.ANTHROPIC_API_KEY = 'anthropic-env-key';
      process.env.OPENAI_API_KEY = 'openai-env-key';

      mockExistsSync.mockReturnValue(true);
      mockReadFileSync.mockReturnValue(JSON.stringify(baseConfig));

      const config = await configManager.loadConfig();

      expect(config.llm.apiKey).toBe('anthropic-env-key');
    });

    it('should ignore invalid environment variable values', async () => {
      const baseConfig = {
        llm: {
          provider: 'openai' as const,
          apiKey: 'base-key',
          model: 'gpt-4'
        }
      };

      process.env.CLI_CODER_SHELL_TIMEOUT = 'invalid-number';

      mockExistsSync.mockReturnValue(true);
      mockReadFileSync.mockReturnValue(JSON.stringify(baseConfig));

      const config = await configManager.loadConfig();

      // Should use default value since env var is invalid
      expect(config.shell.defaultTimeout).toBe(30000);
    });
  });

  describe('saveConfig', () => {
    it('should save global configuration correctly', async () => {
      const config = {
        llm: {
          provider: 'openai' as const,
          apiKey: 'test-key',
          model: 'gpt-4'
        }
      };

      // Directory doesn't exist, should be created
      mockExistsSync.mockReturnValue(false);

      await configManager.saveConfig(config, true);

      expect(mockMkdirSync).toHaveBeenCalledWith(
        dirname('/home/testuser/.cli-coder/config.json'),
        { recursive: true }
      );
      expect(mockWriteFileSync).toHaveBeenCalledWith(
        '/home/testuser/.cli-coder/config.json',
        expect.stringContaining('"provider":"openai"')
      );
    });

    it('should save local configuration correctly', async () => {
      const config = {
        llm: {
          provider: 'anthropic' as const,
          apiKey: 'test-key',
          model: 'claude-3-sonnet'
        }
      };

      // Directory exists
      mockExistsSync.mockReturnValue(true);

      await configManager.saveConfig(config, false);

      expect(mockMkdirSync).not.toHaveBeenCalled();
      expect(mockWriteFileSync).toHaveBeenCalledWith(
        join(process.cwd(), '.cli-coder', 'config.json'),
        expect.stringContaining('"provider":"anthropic"')
      );
    });

    it('should create config directory if it does not exist', async () => {
      const config = {
        llm: {
          provider: 'openai' as const,
          apiKey: 'test-key',
          model: 'gpt-4'
        }
      };

      mockExistsSync.mockReturnValue(false);

      await configManager.saveConfig(config, true);

      expect(mockMkdirSync).toHaveBeenCalledWith(
        '/home/testuser/.cli-coder',
        { recursive: true }
      );
    });

    it('should validate configuration before saving', async () => {
      const invalidConfig = {
        llm: {
          provider: 'invalid-provider',
          apiKey: 'test-key',
          model: 'gpt-4'
        }
      } as any;

      await expect(configManager.saveConfig(invalidConfig)).rejects.toThrow();
      expect(mockWriteFileSync).not.toHaveBeenCalled();
    });

    it('should format saved JSON with proper indentation', async () => {
      const config = {
        llm: {
          provider: 'openai' as const,
          apiKey: 'test-key',
          model: 'gpt-4'
        },
        shell: {
          allowDangerousCommands: false,
          defaultTimeout: 30000
        }
      };

      mockExistsSync.mockReturnValue(true);

      await configManager.saveConfig(config, false);

      expect(mockWriteFileSync).toHaveBeenCalledWith(
        expect.any(String),
        expect.stringMatching(/{\n  "llm": {\n    "provider": "openai"/)
      );
    });
  });

  describe('loadConfigFile', () => {
    it('should throw CLIErrorClass when file does not exist', async () => {
      mockExistsSync.mockReturnValue(false);

      expect(() => {
        configManager['loadConfigFile']('/nonexistent/config.json');
      }).toThrow(CLIErrorClass);
      expect(() => {
        configManager['loadConfigFile']('/nonexistent/config.json');
      }).toThrow('CONFIG_NOT_FOUND');
    });

    it('should parse valid JSON configuration', async () => {
      const config = {
        llm: {
          provider: 'openai',
          apiKey: 'test-key',
          model: 'gpt-4'
        }
      };

      mockExistsSync.mockReturnValue(true);
      mockReadFileSync.mockReturnValue(JSON.stringify(config));

      const result = configManager['loadConfigFile']('/test/config.json');

      expect(result).toEqual(config);
    });

    it('should throw error for invalid JSON', async () => {
      mockExistsSync.mockReturnValue(true);
      mockReadFileSync.mockReturnValue('invalid-json{');

      expect(() => {
        configManager['loadConfigFile']('/test/config.json');
      }).toThrow();
    });
  });

  describe('applyEnvironmentOverrides', () => {
    it('should apply OPENAI_API_KEY override', () => {
      const config: Partial<AppConfig> = {
        llm: {
          provider: 'openai',
          apiKey: 'original-key',
          model: 'gpt-4'
        }
      };

      process.env.OPENAI_API_KEY = 'env-openai-key';

      configManager['applyEnvironmentOverrides'](config);

      expect(config.llm?.apiKey).toBe('env-openai-key');
    });

    it('should apply ANTHROPIC_API_KEY override', () => {
      const config: Partial<AppConfig> = {
        llm: {
          provider: 'anthropic',
          apiKey: 'original-key',
          model: 'claude-3-sonnet'
        }
      };

      process.env.ANTHROPIC_API_KEY = 'env-anthropic-key';

      configManager['applyEnvironmentOverrides'](config);

      expect(config.llm?.apiKey).toBe('env-anthropic-key');
    });

    it('should apply shell timeout override', () => {
      const config: Partial<AppConfig> = {
        shell: {
          defaultTimeout: 30000
        }
      };

      process.env.CLI_CODER_SHELL_TIMEOUT = '45000';

      configManager['applyEnvironmentOverrides'](config);

      expect(config.shell?.defaultTimeout).toBe(45000);
    });

    it('should apply dangerous commands override', () => {
      const config: Partial<AppConfig> = {
        shell: {
          allowDangerousCommands: false
        }
      };

      process.env.CLI_CODER_ALLOW_DANGEROUS = 'true';

      configManager['applyEnvironmentOverrides'](config);

      expect(config.shell?.allowDangerousCommands).toBe(true);
    });

    it('should ignore invalid timeout values', () => {
      const config: Partial<AppConfig> = {
        shell: {
          defaultTimeout: 30000
        }
      };

      process.env.CLI_CODER_SHELL_TIMEOUT = 'not-a-number';

      configManager['applyEnvironmentOverrides'](config);

      expect(config.shell?.defaultTimeout).toBe(30000);
    });

    it('should not enable dangerous commands for non-true values', () => {
      const config: Partial<AppConfig> = {
        shell: {
          allowDangerousCommands: false
        }
      };

      const testValues = ['false', 'yes', '1', 'TRUE', 'True'];

      testValues.forEach(value => {
        process.env.CLI_CODER_ALLOW_DANGEROUS = value;
        configManager['applyEnvironmentOverrides'](config);
        expect(config.shell?.allowDangerousCommands).toBe(false);
      });
    });

    it('should handle missing config sections gracefully', () => {
      const config: Partial<AppConfig> = {};

      process.env.OPENAI_API_KEY = 'env-key';
      process.env.CLI_CODER_SHELL_TIMEOUT = '60000';

      configManager['applyEnvironmentOverrides'](config);

      expect(config.llm?.apiKey).toBe('env-key');
      expect(config.shell?.defaultTimeout).toBe(60000);
    });
  });

  describe('configuration precedence', () => {
    it('should follow correct precedence: env > local > global > defaults', async () => {
      const globalConfig = {
        llm: {
          provider: 'openai' as const,
          apiKey: 'global-key',
          model: 'gpt-3.5-turbo'
        },
        shell: {
          defaultTimeout: 20000,
          allowDangerousCommands: false
        }
      };

      const localConfig = {
        llm: {
          apiKey: 'local-key',
          model: 'gpt-4'
        },
        shell: {
          defaultTimeout: 40000
        }
      };

      process.env.OPENAI_API_KEY = 'env-key';
      process.env.CLI_CODER_ALLOW_DANGEROUS = 'true';

      mockExistsSync.mockImplementation((path) => {
        if (path === '/home/testuser/.cli-coder/config.json') return true;
        if (path === join(process.cwd(), '.cli-coder', 'config.json')) return true;
        return false;
      });

      mockReadFileSync.mockImplementation((path) => {
        if (path === '/home/testuser/.cli-coder/config.json') {
          return JSON.stringify(globalConfig);
        }
        if (path === join(process.cwd(), '.cli-coder', 'config.json')) {
          return JSON.stringify(localConfig);
        }
        throw new Error('File not found');
      });

      const config = await configManager.loadConfig();

      // Environment should override everything
      expect(config.llm.apiKey).toBe('env-key');
      expect(config.shell.allowDangerousCommands).toBe(true);
      
      // Local should override global
      expect(config.llm.model).toBe('gpt-4');
      expect(config.shell.defaultTimeout).toBe(40000);
      
      // Global should be used where not overridden
      expect(config.llm.provider).toBe('openai');
      
      // Defaults should be used where nothing else specified
      expect(config.shell.confirmationRequired).toBe(true);
    });
  });
});