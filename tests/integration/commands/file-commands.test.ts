/**
 * @fileoverview Integration tests for file commands in chat interface
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { ChatInterface } from '../../../src/core/chat/interface';
import { CommandParser } from '../../../src/core/chat/parser';
import { fileService } from '../../../src/integrations/filesystem/service';
import { ChatSession, AppConfig } from '../../../src/types';
import { writeFileSync, mkdirSync, rmSync, existsSync } from 'fs';
import { join } from 'path';
import inquirer from 'inquirer';

// Mock dependencies
vi.mock('../../../src/integrations/llm');
vi.mock('inquirer');
vi.mock('ora', () => ({
  default: vi.fn(() => ({
    start: vi.fn().mockReturnThis(),
    stop: vi.fn(),
  })),
}));
vi.mock('chalk', () => ({
  default: Object.assign(
    (text: string) => text,
    {
      blue: Object.assign(vi.fn((text) => text), { bold: vi.fn((text) => text) }),
      gray: vi.fn((text) => text),
      cyan: vi.fn((text) => text),
      yellow: vi.fn((text) => text),
      red: vi.fn((text) => text),
      green: vi.fn((text) => text),
    }
  ),
}));

const mockInquirer = vi.mocked(inquirer);

describe('File Commands Integration', () => {
  let chatInterface: ChatInterface;
  let parser: CommandParser;
  let session: ChatSession;
  let config: AppConfig;
  let testDir: string;
  let originalConsoleLog: any;
  let originalCwd: string;

  beforeEach(async () => {
    // Setup test directory
    testDir = join(process.cwd(), 'test-integration-files');
    originalCwd = process.cwd();
    
    if (existsSync(testDir)) {
      rmSync(testDir, { recursive: true, force: true });
    }
    mkdirSync(testDir, { recursive: true });

    // Create test session and config
    session = {
      id: 'test-session',
      messages: [],
      context: [],
      config: {},
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    config = {
      llm: {
        provider: 'openai',
        apiKey: 'test-key',
        model: 'gpt-4',
      },
      shell: {
        allowDangerousCommands: false,
        defaultTimeout: 30000,
        confirmationRequired: true,
        historySize: 100,
      },
      editor: {
        defaultEditor: 'code',
        tempDir: '/tmp',
      },
      session: {
        saveHistory: true,
        maxHistorySize: 100,
      },
    };

    // Create chat interface and parser
    chatInterface = new ChatInterface(session, config);
    parser = new CommandParser(chatInterface);

    // Mock console and inquirer
    originalConsoleLog = console.log;
    console.log = vi.fn();
    mockInquirer.prompt.mockResolvedValue({ proceed: true });

    // Change to test directory for relative paths
    process.chdir(testDir);
  });

  afterEach(() => {
    // Cleanup
    process.chdir(originalCwd);
    if (existsSync(testDir)) {
      rmSync(testDir, { recursive: true, force: true });
    }
    console.log = originalConsoleLog;
    vi.clearAllMocks();
  });

  describe('add command integration', () => {
    it('should add files to chat context', async () => {
      // Arrange
      const files = [
        { path: 'src/main.ts', content: 'console.log("main");' },
        { path: 'src/utils.ts', content: 'export const utils = {};' },
        { path: 'package.json', content: '{"name": "test"}' },
      ];

      for (const file of files) {
        mkdirSync(join(file.path, '..'), { recursive: true });
        writeFileSync(file.path, file.content);
      }

      // Act
      await parser.parseCommand('/add src/**/*.ts');

      // Assert
      expect(session.context).toHaveLength(2);
      expect(session.context.map(f => f.path)).toEqual(
        expect.arrayContaining(['src/main.ts', 'src/utils.ts'])
      );
      expect(session.context[0].content).toBe('console.log("main");');
      expect(session.context[0].language).toBe('typescript');
    });

    it('should handle multiple patterns in single command', async () => {
      // Arrange
      const files = [
        { path: 'src/main.ts', content: 'typescript content' },
        { path: 'package.json', content: '{"name": "test"}' },
        { path: 'README.md', content: '# Test Project' },
      ];

      for (const file of files) {
        mkdirSync(join(file.path, '..'), { recursive: true });
        writeFileSync(file.path, file.content);
      }

      // Act
      await parser.parseCommand('/add src/**/*.ts package.json README.md');

      // Assert
      expect(session.context).toHaveLength(3);
      const paths = session.context.map(f => f.path);
      expect(paths).toContain('src/main.ts');
      expect(paths).toContain('package.json');
      expect(paths).toContain('README.md');
    });

    it('should avoid duplicate files', async () => {
      // Arrange
      const file = { path: 'test.ts', content: 'test content' };
      writeFileSync(file.path, file.content);

      // Act - add same file twice
      await parser.parseCommand('/add test.ts');
      await parser.parseCommand('/add test.ts');

      // Assert
      expect(session.context).toHaveLength(1);
      expect(console.log).toHaveBeenCalledWith('All files are already in context');
    });

    it('should show usage when no patterns provided', async () => {
      // Act
      await parser.parseCommand('/add');

      // Assert
      expect(console.log).toHaveBeenCalledWith(expect.stringContaining('Usage: /add <file-pattern>'));
      expect(console.log).toHaveBeenCalledWith(expect.stringContaining('Examples:'));
    });

    it('should handle file not found errors', async () => {
      // Act
      await parser.parseCommand('/add nonexistent/**/*.ts');

      // Assert
      expect(session.context).toHaveLength(0);
      // Should call handleError, which we can't directly test here but the command should not crash
    });
  });

  describe('remove command integration', () => {
    beforeEach(async () => {
      // Add some files to context first
      const files = [
        { path: 'file1.ts', content: 'content1' },
        { path: 'file2.js', content: 'content2' },
        { path: 'file3.py', content: 'content3' },
      ];

      for (const file of files) {
        writeFileSync(file.path, file.content);
      }

      await parser.parseCommand('/add *.ts *.js *.py');
    });

    it('should remove specific file from context', async () => {
      // Act
      await parser.parseCommand('/remove file1.ts');

      // Assert
      expect(session.context).toHaveLength(2);
      expect(session.context.find(f => f.path === 'file1.ts')).toBeUndefined();
      expect(console.log).toHaveBeenCalledWith(expect.stringContaining('Removed: file1.ts'));
    });

    it('should remove multiple files', async () => {
      // Act
      await parser.parseCommand('/remove file1.ts file2.js');

      // Assert
      expect(session.context).toHaveLength(1);
      expect(session.context[0].path).toBe('file3.py');
      expect(console.log).toHaveBeenCalledWith(expect.stringContaining('Removed: file1.ts'));
      expect(console.log).toHaveBeenCalledWith(expect.stringContaining('Removed: file2.js'));
    });

    it('should remove all files', async () => {
      // Act
      await parser.parseCommand('/remove all');

      // Assert
      expect(session.context).toHaveLength(0);
      expect(console.log).toHaveBeenCalledWith(expect.stringContaining('Removed all 3 files'));
    });

    it('should handle non-existent files gracefully', async () => {
      // Act
      await parser.parseCommand('/remove nonexistent.ts');

      // Assert
      expect(session.context).toHaveLength(3); // No change
      expect(console.log).toHaveBeenCalledWith(expect.stringContaining('Not in context: nonexistent.ts'));
    });

    it('should show usage when no arguments provided', async () => {
      // Act
      await parser.parseCommand('/remove');

      // Assert
      expect(console.log).toHaveBeenCalledWith(expect.stringContaining('Usage: /remove <file-path>'));
    });
  });

  describe('context command integration', () => {
    it('should show empty context message', async () => {
      // Act
      await parser.parseCommand('/context');

      // Assert
      expect(console.log).toHaveBeenCalledWith('No files in context');
    });

    it('should display files with details', async () => {
      // Arrange
      const files = [
        { path: 'large.ts', content: 'a'.repeat(2048) },
        { path: 'small.js', content: 'tiny' },
      ];

      for (const file of files) {
        writeFileSync(file.path, file.content);
      }

      await parser.parseCommand('/add *.ts *.js');

      // Act
      await parser.parseCommand('/context');

      // Assert
      expect(console.log).toHaveBeenCalledWith(expect.stringContaining('Files in Context (2)'));
      expect(console.log).toHaveBeenCalledWith(expect.stringContaining('large.ts (2KB, typescript)'));
      expect(console.log).toHaveBeenCalledWith(expect.stringContaining('small.js (0KB, javascript)'));
      expect(console.log).toHaveBeenCalledWith(expect.stringContaining('Total: 2KB'));
    });
  });

  describe('command chaining and workflows', () => {
    it('should support complete file management workflow', async () => {
      // Arrange
      const files = [
        { path: 'src/main.ts', content: 'main content' },
        { path: 'src/utils.ts', content: 'utils content' },
        { path: 'test/main.test.ts', content: 'test content' },
        { path: 'package.json', content: '{}' },
      ];

      for (const file of files) {
        mkdirSync(join(file.path, '..'), { recursive: true });
        writeFileSync(file.path, file.content);
      }

      // Act - Workflow: add files, check context, remove some, check again
      await parser.parseCommand('/add src/**/*.ts package.json');
      expect(session.context).toHaveLength(3);

      await parser.parseCommand('/context');
      expect(console.log).toHaveBeenCalledWith(expect.stringContaining('Files in Context (3)'));

      await parser.parseCommand('/remove package.json');
      expect(session.context).toHaveLength(2);

      await parser.parseCommand('/add test/**/*.ts');
      expect(session.context).toHaveLength(3);

      await parser.parseCommand('/remove all');
      expect(session.context).toHaveLength(0);

      // Assert
      expect(console.log).toHaveBeenCalledWith(expect.stringContaining('Removed all 3 files'));
    });

    it('should handle mixed success and failure scenarios', async () => {
      // Arrange
      writeFileSync('existing.ts', 'content');

      // Act - Add mix of existing and non-existing files
      await parser.parseCommand('/add existing.ts nonexistent.ts');

      // Should add the existing file and handle the error for non-existing
      expect(session.context).toHaveLength(1);
      expect(session.context[0].path).toBe('existing.ts');
    });
  });

  describe('file size and type handling', () => {
    it('should handle various file types correctly', async () => {
      // Arrange
      const files = [
        { path: 'script.js', content: 'console.log("js");' },
        { path: 'component.tsx', content: 'export const Component = () => {};' },
        { path: 'style.css', content: 'body { margin: 0; }' },
        { path: 'config.json', content: '{"key": "value"}' },
        { path: 'readme.md', content: '# Title' },
      ];

      for (const file of files) {
        writeFileSync(file.path, file.content);
      }

      // Act
      await parser.parseCommand('/add *');

      // Assert
      expect(session.context).toHaveLength(5);
      
      const languages = session.context.map(f => f.language);
      expect(languages).toContain('javascript');
      expect(languages).toContain('typescript');
      expect(languages).toContain('css');
      expect(languages).toContain('json');
      expect(languages).toContain('markdown');
    });

    it('should filter out binary and unsupported files', async () => {
      // Arrange
      const files = [
        { path: 'good.ts', content: 'typescript content' },
        { path: 'bad.exe', content: 'binary content' },
        { path: 'also-bad.dll', content: 'binary content' },
      ];

      for (const file of files) {
        writeFileSync(file.path, file.content);
      }

      // Act
      await parser.parseCommand('/add *');

      // Assert
      expect(session.context).toHaveLength(1);
      expect(session.context[0].path).toBe('good.ts');
    });
  });

  describe('error handling and recovery', () => {
    it('should handle permission errors gracefully', async () => {
      // Act - Try to add files from restricted directory
      await parser.parseCommand('/add /root/**/*');

      // Assert - Should not crash, error should be handled
      expect(session.context).toHaveLength(0);
    });

    it('should continue operation after partial failures', async () => {
      // Arrange
      writeFileSync('good.ts', 'good content');

      // Act - Mix of valid and invalid patterns
      await parser.parseCommand('/add good.ts');
      await parser.parseCommand('/add invalid-pattern[');

      // Assert - First command should succeed, second should fail gracefully
      expect(session.context).toHaveLength(1);
      expect(session.context[0].path).toBe('good.ts');
    });
  });
});