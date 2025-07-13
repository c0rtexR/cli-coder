import { describe, it, expect, beforeEach, vi } from 'vitest';
import { AnthropicProvider } from '@/integrations/llm/anthropic.provider';
import { LLMConfig, ChatContext } from '@/types';
import { CLIErrorClass } from '@/utils/errors';

// Mock Anthropic SDK
vi.mock('@anthropic-ai/sdk', () => {
  const mockAnthropicCreate = vi.fn();
  const mockAnthropic = vi.fn().mockImplementation(() => ({
    messages: {
      create: mockAnthropicCreate
    }
  }));

  return {
    default: mockAnthropic
  };
});

describe('AnthropicProvider', () => {
  let provider: AnthropicProvider;
  let config: LLMConfig;
  let mockAnthropic: any;
  let mockAnthropicCreate: any;

  beforeEach(async () => {
    config = {
      provider: 'anthropic',
      apiKey: 'sk-ant-test123',
      model: 'claude-3-sonnet-20240229',
      temperature: 0.7,
      maxTokens: 1000
    };
    
    // Reset mocks
    vi.clearAllMocks();

    // Get mocked instances
    const Anthropic = (await import('@anthropic-ai/sdk')).default;
    mockAnthropic = vi.mocked(Anthropic);
    
    // Create a mock instance with create method
    const mockInstance = {
      messages: {
        create: vi.fn()
      }
    };
    mockAnthropicCreate = mockInstance.messages.create;
    mockAnthropic.mockReturnValue(mockInstance);

    provider = new AnthropicProvider(config);
  });

  describe('constructor', () => {
    it('should initialize Anthropic client with API key', () => {
      expect(mockAnthropic).toHaveBeenCalledWith({
        apiKey: 'sk-ant-test123'
      });
    });
  });

  describe('name getter', () => {
    it('should return Anthropic as provider name', () => {
      expect(provider.name).toBe('Anthropic');
    });
  });

  describe('validateConfig', () => {
    it('should validate correct Anthropic config', () => {
      const validConfig = {
        provider: 'anthropic' as const,
        apiKey: 'sk-ant-test123',
        model: 'claude-3-sonnet-20240229'
      };
      
      expect(provider.validateConfig(validConfig)).toBe(true);
    });

    it('should reject config with invalid API key format', () => {
      const invalidConfig = {
        provider: 'anthropic' as const,
        apiKey: 'invalid-key',
        model: 'claude-3-sonnet-20240229'
      };
      
      expect(provider.validateConfig(invalidConfig)).toBe(false);
    });

    it('should reject config with invalid model', () => {
      const invalidConfig = {
        provider: 'anthropic' as const,
        apiKey: 'sk-ant-test123',
        model: 'invalid-model'
      };
      
      expect(provider.validateConfig(invalidConfig)).toBe(false);
    });

    it('should accept valid models', () => {
      const validModels = [
        'claude-3-opus-20240229',
        'claude-3-sonnet-20240229',
        'claude-3-haiku-20240307'
      ];
      
      validModels.forEach(model => {
        const config = {
          provider: 'anthropic' as const,
          apiKey: 'sk-ant-test123',
          model
        };
        expect(provider.validateConfig(config)).toBe(true);
      });
    });
  });

  describe('generateResponse', () => {
    const mockResponse = {
      content: [{
        type: 'text',
        text: 'Test response from Anthropic'
      }],
      usage: {
        input_tokens: 50,
        output_tokens: 25
      },
      model: 'claude-3-sonnet-20240229'
    };

    beforeEach(() => {
      mockAnthropicCreate.mockResolvedValue(mockResponse);
    });

    it('should generate response with basic prompt', async () => {
      const prompt = 'Hello, world!';
      const context: ChatContext = {
        messages: [],
        files: []
      };

      const result = await provider.generateResponse(prompt, context);

      expect(result).toEqual({
        content: 'Test response from Anthropic',
        usage: {
          promptTokens: 50,
          completionTokens: 25,
          totalTokens: 75
        },
        model: 'claude-3-sonnet-20240229'
      });

      expect(mockAnthropicCreate).toHaveBeenCalledWith({
        model: 'claude-3-sonnet-20240229',
        max_tokens: 1000,
        temperature: 0.7,
        system: undefined,
        messages: [{ role: 'user', content: 'Hello, world!' }]
      });
    });

    it('should include conversation history in messages (excluding system)', async () => {
      const prompt = 'Follow up question';
      const context: ChatContext = {
        messages: [
          { role: 'system', content: 'System message', timestamp: new Date() },
          { role: 'user', content: 'Initial question', timestamp: new Date() },
          { role: 'assistant', content: 'Initial response', timestamp: new Date() }
        ],
        files: []
      };

      await provider.generateResponse(prompt, context);

      expect(mockAnthropicCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          messages: [
            { role: 'user', content: 'Initial question' },
            { role: 'assistant', content: 'Initial response' },
            { role: 'user', content: 'Follow up question' }
          ]
        })
      );
    });

    it('should include system prompt separately', async () => {
      const prompt = 'Test prompt';
      const context: ChatContext = {
        systemPrompt: 'You are a coding assistant',
        messages: [],
        files: []
      };

      await provider.generateResponse(prompt, context);

      expect(mockAnthropicCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          system: 'You are a coding assistant',
          messages: [{ role: 'user', content: 'Test prompt' }]
        })
      );
    });

    it('should include file context in prompt', async () => {
      const prompt = 'Analyze this code';
      const context: ChatContext = {
        messages: [],
        files: [
          {
            path: '/test/file.ts',
            content: 'const x = 1;',
            type: 'text'
          }
        ]
      };

      await provider.generateResponse(prompt, context);

      const lastMessage = mockAnthropicCreate.mock.calls[0][0].messages.slice(-1)[0];
      expect(lastMessage.content).toContain('Analyze this code');
      expect(lastMessage.content).toContain('--- File Context ---');
      expect(lastMessage.content).toContain('=== /test/file.ts ===');
      expect(lastMessage.content).toContain('const x = 1;');
    });

    it('should use default parameters when not specified', async () => {
      const providerWithDefaults = new AnthropicProvider({
        provider: 'anthropic',
        apiKey: 'sk-ant-test123',
        model: 'claude-3-sonnet-20240229'
      });

      await providerWithDefaults.generateResponse('test', { messages: [], files: [] });

      expect(mockAnthropicCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          temperature: 0.7,
          max_tokens: 4000
        })
      );
    });

    it('should throw error when response is not text type', async () => {
      mockAnthropicCreate.mockResolvedValue({
        content: [{
          type: 'image',
          data: 'base64data'
        }],
        usage: { input_tokens: 10, output_tokens: 5 },
        model: 'claude-3-sonnet-20240229'
      });

      await expect(
        provider.generateResponse('test', { messages: [], files: [] })
      ).rejects.toThrow(CLIErrorClass);
    });

    it('should handle Anthropic API errors', async () => {
      const apiError = new Error('API Error');
      (apiError as any).constructor = { name: 'APIError' };
      mockAnthropicCreate.mockRejectedValue(apiError);

      await expect(
        provider.generateResponse('test', { messages: [], files: [] })
      ).rejects.toThrow(CLIErrorClass);
    });

    it('should propagate non-API errors', async () => {
      const genericError = new Error('Generic error');
      mockAnthropicCreate.mockRejectedValue(genericError);

      await expect(
        provider.generateResponse('test', { messages: [], files: [] })
      ).rejects.toThrow('Generic error');
    });
  });
});