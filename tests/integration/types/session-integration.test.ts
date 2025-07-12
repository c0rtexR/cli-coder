/**
 * @fileoverview Integration tests for Session type compatibility with real session management
 */

import { describe, it, expect } from 'vitest';
import { writeFileSync, readFileSync, mkdirSync, rmSync } from 'fs';
import { join } from 'path';
import type { 
  ChatSession, 
  SessionMetadata, 
  SlashCommand 
} from '../../../src/types/session.types';
import type { ChatMessage, FileContext } from '../../../src/types';

describe('Session Integration Tests', () => {
  const testDir = join('/tmp', 'cli-coder-session-test');
  
  beforeEach(() => {
    // Clean up and create test directory
    try {
      rmSync(testDir, { recursive: true });
    } catch {
      // Directory doesn't exist, that's fine
    }
    mkdirSync(testDir, { recursive: true });
  });

  afterEach(() => {
    // Clean up test directory
    try {
      rmSync(testDir, { recursive: true });
    } catch {
      // Ignore cleanup errors
    }
  });

  describe('Session Creation and Management', () => {
    it('should create and manage real sessions', () => {
      const sessionId = `session-${Date.now()}`;
      const createdAt = new Date();
      
      const session: ChatSession = {
        id: sessionId,
        name: 'Test Integration Session',
        messages: [
          {
            role: 'system',
            content: 'You are a helpful coding assistant.',
            timestamp: createdAt
          },
          {
            role: 'user',
            content: 'Help me understand TypeScript interfaces.',
            timestamp: new Date(createdAt.getTime() + 1000)
          },
          {
            role: 'assistant',
            content: 'I\'d be happy to explain TypeScript interfaces!',
            timestamp: new Date(createdAt.getTime() + 2000)
          }
        ],
        context: [
          {
            path: join(testDir, 'example.ts'),
            content: 'interface User { id: number; name: string; }',
            language: 'typescript',
            size: 45,
            lastModified: createdAt
          }
        ],
        config: {
          llm: {
            provider: 'openai',
            apiKey: 'sk-test-integration',
            model: 'gpt-4',
            temperature: 0.7
          }
        },
        createdAt,
        updatedAt: new Date(createdAt.getTime() + 2000),
        metadata: {
          projectPath: testDir,
          totalTokensUsed: 150,
          filesModified: ['example.ts'],
          lastActivity: new Date(createdAt.getTime() + 2000),
          shellCommandsExecuted: 0
        }
      };

      // Validate session structure
      expect(session.id).toBe(sessionId);
      expect(session.name).toBe('Test Integration Session');
      expect(session.messages).toHaveLength(3);
      expect(session.context).toHaveLength(1);
      expect(session.metadata).toBeDefined();
      
      // Validate message ordering
      expect(session.messages[0].role).toBe('system');
      expect(session.messages[1].role).toBe('user');
      expect(session.messages[2].role).toBe('assistant');
      
      // Validate timestamps are in order
      expect(session.messages[1].timestamp.getTime()).toBeGreaterThan(
        session.messages[0].timestamp.getTime()
      );
      expect(session.messages[2].timestamp.getTime()).toBeGreaterThan(
        session.messages[1].timestamp.getTime()
      );
    });

    it('should handle session state transitions', () => {
      const baseTime = new Date('2024-01-01T10:00:00Z');
      
      // Initial session creation
      let session: ChatSession = {
        id: 'state-test-session',
        messages: [],
        context: [],
        config: {},
        createdAt: baseTime,
        updatedAt: baseTime,
        metadata: {
          totalTokensUsed: 0,
          filesModified: [],
          lastActivity: baseTime,
          shellCommandsExecuted: 0
        }
      };

      // Add user message
      const userMessage: ChatMessage = {
        role: 'user',
        content: 'Create a new TypeScript file',
        timestamp: new Date(baseTime.getTime() + 1000)
      };

      session = {
        ...session,
        messages: [...session.messages, userMessage],
        updatedAt: userMessage.timestamp,
        metadata: {
          ...session.metadata!,
          lastActivity: userMessage.timestamp
        }
      };

      expect(session.messages).toHaveLength(1);
      expect(session.updatedAt).toEqual(userMessage.timestamp);

      // Add file context
      const fileContext: FileContext = {
        path: '/project/new-file.ts',
        content: 'export interface Example {}',
        language: 'typescript',
        size: 26,
        lastModified: new Date(baseTime.getTime() + 2000)
      };

      session = {
        ...session,
        context: [...session.context, fileContext],
        updatedAt: fileContext.lastModified,
        metadata: {
          ...session.metadata!,
          filesModified: [...session.metadata!.filesModified, 'new-file.ts'],
          lastActivity: fileContext.lastModified
        }
      };

      expect(session.context).toHaveLength(1);
      expect(session.metadata!.filesModified).toContain('new-file.ts');

      // Add assistant response with token usage
      const assistantMessage: ChatMessage = {
        role: 'assistant',
        content: 'I\'ve created the TypeScript file for you.',
        timestamp: new Date(baseTime.getTime() + 3000)
      };

      session = {
        ...session,
        messages: [...session.messages, assistantMessage],
        updatedAt: assistantMessage.timestamp,
        metadata: {
          ...session.metadata!,
          totalTokensUsed: session.metadata!.totalTokensUsed + 50,
          lastActivity: assistantMessage.timestamp
        }
      };

      expect(session.messages).toHaveLength(2);
      expect(session.metadata!.totalTokensUsed).toBe(50);
    });

    it('should track metadata accurately', () => {
      const startTime = new Date();
      
      const metadata: SessionMetadata = {
        projectPath: '/home/user/my-project',
        totalTokensUsed: 0,
        filesModified: [],
        lastActivity: startTime,
        shellCommandsExecuted: 0
      };

      // Simulate development session activities
      const activities = [
        { type: 'file_edit', file: 'src/main.ts', tokens: 25 },
        { type: 'shell_command', command: 'npm test', tokens: 15 },
        { type: 'file_edit', file: 'package.json', tokens: 10 },
        { type: 'shell_command', command: 'git add .', tokens: 5 },
        { type: 'shell_command', command: 'git commit -m "Update"', tokens: 8 }
      ];

      activities.forEach((activity, index) => {
        const activityTime = new Date(startTime.getTime() + (index + 1) * 60000);
        
        if (activity.type === 'file_edit') {
          if (!metadata.filesModified.includes(activity.file)) {
            metadata.filesModified.push(activity.file);
          }
        } else if (activity.type === 'shell_command') {
          metadata.shellCommandsExecuted++;
        }
        
        metadata.totalTokensUsed += activity.tokens;
        metadata.lastActivity = activityTime;
      });

      expect(metadata.totalTokensUsed).toBe(63);
      expect(metadata.filesModified).toEqual(['src/main.ts', 'package.json']);
      expect(metadata.shellCommandsExecuted).toBe(3);
      expect(metadata.lastActivity.getTime()).toBeGreaterThan(startTime.getTime());
    });
  });

  describe('Session Persistence', () => {
    it('should handle session persistence', () => {
      const session: ChatSession = {
        id: 'persist-test',
        name: 'Persistence Test Session',
        messages: [
          {
            role: 'user',
            content: 'Test message',
            timestamp: new Date('2024-01-01T10:00:00Z')
          }
        ],
        context: [
          {
            path: '/test/file.ts',
            content: 'console.log("test");',
            language: 'typescript',
            size: 20,
            lastModified: new Date('2024-01-01T09:59:00Z')
          }
        ],
        config: {
          llm: {
            provider: 'anthropic',
            apiKey: 'sk-ant-test',
            model: 'claude-3-sonnet'
          }
        },
        createdAt: new Date('2024-01-01T09:58:00Z'),
        updatedAt: new Date('2024-01-01T10:00:00Z'),
        metadata: {
          totalTokensUsed: 100,
          filesModified: ['file.ts'],
          lastActivity: new Date('2024-01-01T10:00:00Z'),
          shellCommandsExecuted: 2
        }
      };

      // Save session to file
      const sessionPath = join(testDir, 'session.json');
      writeFileSync(sessionPath, JSON.stringify(session, null, 2));

      // Load session from file
      const rawSession = readFileSync(sessionPath, 'utf-8');
      const loadedSession = JSON.parse(rawSession);

      // Convert date strings back to Date objects
      const restoredSession: ChatSession = {
        ...loadedSession,
        createdAt: new Date(loadedSession.createdAt),
        updatedAt: new Date(loadedSession.updatedAt),
        messages: loadedSession.messages.map((msg: any) => ({
          ...msg,
          timestamp: new Date(msg.timestamp)
        })),
        context: loadedSession.context.map((file: any) => ({
          ...file,
          lastModified: new Date(file.lastModified)
        })),
        metadata: loadedSession.metadata ? {
          ...loadedSession.metadata,
          lastActivity: new Date(loadedSession.metadata.lastActivity)
        } : undefined
      };

      // Validate restored session
      expect(restoredSession.id).toBe(session.id);
      expect(restoredSession.name).toBe(session.name);
      expect(restoredSession.messages).toHaveLength(1);
      expect(restoredSession.messages[0].timestamp).toBeInstanceOf(Date);
      expect(restoredSession.context).toHaveLength(1);
      expect(restoredSession.context[0].lastModified).toBeInstanceOf(Date);
      expect(restoredSession.createdAt).toBeInstanceOf(Date);
      expect(restoredSession.updatedAt).toBeInstanceOf(Date);
    });

    it('should handle multiple session files', () => {
      const sessions: ChatSession[] = Array.from({ length: 5 }, (_, i) => ({
        id: `session-${i}`,
        name: `Session ${i}`,
        messages: [],
        context: [],
        config: {},
        createdAt: new Date(`2024-01-0${i + 1}T10:00:00Z`),
        updatedAt: new Date(`2024-01-0${i + 1}T10:30:00Z`)
      }));

      // Save all sessions
      sessions.forEach(session => {
        const sessionPath = join(testDir, `${session.id}.json`);
        writeFileSync(sessionPath, JSON.stringify(session, null, 2));
      });

      // Load and validate all sessions
      const loadedSessions = sessions.map(session => {
        const sessionPath = join(testDir, `${session.id}.json`);
        const rawSession = readFileSync(sessionPath, 'utf-8');
        return JSON.parse(rawSession);
      });

      expect(loadedSessions).toHaveLength(5);
      loadedSessions.forEach((session, i) => {
        expect(session.id).toBe(`session-${i}`);
        expect(session.name).toBe(`Session ${i}`);
      });
    });
  });

  describe('Slash Command Integration', () => {
    it('should implement functional slash commands', async () => {
      const helpCommand: SlashCommand = {
        name: 'help',
        description: 'Show available commands',
        usage: '/help [command]',
        execute: async (args: string[], session: ChatSession): Promise<void> => {
          // Mock help command implementation
          const helpMessage: ChatMessage = {
            role: 'assistant',
            content: args.length > 0 
              ? `Help for command: ${args[0]}`
              : 'Available commands: /help, /clear, /save',
            timestamp: new Date()
          };

          // Add help message to session (in real implementation)
          session.messages.push(helpMessage);
        }
      };

      const clearCommand: SlashCommand = {
        name: 'clear',
        description: 'Clear chat history',
        usage: '/clear',
        execute: async (args: string[], session: ChatSession): Promise<void> => {
          // Clear all messages except system messages
          session.messages = session.messages.filter(msg => msg.role === 'system');
          session.updatedAt = new Date();
        }
      };

      const saveCommand: SlashCommand = {
        name: 'save',
        description: 'Save current session',
        usage: '/save [name]',
        execute: async (args: string[], session: ChatSession): Promise<void> => {
          const sessionName = args[0] || `session-${Date.now()}`;
          session.name = sessionName;
          session.updatedAt = new Date();
          
          // In real implementation, would save to disk
          const sessionPath = join(testDir, `${sessionName}.json`);
          writeFileSync(sessionPath, JSON.stringify(session, null, 2));
        }
      };

      // Test session with messages
      const session: ChatSession = {
        id: 'slash-command-test',
        messages: [
          {
            role: 'system',
            content: 'System message',
            timestamp: new Date()
          },
          {
            role: 'user',
            content: 'User message',
            timestamp: new Date()
          }
        ],
        context: [],
        config: {},
        createdAt: new Date(),
        updatedAt: new Date()
      };

      // Test help command
      await helpCommand.execute([], session);
      expect(session.messages).toHaveLength(3);
      expect(session.messages[2].content).toContain('Available commands');

      await helpCommand.execute(['clear'], session);
      expect(session.messages).toHaveLength(4);
      expect(session.messages[3].content).toContain('Help for command: clear');

      // Test clear command
      await clearCommand.execute([], session);
      expect(session.messages).toHaveLength(1); // Only system message remains
      expect(session.messages[0].role).toBe('system');

      // Test save command
      await saveCommand.execute(['my-test-session'], session);
      expect(session.name).toBe('my-test-session');
      
      // Verify file was created
      const savedSessionPath = join(testDir, 'my-test-session.json');
      const savedSession = JSON.parse(readFileSync(savedSessionPath, 'utf-8'));
      expect(savedSession.name).toBe('my-test-session');
    });

    it('should handle command error scenarios', async () => {
      const errorCommand: SlashCommand = {
        name: 'error-test',
        description: 'Command that can fail',
        usage: '/error-test <action>',
        execute: async (args: string[], session: ChatSession): Promise<void> => {
          if (args.length === 0) {
            throw new Error('Action argument is required');
          }
          
          if (args[0] === 'fail') {
            throw new Error('Simulated command failure');
          }
          
          // Success case
          const successMessage: ChatMessage = {
            role: 'assistant',
            content: `Command executed successfully with action: ${args[0]}`,
            timestamp: new Date()
          };
          session.messages.push(successMessage);
        }
      };

      const session: ChatSession = {
        id: 'error-test-session',
        messages: [],
        context: [],
        config: {},
        createdAt: new Date(),
        updatedAt: new Date()
      };

      // Test missing argument error
      try {
        await errorCommand.execute([], session);
        expect(true).toBe(false); // Should not reach here
      } catch (error: any) {
        expect(error.message).toBe('Action argument is required');
      }

      // Test simulated failure
      try {
        await errorCommand.execute(['fail'], session);
        expect(true).toBe(false); // Should not reach here
      } catch (error: any) {
        expect(error.message).toBe('Simulated command failure');
      }

      // Test success case
      await errorCommand.execute(['success'], session);
      expect(session.messages).toHaveLength(1);
      expect(session.messages[0].content).toContain('executed successfully');
    });
  });

  describe('Session Context Management', () => {
    it('should manage file context efficiently', () => {
      const files: FileContext[] = [
        {
          path: '/project/src/main.ts',
          content: 'console.log("main");',
          language: 'typescript',
          size: 20,
          lastModified: new Date('2024-01-01T10:00:00Z')
        },
        {
          path: '/project/src/utils.ts',
          content: 'export const helper = () => {};',
          language: 'typescript',
          size: 30,
          lastModified: new Date('2024-01-01T10:01:00Z')
        },
        {
          path: '/project/package.json',
          content: '{"name": "test", "version": "1.0.0"}',
          language: 'json',
          size: 35,
          lastModified: new Date('2024-01-01T10:02:00Z')
        }
      ];

      const session: ChatSession = {
        id: 'context-test',
        messages: [],
        context: files,
        config: {},
        createdAt: new Date(),
        updatedAt: new Date()
      };

      // Test context operations
      expect(session.context).toHaveLength(3);
      
      // Find TypeScript files
      const tsFiles = session.context.filter(file => file.language === 'typescript');
      expect(tsFiles).toHaveLength(2);
      
      // Calculate total context size
      const totalSize = session.context.reduce((sum, file) => sum + file.size, 0);
      expect(totalSize).toBe(85);
      
      // Find most recently modified file
      const mostRecent = session.context.reduce((latest, file) => 
        file.lastModified > latest.lastModified ? file : latest
      );
      expect(mostRecent.path).toBe('/project/package.json');
      
      // Remove file from context
      session.context = session.context.filter(file => file.path !== '/project/src/utils.ts');
      expect(session.context).toHaveLength(2);
    });

    it('should handle large context efficiently', () => {
      // Create many file contexts
      const manyFiles: FileContext[] = Array.from({ length: 100 }, (_, i) => ({
        path: `/project/file${i}.ts`,
        content: `// File ${i}\nexport const value${i} = ${i};`,
        language: 'typescript',
        size: 50 + i,
        lastModified: new Date(`2024-01-01T${String(10 + Math.floor(i / 60)).padStart(2, '0')}:${String(i % 60).padStart(2, '0')}:00Z`)
      }));

      const session: ChatSession = {
        id: 'large-context-test',
        messages: [],
        context: manyFiles,
        config: {},
        createdAt: new Date(),
        updatedAt: new Date()
      };

      expect(session.context).toHaveLength(100);
      
      // Test context size management (might need truncation in real app)
      const maxContextSize = 50;
      if (session.context.length > maxContextSize) {
        // Keep most recently modified files
        session.context = session.context
          .sort((a, b) => b.lastModified.getTime() - a.lastModified.getTime())
          .slice(0, maxContextSize);
      }
      
      expect(session.context).toHaveLength(50);
      expect(session.context[0].path).toBe('/project/file99.ts'); // Most recent
    });
  });
});