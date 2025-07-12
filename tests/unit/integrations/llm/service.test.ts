import { describe, it, expect, beforeEach, vi } from 'vitest';
import { LLMService } from '@/integrations/llm/service';
import { LLMProviderFactory } from '@/integrations/llm/factory';
import { LLMConfig, ChatContext, LLMResponse } from '@/types';
import { CLIErrorClass } from '@/utils/errors';

// Mock the factory
vi.mock('@/integrations/llm/factory');

describe('LLMService', () => {
  let service: LLMService;
  let mockProvider: any;
  let config: LLMConfig;

  beforeEach(() => {
    service = new LLMService();
    
    config = {
      provider: 'openai',
      apiKey: 'sk-test123',
      model: 'gpt-4',
      temperature: 0.7,
      maxTokens: 1000
    };

    mockProvider = {
      name: 'MockProvider',
      generateResponse: vi.fn(),
      validateConfig: vi.fn().mockReturnValue(true)
    };

    // Reset mocks
    vi.clearAllMocks();
  });

  describe('initialize', () => {
    it('should initialize with valid config', async () => {
      vi.mocked(LLMProviderFactory.validateProviderConfig).mockReturnValue(true);
      vi.mocked(LLMProviderFactory.createProvider).mockReturnValue(mockProvider);

      await service.initialize(config);

      expect(LLMProviderFactory.validateProviderConfig).toHaveBeenCalledWith(config);
      expect(LLMProviderFactory.createProvider).toHaveBeenCalledWith(config);
      expect(service.isInitialized()).toBe(true);
    });

    it('should throw error for invalid config', async () => {
      vi.mocked(LLMProviderFactory.validateProviderConfig).mockReturnValue(false);

      await expect(service.initialize(config))
        .rejects.toThrow(CLIErrorClass);
      
      await expect(service.initialize(config))
        .rejects.toThrow('Invalid LLM configuration');
      
      expect(service.isInitialized()).toBe(false);
    });

    it('should handle provider creation failure', async () => {
      vi.mocked(LLMProviderFactory.validateProviderConfig).mockReturnValue(true);
      vi.mocked(LLMProviderFactory.createProvider).mockImplementation(() => {
        throw new Error('Provider creation failed');
      });

      await expect(service.initialize(config))
        .rejects.toThrow('Provider creation failed');
      
      expect(service.isInitialized()).toBe(false);
    });

    it('should allow re-initialization with different config', async () => {
      // First initialization
      vi.mocked(LLMProviderFactory.validateProviderConfig).mockReturnValue(true);
      vi.mocked(LLMProviderFactory.createProvider).mockReturnValue(mockProvider);
      await service.initialize(config);

      // Second initialization with different config
      const newConfig = { ...config, provider: 'anthropic' as const };
      const newMockProvider = { ...mockProvider, name: 'Anthropic' };
      vi.mocked(LLMProviderFactory.createProvider).mockReturnValue(newMockProvider);
      
      await service.initialize(newConfig);

      expect(service.getProviderName()).toBe('Anthropic');
    });
  });

  describe('generateResponse', () => {
    const mockResponse: LLMResponse = {
      content: 'Test response',
      usage: {
        promptTokens: 10,
        completionTokens: 20,
        totalTokens: 30
      },
      model: 'gpt-4'
    };

    beforeEach(async () => {
      vi.mocked(LLMProviderFactory.validateProviderConfig).mockReturnValue(true);
      vi.mocked(LLMProviderFactory.createProvider).mockReturnValue(mockProvider);
      mockProvider.generateResponse.mockResolvedValue(mockResponse);
      
      await service.initialize(config);
    });

    it('should generate response with initialized service', async () => {
      const prompt = 'Test prompt';
      const context: ChatContext = {
        messages: [],
        files: []
      };

      const result = await service.generateResponse(prompt, context);

      expect(result).toEqual(mockResponse);
      expect(mockProvider.generateResponse).toHaveBeenCalledWith(prompt, context);
    });

    it('should use default context when not provided', async () => {
      const prompt = 'Test prompt';

      const result = await service.generateResponse(prompt);

      expect(result).toEqual(mockResponse);
      expect(mockProvider.generateResponse).toHaveBeenCalledWith(prompt, {
        messages: [],
        files: []
      });
    });

    it('should throw error when service not initialized', async () => {
      const uninitializedService = new LLMService();
      
      await expect(uninitializedService.generateResponse('test'))
        .rejects.toThrow(CLIErrorClass);
      
      await expect(uninitializedService.generateResponse('test'))
        .rejects.toThrow('LLM service not initialized');
    });

    it('should propagate provider errors', async () => {
      const providerError = new Error('Provider error');
      mockProvider.generateResponse.mockRejectedValue(providerError);

      await expect(service.generateResponse('test'))
        .rejects.toThrow('Provider error');
    });

    it('should handle provider API errors', async () => {
      const apiError = new CLIErrorClass('API_ERROR', 'API failed');
      mockProvider.generateResponse.mockRejectedValue(apiError);

      await expect(service.generateResponse('test'))
        .rejects.toThrow(CLIErrorClass);
    });
  });

  describe('getProviderName', () => {
    it('should return provider name when initialized', async () => {
      vi.mocked(LLMProviderFactory.validateProviderConfig).mockReturnValue(true);
      vi.mocked(LLMProviderFactory.createProvider).mockReturnValue(mockProvider);
      
      await service.initialize(config);
      
      expect(service.getProviderName()).toBe('MockProvider');
    });

    it('should return "None" when not initialized', () => {
      expect(service.getProviderName()).toBe('None');
    });
  });

  describe('getModelName', () => {
    it('should return model name when initialized', async () => {
      vi.mocked(LLMProviderFactory.validateProviderConfig).mockReturnValue(true);
      vi.mocked(LLMProviderFactory.createProvider).mockReturnValue(mockProvider);
      
      await service.initialize(config);
      
      expect(service.getModelName()).toBe('gpt-4');
    });

    it('should return "None" when not initialized', () => {
      expect(service.getModelName()).toBe('None');
    });
  });

  describe('isInitialized', () => {
    it('should return false initially', () => {
      expect(service.isInitialized()).toBe(false);
    });

    it('should return true after successful initialization', async () => {
      vi.mocked(LLMProviderFactory.validateProviderConfig).mockReturnValue(true);
      vi.mocked(LLMProviderFactory.createProvider).mockReturnValue(mockProvider);
      
      await service.initialize(config);
      
      expect(service.isInitialized()).toBe(true);
    });

    it('should return false after failed initialization', async () => {
      vi.mocked(LLMProviderFactory.validateProviderConfig).mockReturnValue(false);
      
      try {
        await service.initialize(config);
      } catch {
        // Expected to fail
      }
      
      expect(service.isInitialized()).toBe(false);
    });
  });
});