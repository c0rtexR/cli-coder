import { describe, it, expect, beforeEach } from 'vitest';
import { LLMService } from '@/integrations/llm/service';
import { ConfigManager } from '@/config/manager';
import { LLMConfig } from '@/types';
import { promises as fs } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';

describe('LLM Service Configuration Integration', () => {
  let service: LLMService;
  let configManager: ConfigManager;
  let tempDir: string;
  let tempConfigPath: string;

  beforeEach(async () => {
    service = new LLMService();
    
    // Create temporary directory for test configs
    tempDir = join(tmpdir(), `cli-coder-test-${Date.now()}`);
    await fs.mkdir(tempDir, { recursive: true });
    
    tempConfigPath = join(tempDir, '.cli-coder');
    await fs.mkdir(tempConfigPath, { recursive: true });

    // Create ConfigManager with test path
    configManager = new ConfigManager();
    // Override paths for testing
    (configManager as any).globalConfigPath = join(tempConfigPath, 'global-config.json');
    (configManager as any).localConfigPath = join(tempConfigPath, 'local-config.json');
  });

  afterEach(async () => {
    // Clean up temporary files
    try {
      await fs.rm(tempDir, { recursive: true, force: true });
    } catch {
      // Ignore cleanup errors
    }
  });

  describe('Configuration Loading Integration', () => {
    it('should initialize service from global configuration', async () => {
      const globalConfig = {
        llm: {
          provider: 'openai',
          apiKey: 'sk-test123',
          model: 'gpt-4',
          temperature: 0.7,
          maxTokens: 1000
        },
        shell: {},
        editor: {},
        session: {}
      };

      await fs.writeFile(
        (configManager as any).globalConfigPath,
        JSON.stringify(globalConfig, null, 2)
      );

      const config = await configManager.loadConfig();
      await service.initialize(config.llm);

      expect(service.isInitialized()).toBe(true);
      expect(service.getProviderName()).toBe('OpenAI');
      expect(service.getModelName()).toBe('gpt-4');
    });

    it('should initialize service from local configuration override', async () => {
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

      const localConfig = {
        llm: {
          provider: 'anthropic',
          apiKey: 'sk-ant-local123',
          model: 'claude-3-sonnet-20240229'
        }
      };

      await fs.writeFile(
        (configManager as any).globalConfigPath,
        JSON.stringify(globalConfig, null, 2)
      );

      await fs.writeFile(
        (configManager as any).localConfigPath,
        JSON.stringify(localConfig, null, 2)
      );

      const config = await configManager.loadConfig();
      await service.initialize(config.llm);

      expect(service.isInitialized()).toBe(true);
      expect(service.getProviderName()).toBe('Anthropic');
      expect(service.getModelName()).toBe('claude-3-sonnet-20240229');
    });

    it('should handle environment variable overrides', async () => {
      const originalEnv = process.env.OPENAI_API_KEY;

      try {
        // Set environment variable
        process.env.OPENAI_API_KEY = 'sk-env-override123';

        const globalConfig = {
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
          (configManager as any).globalConfigPath,
          JSON.stringify(globalConfig, null, 2)
        );

        const config = await configManager.loadConfig();
        
        // Environment should override config file
        expect(config.llm.apiKey).toBe('sk-env-override123');
        
        await service.initialize(config.llm);
        expect(service.isInitialized()).toBe(true);
      } finally {
        // Restore original environment
        if (originalEnv) {
          process.env.OPENAI_API_KEY = originalEnv;
        } else {
          delete process.env.OPENAI_API_KEY;
        }
      }
    });
  });

  describe('Configuration Validation Integration', () => {
    it('should reject invalid configuration from file', async () => {
      const invalidConfig = {
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
        (configManager as any).globalConfigPath,
        JSON.stringify(invalidConfig, null, 2)
      );

      const config = await configManager.loadConfig();
      
      await expect(service.initialize(config.llm))
        .rejects.toThrow('Invalid LLM configuration');
      
      expect(service.isInitialized()).toBe(false);
    });

    it('should validate configuration changes at runtime', async () => {
      // Start with valid config
      const validConfig = {
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
        (configManager as any).globalConfigPath,
        JSON.stringify(validConfig, null, 2)
      );

      let config = await configManager.loadConfig();
      await service.initialize(config.llm);
      expect(service.isInitialized()).toBe(true);

      // Try to switch to invalid config
      const invalidLLMConfig: LLMConfig = {
        provider: 'openai',
        apiKey: 'invalid-key',
        model: 'gpt-4'
      };

      await expect(service.initialize(invalidLLMConfig))
        .rejects.toThrow('Invalid LLM configuration');
    });
  });

  describe('Provider Switching Integration', () => {
    it('should switch providers through configuration', async () => {
      // Start with OpenAI
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
        (configManager as any).globalConfigPath,
        JSON.stringify(openaiConfig, null, 2)
      );

      let config = await configManager.loadConfig();
      await service.initialize(config.llm);
      expect(service.getProviderName()).toBe('OpenAI');

      // Switch to Anthropic
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
        (configManager as any).globalConfigPath,
        JSON.stringify(anthropicConfig, null, 2)
      );

      config = await configManager.loadConfig();
      await service.initialize(config.llm);
      expect(service.getProviderName()).toBe('Anthropic');
    });

    it('should maintain service state across provider switches', async () => {
      const openaiConfig: LLMConfig = {
        provider: 'openai',
        apiKey: 'sk-test123',
        model: 'gpt-4'
      };

      const anthropicConfig: LLMConfig = {
        provider: 'anthropic',
        apiKey: 'sk-ant-test123',
        model: 'claude-3-sonnet-20240229'
      };

      // Initialize with OpenAI
      await service.initialize(openaiConfig);
      expect(service.isInitialized()).toBe(true);
      expect(service.getProviderName()).toBe('OpenAI');

      // Switch to Anthropic
      await service.initialize(anthropicConfig);
      expect(service.isInitialized()).toBe(true);
      expect(service.getProviderName()).toBe('Anthropic');

      // Service should remain initialized
      expect(service.isInitialized()).toBe(true);
    });
  });

  describe('Error Handling Integration', () => {
    it('should handle missing configuration files gracefully', async () => {
      // Don't create any config files
      try {
        const config = await configManager.loadConfig();
        
        // Should throw because no LLM config is available
        await expect(service.initialize(config.llm))
          .rejects.toThrow();
        
      } catch (error) {
        // Expected - no valid configuration available
        expect(service.isInitialized()).toBe(false);
      }
    });

    it('should handle malformed configuration files', async () => {
      // Write invalid JSON
      await fs.writeFile(
        (configManager as any).globalConfigPath,
        'invalid json content'
      );

      await expect(configManager.loadConfig())
        .rejects.toThrow();
      
      expect(service.isInitialized()).toBe(false);
    });

    it('should handle configuration schema validation errors', async () => {
      const invalidSchemaConfig = {
        llm: {
          // Missing required fields
          provider: 'openai'
          // apiKey and model missing
        },
        shell: {},
        editor: {},
        session: {}
      };

      await fs.writeFile(
        (configManager as any).globalConfigPath,
        JSON.stringify(invalidSchemaConfig, null, 2)
      );

      await expect(configManager.loadConfig())
        .rejects.toThrow();
    });
  });
});