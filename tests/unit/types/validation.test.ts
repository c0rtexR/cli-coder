/**
 * @fileoverview Unit tests for type validation and constraints
 */

import { describe, it, expect } from 'vitest';
import type { 
  LLMConfig, 
  ChatMessage, 
  ShellCommand, 
  FileContext, 
  AppConfig 
} from '../../../src/types';

describe('Type Validation', () => {
  describe('LLMConfig', () => {
    it('should accept valid OpenAI configuration', () => {
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

    it('should accept valid Anthropic configuration', () => {
      const config: LLMConfig = {
        provider: 'anthropic',
        apiKey: 'sk-ant-test123',
        model: 'claude-3-sonnet-20240229'
      };
      
      expect(config.provider).toBe('anthropic');
      expect(config.apiKey).toBe('sk-ant-test123');
      expect(config.model).toBe('claude-3-sonnet-20240229');
    });

    it('should accept valid Gemini configuration', () => {
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

    it('should validate temperature range constraints', () => {
      // Test valid temperature values
      const validTemperatures = [0, 0.1, 0.5, 1.0, 1.5, 2.0];
      
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

    it('should validate maxTokens is positive', () => {
      const config: LLMConfig = {
        provider: 'openai',
        apiKey: 'test',
        model: 'gpt-4',
        maxTokens: 4000
      };
      
      expect(config.maxTokens).toBeGreaterThan(0);
    });

    it('should handle configuration without optional fields', () => {
      const config: LLMConfig = {
        provider: 'anthropic',
        apiKey: 'sk-ant-test',
        model: 'claude-3-haiku'
      };
      
      expect(config.temperature).toBeUndefined();
      expect(config.maxTokens).toBeUndefined();
    });
  });

  describe('ChatMessage', () => {
    it('should validate message roles', () => {
      const userMessage: ChatMessage = {
        role: 'user',
        content: 'Hello',
        timestamp: new Date()
      };
      
      const assistantMessage: ChatMessage = {
        role: 'assistant',
        content: 'Hi there!',
        timestamp: new Date()
      };
      
      const systemMessage: ChatMessage = {
        role: 'system',
        content: 'You are a helpful assistant',
        timestamp: new Date()
      };

      expect(userMessage.role).toBe('user');
      expect(assistantMessage.role).toBe('assistant');
      expect(systemMessage.role).toBe('system');
    });

    it('should validate message content is string', () => {
      const message: ChatMessage = {
        role: 'user',
        content: 'This is a test message with special chars: !@#$%^&*()',
        timestamp: new Date()
      };
      
      expect(typeof message.content).toBe('string');
      expect(message.content.length).toBeGreaterThan(0);
    });

    it('should validate timestamp is Date object', () => {
      const message: ChatMessage = {
        role: 'assistant',
        content: 'Response',
        timestamp: new Date('2024-01-01T12:00:00Z')
      };
      
      expect(message.timestamp).toBeInstanceOf(Date);
      expect(typeof message.timestamp.getTime()).toBe('number');
    });

    it('should handle empty content', () => {
      const message: ChatMessage = {
        role: 'user',
        content: '',
        timestamp: new Date()
      };
      
      expect(message.content).toBe('');
      expect(typeof message.content).toBe('string');
    });
  });

  describe('ShellCommand', () => {
    it('should validate command structure', () => {
      const command: ShellCommand = {
        command: 'ls',
        args: ['-la'],
        workingDirectory: '/tmp',
        timeout: 5000,
        requireConfirmation: true
      };
      
      expect(command.command).toBe('ls');
      expect(command.args).toEqual(['-la']);
      expect(command.workingDirectory).toBe('/tmp');
      expect(command.timeout).toBe(5000);
      expect(command.requireConfirmation).toBe(true);
    });

    it('should validate minimal command structure', () => {
      const command: ShellCommand = {
        command: 'pwd'
      };
      
      expect(command.command).toBe('pwd');
      expect(command.args).toBeUndefined();
      expect(command.workingDirectory).toBeUndefined();
      expect(command.timeout).toBeUndefined();
      expect(command.requireConfirmation).toBeUndefined();
    });

    it('should validate args array', () => {
      const command: ShellCommand = {
        command: 'git',
        args: ['status', '--porcelain']
      };
      
      expect(Array.isArray(command.args)).toBe(true);
      expect(command.args).toHaveLength(2);
      expect(command.args![0]).toBe('status');
      expect(command.args![1]).toBe('--porcelain');
    });

    it('should validate timeout is positive number', () => {
      const command: ShellCommand = {
        command: 'sleep',
        args: ['10'],
        timeout: 15000
      };
      
      expect(typeof command.timeout).toBe('number');
      expect(command.timeout).toBeGreaterThan(0);
    });

    it('should validate working directory path', () => {
      const command: ShellCommand = {
        command: 'npm',
        args: ['install'],
        workingDirectory: '/project/frontend'
      };
      
      expect(typeof command.workingDirectory).toBe('string');
      expect(command.workingDirectory!.length).toBeGreaterThan(0);
    });
  });

  describe('FileContext', () => {
    it('should validate file context structure', () => {
      const fileCtx: FileContext = {
        path: '/path/to/file.ts',
        content: 'console.log("hello");',
        language: 'typescript',
        size: 1024,
        lastModified: new Date()
      };
      
      expect(fileCtx.path).toBe('/path/to/file.ts');
      expect(fileCtx.content).toBe('console.log("hello");');
      expect(fileCtx.language).toBe('typescript');
      expect(fileCtx.size).toBe(1024);
      expect(fileCtx.lastModified).toBeInstanceOf(Date);
    });

    it('should validate file size is non-negative', () => {
      const emptyFile: FileContext = {
        path: '/empty.txt',
        content: '',
        language: 'text',
        size: 0,
        lastModified: new Date()
      };
      
      const largeFile: FileContext = {
        path: '/large.txt',
        content: 'x'.repeat(1000),
        language: 'text',
        size: 1000,
        lastModified: new Date()
      };
      
      expect(emptyFile.size).toBeGreaterThanOrEqual(0);
      expect(largeFile.size).toBeGreaterThan(0);
    });

    it('should validate programming language types', () => {
      const languages = [
        'javascript', 'typescript', 'python', 'rust', 
        'go', 'java', 'c', 'cpp', 'csharp', 'php'
      ];
      
      languages.forEach(lang => {
        const file: FileContext = {
          path: `/test.${lang}`,
          content: `// ${lang} code`,
          language: lang,
          size: 100,
          lastModified: new Date()
        };
        
        expect(file.language).toBe(lang);
      });
    });

    it('should validate content and size consistency', () => {
      const content = 'Hello, World!';
      const file: FileContext = {
        path: '/test.txt',
        content,
        language: 'text',
        size: content.length,
        lastModified: new Date()
      };
      
      expect(file.content.length).toBe(file.size);
    });

    it('should handle binary file representations', () => {
      const binaryFile: FileContext = {
        path: '/image.png',
        content: '[BINARY DATA]',
        language: 'binary',
        size: 2048,
        lastModified: new Date()
      };
      
      expect(binaryFile.language).toBe('binary');
      expect(binaryFile.size).toBeGreaterThan(binaryFile.content.length);
    });
  });

  describe('AppConfig', () => {
    it('should validate complete application configuration', () => {
      const config: AppConfig = {
        llm: {
          provider: 'openai',
          apiKey: 'sk-test',
          model: 'gpt-4'
        },
        shell: {
          allowDangerousCommands: false,
          defaultTimeout: 30000,
          confirmationRequired: true,
          historySize: 100
        },
        editor: {
          defaultEditor: 'code',
          tempDir: '/tmp'
        },
        session: {
          saveHistory: true,
          maxHistorySize: 1000,
          historyPath: '/home/.cli-coder/history'
        }
      };
      
      expect(config.llm.provider).toBe('openai');
      expect(config.shell.allowDangerousCommands).toBe(false);
      expect(config.editor.defaultEditor).toBe('code');
      expect(config.session.saveHistory).toBe(true);
    });

    it('should validate nested configuration objects', () => {
      const config: AppConfig = {
        llm: {
          provider: 'anthropic',
          apiKey: 'sk-ant-test',
          model: 'claude-3-sonnet'
        },
        shell: {
          allowDangerousCommands: true,
          defaultTimeout: 60000,
          confirmationRequired: false,
          historySize: 500
        },
        editor: {
          defaultEditor: 'vim',
          tempDir: '/var/tmp'
        },
        session: {
          saveHistory: false,
          maxHistorySize: 0,
          historyPath: ''
        }
      };
      
      // Verify each nested object is properly typed
      expect(typeof config.llm).toBe('object');
      expect(typeof config.shell).toBe('object');
      expect(typeof config.editor).toBe('object');
      expect(typeof config.session).toBe('object');
      
      // Verify specific field types
      expect(typeof config.shell.allowDangerousCommands).toBe('boolean');
      expect(typeof config.shell.defaultTimeout).toBe('number');
      expect(typeof config.session.saveHistory).toBe('boolean');
      expect(typeof config.session.maxHistorySize).toBe('number');
    });
  });
});