/**
 * @fileoverview Unit tests for LLM type definitions
 */

import { describe, it, expect } from 'vitest';
import type { 
  LLMProvider, 
  LLMConfig, 
  LLMResponse, 
  ChatMessage, 
  ChatContext 
} from '../../../src/types/llm.types';

describe('LLM Provider Types', () => {
  describe('LLMConfig', () => {
    it('should validate LLMConfig with OpenAI provider', () => {
      const config: LLMConfig = {
        provider: 'openai',
        apiKey: 'sk-test123',
        model: 'gpt-4',
        temperature: 0.7,
        maxTokens: 2000
      };

      expect(config.provider).toBe('openai');
      expect(config.apiKey).toBe('sk-test123');
      expect(config.model).toBe('gpt-4');
      expect(config.temperature).toBe(0.7);
      expect(config.maxTokens).toBe(2000);
    });

    it('should validate LLMConfig with Anthropic provider', () => {
      const config: LLMConfig = {
        provider: 'anthropic',
        apiKey: 'sk-ant-test123',
        model: 'claude-3-sonnet-20240229'
      };

      expect(config.provider).toBe('anthropic');
      expect(config.apiKey).toBe('sk-ant-test123');
      expect(config.model).toBe('claude-3-sonnet-20240229');
      expect(config.temperature).toBeUndefined();
      expect(config.maxTokens).toBeUndefined();
    });

    it('should validate LLMConfig with Gemini provider', () => {
      const config: LLMConfig = {
        provider: 'gemini',
        apiKey: 'AIzaSyTest123',
        model: 'gemini-pro',
        temperature: 0.5,
        maxTokens: 1000
      };

      expect(config.provider).toBe('gemini');
      expect(config.apiKey).toBe('AIzaSyTest123');
      expect(config.model).toBe('gemini-pro');
    });

    it('should require apiKey and model fields', () => {
      // This test verifies TypeScript compilation requires these fields
      const config: LLMConfig = {
        provider: 'openai',
        apiKey: 'required-key',
        model: 'required-model'
      };

      expect(config.apiKey).toBeDefined();
      expect(config.model).toBeDefined();
    });

    it('should validate temperature range constraints (logical test)', () => {
      // Test that temperature values are reasonable (business logic test)
      const validTemperatures = [0, 0.5, 1.0, 1.5, 2.0];
      
      validTemperatures.forEach(temp => {
        const config: LLMConfig = {
          provider: 'openai',
          apiKey: 'test',
          model: 'gpt-4',
          temperature: temp
        };
        
        expect(config.temperature).toBeGreaterThanOrEqual(0);
        expect(config.temperature).toBeLessThanOrEqual(2);
      });
    });
  });

  describe('ChatMessage', () => {
    it('should validate ChatMessage role enum', () => {
      const userMessage: ChatMessage = {
        role: 'user',
        content: 'Hello',
        timestamp: new Date('2024-01-01T10:00:00Z')
      };

      const assistantMessage: ChatMessage = {
        role: 'assistant',
        content: 'Hi there!',
        timestamp: new Date('2024-01-01T10:01:00Z')
      };

      const systemMessage: ChatMessage = {
        role: 'system',
        content: 'You are a helpful assistant',
        timestamp: new Date('2024-01-01T09:59:00Z')
      };

      expect(userMessage.role).toBe('user');
      expect(assistantMessage.role).toBe('assistant');
      expect(systemMessage.role).toBe('system');
      
      expect(userMessage.content).toBe('Hello');
      expect(assistantMessage.content).toBe('Hi there!');
      expect(systemMessage.content).toBe('You are a helpful assistant');
      
      expect(userMessage.timestamp).toBeInstanceOf(Date);
      expect(assistantMessage.timestamp).toBeInstanceOf(Date);
      expect(systemMessage.timestamp).toBeInstanceOf(Date);
    });

    it('should validate message timestamp is Date object', () => {
      const message: ChatMessage = {
        role: 'user',
        content: 'Test message',
        timestamp: new Date()
      };

      expect(message.timestamp).toBeInstanceOf(Date);
      expect(typeof message.timestamp.getTime()).toBe('number');
    });
  });

  describe('LLMResponse', () => {
    it('should validate LLMResponse usage structure', () => {
      const response: LLMResponse = {
        content: 'Generated response text',
        usage: {
          promptTokens: 50,
          completionTokens: 100,
          totalTokens: 150
        },
        model: 'gpt-4'
      };

      expect(response.content).toBe('Generated response text');
      expect(response.model).toBe('gpt-4');
      
      expect(response.usage.promptTokens).toBe(50);
      expect(response.usage.completionTokens).toBe(100);
      expect(response.usage.totalTokens).toBe(150);
      
      expect(typeof response.usage.promptTokens).toBe('number');
      expect(typeof response.usage.completionTokens).toBe('number');
      expect(typeof response.usage.totalTokens).toBe('number');
    });

    it('should validate token usage consistency', () => {
      const response: LLMResponse = {
        content: 'Test response',
        usage: {
          promptTokens: 25,
          completionTokens: 75,
          totalTokens: 100
        },
        model: 'claude-3-sonnet'
      };

      // Business logic test: total should equal prompt + completion
      expect(response.usage.totalTokens).toBe(
        response.usage.promptTokens + response.usage.completionTokens
      );
    });
  });

  describe('ChatContext', () => {
    it('should validate ChatContext structure', () => {
      const context: ChatContext = {
        messages: [
          {
            role: 'user',
            content: 'Hello',
            timestamp: new Date()
          },
          {
            role: 'assistant',
            content: 'Hi there!',
            timestamp: new Date()
          }
        ],
        files: [
          {
            path: '/path/to/file.ts',
            content: 'const x = 1;',
            language: 'typescript',
            size: 12,
            lastModified: new Date()
          }
        ],
        systemPrompt: 'You are a coding assistant'
      };

      expect(Array.isArray(context.messages)).toBe(true);
      expect(context.messages).toHaveLength(2);
      expect(Array.isArray(context.files)).toBe(true);
      expect(context.files).toHaveLength(1);
      expect(context.systemPrompt).toBe('You are a coding assistant');
    });

    it('should allow optional systemPrompt', () => {
      const context: ChatContext = {
        messages: [],
        files: []
      };

      expect(context.systemPrompt).toBeUndefined();
      expect(Array.isArray(context.messages)).toBe(true);
      expect(Array.isArray(context.files)).toBe(true);
    });
  });

  describe('LLMProvider', () => {
    it('should validate LLMProvider interface structure', () => {
      class MockLLMProvider implements LLMProvider {
        name = 'mock-provider';

        async generateResponse(prompt: string, context: ChatContext): Promise<LLMResponse> {
          return {
            content: `Mock response to: ${prompt}`,
            usage: {
              promptTokens: 10,
              completionTokens: 20,
              totalTokens: 30
            },
            model: 'mock-model'
          };
        }

        validateConfig(config: LLMConfig): boolean {
          return config.apiKey.length > 0 && config.model.length > 0;
        }
      }

      const provider = new MockLLMProvider();
      
      expect(provider.name).toBe('mock-provider');
      expect(typeof provider.generateResponse).toBe('function');
      expect(typeof provider.validateConfig).toBe('function');
    });

    it('should validate provider methods work correctly', async () => {
      class TestProvider implements LLMProvider {
        name = 'test-provider';

        async generateResponse(prompt: string, context: ChatContext): Promise<LLMResponse> {
          expect(typeof prompt).toBe('string');
          expect(typeof context).toBe('object');
          expect(Array.isArray(context.messages)).toBe(true);
          
          return {
            content: 'Test response',
            usage: {
              promptTokens: 5,
              completionTokens: 10,
              totalTokens: 15
            },
            model: 'test-model'
          };
        }

        validateConfig(config: LLMConfig): boolean {
          return config.provider === 'openai' && 
                 config.apiKey.startsWith('sk-') &&
                 config.model.length > 0;
        }
      }

      const provider = new TestProvider();
      const context: ChatContext = { messages: [], files: [] };
      
      const response = await provider.generateResponse('test prompt', context);
      expect(response.content).toBe('Test response');
      
      const isValid = provider.validateConfig({
        provider: 'openai',
        apiKey: 'sk-test123',
        model: 'gpt-4'
      });
      expect(isValid).toBe(true);
    });
  });
});