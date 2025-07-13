/**
 * @fileoverview Unit tests for CommandParser - slash command parsing and execution
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { CommandParser } from '../../../../src/core/chat/parser';
import { ChatInterface } from '../../../../src/core/chat/interface';
import { ChatSession } from '../../../../src/types';

// Mock ChatInterface
vi.mock('../../../../src/core/chat/interface');
const MockedChatInterface = vi.mocked(ChatInterface);

describe('CommandParser', () => {
  let parser: CommandParser;
  let mockChatInterface: ReturnType<typeof vi.mocked<ChatInterface>>;
  let mockSession: ChatSession;

  beforeEach(() => {
    // Create mock session
    mockSession = {
      id: 'test-session',
      messages: [],
      context: [],
      config: {},
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    // Create mock chat interface
    mockChatInterface = {
      showHelp: vi.fn(),
      getSession: vi.fn().mockReturnValue(mockSession),
      stop: vi.fn().mockResolvedValue(undefined),
    } as any;

    parser = new CommandParser(mockChatInterface);
  });

  describe('parseCommand', () => {
    it('should handle help command', async () => {
      await parser.parseCommand('/help');
      
      expect(mockChatInterface.showHelp).toHaveBeenCalledOnce();
    });

    it('should handle clear command', async () => {
      // Add some messages to clear
      mockSession.messages = [
        { role: 'user', content: 'test', timestamp: new Date() },
        { role: 'assistant', content: 'response', timestamp: new Date() },
      ];

      await parser.parseCommand('/clear');
      
      expect(mockSession.messages).toHaveLength(0);
    });

    it('should handle context command with empty context', async () => {
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
      
      await parser.parseCommand('/context');
      
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('No files in context')
      );
      
      consoleSpy.mockRestore();
    });

    it('should handle context command with files', async () => {
      mockSession.context = [
        { path: '/path/to/file1.ts', content: 'content1' },
        { path: '/path/to/file2.js', content: 'content2' },
      ];

      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
      
      await parser.parseCommand('/context');
      
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('Files in Context (2)')
      );
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('file1.ts')
      );
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('file2.js')
      );
      
      consoleSpy.mockRestore();
    });

    it('should handle exit command', async () => {
      await parser.parseCommand('/exit');
      
      expect(mockChatInterface.stop).toHaveBeenCalledOnce();
    });

    it('should handle quit command (alias for exit)', async () => {
      await parser.parseCommand('/quit');
      
      expect(mockChatInterface.stop).toHaveBeenCalledOnce();
    });

    it('should handle unknown commands', async () => {
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
      
      await parser.parseCommand('/unknown');
      
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('Unknown command: /unknown')
      );
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('Type /help for available commands')
      );
      
      consoleSpy.mockRestore();
    });

    it('should handle commands with arguments', async () => {
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
      
      await parser.parseCommand('/unknown arg1 arg2');
      
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('Unknown command: /unknown')
      );
      
      consoleSpy.mockRestore();
    });

    it('should handle case insensitive commands', async () => {
      await parser.parseCommand('/HELP');
      expect(mockChatInterface.showHelp).toHaveBeenCalledOnce();

      await parser.parseCommand('/Clear');
      expect(mockSession.messages).toHaveLength(0);

      await parser.parseCommand('/EXIT');
      expect(mockChatInterface.stop).toHaveBeenCalledOnce();
    });

    it('should handle commands with leading/trailing spaces', async () => {
      await parser.parseCommand('/help ');
      expect(mockChatInterface.showHelp).toHaveBeenCalledOnce();
    });

    it('should handle empty command', async () => {
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
      
      await parser.parseCommand('/');
      
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('Unknown command: /')
      );
      
      consoleSpy.mockRestore();
    });
  });
});