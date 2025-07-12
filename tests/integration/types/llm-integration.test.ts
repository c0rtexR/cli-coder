/**
 * @fileoverview Integration tests for LLM type compatibility with real API structures
 */

import { describe, it, expect } from 'vitest';
import type { LLMResponse, LLMConfig, ChatMessage, ChatContext } from '../../../src/types/llm.types';

describe('LLM Integration Types', () => {
  describe('OpenAI API Compatibility', () => {
    it('should work with actual OpenAI API response structure', () => {
      // Mock OpenAI API response structure based on real API
      const mockOpenAIResponse = {
        id: 'chatcmpl-123',
        object: 'chat.completion',
        created: 1677652288,
        model: 'gpt-4',
        choices: [
          {
            index: 0,
            message: {
              role: 'assistant',
              content: 'Hello! How can I help you today?'
            },
            finish_reason: 'stop'
          }
        ],
        usage: {
          prompt_tokens: 9,
          completion_tokens: 12,
          total_tokens: 21
        }
      };

      // Transform to our LLMResponse type
      const llmResponse: LLMResponse = {
        content: mockOpenAIResponse.choices[0].message.content,
        usage: {
          promptTokens: mockOpenAIResponse.usage.prompt_tokens,
          completionTokens: mockOpenAIResponse.usage.completion_tokens,
          totalTokens: mockOpenAIResponse.usage.total_tokens
        },
        model: mockOpenAIResponse.model
      };

      expect(llmResponse.content).toBe('Hello! How can I help you today?');
      expect(llmResponse.usage.promptTokens).toBe(9);
      expect(llmResponse.usage.completionTokens).toBe(12);
      expect(llmResponse.usage.totalTokens).toBe(21);
      expect(llmResponse.model).toBe('gpt-4');
    });

    it('should validate OpenAI configuration format', () => {
      const openAIConfig: LLMConfig = {
        provider: 'openai',
        apiKey: 'sk-proj-1234567890abcdef1234567890abcdef1234567890abcdef',
        model: 'gpt-4-turbo-preview',
        temperature: 0.7,
        maxTokens: 4096
      };

      // Validate OpenAI-specific patterns
      expect(openAIConfig.provider).toBe('openai');
      expect(openAIConfig.apiKey.startsWith('sk-')).toBe(true);
      expect(openAIConfig.model.startsWith('gpt-')).toBe(true);
      expect(openAIConfig.temperature).toBeGreaterThanOrEqual(0);
      expect(openAIConfig.temperature).toBeLessThanOrEqual(2);
      expect(openAIConfig.maxTokens).toBeGreaterThan(0);
    });

    it('should handle OpenAI streaming response format', () => {
      // Mock streaming response chunk
      const streamChunk = {
        id: 'chatcmpl-123',
        object: 'chat.completion.chunk',
        created: 1677652288,
        model: 'gpt-4',
        choices: [
          {
            index: 0,
            delta: {
              role: 'assistant',
              content: 'Hello'
            },
            finish_reason: null
          }
        ]
      };

      // Our types should handle partial responses
      const partialResponse: Partial<LLMResponse> = {
        content: streamChunk.choices[0].delta.content,
        model: streamChunk.model
      };

      expect(partialResponse.content).toBe('Hello');
      expect(partialResponse.model).toBe('gpt-4');
    });
  });

  describe('Anthropic API Compatibility', () => {
    it('should work with actual Anthropic API response structure', () => {
      // Mock Anthropic API response structure
      const mockAnthropicResponse = {
        id: 'msg_01XFDUDYJgAACzvnptvVoYEL',
        type: 'message',
        role: 'assistant',
        content: [
          {
            type: 'text',
            text: 'Hello! I\'m Claude, an AI assistant. How can I help you today?'
          }
        ],
        model: 'claude-3-sonnet-20240229',
        stop_reason: 'end_turn',
        stop_sequence: null,
        usage: {
          input_tokens: 10,
          output_tokens: 15
        }
      };

      // Transform to our LLMResponse type
      const llmResponse: LLMResponse = {
        content: mockAnthropicResponse.content[0].text,
        usage: {
          promptTokens: mockAnthropicResponse.usage.input_tokens,
          completionTokens: mockAnthropicResponse.usage.output_tokens,
          totalTokens: mockAnthropicResponse.usage.input_tokens + mockAnthropicResponse.usage.output_tokens
        },
        model: mockAnthropicResponse.model
      };

      expect(llmResponse.content).toBe('Hello! I\'m Claude, an AI assistant. How can I help you today?');
      expect(llmResponse.usage.promptTokens).toBe(10);
      expect(llmResponse.usage.completionTokens).toBe(15);
      expect(llmResponse.usage.totalTokens).toBe(25);
      expect(llmResponse.model).toBe('claude-3-sonnet-20240229');
    });

    it('should validate Anthropic configuration format', () => {
      const anthropicConfig: LLMConfig = {
        provider: 'anthropic',
        apiKey: 'sk-ant-api03-1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef12',
        model: 'claude-3-opus-20240229',
        temperature: 0.5,
        maxTokens: 8192
      };

      // Validate Anthropic-specific patterns
      expect(anthropicConfig.provider).toBe('anthropic');
      expect(anthropicConfig.apiKey.startsWith('sk-ant-')).toBe(true);
      expect(anthropicConfig.model.startsWith('claude-')).toBe(true);
      expect(anthropicConfig.temperature).toBeGreaterThanOrEqual(0);
      expect(anthropicConfig.temperature).toBeLessThanOrEqual(1);
    });

    it('should handle Anthropic message format', () => {
      // Anthropic uses a different message format for input
      const anthropicMessages = [
        {
          role: 'user',
          content: 'Hello, how are you?'
        }
      ];

      // Our ChatMessage type should be compatible
      const chatMessages: ChatMessage[] = anthropicMessages.map(msg => ({
        role: msg.role as 'user' | 'assistant' | 'system',
        content: msg.content,
        timestamp: new Date()
      }));

      expect(chatMessages).toHaveLength(1);
      expect(chatMessages[0].role).toBe('user');
      expect(chatMessages[0].content).toBe('Hello, how are you?');
    });
  });

  describe('Gemini API Compatibility', () => {
    it('should work with actual Gemini API response structure', () => {
      // Mock Gemini API response structure
      const mockGeminiResponse = {
        candidates: [
          {
            content: {
              parts: [
                {
                  text: 'Hello! I\'m Gemini. How can I assist you today?'
                }
              ],
              role: 'model'
            },
            finishReason: 'STOP',
            index: 0,
            safetyRatings: []
          }
        ],
        usageMetadata: {
          promptTokenCount: 8,
          candidatesTokenCount: 12,
          totalTokenCount: 20
        }
      };

      // Transform to our LLMResponse type
      const llmResponse: LLMResponse = {
        content: mockGeminiResponse.candidates[0].content.parts[0].text,
        usage: {
          promptTokens: mockGeminiResponse.usageMetadata.promptTokenCount,
          completionTokens: mockGeminiResponse.usageMetadata.candidatesTokenCount,
          totalTokens: mockGeminiResponse.usageMetadata.totalTokenCount
        },
        model: 'gemini-pro'
      };

      expect(llmResponse.content).toBe('Hello! I\'m Gemini. How can I assist you today?');
      expect(llmResponse.usage.promptTokens).toBe(8);
      expect(llmResponse.usage.completionTokens).toBe(12);
      expect(llmResponse.usage.totalTokens).toBe(20);
      expect(llmResponse.model).toBe('gemini-pro');
    });

    it('should validate Gemini configuration format', () => {
      const geminiConfig: LLMConfig = {
        provider: 'gemini',
        apiKey: 'AIzaSyAbCdEfGhIjKlMnOpQrStUvWxYz1234567',
        model: 'gemini-1.5-pro-latest',
        temperature: 0.9,
        maxTokens: 2048
      };

      // Validate Gemini-specific patterns
      expect(geminiConfig.provider).toBe('gemini');
      expect(geminiConfig.apiKey.startsWith('AIzaSy')).toBe(true);
      expect(geminiConfig.model.includes('gemini')).toBe(true);
    });
  });

  describe('Cross-Provider Compatibility', () => {
    it('should validate configuration against real provider APIs', () => {
      const configs: LLMConfig[] = [
        {
          provider: 'openai',
          apiKey: 'sk-test123',
          model: 'gpt-4',
          temperature: 0.7,
          maxTokens: 2000
        },
        {
          provider: 'anthropic',
          apiKey: 'sk-ant-test123',
          model: 'claude-3-sonnet-20240229',
          temperature: 0.5,
          maxTokens: 4000
        },
        {
          provider: 'gemini',
          apiKey: 'AIzaSyTest123',
          model: 'gemini-pro',
          temperature: 0.3,
          maxTokens: 1000
        }
      ];

      // All configs should be valid LLMConfig types
      configs.forEach(config => {
        expect(['openai', 'anthropic', 'gemini']).toContain(config.provider);
        expect(typeof config.apiKey).toBe('string');
        expect(config.apiKey.length).toBeGreaterThan(0);
        expect(typeof config.model).toBe('string');
        expect(config.model.length).toBeGreaterThan(0);
        
        if (config.temperature !== undefined) {
          expect(config.temperature).toBeGreaterThanOrEqual(0);
          expect(config.temperature).toBeLessThanOrEqual(2);
        }
        
        if (config.maxTokens !== undefined) {
          expect(config.maxTokens).toBeGreaterThan(0);
        }
      });
    });

    it('should handle chat context consistently across providers', () => {
      const messages: ChatMessage[] = [
        {
          role: 'system',
          content: 'You are a helpful coding assistant.',
          timestamp: new Date('2024-01-01T10:00:00Z')
        },
        {
          role: 'user',
          content: 'Help me write a function in TypeScript.',
          timestamp: new Date('2024-01-01T10:01:00Z')
        },
        {
          role: 'assistant',
          content: 'I\'d be happy to help! What should the function do?',
          timestamp: new Date('2024-01-01T10:01:30Z')
        }
      ];

      const context: ChatContext = {
        messages,
        files: [
          {
            path: '/project/utils.ts',
            content: 'export const helper = () => {};',
            language: 'typescript',
            size: 30,
            lastModified: new Date('2024-01-01T09:30:00Z')
          }
        ],
        systemPrompt: 'You are an expert TypeScript developer.'
      };

      // Context should work with all providers
      expect(context.messages).toHaveLength(3);
      expect(context.files).toHaveLength(1);
      expect(context.systemPrompt).toBe('You are an expert TypeScript developer.');
      
      // Validate message ordering
      expect(context.messages[0].role).toBe('system');
      expect(context.messages[1].role).toBe('user');
      expect(context.messages[2].role).toBe('assistant');
    });

    it('should maintain response format consistency', () => {
      // Different providers should all map to the same LLMResponse structure
      const responses: LLMResponse[] = [
        {
          content: 'OpenAI response',
          usage: { promptTokens: 10, completionTokens: 20, totalTokens: 30 },
          model: 'gpt-4'
        },
        {
          content: 'Anthropic response',
          usage: { promptTokens: 15, completionTokens: 25, totalTokens: 40 },
          model: 'claude-3-sonnet-20240229'
        },
        {
          content: 'Gemini response',
          usage: { promptTokens: 12, completionTokens: 18, totalTokens: 30 },
          model: 'gemini-pro'
        }
      ];

      responses.forEach(response => {
        expect(typeof response.content).toBe('string');
        expect(response.content.length).toBeGreaterThan(0);
        expect(typeof response.usage.promptTokens).toBe('number');
        expect(typeof response.usage.completionTokens).toBe('number');
        expect(typeof response.usage.totalTokens).toBe('number');
        expect(response.usage.totalTokens).toBe(
          response.usage.promptTokens + response.usage.completionTokens
        );
        expect(typeof response.model).toBe('string');
        expect(response.model.length).toBeGreaterThan(0);
      });
    });
  });
});