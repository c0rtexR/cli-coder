import { describe, it, expect, beforeEach, vi } from 'vitest';
import { OpenAIProvider } from '@/integrations/llm/openai.provider';
import { LLMConfig, ChatContext } from '@/types';
import { CLIErrorClass } from '@/utils/errors';

// Mock OpenAI SDK
vi.mock('openai', () => {
  const mockCreate = vi.fn();
  const mockOpenAI = vi.fn().mockImplementation(() => ({
    chat: {
      completions: {
        create: mockCreate
      }
    }
  }));

  return {
    default: mockOpenAI
  };
});

describe('OpenAIProvider', () => {
  let provider: OpenAIProvider;
  let config: LLMConfig;
  let mockOpenAI: any;
  let mockCreate: any;

  beforeEach(async () => {
    config = {
      provider: 'openai',
      apiKey: 'sk-test123',
      model: 'gpt-4',
      temperature: 0.7,
      maxTokens: 1000
    };
    
    // Reset mocks
    vi.clearAllMocks();

    // Get mocked instances
    const OpenAI = (await import('openai')).default;
    mockOpenAI = vi.mocked(OpenAI);
    
    // Create a mock instance with create method
    const mockInstance = {
      chat: {
        completions: {
          create: vi.fn()
        }
      }
    };
    mockCreate = mockInstance.chat.completions.create;
    mockOpenAI.mockReturnValue(mockInstance);

    provider = new OpenAIProvider(config);
  });

  describe('constructor', () => {
    it('should initialize OpenAI client with API key', () => {
      expect(mockOpenAI).toHaveBeenCalledWith({
        apiKey: 'sk-test123'
      });
    });
  });

  describe('name getter', () => {
    it('should return OpenAI as provider name', () => {
      expect(provider.name).toBe('OpenAI');
    });
  });

  describe('validateConfig', () => {
    it('should validate correct OpenAI config', () => {
      const validConfig = {
        provider: 'openai' as const,
        apiKey: 'sk-test123',
        model: 'gpt-4'
      };
      
      expect(provider.validateConfig(validConfig)).toBe(true);
    });

    it('should reject config with invalid API key format', () => {
      const invalidConfig = {
        provider: 'openai' as const,
        apiKey: 'invalid-key',
        model: 'gpt-4'
      };
      
      expect(provider.validateConfig(invalidConfig)).toBe(false);
    });

    it('should reject config with invalid model', () => {
      const invalidConfig = {
        provider: 'openai' as const,
        apiKey: 'sk-test123',
        model: 'invalid-model'
      };
      
      expect(provider.validateConfig(invalidConfig)).toBe(false);
    });

    it('should accept valid models', () => {
      const validModels = ['gpt-4', 'gpt-4-turbo', 'gpt-3.5-turbo'];
      
      validModels.forEach(model => {
        const config = {
          provider: 'openai' as const,
          apiKey: 'sk-test123',
          model
        };
        expect(provider.validateConfig(config)).toBe(true);
      });
    });
  });

  describe('generateResponse', () => {
    const mockResponse = {
      choices: [{
        message: {
          content: 'Test response from OpenAI'
        }
      }],
      usage: {
        prompt_tokens: 50,
        completion_tokens: 25,
        total_tokens: 75
      },
      model: 'gpt-4'
    };

    beforeEach(() => {
      mockCreate.mockResolvedValue(mockResponse);
    });

    it('should generate response with basic prompt', async () => {
      const prompt = 'Hello, world!';
      const context: ChatContext = {
        messages: [],
        files: []
      };

      const result = await provider.generateResponse(prompt, context);

      expect(result).toEqual({
        content: 'Test response from OpenAI',
        usage: {
          promptTokens: 50,
          completionTokens: 25,
          totalTokens: 75
        },
        model: 'gpt-4'
      });

      expect(mockCreate).toHaveBeenCalledWith({
        model: 'gpt-4',
        messages: [{ role: 'user', content: 'Hello, world!' }],
        temperature: 0.7,
        max_tokens: 1000
      });
    });

    it('should include conversation history in messages', async () => {
      const prompt = 'Follow up question';
      const context: ChatContext = {
        messages: [
          { role: 'user', content: 'Initial question', timestamp: new Date() },
          { role: 'assistant', content: 'Initial response', timestamp: new Date() }
        ],
        files: []
      };

      await provider.generateResponse(prompt, context);

      expect(mockCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          messages: [
            { role: 'user', content: 'Initial question' },
            { role: 'assistant', content: 'Initial response' },
            { role: 'user', content: 'Follow up question' }
          ]
        })
      );
    });

    it('should include system prompt when provided', async () => {
      const prompt = 'Test prompt';
      const context: ChatContext = {
        systemPrompt: 'You are a coding assistant',
        messages: [],
        files: []
      };

      await provider.generateResponse(prompt, context);

      expect(mockCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          messages: [
            { role: 'system', content: 'You are a coding assistant' },
            { role: 'user', content: 'Test prompt' }
          ]
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

      const lastMessage = mockCreate.mock.calls[0][0].messages.slice(-1)[0];
      expect(lastMessage.content).toContain('Analyze this code');
      expect(lastMessage.content).toContain('--- File Context ---');
      expect(lastMessage.content).toContain('=== /test/file.ts ===');
      expect(lastMessage.content).toContain('const x = 1;');
    });

    it('should use default parameters when not specified', async () => {
      const providerWithDefaults = new OpenAIProvider({
        provider: 'openai',
        apiKey: 'sk-test123',
        model: 'gpt-4'
      });

      await providerWithDefaults.generateResponse('test', { messages: [], files: [] });

      expect(mockCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          temperature: 0.7,
          max_tokens: 4000
        })
      );
    });

    it('should throw error when no response content', async () => {
      mockCreate.mockResolvedValue({
        choices: [{ message: {} }]
      });

      await expect(
        provider.generateResponse('test', { messages: [], files: [] })
      ).rejects.toThrow(CLIErrorClass);
    });

    it('should handle OpenAI API errors', async () => {
      // Create a proper OpenAI API error mock
      const apiError = new Error('API Error');
      (apiError as any).constructor = { name: 'APIError' };
      
      mockCreate.mockRejectedValue(apiError);

      await expect(
        provider.generateResponse('test', { messages: [], files: [] })
      ).rejects.toThrow(CLIErrorClass);
    });

    it('should propagate non-API errors', async () => {
      const genericError = new Error('Generic error');
      mockCreate.mockRejectedValue(genericError);

      await expect(
        provider.generateResponse('test', { messages: [], files: [] })
      ).rejects.toThrow('Generic error');
    });
  });
});