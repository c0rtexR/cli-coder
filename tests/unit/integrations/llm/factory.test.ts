import { describe, it, expect, vi } from 'vitest';
import { LLMProviderFactory } from '@/integrations/llm/factory';
import { OpenAIProvider } from '@/integrations/llm/openai.provider';
import { AnthropicProvider } from '@/integrations/llm/anthropic.provider';
import { LLMConfig } from '@/types';
import { CLIErrorClass } from '@/utils/errors';

// Mock the provider classes
vi.mock('@/integrations/llm/openai.provider');
vi.mock('@/integrations/llm/anthropic.provider');

describe('LLMProviderFactory', () => {
  describe('createProvider', () => {
    it('should create OpenAI provider', () => {
      const config: LLMConfig = {
        provider: 'openai',
        apiKey: 'sk-test123',
        model: 'gpt-4'
      };

      const provider = LLMProviderFactory.createProvider(config);
      
      expect(OpenAIProvider).toHaveBeenCalledWith(config);
      expect(provider).toBeInstanceOf(OpenAIProvider);
    });

    it('should create Anthropic provider', () => {
      const config: LLMConfig = {
        provider: 'anthropic',
        apiKey: 'sk-ant-test123',
        model: 'claude-3-sonnet-20240229'
      };

      const provider = LLMProviderFactory.createProvider(config);
      
      expect(AnthropicProvider).toHaveBeenCalledWith(config);
      expect(provider).toBeInstanceOf(AnthropicProvider);
    });

    it('should throw error for Gemini provider (not implemented)', () => {
      const config: LLMConfig = {
        provider: 'gemini',
        apiKey: 'test-key',
        model: 'gemini-pro'
      };

      expect(() => LLMProviderFactory.createProvider(config))
        .toThrow(CLIErrorClass);
      
      expect(() => LLMProviderFactory.createProvider(config))
        .toThrow('Gemini provider not yet implemented');
    });

    it('should throw error for unknown provider', () => {
      const config = {
        provider: 'unknown-provider',
        apiKey: 'test-key',
        model: 'test-model'
      } as any;

      expect(() => LLMProviderFactory.createProvider(config))
        .toThrow(CLIErrorClass);
      
      expect(() => LLMProviderFactory.createProvider(config))
        .toThrow('Unknown provider: unknown-provider');
    });
  });

  describe('getSupportedProviders', () => {
    it('should return list of supported providers', () => {
      const providers = LLMProviderFactory.getSupportedProviders();
      
      expect(providers).toEqual(['openai', 'anthropic']);
      expect(providers).not.toContain('gemini');
    });

    it('should return array of strings', () => {
      const providers = LLMProviderFactory.getSupportedProviders();
      
      expect(Array.isArray(providers)).toBe(true);
      providers.forEach(provider => {
        expect(typeof provider).toBe('string');
      });
    });
  });

  describe('validateProviderConfig', () => {
    it('should validate valid OpenAI config', () => {
      const config: LLMConfig = {
        provider: 'openai',
        apiKey: 'sk-test123',
        model: 'gpt-4'
      };

      // Mock the provider's validateConfig method
      const mockValidateConfig = vi.fn().mockReturnValue(true);
      vi.mocked(OpenAIProvider).mockImplementation(() => ({
        validateConfig: mockValidateConfig
      } as any));

      const isValid = LLMProviderFactory.validateProviderConfig(config);
      
      expect(isValid).toBe(true);
      expect(mockValidateConfig).toHaveBeenCalledWith(config);
    });

    it('should invalidate config with validation failure', () => {
      const config: LLMConfig = {
        provider: 'openai',
        apiKey: 'invalid-key',
        model: 'gpt-4'
      };

      // Mock the provider's validateConfig method to return false
      const mockValidateConfig = vi.fn().mockReturnValue(false);
      vi.mocked(OpenAIProvider).mockImplementation(() => ({
        validateConfig: mockValidateConfig
      } as any));

      const isValid = LLMProviderFactory.validateProviderConfig(config);
      
      expect(isValid).toBe(false);
    });

    it('should return false for unknown provider', () => {
      const config = {
        provider: 'unknown',
        apiKey: 'test-key',
        model: 'test-model'
      } as any;

      const isValid = LLMProviderFactory.validateProviderConfig(config);
      
      expect(isValid).toBe(false);
    });

    it('should return false when provider creation throws', () => {
      const config: LLMConfig = {
        provider: 'openai',
        apiKey: 'sk-test123',
        model: 'gpt-4'
      };

      // Mock provider constructor to throw
      vi.mocked(OpenAIProvider).mockImplementation(() => {
        throw new Error('Provider creation failed');
      });

      const isValid = LLMProviderFactory.validateProviderConfig(config);
      
      expect(isValid).toBe(false);
    });

    it('should return false when validateConfig throws', () => {
      const config: LLMConfig = {
        provider: 'openai',
        apiKey: 'sk-test123',
        model: 'gpt-4'
      };

      // Mock the provider's validateConfig method to throw
      const mockValidateConfig = vi.fn().mockImplementation(() => {
        throw new Error('Validation failed');
      });
      vi.mocked(OpenAIProvider).mockImplementation(() => ({
        validateConfig: mockValidateConfig
      } as any));

      const isValid = LLMProviderFactory.validateProviderConfig(config);
      
      expect(isValid).toBe(false);
    });
  });
});