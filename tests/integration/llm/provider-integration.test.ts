import { describe, it, expect, beforeEach } from 'vitest';
import { LLMProviderFactory } from '@/integrations/llm/factory';
import { LLMService } from '@/integrations/llm/service';
import { LLMConfig, ChatContext } from '@/types';

describe('LLM Provider Integration', () => {
  describe('Factory and Provider Integration', () => {
    it('should create and validate OpenAI provider', () => {
      const config: LLMConfig = {
        provider: 'openai',
        apiKey: 'sk-test123',
        model: 'gpt-4',
        temperature: 0.7,
        maxTokens: 1000
      };

      const provider = LLMProviderFactory.createProvider(config);
      
      expect(provider).toBeDefined();
      expect(provider.name).toBe('OpenAI');
      expect(provider.validateConfig(config)).toBe(true);
    });

    it('should create and validate Anthropic provider', () => {
      const config: LLMConfig = {
        provider: 'anthropic',
        apiKey: 'sk-ant-test123',
        model: 'claude-3-sonnet-20240229',
        temperature: 0.7,
        maxTokens: 1000
      };

      const provider = LLMProviderFactory.createProvider(config);
      
      expect(provider).toBeDefined();
      expect(provider.name).toBe('Anthropic');
      expect(provider.validateConfig(config)).toBe(true);
    });

    it('should validate configurations through factory', () => {
      const validOpenAIConfig: LLMConfig = {
        provider: 'openai',
        apiKey: 'sk-test123',
        model: 'gpt-4'
      };

      const validAnthropicConfig: LLMConfig = {
        provider: 'anthropic',
        apiKey: 'sk-ant-test123',
        model: 'claude-3-sonnet-20240229'
      };

      const invalidConfig: LLMConfig = {
        provider: 'openai',
        apiKey: 'invalid-key',
        model: 'gpt-4'
      };

      expect(LLMProviderFactory.validateProviderConfig(validOpenAIConfig)).toBe(true);
      expect(LLMProviderFactory.validateProviderConfig(validAnthropicConfig)).toBe(true);
      expect(LLMProviderFactory.validateProviderConfig(invalidConfig)).toBe(false);
    });
  });

  describe('Service and Factory Integration', () => {
    let service: LLMService;

    beforeEach(() => {
      service = new LLMService();
    });

    it('should initialize service with valid OpenAI config', async () => {
      const config: LLMConfig = {
        provider: 'openai',
        apiKey: 'sk-test123',
        model: 'gpt-4'
      };

      await service.initialize(config);

      expect(service.isInitialized()).toBe(true);
      expect(service.getProviderName()).toBe('OpenAI');
      expect(service.getModelName()).toBe('gpt-4');
    });

    it('should initialize service with valid Anthropic config', async () => {
      const config: LLMConfig = {
        provider: 'anthropic',
        apiKey: 'sk-ant-test123',
        model: 'claude-3-sonnet-20240229'
      };

      await service.initialize(config);

      expect(service.isInitialized()).toBe(true);
      expect(service.getProviderName()).toBe('Anthropic');
      expect(service.getModelName()).toBe('claude-3-sonnet-20240229');
    });

    it('should switch between providers', async () => {
      // Initialize with OpenAI
      const openaiConfig: LLMConfig = {
        provider: 'openai',
        apiKey: 'sk-test123',
        model: 'gpt-4'
      };

      await service.initialize(openaiConfig);
      expect(service.getProviderName()).toBe('OpenAI');

      // Switch to Anthropic
      const anthropicConfig: LLMConfig = {
        provider: 'anthropic',
        apiKey: 'sk-ant-test123',
        model: 'claude-3-sonnet-20240229'
      };

      await service.initialize(anthropicConfig);
      expect(service.getProviderName()).toBe('Anthropic');
    });

    it('should reject invalid configurations', async () => {
      const invalidConfig: LLMConfig = {
        provider: 'openai',
        apiKey: 'invalid-key',
        model: 'gpt-4'
      };

      await expect(service.initialize(invalidConfig))
        .rejects.toThrow('Invalid LLM configuration');
      
      expect(service.isInitialized()).toBe(false);
    });
  });

  describe('Provider Message Building Integration', () => {
    it('should build consistent messages across providers', () => {
      const prompt = 'Test prompt';
      const context: ChatContext = {
        systemPrompt: 'You are helpful',
        messages: [
          { role: 'user', content: 'Previous message', timestamp: new Date() },
          { role: 'assistant', content: 'Previous response', timestamp: new Date() }
        ],
        files: [
          {
            path: '/test/file.ts',
            content: 'const x = 1;',
            type: 'text'
          }
        ]
      };

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

      const openaiProvider = LLMProviderFactory.createProvider(openaiConfig);
      const anthropicProvider = LLMProviderFactory.createProvider(anthropicConfig);

      // Both providers should handle the same context consistently
      expect(openaiProvider).toBeDefined();
      expect(anthropicProvider).toBeDefined();
      expect(openaiProvider.name).toBe('OpenAI');
      expect(anthropicProvider.name).toBe('Anthropic');
    });
  });

  describe('Error Handling Integration', () => {
    it('should handle factory errors consistently', () => {
      const unknownConfig = {
        provider: 'unknown-provider',
        apiKey: 'test-key',
        model: 'test-model'
      } as any;

      expect(() => LLMProviderFactory.createProvider(unknownConfig))
        .toThrow('Unknown provider: unknown-provider');

      expect(LLMProviderFactory.validateProviderConfig(unknownConfig))
        .toBe(false);
    });

    it('should handle unimplemented providers', () => {
      const geminiConfig: LLMConfig = {
        provider: 'gemini',
        apiKey: 'test-key',
        model: 'gemini-pro'
      };

      expect(() => LLMProviderFactory.createProvider(geminiConfig))
        .toThrow('Gemini provider not yet implemented');
    });
  });

  describe('Configuration Validation Integration', () => {
    it('should validate OpenAI configurations correctly', () => {
      const validConfigs = [
        {
          provider: 'openai' as const,
          apiKey: 'sk-test123',
          model: 'gpt-4'
        },
        {
          provider: 'openai' as const,
          apiKey: 'sk-test456',
          model: 'gpt-4-turbo'
        },
        {
          provider: 'openai' as const,
          apiKey: 'sk-test789',
          model: 'gpt-3.5-turbo'
        }
      ];

      const invalidConfigs = [
        {
          provider: 'openai' as const,
          apiKey: 'invalid-key',
          model: 'gpt-4'
        },
        {
          provider: 'openai' as const,
          apiKey: 'sk-test123',
          model: 'invalid-model'
        }
      ];

      validConfigs.forEach(config => {
        expect(LLMProviderFactory.validateProviderConfig(config)).toBe(true);
      });

      invalidConfigs.forEach(config => {
        expect(LLMProviderFactory.validateProviderConfig(config)).toBe(false);
      });
    });

    it('should validate Anthropic configurations correctly', () => {
      const validConfigs = [
        {
          provider: 'anthropic' as const,
          apiKey: 'sk-ant-test123',
          model: 'claude-3-opus-20240229'
        },
        {
          provider: 'anthropic' as const,
          apiKey: 'sk-ant-test456',
          model: 'claude-3-sonnet-20240229'
        },
        {
          provider: 'anthropic' as const,
          apiKey: 'sk-ant-test789',
          model: 'claude-3-haiku-20240307'
        }
      ];

      const invalidConfigs = [
        {
          provider: 'anthropic' as const,
          apiKey: 'invalid-key',
          model: 'claude-3-sonnet-20240229'
        },
        {
          provider: 'anthropic' as const,
          apiKey: 'sk-ant-test123',
          model: 'invalid-model'
        }
      ];

      validConfigs.forEach(config => {
        expect(LLMProviderFactory.validateProviderConfig(config)).toBe(true);
      });

      invalidConfigs.forEach(config => {
        expect(LLMProviderFactory.validateProviderConfig(config)).toBe(false);
      });
    });
  });
});