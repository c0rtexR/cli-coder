import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { writeFileSync, unlinkSync, mkdirSync, rmSync } from 'fs';
import { join } from 'path';
import { execSync } from 'child_process';
import { ClipboardService } from '../../../src/integrations/clipboard/service';
import { FilePathUtils } from '../../../src/utils/filepath';
import type { ClipboardFileResult, PathValidationResult } from '../../../src/types';

// Integration test for clipboard and file system workflow
describe('Clipboard + File System Integration', () => {
  const testDir = join(process.cwd(), 'test-temp');
  const testFiles = {
    'test1.txt': 'Content of test file 1',
    'test2.js': 'console.log("test");',
    'subdir/test3.ts': 'export const test = "hello";',
  };
  let clipboardService: ClipboardService;
  const originalPlatform = process.platform;
  const originalCwd = process.cwd();

  beforeEach(() => {
    // Create test directory and files
    mkdirSync(testDir, { recursive: true });
    mkdirSync(join(testDir, 'subdir'), { recursive: true });
    
    Object.entries(testFiles).forEach(([path, content]) => {
      const fullPath = join(testDir, path);
      writeFileSync(fullPath, content);
    });

    // Change to test directory so relative paths work
    process.chdir(testDir);

    clipboardService = new ClipboardService();
    vi.clearAllMocks();
  });

  afterEach(() => {
    // Restore original working directory
    process.chdir(originalCwd);

    // Cleanup test directory
    try {
      rmSync(testDir, { recursive: true, force: true });
    } catch {
      // Ignore cleanup errors
    }

    // Restore original platform
    Object.defineProperty(process, 'platform', {
      value: originalPlatform,
      writable: true,
    });
  });

  describe('file path expansion and validation workflow', () => {
    it('should expand and validate file paths from various formats', () => {
      const testCases = [
        { input: './test1.txt', expectedValid: true },
        { input: './test2.js', expectedValid: true },
        { input: './nonexistent.txt', expectedValid: false },
        { input: './subdir', expectedValid: false }, // Directory, not file
      ];

      for (const testCase of testCases) {
        const expandedPath = FilePathUtils.expandPath(testCase.input);
        const validation = FilePathUtils.isValidPath(expandedPath);
        
        expect(validation.valid).toBe(testCase.expectedValid);
        
        if (testCase.expectedValid) {
          expect(validation.details?.exists).toBe(true);
          expect(validation.details?.isFile).toBe(true);
        } else {
          expect(validation.valid).toBe(false);
          expect(validation.error).toBeDefined();
        }
      }
    });

    it('should handle environment variable expansion in file paths', () => {
      const originalHome = process.env.HOME;
      const testHome = '/test/home';
      process.env.HOME = testHome;

      try {
        const expanded = FilePathUtils.expandPath('$HOME/documents/file.txt');
        expect(expanded).toBe('/test/home/documents/file.txt');

        const expandedBrace = FilePathUtils.expandPath('${HOME}/documents/file.txt');
        expect(expandedBrace).toBe('/test/home/documents/file.txt');
      } finally {
        process.env.HOME = originalHome;
      }
    });

    it('should get completions for existing directory', async () => {
      const completions = await FilePathUtils.getCompletions(testDir + '/test');
      
      expect(completions.length).toBeGreaterThan(0);
      expect(completions.some(c => c.includes('test1.txt'))).toBe(true);
      expect(completions.some(c => c.includes('test2.js'))).toBe(true);
    });

    it('should expand glob patterns correctly', async () => {
      const globPattern = join(testDir, '**/*.ts');
      const files = await FilePathUtils.expandGlob(globPattern);
      
      expect(files.length).toBe(1);
      expect(files[0]).toContain('test3.ts');
    });
  });

  describe('clipboard integration workflow', () => {
    it('should parse various file path formats from clipboard content', () => {
      const clipboardContent = [
        `file://${join(testDir, 'test1.txt')}`,
        `"${join(testDir, 'test2.js')}"`,
        join(testDir, 'subdir/test3.ts'),
        join(testDir, 'nonexistent.txt'), // This should be filtered out
      ].join('\n');

      const parsedPaths = clipboardService.parseFilePaths(clipboardContent);
      
      // Should filter out non-existent files
      expect(parsedPaths.length).toBe(3);
      expect(parsedPaths).toContain(join(testDir, 'test1.txt'));
      expect(parsedPaths).toContain(join(testDir, 'test2.js'));
      expect(parsedPaths).toContain(join(testDir, 'subdir/test3.ts'));
      expect(parsedPaths).not.toContain(join(testDir, 'nonexistent.txt'));
    });

    it('should handle mixed content with file paths and other text', () => {
      const clipboardContent = `
        Here are some files to check:
        ${join(testDir, 'test1.txt')}
        Some other text here
        file://${join(testDir, 'test2.js')}
        And more random content
        "${join(testDir, 'subdir/test3.ts')}"
      `;

      const parsedPaths = clipboardService.parseFilePaths(clipboardContent);
      
      expect(parsedPaths.length).toBe(3);
      expect(parsedPaths).toContain(join(testDir, 'test1.txt'));
      expect(parsedPaths).toContain(join(testDir, 'test2.js'));
      expect(parsedPaths).toContain(join(testDir, 'subdir/test3.ts'));
    });

    it('should handle empty clipboard content gracefully', () => {
      const parsedPaths = clipboardService.parseFilePaths('');
      expect(parsedPaths).toHaveLength(0);

      const parsedPaths2 = clipboardService.parseFilePaths('   \n  \n  ');
      expect(parsedPaths2).toHaveLength(0);
    });

    it('should handle clipboard content with no valid paths', () => {
      const clipboardContent = 'This is just some regular text without any file paths.';
      const parsedPaths = clipboardService.parseFilePaths(clipboardContent);
      expect(parsedPaths).toHaveLength(0);
    });
  });

  describe('cross-platform clipboard operations', () => {
    it('should handle macOS clipboard platform', () => {
      Object.defineProperty(process, 'platform', { value: 'darwin', writable: true });
      
      const commands = clipboardService.getPlatformCommands();
      expect(commands).not.toBeNull();
      expect(commands?.readCommand).toBe('pbpaste');
      expect(commands?.platform).toBe('darwin');
    });

    it('should handle Windows clipboard platform', () => {
      Object.defineProperty(process, 'platform', { value: 'win32', writable: true });
      
      const commands = clipboardService.getPlatformCommands();
      expect(commands).not.toBeNull();
      expect(commands?.readCommand).toBe('powershell.exe Get-Clipboard');
      expect(commands?.platform).toBe('win32');
    });

    it('should handle Linux clipboard platform with fallbacks', () => {
      Object.defineProperty(process, 'platform', { value: 'linux', writable: true });
      
      const commands = clipboardService.getPlatformCommands();
      expect(commands).not.toBeNull();
      expect(commands?.readCommand).toBe('xclip -selection clipboard -o');
      expect(commands?.fallbackCommands).toContain('xsel --clipboard --output');
      expect(commands?.platform).toBe('linux');
    });

    it('should detect platform support correctly', () => {
      expect(ClipboardService.isSupported()).toBe(true);
    });
  });

  describe('error handling and edge cases', () => {
    it('should handle file system permission errors gracefully', () => {
      const restrictedPath = '/root/restricted-file.txt'; // Likely to be restricted
      const validation = FilePathUtils.isValidPath(restrictedPath);
      
      expect(validation.valid).toBe(false);
      expect(validation.error).toBeDefined();
    });

    it('should handle malformed file URLs in clipboard', () => {
      const clipboardContent = [
        'file://invalid-url',
        'file:///valid/but/nonexistent/path.txt',
        join(testDir, 'test1.txt'), // Valid file
      ].join('\n');

      const parsedPaths = clipboardService.parseFilePaths(clipboardContent);
      
      // Should only return valid, existing files
      expect(parsedPaths.length).toBe(1);
      expect(parsedPaths[0]).toContain('test1.txt');
    });

    it('should handle very long file paths', () => {
      const longPath = join(testDir, 'a'.repeat(200) + '.txt');
      writeFileSync(longPath, 'content');

      try {
        const validation = FilePathUtils.isValidPath(longPath);
        expect(validation.valid).toBe(true);

        const expanded = FilePathUtils.expandPath(longPath);
        expect(expanded).toBe(longPath);
      } finally {
        unlinkSync(longPath);
      }
    });

    it('should handle special characters in file paths', () => {
      const specialPath = join(testDir, 'file with spaces & symbols!.txt');
      writeFileSync(specialPath, 'content');

      try {
        const validation = FilePathUtils.isValidPath(specialPath);
        expect(validation.valid).toBe(true);

        const clipboardContent = `"${specialPath}"`;
        const parsedPaths = clipboardService.parseFilePaths(clipboardContent);
        expect(parsedPaths).toContain(specialPath);
      } finally {
        unlinkSync(specialPath);
      }
    });
  });

  describe('detailed clipboard results workflow', () => {
    it('should provide detailed metadata for clipboard file results', async () => {
      // Create a mock clipboard service with validation disabled
      const mockClipboardService = new ClipboardService({ enableValidation: false });
      
      // Mock the readClipboard method to return our test content
      mockClipboardService.readClipboard = vi.fn().mockResolvedValue(
        [
          './test1.txt',
          './test2.js',
          './nonexistent.txt',
        ].join('\n')
      );

      const result = await mockClipboardService.getDetailedClipboardResult();
      
      expect(result.paths.length).toBe(3); // All paths, including non-existent
      expect(result.rawContent).toContain('test1.txt');
      expect(result.parsedAt).toBeInstanceOf(Date);

      // Check existing files have correct metadata
      const existingFile = result.paths.find(p => p.original.includes('test1.txt'));
      expect(existingFile?.exists).toBe(true);
      expect(existingFile?.isFile).toBe(true);
      expect(existingFile?.size).toBeGreaterThan(0);
      expect(existingFile?.lastModified).toBeInstanceOf(Date);

      // Check non-existing files are marked correctly
      const nonExistentFile = result.paths.find(p => p.original.includes('nonexistent.txt'));
      expect(nonExistentFile?.exists).toBe(false);
      expect(nonExistentFile?.isFile).toBe(false);
    });
  });

  describe('workspace file detection', () => {
    it('should detect common project files in test directory', () => {
      // Create some common project files
      const projectFiles = {
        'package.json': '{"name": "test"}',
        'tsconfig.json': '{"compilerOptions": {}}',
        'README.md': '# Test Project',
      };

      Object.entries(projectFiles).forEach(([file, content]) => {
        writeFileSync(join(testDir, file), content);
      });

      // Change to test directory to simulate workspace detection
      const originalCwd = process.cwd();
      process.chdir(testDir);

      try {
        const commonFiles = FilePathUtils.getCommonProjectFiles();
        
        expect(commonFiles.length).toBeGreaterThanOrEqual(3);
        expect(commonFiles).toContain('package.json');
        expect(commonFiles).toContain('tsconfig.json');
        expect(commonFiles).toContain('README.md');
      } finally {
        process.chdir(originalCwd);
        
        // Cleanup project files
        Object.keys(projectFiles).forEach(file => {
          try {
            unlinkSync(join(testDir, file));
          } catch {
            // Ignore cleanup errors
          }
        });
      }
    });
  });

  describe('file icon detection', () => {
    it('should return appropriate icons for different file types', () => {
      const iconTests = [
        { file: 'test.ts', expectedIcon: '📘' },
        { file: 'test.js', expectedIcon: '📄' },
        { file: 'package.json', expectedIcon: '📋' },
        { file: 'README.md', expectedIcon: '📝' },
        { file: 'unknown.xyz', expectedIcon: '📄' },
      ];

      for (const test of iconTests) {
        const icon = FilePathUtils.getFileIcon(test.file);
        expect(icon).toBe(test.expectedIcon);
      }
    });
  });
});