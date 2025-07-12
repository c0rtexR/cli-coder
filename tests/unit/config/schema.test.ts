import { describe, it, expect } from 'vitest';
import { AppConfigSchema, LLMConfigSchema, ShellConfigSchema } from '../../../src/config/schema';

describe('Configuration Schema Validation', () => {
  describe('LLMConfigSchema', () => {
    it('should validate valid OpenAI configuration', () => {
      const validConfig = {
        provider: 'openai' as const,
        apiKey: 'sk-test123456789',
        model: 'gpt-4'
      };
      
      const result = LLMConfigSchema.safeParse(validConfig);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.provider).toBe('openai');
        expect(result.data.apiKey).toBe('sk-test123456789');
        expect(result.data.model).toBe('gpt-4');
      }
    });

    it('should validate valid Anthropic configuration', () => {
      const validConfig = {
        provider: 'anthropic' as const,
        apiKey: 'sk-ant-api03-test123',
        model: 'claude-3-sonnet-20240229'
      };
      
      const result = LLMConfigSchema.safeParse(validConfig);
      expect(result.success).toBe(true);
    });

    it('should validate valid Gemini configuration', () => {
      const validConfig = {
        provider: 'gemini' as const,
        apiKey: 'AIzaSyTest123',
        model: 'gemini-1.5-pro'
      };
      
      const result = LLMConfigSchema.safeParse(validConfig);
      expect(result.success).toBe(true);
    });

    it('should reject invalid provider', () => {
      const invalidConfig = {
        provider: 'invalid-provider',
        apiKey: 'sk-test123',
        model: 'gpt-4'
      };
      
      const result = LLMConfigSchema.safeParse(invalidConfig);
      expect(result.success).toBe(false);
    });

    it('should reject missing API key', () => {
      const invalidConfig = {
        provider: 'openai' as const,
        model: 'gpt-4'
      };
      
      const result = LLMConfigSchema.safeParse(invalidConfig);
      expect(result.success).toBe(false);
    });

    it('should reject empty API key', () => {
      const invalidConfig = {
        provider: 'openai' as const,
        apiKey: '',
        model: 'gpt-4'
      };
      
      const result = LLMConfigSchema.safeParse(invalidConfig);
      expect(result.success).toBe(false);
    });

    it('should reject missing model', () => {
      const invalidConfig = {
        provider: 'openai' as const,
        apiKey: 'sk-test123'
      };
      
      const result = LLMConfigSchema.safeParse(invalidConfig);
      expect(result.success).toBe(false);
    });

    it('should validate temperature within valid range', () => {
      const configs = [
        { provider: 'openai' as const, apiKey: 'sk-test', model: 'gpt-4', temperature: 0 },
        { provider: 'openai' as const, apiKey: 'sk-test', model: 'gpt-4', temperature: 1.0 },
        { provider: 'openai' as const, apiKey: 'sk-test', model: 'gpt-4', temperature: 2.0 }
      ];

      configs.forEach(config => {
        const result = LLMConfigSchema.safeParse(config);
        expect(result.success).toBe(true);
      });
    });

    it('should reject temperature outside valid range', () => {
      const invalidConfigs = [
        { provider: 'openai' as const, apiKey: 'sk-test', model: 'gpt-4', temperature: -0.1 },
        { provider: 'openai' as const, apiKey: 'sk-test', model: 'gpt-4', temperature: 2.1 }
      ];

      invalidConfigs.forEach(config => {
        const result = LLMConfigSchema.safeParse(config);
        expect(result.success).toBe(false);
      });
    });

    it('should validate positive maxTokens', () => {
      const validConfig = {
        provider: 'openai' as const,
        apiKey: 'sk-test123',
        model: 'gpt-4',
        maxTokens: 1000
      };
      
      const result = LLMConfigSchema.safeParse(validConfig);
      expect(result.success).toBe(true);
    });

    it('should reject non-positive maxTokens', () => {
      const invalidConfigs = [
        { provider: 'openai' as const, apiKey: 'sk-test', model: 'gpt-4', maxTokens: 0 },
        { provider: 'openai' as const, apiKey: 'sk-test', model: 'gpt-4', maxTokens: -100 }
      ];

      invalidConfigs.forEach(config => {
        const result = LLMConfigSchema.safeParse(config);
        expect(result.success).toBe(false);
      });
    });
  });

  describe('ShellConfigSchema', () => {
    it('should use default values for empty configuration', () => {
      const emptyConfig = {};
      
      const result = ShellConfigSchema.safeParse(emptyConfig);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.allowDangerousCommands).toBe(false);
        expect(result.data.defaultTimeout).toBe(30000);
        expect(result.data.confirmationRequired).toBe(true);
        expect(result.data.historySize).toBe(100);
      }
    });

    it('should validate complete shell configuration', () => {
      const completeConfig = {
        allowDangerousCommands: true,
        defaultTimeout: 60000,
        confirmationRequired: false,
        workingDirectory: '/home/user/projects',
        historySize: 200
      };
      
      const result = ShellConfigSchema.safeParse(completeConfig);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.allowDangerousCommands).toBe(true);
        expect(result.data.defaultTimeout).toBe(60000);
        expect(result.data.confirmationRequired).toBe(false);
        expect(result.data.workingDirectory).toBe('/home/user/projects');
        expect(result.data.historySize).toBe(200);
      }
    });

    it('should allow partial shell configuration with defaults', () => {
      const partialConfig = {
        allowDangerousCommands: true,
        historySize: 50
      };
      
      const result = ShellConfigSchema.safeParse(partialConfig);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.allowDangerousCommands).toBe(true);
        expect(result.data.defaultTimeout).toBe(30000); // default
        expect(result.data.confirmationRequired).toBe(true); // default
        expect(result.data.historySize).toBe(50);
      }
    });

    it('should validate boolean fields correctly', () => {
      const booleanConfigs = [
        { allowDangerousCommands: true },
        { allowDangerousCommands: false },
        { confirmationRequired: true },
        { confirmationRequired: false }
      ];

      booleanConfigs.forEach(config => {
        const result = ShellConfigSchema.safeParse(config);
        expect(result.success).toBe(true);
      });
    });

    it('should validate numeric fields correctly', () => {
      const numericConfigs = [
        { defaultTimeout: 1000 },
        { defaultTimeout: 300000 },
        { historySize: 1 },
        { historySize: 1000 }
      ];

      numericConfigs.forEach(config => {
        const result = ShellConfigSchema.safeParse(config);
        expect(result.success).toBe(true);
      });
    });

    it('should accept optional workingDirectory', () => {
      const configs = [
        {},
        { workingDirectory: undefined },
        { workingDirectory: '/tmp' },
        { workingDirectory: '/home/user/workspace' }
      ];

      configs.forEach(config => {
        const result = ShellConfigSchema.safeParse(config);
        expect(result.success).toBe(true);
      });
    });
  });

  describe('AppConfigSchema', () => {
    it('should require LLM configuration', () => {
      const incompleteConfig = {
        shell: {
          allowDangerousCommands: false
        }
      };
      
      const result = AppConfigSchema.safeParse(incompleteConfig);
      expect(result.success).toBe(false);
    });

    it('should validate complete application configuration', () => {
      const completeConfig = {
        llm: {
          provider: 'anthropic' as const,
          apiKey: 'sk-ant-api03-test123',
          model: 'claude-3-sonnet-20240229',
          temperature: 0.7,
          maxTokens: 4000
        },
        shell: {
          allowDangerousCommands: false,
          defaultTimeout: 45000,
          confirmationRequired: true,
          workingDirectory: '/home/user/projects',
          historySize: 150
        },
        editor: {
          defaultEditor: 'vim',
          tempDir: '/tmp/cli-coder'
        },
        session: {
          saveHistory: true,
          maxHistorySize: 200
        }
      };
      
      const result = AppConfigSchema.safeParse(completeConfig);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.llm.provider).toBe('anthropic');
        expect(result.data.shell.allowDangerousCommands).toBe(false);
        expect(result.data.editor.defaultEditor).toBe('vim');
        expect(result.data.session.saveHistory).toBe(true);
      }
    });

    it('should use default values for optional sections', () => {
      const minimalConfig = {
        llm: {
          provider: 'openai' as const,
          apiKey: 'sk-test123',
          model: 'gpt-4'
        }
      };
      
      const result = AppConfigSchema.safeParse(minimalConfig);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.shell.allowDangerousCommands).toBe(false);
        expect(result.data.shell.defaultTimeout).toBe(30000);
        expect(result.data.editor.defaultEditor).toBe('code');
        expect(result.data.editor.tempDir).toBe('/tmp');
        expect(result.data.session.saveHistory).toBe(true);
        expect(result.data.session.maxHistorySize).toBe(100);
      }
    });

    it('should validate nested configuration structure', () => {
      const nestedConfig = {
        llm: {
          provider: 'gemini' as const,
          apiKey: 'AIzaSyTest123',
          model: 'gemini-1.5-pro'
        },
        shell: {
          allowDangerousCommands: true
        },
        editor: {
          defaultEditor: 'nano'
        },
        session: {
          maxHistorySize: 500
        }
      };
      
      const result = AppConfigSchema.safeParse(nestedConfig);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.llm.provider).toBe('gemini');
        expect(result.data.shell.allowDangerousCommands).toBe(true);
        expect(result.data.shell.defaultTimeout).toBe(30000); // default preserved
        expect(result.data.editor.defaultEditor).toBe('nano');
        expect(result.data.editor.tempDir).toBe('/tmp'); // default preserved
        expect(result.data.session.maxHistorySize).toBe(500);
        expect(result.data.session.saveHistory).toBe(true); // default preserved
      }
    });

    it('should reject invalid nested configuration', () => {
      const invalidConfig = {
        llm: {
          provider: 'invalid-provider',
          apiKey: 'sk-test123',
          model: 'gpt-4'
        },
        shell: {
          allowDangerousCommands: 'invalid-boolean' // Should be boolean
        }
      };
      
      const result = AppConfigSchema.safeParse(invalidConfig);
      expect(result.success).toBe(false);
    });

    it('should validate session configuration constraints', () => {
      const validSessionConfigs = [
        { saveHistory: true, maxHistorySize: 1 },
        { saveHistory: false, maxHistorySize: 1000 },
        { saveHistory: true, maxHistorySize: 9999 }
      ];

      validSessionConfigs.forEach(sessionConfig => {
        const config = {
          llm: {
            provider: 'openai' as const,
            apiKey: 'sk-test',
            model: 'gpt-4'
          },
          session: sessionConfig
        };
        
        const result = AppConfigSchema.safeParse(config);
        expect(result.success).toBe(true);
      });
    });

    it('should reject invalid session configuration', () => {
      const invalidSessionConfigs = [
        { maxHistorySize: 0 },
        { maxHistorySize: -1 }
      ];

      invalidSessionConfigs.forEach(sessionConfig => {
        const config = {
          llm: {
            provider: 'openai' as const,
            apiKey: 'sk-test',
            model: 'gpt-4'
          },
          session: sessionConfig
        };
        
        const result = AppConfigSchema.safeParse(config);
        expect(result.success).toBe(false);
      });
    });
  });

  describe('Schema Type Inference', () => {
    it('should properly infer types from validated configuration', () => {
      const config = {
        llm: {
          provider: 'openai' as const,
          apiKey: 'sk-test123',
          model: 'gpt-4',
          temperature: 0.8
        },
        shell: {
          allowDangerousCommands: false,
          defaultTimeout: 30000
        }
      };
      
      const result = AppConfigSchema.safeParse(config);
      expect(result.success).toBe(true);
      
      if (result.success) {
        // Type assertions to ensure TypeScript inference works correctly
        const validatedConfig = result.data;
        
        // These should not cause TypeScript errors
        expect(typeof validatedConfig.llm.provider).toBe('string');
        expect(typeof validatedConfig.llm.apiKey).toBe('string');
        expect(typeof validatedConfig.llm.model).toBe('string');
        expect(typeof validatedConfig.shell.allowDangerousCommands).toBe('boolean');
        expect(typeof validatedConfig.shell.defaultTimeout).toBe('number');
        
        // Verify provider is properly typed as union
        expect(['openai', 'anthropic', 'gemini']).toContain(validatedConfig.llm.provider);
      }
    });
  });
});