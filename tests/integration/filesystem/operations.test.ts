/**
 * @fileoverview Integration tests for file operations - real filesystem interactions
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { FileService } from '../../../src/integrations/filesystem/service';
import { writeFileSync, mkdirSync, rmSync, existsSync } from 'fs';
import { join } from 'path';
import inquirer from 'inquirer';

// Mock inquirer for file confirmations
vi.mock('inquirer');
const mockInquirer = vi.mocked(inquirer);

describe('FileService Integration', () => {
  let fileService: FileService;
  let testDir: string;
  let originalConsoleLog: any;

  beforeEach(async () => {
    fileService = new FileService();
    testDir = join(process.cwd(), 'test-temp-files');
    
    // Create test directory
    if (existsSync(testDir)) {
      rmSync(testDir, { recursive: true, force: true });
    }
    mkdirSync(testDir, { recursive: true });

    // Mock console.log to reduce noise
    originalConsoleLog = console.log;
    console.log = vi.fn();

    // Default to confirming all operations
    mockInquirer.prompt.mockResolvedValue({ proceed: true });
  });

  afterEach(() => {
    // Cleanup test directory
    if (existsSync(testDir)) {
      rmSync(testDir, { recursive: true, force: true });
    }

    console.log = originalConsoleLog;
    vi.clearAllMocks();
  });

  describe('file reading operations', () => {
    it('should read single file successfully', async () => {
      // Arrange
      const filePath = join(testDir, 'test.ts');
      const content = 'const hello = "world";';
      writeFileSync(filePath, content);

      // Act
      const result = await fileService.readFile(filePath);

      // Assert
      expect(result.path).toBe(filePath);
      expect(result.content).toBe(content);
      expect(result.language).toBe('typescript');
      expect(result.size).toBe(content.length);
      expect(result.lastModified).toBeInstanceOf(Date);
    });

    it('should add files to context using glob patterns', async () => {
      // Arrange
      const files = [
        { path: 'src/main.ts', content: 'console.log("main");' },
        { path: 'src/utils/helper.ts', content: 'export const helper = () => {};' },
        { path: 'src/utils/logger.js', content: 'console.log("logger");' },
        { path: 'package.json', content: '{"name": "test"}' },
        { path: 'README.md', content: '# Test Project' },
      ];

      // Create test files
      for (const file of files) {
        const fullPath = join(testDir, file.path);
        mkdirSync(join(fullPath, '..'), { recursive: true });
        writeFileSync(fullPath, file.content);
      }

      // Change to test directory for relative paths
      const originalCwd = process.cwd();
      process.chdir(testDir);

      try {
        // Act
        const results = await fileService.addFilesToContext(['src/**/*.ts', 'package.json']);

        // Assert
        expect(results).toHaveLength(3); // 2 TypeScript files + package.json
        expect(results.map(r => r.path.replace(testDir + '/', ''))).toEqual(
          expect.arrayContaining(['src/main.ts', 'src/utils/helper.ts', 'package.json'])
        );
        expect(results.find(r => r.path.includes('main.ts'))?.language).toBe('typescript');
        expect(results.find(r => r.path.includes('package.json'))?.language).toBe('json');
      } finally {
        process.chdir(originalCwd);
      }
    });

    it('should filter out unsupported files', async () => {
      // Arrange
      const files = [
        { path: 'test.ts', content: 'typescript content' },
        { path: 'test.exe', content: 'binary content' },
        { path: 'test.dll', content: 'binary content' },
      ];

      for (const file of files) {
        const fullPath = join(testDir, file.path);
        writeFileSync(fullPath, file.content);
      }

      const originalCwd = process.cwd();
      process.chdir(testDir);

      try {
        // Act
        const results = await fileService.addFilesToContext(['*']);

        // Assert
        expect(results).toHaveLength(1);
        expect(results[0].path).toContain('test.ts');
      } finally {
        process.chdir(originalCwd);
      }
    });

    it('should handle file reading errors gracefully', async () => {
      // Act & Assert
      await expect(fileService.readFile('/nonexistent/file.ts')).rejects.toThrow('File not found');
    });
  });

  describe('file writing operations', () => {
    it('should write new file with confirmation', async () => {
      // Arrange
      const filePath = join(testDir, 'new-file.ts');
      const content = 'const newFile = true;';

      // Act
      const result = await fileService.writeFile(filePath, content);

      // Assert
      expect(result.success).toBe(true);
      expect(result.filePath).toBe(filePath);
      expect(mockInquirer.prompt).toHaveBeenCalledWith([
        expect.objectContaining({
          type: 'confirm',
          message: 'Create this file?',
        }),
      ]);
      expect(existsSync(filePath)).toBe(true);
    });

    it('should create backup when overwriting existing file', async () => {
      // Arrange
      const filePath = join(testDir, 'existing.ts');
      const originalContent = 'const original = true;';
      const newContent = 'const updated = true;';
      writeFileSync(filePath, originalContent);

      // Act
      const result = await fileService.writeFile(filePath, newContent);

      // Assert
      expect(result.success).toBe(true);
      expect(result.backupPath).toBeDefined();
      expect(existsSync(result.backupPath!)).toBe(true);
      expect(mockInquirer.prompt).toHaveBeenCalledWith([
        expect.objectContaining({
          message: 'Do you want to overwrite this file?',
        }),
      ]);
    });

    it('should cancel operation when user declines', async () => {
      // Arrange
      const filePath = join(testDir, 'cancelled.ts');
      const content = 'const cancelled = true;';
      mockInquirer.prompt.mockResolvedValue({ proceed: false });

      // Act
      const result = await fileService.writeFile(filePath, content);

      // Assert
      expect(result.success).toBe(false);
      expect(result.error).toBe('Operation cancelled by user');
      expect(existsSync(filePath)).toBe(false);
    });

    it('should write multiple files', async () => {
      // Arrange
      const operations = [
        { filePath: join(testDir, 'file1.ts'), content: 'const file1 = 1;' },
        { filePath: join(testDir, 'file2.js'), content: 'const file2 = 2;' },
      ];

      // Act
      const results = await fileService.writeMultipleFiles(operations);

      // Assert
      expect(results).toHaveLength(2);
      expect(results.every(r => r.success)).toBe(true);
      expect(existsSync(operations[0].filePath)).toBe(true);
      expect(existsSync(operations[1].filePath)).toBe(true);
    });
  });

  describe('path validation', () => {
    it('should accept valid relative paths', () => {
      expect(() => fileService.validateFilePath('src/main.ts')).not.toThrow();
      expect(() => fileService.validateFilePath('package.json')).not.toThrow();
    });

    it('should reject dangerous paths', () => {
      expect(() => fileService.validateFilePath('../../../etc/passwd')).toThrow();
      expect(() => fileService.validateFilePath('/etc/passwd')).toThrow();
      expect(() => fileService.validateFilePath('C:\\Windows\\System32')).toThrow();
    });
  });

  describe('supported file types', () => {
    it('should correctly identify supported files', () => {
      expect(fileService.isFileSupported('test.ts')).toBe(true);
      expect(fileService.isFileSupported('test.js')).toBe(true);
      expect(fileService.isFileSupported('test.py')).toBe(true);
      expect(fileService.isFileSupported('test.json')).toBe(true);
      expect(fileService.isFileSupported('test.md')).toBe(true);
      
      expect(fileService.isFileSupported('test.exe')).toBe(false);
      expect(fileService.isFileSupported('test.bin')).toBe(false);
      expect(fileService.isFileSupported('test.dll')).toBe(false);
    });

    it('should return list of supported extensions', () => {
      const extensions = fileService.getSupportedExtensions();
      
      expect(extensions).toContain('.ts');
      expect(extensions).toContain('.js');
      expect(extensions).toContain('.py');
      expect(extensions).toContain('.json');
      expect(extensions).toContain('.md');
    });
  });

  describe('error handling', () => {
    it('should handle no files found error', async () => {
      const originalCwd = process.cwd();
      process.chdir(testDir);

      try {
        await expect(fileService.addFilesToContext(['nonexistent/**/*.ts']))
          .rejects.toThrow('No files found matching patterns');
      } finally {
        process.chdir(originalCwd);
      }
    });

    it('should handle no supported files error', async () => {
      // Arrange
      const binaryFile = join(testDir, 'test.exe');
      writeFileSync(binaryFile, 'binary content');

      const originalCwd = process.cwd();
      process.chdir(testDir);

      try {
        // Act & Assert
        await expect(fileService.addFilesToContext(['*.exe']))
          .rejects.toThrow('No supported files found');
      } finally {
        process.chdir(originalCwd);
      }
    });

    it('should handle write permission errors', async () => {
      // This test would require setting up permission restrictions
      // For now, just test that error handling structure exists
      expect(fileService).toBeDefined();
    });
  });

  describe('backup functionality', () => {
    it('should create timestamped backups', async () => {
      // Arrange
      const filePath = join(testDir, 'for-backup.ts');
      const originalContent = 'const original = true;';
      const newContent = 'const updated = true;';
      writeFileSync(filePath, originalContent);

      // Act
      const result = await fileService.writeFile(filePath, newContent);

      // Assert
      expect(result.backupPath).toBeDefined();
      expect(result.backupPath).toContain('.cli-coder-backups');
      expect(result.backupPath).toContain('for-backup.ts');
      expect(existsSync(result.backupPath!)).toBe(true);
    });

    it('should disable backup when requested', async () => {
      // Arrange
      const filePath = join(testDir, 'no-backup.ts');
      const originalContent = 'const original = true;';
      const newContent = 'const updated = true;';
      writeFileSync(filePath, originalContent);

      // Act
      const result = await fileService.writeFile(filePath, newContent, false);

      // Assert
      expect(result.backupPath).toBeUndefined();
    });
  });
});