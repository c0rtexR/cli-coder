/**
 * @fileoverview Unit tests for CommandParser - enhanced with file operations
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { CommandParser } from '../../../../src/core/chat/parser';
import { ChatInterface } from '../../../../src/core/chat/interface';
import { fileService } from '../../../../src/integrations/filesystem/service';
import { handleError } from '../../../../src/utils/errors';
import { ChatSession } from '../../../../src/types';

// Mock dependencies
vi.mock('../../../../src/integrations/filesystem/service');
vi.mock('../../../../src/utils/errors');
vi.mock('inquirer', () => ({
  default: {
    prompt: vi.fn().mockResolvedValue({ action: 'cancel' }),
  },
}));
vi.mock('chalk', () => ({
  default: {
    red: vi.fn((text) => text),
    green: vi.fn((text) => text),
    blue: vi.fn((text) => text),
    gray: vi.fn((text) => text),
    yellow: vi.fn((text) => text),
  },
}));

const mockFileService = vi.mocked(fileService);
const mockHandleError = vi.mocked(handleError);

describe('CommandParser', () => {
  let parser: CommandParser;
  let mockChatInterface: any;
  let mockSession: ChatSession;
  let originalConsoleLog: any;

  beforeEach(() => {
    // Mock session
    mockSession = {
      id: 'test-session',
      messages: [
        { role: 'user', content: 'Hello', timestamp: new Date() },
        { role: 'assistant', content: 'Hi there', timestamp: new Date() },
      ],
      context: [
        { path: 'existing.ts', content: 'code', language: 'typescript', size: 100, lastModified: new Date() },
      ],
      config: {},
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    // Mock chat interface
    mockChatInterface = {
      getSession: vi.fn().mockReturnValue(mockSession),
      showHelp: vi.fn(),
      stop: vi.fn(),
    };

    parser = new CommandParser(mockChatInterface);

    // Mock console.log
    originalConsoleLog = console.log;
    console.log = vi.fn();

    vi.clearAllMocks();
  });

  afterEach(() => {
    console.log = originalConsoleLog;
  });

  describe('parseCommand', () => {
    it('should handle help command', async () => {
      // Act
      await parser.parseCommand('/help');

      // Assert
      expect(mockChatInterface.showHelp).toHaveBeenCalled();
    });

    it('should handle clear command', async () => {
      // Act
      await parser.parseCommand('/clear');

      // Assert
      expect(mockSession.messages).toHaveLength(0);
      expect(console.log).toHaveBeenCalledWith(expect.stringContaining('Chat history cleared'));
    });

    it('should handle context command with files', async () => {
      // Act
      await parser.parseCommand('/context');

      // Assert
      expect(console.log).toHaveBeenCalledWith(expect.stringContaining('Files in Context (1)'));
      expect(console.log).toHaveBeenCalledWith(expect.stringContaining('existing.ts'));
      expect(console.log).toHaveBeenCalledWith(expect.stringContaining('typescript'));
    });

    it('should handle context command with no files', async () => {
      // Arrange
      mockSession.context = [];

      // Act
      await parser.parseCommand('/context');

      // Assert
      expect(console.log).toHaveBeenCalledWith('No files in context');
    });

    it('should handle exit command', async () => {
      // Act
      await parser.parseCommand('/exit');

      // Assert
      expect(mockChatInterface.stop).toHaveBeenCalled();
    });

    it('should handle quit command', async () => {
      // Act
      await parser.parseCommand('/quit');

      // Assert
      expect(mockChatInterface.stop).toHaveBeenCalled();
    });

    it('should handle unknown commands', async () => {
      // Act
      await parser.parseCommand('/unknown');

      // Assert
      expect(console.log).toHaveBeenCalledWith(expect.stringContaining('Unknown command: /unknown'));
      expect(console.log).toHaveBeenCalledWith(expect.stringContaining('Type /help for available commands'));
    });
  });

  describe('add command', () => {
    it('should show interactive file selection when no arguments provided', async () => {
      // Act
      await parser.parseCommand('/add');

      // Assert
      expect(console.log).toHaveBeenCalledWith(expect.stringContaining('Interactive file selection'));
    });

    it('should add files to context successfully', async () => {
      // Arrange
      const newFiles = [
        { path: 'src/main.ts', content: 'main content', language: 'typescript', size: 200, lastModified: new Date() },
        { path: 'src/helper.ts', content: 'helper content', language: 'typescript', size: 150, lastModified: new Date() },
      ];
      mockFileService.addFilesToContext.mockResolvedValue(newFiles);

      // Act
      await parser.parseCommand('/add src/**/*.ts');

      // Assert
      expect(mockFileService.addFilesToContext).toHaveBeenCalledWith(['src/**/*.ts']);
      expect(mockSession.context).toHaveLength(3); // 1 existing + 2 new
      expect(console.log).toHaveBeenCalledWith(expect.stringContaining('Added 2 files to context'));
      expect(console.log).toHaveBeenCalledWith(expect.stringContaining('src/main.ts'));
      expect(console.log).toHaveBeenCalledWith(expect.stringContaining('src/helper.ts'));
    });

    it('should handle multiple file patterns', async () => {
      // Arrange
      const newFiles = [
        { path: 'package.json', content: '{}', language: 'json', size: 50, lastModified: new Date() },
      ];
      mockFileService.addFilesToContext.mockResolvedValue(newFiles);

      // Act
      await parser.parseCommand('/add package.json README.md');

      // Assert
      expect(mockFileService.addFilesToContext).toHaveBeenCalledWith(['package.json', 'README.md']);
    });

    it('should skip duplicate files', async () => {
      // Arrange
      const duplicateFile = mockSession.context[0]; // existing.ts
      const newFiles = [duplicateFile]; // Same file returned by service
      mockFileService.addFilesToContext.mockResolvedValue(newFiles);

      // Act
      await parser.parseCommand('/add existing.ts');

      // Assert
      expect(console.log).toHaveBeenCalledWith('All files are already in context');
      expect(mockSession.context).toHaveLength(1); // No change
    });

    it('should handle mix of new and duplicate files', async () => {
      // Arrange
      const duplicateFile = mockSession.context[0];
      const newFile = { path: 'new.ts', content: 'new content', language: 'typescript', size: 100, lastModified: new Date() };
      const mixedFiles = [duplicateFile, newFile];
      mockFileService.addFilesToContext.mockResolvedValue(mixedFiles);

      // Act
      await parser.parseCommand('/add existing.ts new.ts');

      // Assert
      expect(mockSession.context).toHaveLength(2); // 1 existing + 1 new
      expect(console.log).toHaveBeenCalledWith(expect.stringContaining('Added 1 files to context'));
      expect(console.log).toHaveBeenCalledWith(expect.stringContaining('1 files were already in context'));
    });

    it('should handle file service errors', async () => {
      // Arrange
      const error = new Error('File not found');
      mockFileService.addFilesToContext.mockRejectedValue(error);

      // Act
      await parser.parseCommand('/add nonexistent.ts');

      // Assert
      expect(mockHandleError).toHaveBeenCalledWith(error);
    });
  });

  describe('remove command', () => {
    beforeEach(() => {
      // Add more files to context for testing removal
      mockSession.context.push(
        { path: 'file2.js', content: 'js code', language: 'javascript', size: 200, lastModified: new Date() },
        { path: 'file3.py', content: 'python code', language: 'python', size: 300, lastModified: new Date() }
      );
    });

    it('should show usage when no arguments provided', async () => {
      // Act
      await parser.parseCommand('/remove');

      // Assert
      expect(console.log).toHaveBeenCalledWith(expect.stringContaining('Usage: /remove <file-path>'));
      expect(console.log).toHaveBeenCalledWith(expect.stringContaining('Examples:'));
    });

    it('should remove specific file from context', async () => {
      // Act
      await parser.parseCommand('/remove existing.ts');

      // Assert
      expect(mockSession.context).toHaveLength(2);
      expect(mockSession.context.find(f => f.path === 'existing.ts')).toBeUndefined();
      expect(console.log).toHaveBeenCalledWith(expect.stringContaining('Removed: existing.ts'));
      expect(console.log).toHaveBeenCalledWith(expect.stringContaining('Removed 1 files from context'));
    });

    it('should remove multiple files from context', async () => {
      // Act
      await parser.parseCommand('/remove existing.ts file2.js');

      // Assert
      expect(mockSession.context).toHaveLength(1);
      expect(mockSession.context[0].path).toBe('file3.py');
      expect(console.log).toHaveBeenCalledWith(expect.stringContaining('Removed: existing.ts'));
      expect(console.log).toHaveBeenCalledWith(expect.stringContaining('Removed: file2.js'));
      expect(console.log).toHaveBeenCalledWith(expect.stringContaining('Removed 2 files from context'));
    });

    it('should handle files not in context', async () => {
      // Act
      await parser.parseCommand('/remove nonexistent.ts');

      // Assert
      expect(mockSession.context).toHaveLength(3); // No change
      expect(console.log).toHaveBeenCalledWith(expect.stringContaining('Not in context: nonexistent.ts'));
    });

    it('should remove all files when "all" is specified', async () => {
      // Act
      await parser.parseCommand('/remove all');

      // Assert
      expect(mockSession.context).toHaveLength(0);
      expect(console.log).toHaveBeenCalledWith(expect.stringContaining('Removed all 3 files from context'));
    });

    it('should handle mix of existing and non-existing files', async () => {
      // Act
      await parser.parseCommand('/remove existing.ts nonexistent.ts file2.js');

      // Assert
      expect(mockSession.context).toHaveLength(1);
      expect(mockSession.context[0].path).toBe('file3.py');
      expect(console.log).toHaveBeenCalledWith(expect.stringContaining('Removed: existing.ts'));
      expect(console.log).toHaveBeenCalledWith(expect.stringContaining('Not in context: nonexistent.ts'));
      expect(console.log).toHaveBeenCalledWith(expect.stringContaining('Removed: file2.js'));
      expect(console.log).toHaveBeenCalledWith(expect.stringContaining('Removed 2 files from context'));
    });
  });

  describe('command parsing', () => {
    it('should handle commands with different cases', async () => {
      // Act
      await parser.parseCommand('/HELP');
      await parser.parseCommand('/Clear');
      await parser.parseCommand('/EXIT');

      // Assert
      expect(mockChatInterface.showHelp).toHaveBeenCalled();
      expect(mockSession.messages).toHaveLength(0);
      expect(mockChatInterface.stop).toHaveBeenCalled();
    });

    it('should handle commands with extra spaces', async () => {
      // Act
      await parser.parseCommand('/help  ');
      await parser.parseCommand('/clear   ');

      // Assert
      expect(mockChatInterface.showHelp).toHaveBeenCalled();
      expect(mockSession.messages).toHaveLength(0);
    });

    it('should parse command arguments correctly', async () => {
      // Arrange
      const newFiles = [];
      mockFileService.addFilesToContext.mockResolvedValue(newFiles);

      // Act
      await parser.parseCommand('/add src/**/*.ts   package.json  README.md');

      // Assert
      expect(mockFileService.addFilesToContext).toHaveBeenCalledWith([
        'src/**/*.ts',
        'package.json',
        'README.md'
      ]);
    });

    it('should handle empty commands', async () => {
      // Act
      await parser.parseCommand('/');

      // Assert
      expect(console.log).toHaveBeenCalledWith(expect.stringContaining('Unknown command: /'));
    });
  });

  describe('context display', () => {
    it('should show file details in context', async () => {
      // Arrange
      mockSession.context = [
        { path: 'large.ts', content: 'content', language: 'typescript', size: 2048, lastModified: new Date() },
        { path: 'small.js', content: 'tiny', language: 'javascript', size: 512, lastModified: new Date() },
      ];

      // Act
      await parser.parseCommand('/context');

      // Assert
      expect(console.log).toHaveBeenCalledWith(expect.stringContaining('Files in Context (2)'));
      expect(console.log).toHaveBeenCalledWith(expect.stringContaining('large.ts (2KB, typescript)'));
      expect(console.log).toHaveBeenCalledWith(expect.stringContaining('small.js (1KB, javascript)'));
      expect(console.log).toHaveBeenCalledWith(expect.stringContaining('Total: 3KB'));
    });

    it('should handle zero-size files', async () => {
      // Arrange
      mockSession.context = [
        { path: 'empty.txt', content: '', language: 'text', size: 0, lastModified: new Date() },
      ];

      // Act
      await parser.parseCommand('/context');

      // Assert
      expect(console.log).toHaveBeenCalledWith(expect.stringContaining('empty.txt (0KB, text)'));
      expect(console.log).toHaveBeenCalledWith(expect.stringContaining('Total: 0KB'));
    });
  });
});