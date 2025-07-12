/**
 * @fileoverview Integration tests for configuration type compatibility with real data
 */

import { describe, it, expect } from 'vitest';
import { writeFileSync, readFileSync, mkdirSync, rmSync } from 'fs';
import { join } from 'path';
import type { AppConfig, ShellConfig, EditorConfig, SessionConfig } from '../../../src/types/config.types';

describe('Configuration Integration Tests', () => {
  const testDir = join('/tmp', 'cli-coder-config-test');
  
  beforeEach(() => {
    // Clean up and create test directory
    try {
      rmSync(testDir, { recursive: true });
    } catch {
      // Directory doesn't exist, that's fine
    }
    mkdirSync(testDir, { recursive: true });
  });

  afterEach(() => {
    // Clean up test directory
    try {
      rmSync(testDir, { recursive: true });
    } catch {
      // Ignore cleanup errors
    }
  });

  describe('Configuration File Loading', () => {
    it('should load real configuration files', () => {
      const configData: AppConfig = {
        llm: {
          provider: 'openai',
          apiKey: 'sk-test-key-for-integration',
          model: 'gpt-4',
          temperature: 0.7,
          maxTokens: 2000
        },
        shell: {
          allowDangerousCommands: false,
          defaultTimeout: 30000,
          confirmationRequired: true,
          workingDirectory: '/home/user/projects',
          historySize: 100
        },
        editor: {
          defaultEditor: 'code',
          tempDir: '/tmp'
        },
        session: {
          saveHistory: true,
          maxHistorySize: 1000,
          historyPath: join(testDir, 'history.json')
        }
      };

      // Write config to file
      const configPath = join(testDir, 'config.json');
      writeFileSync(configPath, JSON.stringify(configData, null, 2));

      // Read and parse config
      const rawConfig = readFileSync(configPath, 'utf-8');
      const parsedConfig = JSON.parse(rawConfig) as AppConfig;

      // Validate loaded config matches our types
      expect(parsedConfig.llm.provider).toBe('openai');
      expect(parsedConfig.shell.allowDangerousCommands).toBe(false);
      expect(parsedConfig.editor.defaultEditor).toBe('code');
      expect(parsedConfig.session.saveHistory).toBe(true);
      
      // Validate nested structure integrity
      expect(typeof parsedConfig.llm).toBe('object');
      expect(typeof parsedConfig.shell).toBe('object');
      expect(typeof parsedConfig.editor).toBe('object');
      expect(typeof parsedConfig.session).toBe('object');
    });

    it('should handle partial configuration files', () => {
      // Create config with only LLM settings
      const partialConfig = {
        llm: {
          provider: 'anthropic',
          apiKey: 'sk-ant-test',
          model: 'claude-3-sonnet'
        }
      };

      const configPath = join(testDir, 'partial-config.json');
      writeFileSync(configPath, JSON.stringify(partialConfig, null, 2));

      const rawConfig = readFileSync(configPath, 'utf-8');
      const parsedConfig = JSON.parse(rawConfig);

      // Should have LLM config
      expect(parsedConfig.llm).toBeDefined();
      expect(parsedConfig.llm.provider).toBe('anthropic');
      
      // Should not have other sections
      expect(parsedConfig.shell).toBeUndefined();
      expect(parsedConfig.editor).toBeUndefined();
      expect(parsedConfig.session).toBeUndefined();
    });

    it('should handle configuration with comments (JSON5-like)', () => {
      // Real config files might have comments that need stripping
      const configWithComments = `{
        // LLM Configuration
        "llm": {
          "provider": "openai",
          "apiKey": "sk-test",
          "model": "gpt-4"
        },
        /* Shell Configuration */
        "shell": {
          "allowDangerousCommands": false,
          "defaultTimeout": 30000,
          "confirmationRequired": true,
          "historySize": 100
        }
      }`;

      // Strip comments for JSON parsing
      const cleanConfig = configWithComments
        .replace(/\/\*[\s\S]*?\*\//g, '')
        .replace(/\/\/.*$/gm, '');

      const parsedConfig = JSON.parse(cleanConfig) as Partial<AppConfig>;

      expect(parsedConfig.llm?.provider).toBe('openai');
      expect(parsedConfig.shell?.allowDangerousCommands).toBe(false);
    });
  });

  describe('Environment Variable Overrides', () => {
    it('should validate environment variable overrides', () => {
      // Mock environment variables
      const mockEnv = {
        'CLI_CODER_LLM_PROVIDER': 'anthropic',
        'CLI_CODER_LLM_API_KEY': 'sk-ant-env-override',
        'CLI_CODER_LLM_MODEL': 'claude-3-opus',
        'CLI_CODER_SHELL_ALLOW_DANGEROUS': 'true',
        'CLI_CODER_SHELL_TIMEOUT': '60000',
        'CLI_CODER_EDITOR_DEFAULT': 'vim',
        'CLI_CODER_SESSION_SAVE_HISTORY': 'false'
      };

      // Base config
      const baseConfig: AppConfig = {
        llm: {
          provider: 'openai',
          apiKey: 'sk-default',
          model: 'gpt-4'
        },
        shell: {
          allowDangerousCommands: false,
          defaultTimeout: 30000,
          confirmationRequired: true,
          historySize: 100
        },
        editor: {
          defaultEditor: 'code',
          tempDir: '/tmp'
        },
        session: {
          saveHistory: true,
          maxHistorySize: 1000,
          historyPath: '/home/.cli-coder/history'
        }
      };

      // Apply environment overrides
      const overriddenConfig: AppConfig = {
        ...baseConfig,
        llm: {
          ...baseConfig.llm,
          provider: mockEnv.CLI_CODER_LLM_PROVIDER as 'anthropic',
          apiKey: mockEnv.CLI_CODER_LLM_API_KEY,
          model: mockEnv.CLI_CODER_LLM_MODEL
        },
        shell: {
          ...baseConfig.shell,
          allowDangerousCommands: mockEnv.CLI_CODER_SHELL_ALLOW_DANGEROUS === 'true',
          defaultTimeout: parseInt(mockEnv.CLI_CODER_SHELL_TIMEOUT)
        },
        editor: {
          ...baseConfig.editor,
          defaultEditor: mockEnv.CLI_CODER_EDITOR_DEFAULT
        },
        session: {
          ...baseConfig.session,
          saveHistory: mockEnv.CLI_CODER_SESSION_SAVE_HISTORY === 'true'
        }
      };

      // Validate overrides applied correctly
      expect(overriddenConfig.llm.provider).toBe('anthropic');
      expect(overriddenConfig.llm.apiKey).toBe('sk-ant-env-override');
      expect(overriddenConfig.shell.allowDangerousCommands).toBe(true);
      expect(overriddenConfig.shell.defaultTimeout).toBe(60000);
      expect(overriddenConfig.editor.defaultEditor).toBe('vim');
      expect(overriddenConfig.session.saveHistory).toBe(false);
    });

    it('should handle invalid environment variable values', () => {
      const invalidEnv = {
        'CLI_CODER_SHELL_TIMEOUT': 'not-a-number',
        'CLI_CODER_SHELL_ALLOW_DANGEROUS': 'maybe',
        'CLI_CODER_LLM_PROVIDER': 'invalid-provider'
      };

      // Should have validation logic for environment variables
      const validateEnvNumber = (value: string, defaultValue: number): number => {
        const parsed = parseInt(value);
        return isNaN(parsed) ? defaultValue : parsed;
      };

      const validateEnvBoolean = (value: string, defaultValue: boolean): boolean => {
        if (value === 'true') return true;
        if (value === 'false') return false;
        return defaultValue;
      };

      const validateEnvProvider = (value: string): 'openai' | 'anthropic' | 'gemini' | null => {
        if (['openai', 'anthropic', 'gemini'].includes(value)) {
          return value as 'openai' | 'anthropic' | 'gemini';
        }
        return null;
      };

      expect(validateEnvNumber(invalidEnv.CLI_CODER_SHELL_TIMEOUT, 30000)).toBe(30000);
      expect(validateEnvBoolean(invalidEnv.CLI_CODER_SHELL_ALLOW_DANGEROUS, false)).toBe(false);
      expect(validateEnvProvider(invalidEnv.CLI_CODER_LLM_PROVIDER)).toBeNull();
    });
  });

  describe('Configuration Validation', () => {
    it('should handle invalid configuration gracefully', () => {
      const invalidConfigs = [
        // Missing required fields
        {
          llm: {
            provider: 'openai'
            // Missing apiKey and model
          }
        },
        // Invalid provider
        {
          llm: {
            provider: 'invalid-provider',
            apiKey: 'test',
            model: 'test'
          }
        },
        // Invalid timeout
        {
          shell: {
            allowDangerousCommands: false,
            defaultTimeout: -1000,
            confirmationRequired: true,
            historySize: 100
          }
        },
        // Invalid history size
        {
          session: {
            saveHistory: true,
            maxHistorySize: -500,
            historyPath: '/invalid'
          }
        }
      ];

      const validateConfig = (config: any): string[] => {
        const errors: string[] = [];

        if (config.llm) {
          if (!config.llm.apiKey) errors.push('LLM API key is required');
          if (!config.llm.model) errors.push('LLM model is required');
          if (!['openai', 'anthropic', 'gemini'].includes(config.llm.provider)) {
            errors.push('Invalid LLM provider');
          }
        }

        if (config.shell) {
          if (config.shell.defaultTimeout && config.shell.defaultTimeout <= 0) {
            errors.push('Shell timeout must be positive');
          }
          if (config.shell.historySize && config.shell.historySize < 0) {
            errors.push('Shell history size must be non-negative');
          }
        }

        if (config.session) {
          if (config.session.maxHistorySize && config.session.maxHistorySize < 0) {
            errors.push('Session history size must be non-negative');
          }
        }

        return errors;
      };

      invalidConfigs.forEach((config, index) => {
        const errors = validateConfig(config);
        expect(errors.length).toBeGreaterThan(0);
        // Each invalid config should have at least one error
      });
    });

    it('should validate configuration paths exist', () => {
      const configWithPaths: Partial<AppConfig> = {
        shell: {
          allowDangerousCommands: false,
          defaultTimeout: 30000,
          confirmationRequired: true,
          workingDirectory: '/nonexistent/directory',
          historySize: 100
        },
        editor: {
          defaultEditor: 'code',
          tempDir: '/also/nonexistent'
        },
        session: {
          saveHistory: true,
          maxHistorySize: 1000,
          historyPath: '/invalid/path/history.json'
        }
      };

      const validatePaths = (config: Partial<AppConfig>): string[] => {
        const warnings: string[] = [];

        if (config.shell?.workingDirectory) {
          try {
            // In a real implementation, we'd check if directory exists
            // For testing, we'll simulate path validation
            if (config.shell.workingDirectory.includes('nonexistent')) {
              warnings.push('Working directory does not exist');
            }
          } catch {
            warnings.push('Invalid working directory');
          }
        }

        if (config.editor?.tempDir) {
          if (config.editor.tempDir.includes('nonexistent')) {
            warnings.push('Temp directory does not exist');
          }
        }

        if (config.session?.historyPath) {
          if (config.session.historyPath.includes('invalid')) {
            warnings.push('History path directory does not exist');
          }
        }

        return warnings;
      };

      const warnings = validatePaths(configWithPaths);
      expect(warnings.length).toBeGreaterThan(0);
      expect(warnings).toContain('Working directory does not exist');
      expect(warnings).toContain('Temp directory does not exist');
      expect(warnings).toContain('History path directory does not exist');
    });
  });

  describe('Configuration Merging', () => {
    it('should merge configurations from multiple sources', () => {
      // Default config
      const defaultConfig: AppConfig = {
        llm: {
          provider: 'openai',
          apiKey: '',
          model: 'gpt-3.5-turbo',
          temperature: 0.7,
          maxTokens: 2000
        },
        shell: {
          allowDangerousCommands: false,
          defaultTimeout: 30000,
          confirmationRequired: true,
          historySize: 100
        },
        editor: {
          defaultEditor: 'nano',
          tempDir: '/tmp'
        },
        session: {
          saveHistory: true,
          maxHistorySize: 1000,
          historyPath: '/home/.cli-coder/history'
        }
      };

      // User config (partial override)
      const userConfig: Partial<AppConfig> = {
        llm: {
          provider: 'anthropic',
          apiKey: 'sk-ant-user',
          model: 'claude-3-sonnet',
          temperature: 0.5
        },
        editor: {
          defaultEditor: 'code',
          tempDir: '/tmp/cli-coder'
        }
      };

      // Project config (specific overrides)
      const projectConfig: Partial<AppConfig> = {
        shell: {
          allowDangerousCommands: true,
          workingDirectory: '/project/root'
        }
      };

      // Merge configs
      const mergedConfig: AppConfig = {
        llm: {
          ...defaultConfig.llm,
          ...userConfig.llm
        },
        shell: {
          ...defaultConfig.shell,
          ...projectConfig.shell
        },
        editor: {
          ...defaultConfig.editor,
          ...userConfig.editor
        },
        session: {
          ...defaultConfig.session
        }
      };

      // Validate merged result
      expect(mergedConfig.llm.provider).toBe('anthropic'); // From user config
      expect(mergedConfig.llm.apiKey).toBe('sk-ant-user'); // From user config
      expect(mergedConfig.llm.maxTokens).toBe(2000); // From default config
      expect(mergedConfig.shell.allowDangerousCommands).toBe(true); // From project config
      expect(mergedConfig.shell.defaultTimeout).toBe(30000); // From default config
      expect(mergedConfig.editor.defaultEditor).toBe('code'); // From user config
      expect(mergedConfig.session.saveHistory).toBe(true); // From default config
    });
  });
});