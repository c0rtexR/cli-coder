import { describe, it, expect, beforeEach } from 'vitest';
import { BaseLLMProvider } from '@/integrations/llm/base.provider';
import { LLMConfig, ChatContext } from '@/types';

// Mock implementation for testing
class MockLLMProvider extends BaseLLMProvider {
  get name(): string {
    return 'MockProvider';
  }

  async generateResponse(): Promise<any> {
    return {
      content: 'Mock response',
      usage: { promptTokens: 10, completionTokens: 20, totalTokens: 30 },
      model: 'mock-model'
    };
  }

  validateConfig(): boolean {
    return true;
  }
}

describe('BaseLLMProvider', () => {
  let provider: MockLLMProvider;
  let config: LLMConfig;

  beforeEach(() => {
    config = {
      provider: 'openai',
      apiKey: 'test-api-key',
      model: 'gpt-4',
      temperature: 0.7,
      maxTokens: 1000
    };
    provider = new MockLLMProvider(config);
  });

  describe('constructor', () => {
    it('should store config when instantiated', () => {
      expect(provider['config']).toEqual(config);
    });
  });

  describe('buildMessages', () => {
    it('should build messages without system prompt', () => {
      const prompt = 'Test prompt';
      const context: ChatContext = {
        messages: [
          { role: 'user', content: 'Previous message', timestamp: new Date() },
          { role: 'assistant', content: 'Previous response', timestamp: new Date() }
        ],
        files: []
      };

      const messages = provider['buildMessages'](prompt, context);

      expect(messages).toEqual([
        { role: 'user', content: 'Previous message' },
        { role: 'assistant', content: 'Previous response' },
        { role: 'user', content: 'Test prompt' }
      ]);
    });

    it('should build messages with system prompt', () => {
      const prompt = 'Test prompt';
      const context: ChatContext = {
        systemPrompt: 'You are a helpful assistant',
        messages: [],
        files: []
      };

      const messages = provider['buildMessages'](prompt, context);

      expect(messages).toEqual([
        { role: 'system', content: 'You are a helpful assistant' },
        { role: 'user', content: 'Test prompt' }
      ]);
    });

    it('should handle empty context', () => {
      const prompt = 'Test prompt';
      const context: ChatContext = {
        messages: [],
        files: []
      };

      const messages = provider['buildMessages'](prompt, context);

      expect(messages).toEqual([
        { role: 'user', content: 'Test prompt' }
      ]);
    });
  });

  describe('formatFileContext', () => {
    it('should return empty string when no files', () => {
      const context: ChatContext = {
        messages: [],
        files: []
      };

      const result = provider['formatFileContext'](context);
      expect(result).toBe('');
    });

    it('should format single file context', () => {
      const context: ChatContext = {
        messages: [],
        files: [
          {
            path: '/test/file.ts',
            content: 'export const test = "hello";',
            type: 'text'
          }
        ]
      };

      const result = provider['formatFileContext'](context);
      
      expect(result).toContain('--- File Context ---');
      expect(result).toContain('=== /test/file.ts ===');
      expect(result).toContain('export const test = "hello";');
    });

    it('should format multiple file contexts', () => {
      const context: ChatContext = {
        messages: [],
        files: [
          {
            path: '/test/file1.ts',
            content: 'const a = 1;',
            type: 'text'
          },
          {
            path: '/test/file2.ts',
            content: 'const b = 2;',
            type: 'text'
          }
        ]
      };

      const result = provider['formatFileContext'](context);
      
      expect(result).toContain('=== /test/file1.ts ===');
      expect(result).toContain('const a = 1;');
      expect(result).toContain('=== /test/file2.ts ===');
      expect(result).toContain('const b = 2;');
    });
  });

  describe('abstract methods', () => {
    it('should require implementation of name getter', () => {
      expect(provider.name).toBe('MockProvider');
    });

    it('should require implementation of generateResponse', async () => {
      const result = await provider.generateResponse('test', { messages: [], files: [] });
      expect(result).toBeDefined();
    });

    it('should require implementation of validateConfig', () => {
      const result = provider.validateConfig(config);
      expect(typeof result).toBe('boolean');
    });
  });
});