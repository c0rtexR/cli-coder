/**
 * @fileoverview Unit tests for Session type definitions
 */

import { describe, it, expect } from 'vitest';
import type { 
  ChatSession, 
  SessionMetadata, 
  SlashCommand 
} from '../../../src/types/session.types';
import type { ChatMessage, FileContext, AppConfig } from '../../../src/types';

describe('Session Types', () => {
  describe('ChatSession', () => {
    it('should validate ChatSession structure', () => {
      const session: ChatSession = {
        id: 'session-123',
        name: 'My Coding Session',
        messages: [
          {
            role: 'user',
            content: 'Hello',
            timestamp: new Date('2024-01-01T10:00:00Z')
          },
          {
            role: 'assistant',
            content: 'Hi there!',
            timestamp: new Date('2024-01-01T10:00:01Z')
          }
        ],
        context: [
          {
            path: '/project/main.ts',
            content: 'console.log("hello");',
            language: 'typescript',
            size: 21,
            lastModified: new Date('2024-01-01T09:59:00Z')
          }
        ],
        config: {
          llm: {
            provider: 'openai',
            apiKey: 'sk-override',
            model: 'gpt-4',
            temperature: 0.8
          }
        },
        createdAt: new Date('2024-01-01T09:58:00Z'),
        updatedAt: new Date('2024-01-01T10:00:01Z'),
        metadata: {
          projectPath: '/home/user/project',
          totalTokensUsed: 1500,
          filesModified: ['main.ts', 'config.json'],
          lastActivity: new Date('2024-01-01T10:00:01Z'),
          shellCommandsExecuted: 5
        }
      };

      expect(session.id).toBe('session-123');
      expect(session.name).toBe('My Coding Session');
      expect(Array.isArray(session.messages)).toBe(true);
      expect(session.messages).toHaveLength(2);
      expect(Array.isArray(session.context)).toBe(true);
      expect(session.context).toHaveLength(1);
      expect(typeof session.config).toBe('object');
      expect(session.createdAt).toBeInstanceOf(Date);
      expect(session.updatedAt).toBeInstanceOf(Date);
      expect(session.metadata).toBeDefined();
    });

    it('should allow optional name', () => {
      const session: ChatSession = {
        id: 'session-456',
        messages: [],
        context: [],
        config: {},
        createdAt: new Date(),
        updatedAt: new Date()
      };

      expect(session.name).toBeUndefined();
      expect(session.id).toBe('session-456');
    });

    it('should allow partial config overrides', () => {
      const session: ChatSession = {
        id: 'session-789',
        messages: [],
        context: [],
        config: {
          llm: {
            provider: 'anthropic',
            apiKey: 'override-key',
            model: 'claude-3'
          }
        },
        createdAt: new Date(),
        updatedAt: new Date()
      };

      expect(session.config.llm).toBeDefined();
      expect(session.config.llm!.provider).toBe('anthropic');
      expect(session.config.shell).toBeUndefined();
      expect(session.config.editor).toBeUndefined();
      expect(session.config.session).toBeUndefined();
    });

    it('should validate session timing constraints', () => {
      const createdAt = new Date('2024-01-01T10:00:00Z');
      const updatedAt = new Date('2024-01-01T10:30:00Z');
      
      const session: ChatSession = {
        id: 'timing-test',
        messages: [],
        context: [],
        config: {},
        createdAt,
        updatedAt
      };

      expect(session.updatedAt.getTime()).toBeGreaterThanOrEqual(session.createdAt.getTime());
    });

    it('should handle empty messages and context', () => {
      const session: ChatSession = {
        id: 'empty-session',
        messages: [],
        context: [],
        config: {},
        createdAt: new Date(),
        updatedAt: new Date()
      };

      expect(session.messages).toHaveLength(0);
      expect(session.context).toHaveLength(0);
    });

    it('should allow optional metadata', () => {
      const session: ChatSession = {
        id: 'no-metadata-session',
        messages: [],
        context: [],
        config: {},
        createdAt: new Date(),
        updatedAt: new Date()
      };

      expect(session.metadata).toBeUndefined();
    });
  });

  describe('SessionMetadata', () => {
    it('should validate SessionMetadata tracking fields', () => {
      const metadata: SessionMetadata = {
        projectPath: '/home/user/my-project',
        totalTokensUsed: 2500,
        filesModified: ['src/main.ts', 'package.json', 'README.md'],
        lastActivity: new Date('2024-01-01T15:30:00Z'),
        shellCommandsExecuted: 12
      };

      expect(metadata.projectPath).toBe('/home/user/my-project');
      expect(metadata.totalTokensUsed).toBe(2500);
      expect(Array.isArray(metadata.filesModified)).toBe(true);
      expect(metadata.filesModified).toHaveLength(3);
      expect(metadata.lastActivity).toBeInstanceOf(Date);
      expect(metadata.shellCommandsExecuted).toBe(12);
    });

    it('should allow optional projectPath', () => {
      const metadata: SessionMetadata = {
        totalTokensUsed: 100,
        filesModified: [],
        lastActivity: new Date(),
        shellCommandsExecuted: 0
      };

      expect(metadata.projectPath).toBeUndefined();
      expect(metadata.totalTokensUsed).toBe(100);
      expect(metadata.filesModified).toHaveLength(0);
      expect(metadata.shellCommandsExecuted).toBe(0);
    });

    it('should validate numeric fields are non-negative', () => {
      const metadata: SessionMetadata = {
        totalTokensUsed: 0,
        filesModified: [],
        lastActivity: new Date(),
        shellCommandsExecuted: 0
      };

      expect(metadata.totalTokensUsed).toBeGreaterThanOrEqual(0);
      expect(metadata.shellCommandsExecuted).toBeGreaterThanOrEqual(0);
    });

    it('should handle large token usage', () => {
      const metadata: SessionMetadata = {
        totalTokensUsed: 1000000,
        filesModified: Array.from({ length: 100 }, (_, i) => `file${i}.ts`),
        lastActivity: new Date(),
        shellCommandsExecuted: 500
      };

      expect(metadata.totalTokensUsed).toBe(1000000);
      expect(metadata.filesModified).toHaveLength(100);
      expect(metadata.shellCommandsExecuted).toBe(500);
    });

    it('should validate lastActivity is valid Date', () => {
      const metadata: SessionMetadata = {
        totalTokensUsed: 150,
        filesModified: ['test.ts'],
        lastActivity: new Date('2024-01-01T12:00:00Z'),
        shellCommandsExecuted: 1
      };

      expect(metadata.lastActivity).toBeInstanceOf(Date);
      expect(typeof metadata.lastActivity.getTime()).toBe('number');
      expect(isNaN(metadata.lastActivity.getTime())).toBe(false);
    });
  });

  describe('SlashCommand', () => {
    it('should validate SlashCommand interface', () => {
      const command: SlashCommand = {
        name: 'help',
        description: 'Show available commands',
        usage: '/help [command]',
        execute: async (args: string[], session: ChatSession) => {
          // Mock execution
          expect(Array.isArray(args)).toBe(true);
          expect(typeof session).toBe('object');
          expect(session.id).toBeDefined();
        }
      };

      expect(command.name).toBe('help');
      expect(command.description).toBe('Show available commands');
      expect(command.usage).toBe('/help [command]');
      expect(typeof command.execute).toBe('function');
    });

    it('should validate execute function signature', async () => {
      const command: SlashCommand = {
        name: 'test',
        description: 'Test command',
        usage: '/test',
        execute: async (args: string[], session: ChatSession): Promise<void> => {
          expect(args).toEqual(['arg1', 'arg2']);
          expect(session.id).toBe('test-session');
        }
      };

      const mockSession: ChatSession = {
        id: 'test-session',
        messages: [],
        context: [],
        config: {},
        createdAt: new Date(),
        updatedAt: new Date()
      };

      await command.execute(['arg1', 'arg2'], mockSession);
    });

    it('should validate command names without slash prefix', () => {
      const commands = ['help', 'clear', 'save', 'load', 'exit'];
      
      commands.forEach(cmdName => {
        const command: SlashCommand = {
          name: cmdName,
          description: `${cmdName} command`,
          usage: `/${cmdName}`,
          execute: async () => {}
        };
        
        expect(command.name).toBe(cmdName);
        expect(command.name.startsWith('/')).toBe(false);
      });
    });

    it('should handle commands with complex usage patterns', () => {
      const command: SlashCommand = {
        name: 'run',
        description: 'Execute a shell command',
        usage: '/run <command> [--confirm] [--timeout=30s]',
        execute: async (args: string[], session: ChatSession) => {
          // Complex command logic would go here
        }
      };

      expect(command.usage).toContain('<command>');
      expect(command.usage).toContain('[--confirm]');
      expect(command.usage).toContain('[--timeout=30s]');
    });

    it('should handle commands that modify session', async () => {
      const command: SlashCommand = {
        name: 'addfile',
        description: 'Add file to session context',
        usage: '/addfile <path>',
        execute: async (args: string[], session: ChatSession) => {
          expect(args).toHaveLength(1);
          expect(args[0]).toBe('/path/to/file.ts');
          
          // Verify we can access and modify session
          expect(Array.isArray(session.context)).toBe(true);
          expect(session.id).toBe('modify-session');
        }
      };

      const session: ChatSession = {
        id: 'modify-session',
        messages: [],
        context: [],
        config: {},
        createdAt: new Date(),
        updatedAt: new Date()
      };

      await command.execute(['/path/to/file.ts'], session);
    });
  });
});