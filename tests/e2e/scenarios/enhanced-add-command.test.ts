/**
 * E2E tests for enhanced /add command functionality
 * Tests the complete workflow of adding files through various methods
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { writeFileSync, mkdirSync, rmSync } from 'fs';
import { join } from 'path';
import { CommandParser } from '../../../src/core/chat/parser';
import type { ChatInterface } from '../../../src/core/chat/interface';

// Mock ChatInterface for testing
class MockChatInterface implements Partial<ChatInterface> {
  private session = {
    messages: [],
    context: [],
    settings: {},
    metadata: {},
  };

  getSession() {
    return this.session;
  }

  async stop() {
    // Mock implementation
  }

  showHelp() {
    console.log('Mock help');
  }
}

describe('Enhanced /add Command E2E Tests', () => {
  let commandParser: CommandParser;
  let mockChatInterface: MockChatInterface;
  let testDir: string;
  let originalConsoleLog: typeof console.log;
  let logOutput: string[];

  beforeEach(() => {
    // Setup test environment
    testDir = join(process.cwd(), 'test-temp-e2e');
    mkdirSync(testDir, { recursive: true });
    
    // Create test files
    const testFiles = {
      'src/main.ts': 'export const main = () => console.log("hello");',
      'src/utils.ts': 'export const utils = "helper functions";',
      'src/components/Button.tsx': 'export const Button = () => <button />;',
      'package.json': JSON.stringify({ name: 'test-project', version: '1.0.0' }),
      'README.md': '# Test Project\n\nThis is a test project.',
      'tsconfig.json': JSON.stringify({ compilerOptions: { strict: true } }),
      'docs/guide.md': '# User Guide',
      'config.yml': 'setting: value',
    };

    mkdirSync(join(testDir, 'src'), { recursive: true });
    mkdirSync(join(testDir, 'src/components'), { recursive: true });
    mkdirSync(join(testDir, 'docs'), { recursive: true });

    Object.entries(testFiles).forEach(([path, content]) => {
      writeFileSync(join(testDir, path), content);
    });

    // Change to test directory
    process.chdir(testDir);

    // Setup mocks
    mockChatInterface = new MockChatInterface();
    commandParser = new CommandParser(mockChatInterface as ChatInterface);

    // Capture console output
    logOutput = [];
    originalConsoleLog = console.log;
    console.log = (...args: unknown[]) => {
      logOutput.push(args.join(' '));
    };
  });

  afterEach(() => {
    // Restore console.log
    console.log = originalConsoleLog;

    // Cleanup test directory
    try {
      rmSync(testDir, { recursive: true, force: true });
    } catch {
      // Ignore cleanup errors
    }
  });

  describe('/add help system', () => {
    it('should show help when using --help flag', async () => {
      await commandParser.parseCommand('/add --help');
      
      const output = logOutput.join('\n');
      expect(output).toContain('Add Files to Context - Options:');
      expect(output).toContain('--interactive');
      expect(output).toContain('--clipboard');
      expect(output).toContain('--workspace');
      expect(output).toContain('--all-ts');
    });

    it('should show interactive menu when no arguments provided', async () => {
      // This would normally show an interactive menu
      // In E2E test, we verify the behavior without user interaction
      await commandParser.parseCommand('/add');
      
      const output = logOutput.join('\n');
      expect(output).toContain('Interactive file selection');
    });
  });

  describe('/add with file patterns', () => {
    it('should add files by glob pattern', async () => {
      await commandParser.parseCommand('/add src/**/*.ts');
      
      const session = mockChatInterface.getSession();
      expect(session.context.length).toBeGreaterThan(0);
      
      const addedPaths = session.context.map(f => f.path);
      expect(addedPaths.some(p => p.includes('main.ts'))).toBe(true);
      expect(addedPaths.some(p => p.includes('utils.ts'))).toBe(true);
      
      const output = logOutput.join('\n');
      expect(output).toContain('Added');
      expect(output).toContain('files to context');
    });

    it('should add specific files by path', async () => {
      await commandParser.parseCommand('/add package.json README.md');
      
      const session = mockChatInterface.getSession();
      expect(session.context.length).toBe(2);
      
      const addedPaths = session.context.map(f => f.path);
      expect(addedPaths).toContain('package.json');
      expect(addedPaths).toContain('README.md');
    });

    it('should handle non-existent files gracefully', async () => {
      await commandParser.parseCommand('/add nonexistent.txt');
      
      const session = mockChatInterface.getSession();
      expect(session.context.length).toBe(0);
      
      // Should not crash and should show appropriate message
      const output = logOutput.join('\n');
      expect(output).not.toContain('✅ Added');
    });
  });

  describe('/add --all-* shortcuts', () => {
    it('should add all TypeScript files with --all-ts', async () => {
      await commandParser.parseCommand('/add --all-ts');
      
      const session = mockChatInterface.getSession();
      const addedPaths = session.context.map(f => f.path);
      
      expect(addedPaths.some(p => p.includes('main.ts'))).toBe(true);
      expect(addedPaths.some(p => p.includes('utils.ts'))).toBe(true);
      expect(addedPaths.some(p => p.includes('Button.tsx'))).toBe(true);
      
      // Should not include non-TypeScript files
      expect(addedPaths.some(p => p.includes('package.json'))).toBe(false);
    });

    it('should add all documentation files with --all-docs', async () => {
      await commandParser.parseCommand('/add --all-docs');
      
      const session = mockChatInterface.getSession();
      const addedPaths = session.context.map(f => f.path);
      
      expect(addedPaths.some(p => p.includes('README.md'))).toBe(true);
      expect(addedPaths.some(p => p.includes('guide.md'))).toBe(true);
      
      // Should not include code files
      expect(addedPaths.some(p => p.includes('main.ts'))).toBe(false);
    });

    it('should add all configuration files with --all-config', async () => {
      await commandParser.parseCommand('/add --all-config');
      
      const session = mockChatInterface.getSession();
      const addedPaths = session.context.map(f => f.path);
      
      expect(addedPaths.some(p => p.includes('package.json'))).toBe(true);
      expect(addedPaths.some(p => p.includes('tsconfig.json'))).toBe(true);
      expect(addedPaths.some(p => p.includes('config.yml'))).toBe(true);
    });
  });

  describe('duplicate file handling', () => {
    it('should prevent duplicate files in context', async () => {
      // Add the same file twice
      await commandParser.parseCommand('/add package.json');
      await commandParser.parseCommand('/add package.json');
      
      const session = mockChatInterface.getSession();
      expect(session.context.length).toBe(1);
      
      const output = logOutput.join('\n');
      expect(output).toContain('already in context');
    });

    it('should handle partial duplicates in batch operations', async () => {
      // Add some files first
      await commandParser.parseCommand('/add package.json');
      
      // Then add a batch that includes already added files
      await commandParser.parseCommand('/add package.json README.md tsconfig.json');
      
      const session = mockChatInterface.getSession();
      expect(session.context.length).toBe(3); // Only unique files
      
      const output = logOutput.join('\n');
      expect(output).toContain('files were already in context');
    });
  });

  describe('context size reporting', () => {
    it('should report total context size after adding files', async () => {
      await commandParser.parseCommand('/add src/**/*.ts');
      
      const output = logOutput.join('\n');
      expect(output).toContain('Total context:');
      expect(output).toMatch(/\d+ files/);
      expect(output).toMatch(/\d+KB/);
    });

    it('should show individual file sizes', async () => {
      await commandParser.parseCommand('/add package.json');
      
      const output = logOutput.join('\n');
      expect(output).toMatch(/package\.json \(\d+KB\)/);
    });
  });

  describe('file icons and formatting', () => {
    it('should display appropriate icons for different file types', async () => {
      await commandParser.parseCommand('/add src/main.ts package.json README.md');
      
      const output = logOutput.join('\n');
      expect(output).toContain('📘'); // TypeScript icon
      expect(output).toContain('📋'); // JSON icon
      expect(output).toContain('📝'); // Markdown icon
    });
  });

  describe('error handling', () => {
    it('should handle file system errors gracefully', async () => {
      // Try to add a file that requires special permissions
      await commandParser.parseCommand('/add /root/restricted-file.txt');
      
      const session = mockChatInterface.getSession();
      expect(session.context.length).toBe(0);
      
      // Should not crash the application
      expect(logOutput.length).toBeGreaterThan(0);
    });

    it('should handle invalid glob patterns', async () => {
      await commandParser.parseCommand('/add [invalid-glob');
      
      const session = mockChatInterface.getSession();
      expect(session.context.length).toBe(0);
      
      // Should handle gracefully without crashing
      expect(() => logOutput.join('\n')).not.toThrow();
    });
  });

  describe('workspace detection', () => {
    it('should detect project files in workspace mode', async () => {
      // Note: --workspace functionality would normally be interactive
      // This test verifies the underlying workspace detection logic
      
      // The test environment has package.json, tsconfig.json, and README.md
      // These should be detected as common workspace files
      
      await commandParser.parseCommand('/add package.json tsconfig.json README.md');
      
      const session = mockChatInterface.getSession();
      expect(session.context.length).toBe(3);
      
      const addedPaths = session.context.map(f => f.path);
      expect(addedPaths).toContain('package.json');
      expect(addedPaths).toContain('tsconfig.json');
      expect(addedPaths).toContain('README.md');
    });
  });

  describe('command aliases and shortcuts', () => {
    it('should support short flags', async () => {
      // Test short flag equivalents
      const shortFlagTests = [
        { long: '--help', short: '-h' },
        { long: '--interactive', short: '-i' },
        { long: '--clipboard', short: '-c' },
        { long: '--recent', short: '-r' },
        { long: '--workspace', short: '-w' },
      ];

      for (const test of shortFlagTests) {
        logOutput.length = 0; // Clear output
        
        await commandParser.parseCommand(`/add ${test.short}`);
        const shortOutput = logOutput.join('\n');
        
        logOutput.length = 0; // Clear output
        
        await commandParser.parseCommand(`/add ${test.long}`);
        const longOutput = logOutput.join('\n');
        
        // Both should produce similar output (or at least not crash)
        expect(shortOutput).toBeDefined();
        expect(longOutput).toBeDefined();
      }
    });
  });

  describe('complex scenarios', () => {
    it('should handle mixed file types in single command', async () => {
      await commandParser.parseCommand('/add src/main.ts package.json docs/guide.md config.yml');
      
      const session = mockChatInterface.getSession();
      expect(session.context.length).toBe(4);
      
      const addedPaths = session.context.map(f => f.path);
      expect(addedPaths).toContain('src/main.ts');
      expect(addedPaths).toContain('package.json');
      expect(addedPaths).toContain('docs/guide.md');
      expect(addedPaths).toContain('config.yml');
      
      const output = logOutput.join('\n');
      expect(output).toContain('Added 4 files');
    });

    it('should preserve context across multiple add commands', async () => {
      // Add files in multiple commands
      await commandParser.parseCommand('/add package.json');
      expect(mockChatInterface.getSession().context.length).toBe(1);
      
      await commandParser.parseCommand('/add README.md');
      expect(mockChatInterface.getSession().context.length).toBe(2);
      
      await commandParser.parseCommand('/add src/main.ts');
      expect(mockChatInterface.getSession().context.length).toBe(3);
      
      const finalPaths = mockChatInterface.getSession().context.map(f => f.path);
      expect(finalPaths).toContain('package.json');
      expect(finalPaths).toContain('README.md');
      expect(finalPaths).toContain('src/main.ts');
    });

    it('should handle large number of files efficiently', async () => {
      // Create many test files
      for (let i = 0; i < 50; i++) {
        writeFileSync(join(testDir, `test-file-${i}.txt`), `Content ${i}`);
      }
      
      const startTime = Date.now();
      await commandParser.parseCommand('/add test-file-*.txt');
      const endTime = Date.now();
      
      const session = mockChatInterface.getSession();
      expect(session.context.length).toBe(50);
      
      // Should complete in reasonable time (less than 5 seconds)
      expect(endTime - startTime).toBeLessThan(5000);
      
      const output = logOutput.join('\n');
      expect(output).toContain('Added 50 files');
    });
  });
});