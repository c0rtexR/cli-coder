/**
 * @fileoverview Unit tests for FileReader - file reading functionality with validation
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { existsSync, statSync, readFileSync } from 'fs';
import { FileReader } from '../../../../src/integrations/filesystem/reader';
import { CLIErrorClass } from '../../../../src/utils/errors';

// Mock filesystem
vi.mock('fs');
const mockExistsSync = vi.mocked(existsSync);
const mockStatSync = vi.mocked(statSync);
const mockReadFileSync = vi.mocked(readFileSync);

describe('FileReader', () => {
  let fileReader: FileReader;

  beforeEach(() => {
    fileReader = new FileReader();
    vi.clearAllMocks();
  });

  describe('readFile', () => {
    const testFilePath = 'test/file.ts';
    const testContent = 'console.log("test");';

    it('should successfully read a supported file', async () => {
      // Arrange
      const mockStats = {
        isFile: vi.fn().mockReturnValue(true),
        size: 1024,
        mtime: new Date('2023-01-01'),
      } as any;

      mockExistsSync.mockReturnValue(true);
      mockStatSync.mockReturnValue(mockStats);
      mockReadFileSync.mockReturnValue(testContent);

      // Act
      const result = await fileReader.readFile(testFilePath);

      // Assert
      expect(result).toEqual({
        path: testFilePath,
        content: testContent,
        language: 'typescript',
        size: 1024,
        lastModified: new Date('2023-01-01'),
      });
      expect(mockExistsSync).toHaveBeenCalledWith(testFilePath);
      expect(mockStatSync).toHaveBeenCalledWith(testFilePath);
      expect(mockReadFileSync).toHaveBeenCalledWith(testFilePath, 'utf-8');
    });

    it('should throw error when file does not exist', async () => {
      // Arrange
      mockExistsSync.mockReturnValue(false);

      // Act & Assert
      await expect(fileReader.readFile(testFilePath)).rejects.toThrow(
        CLIErrorClass
      );
      await expect(fileReader.readFile(testFilePath)).rejects.toThrow(
        'File not found'
      );
    });

    it('should throw error when path is not a file', async () => {
      // Arrange
      const mockStats = { isFile: vi.fn().mockReturnValue(false) } as any;
      mockExistsSync.mockReturnValue(true);
      mockStatSync.mockReturnValue(mockStats);

      // Act & Assert
      await expect(fileReader.readFile(testFilePath)).rejects.toThrow(
        'Path is not a file'
      );
    });

    it('should throw error when file is too large', async () => {
      // Arrange
      const mockStats = {
        isFile: vi.fn().mockReturnValue(true),
        size: 2 * 1024 * 1024, // 2MB
      } as any;
      mockExistsSync.mockReturnValue(true);
      mockStatSync.mockReturnValue(mockStats);

      // Act & Assert
      await expect(fileReader.readFile(testFilePath)).rejects.toThrow(
        'File too large'
      );
    });

    it('should throw error for unsupported file type', async () => {
      // Arrange
      const unsupportedFile = 'test/file.exe';
      const mockStats = {
        isFile: vi.fn().mockReturnValue(true),
        size: 1024,
      } as any;
      mockExistsSync.mockReturnValue(true);
      mockStatSync.mockReturnValue(mockStats);

      // Act & Assert
      await expect(fileReader.readFile(unsupportedFile)).rejects.toThrow(
        'Unsupported file type'
      );
    });

    it('should handle permission denied error', async () => {
      // Arrange
      const mockStats = {
        isFile: vi.fn().mockReturnValue(true),
        size: 1024,
        mtime: new Date(),
      } as any;
      const permissionError = new Error('Permission denied') as NodeJS.ErrnoException;
      permissionError.code = 'EACCES';

      mockExistsSync.mockReturnValue(true);
      mockStatSync.mockReturnValue(mockStats);
      mockReadFileSync.mockImplementation(() => {
        throw permissionError;
      });

      // Act & Assert
      await expect(fileReader.readFile(testFilePath)).rejects.toThrow(
        'Permission denied'
      );
    });

    it('should handle generic read error', async () => {
      // Arrange
      const mockStats = {
        isFile: vi.fn().mockReturnValue(true),
        size: 1024,
        mtime: new Date(),
      } as any;
      mockExistsSync.mockReturnValue(true);
      mockStatSync.mockReturnValue(mockStats);
      mockReadFileSync.mockImplementation(() => {
        throw new Error('Generic read error');
      });

      // Act & Assert
      await expect(fileReader.readFile(testFilePath)).rejects.toThrow(
        'Failed to read file'
      );
    });
  });

  describe('readMultipleFiles', () => {
    it('should read multiple files successfully', async () => {
      // Arrange
      const filePaths = ['file1.ts', 'file2.js'];
      const mockStats = {
        isFile: vi.fn().mockReturnValue(true),
        size: 1024,
        mtime: new Date('2023-01-01'),
      } as any;

      mockExistsSync.mockReturnValue(true);
      mockStatSync.mockReturnValue(mockStats);
      mockReadFileSync.mockImplementation((path) => `content of ${path}`);

      // Act
      const results = await fileReader.readMultipleFiles(filePaths);

      // Assert
      expect(results).toHaveLength(2);
      expect(results[0].path).toBe('file1.ts');
      expect(results[0].language).toBe('typescript');
      expect(results[1].path).toBe('file2.js');
      expect(results[1].language).toBe('javascript');
    });

    it('should continue reading other files when one fails', async () => {
      // Arrange
      const filePaths = ['file1.ts', 'nonexistent.js', 'file3.py'];
      const mockStats = {
        isFile: vi.fn().mockReturnValue(true),
        size: 1024,
        mtime: new Date('2023-01-01'),
      } as any;

      mockExistsSync.mockImplementation((path) => path !== 'nonexistent.js');
      mockStatSync.mockReturnValue(mockStats);
      mockReadFileSync.mockImplementation((path) => `content of ${path}`);

      // Act
      const results = await fileReader.readMultipleFiles(filePaths);

      // Assert
      expect(results).toHaveLength(2);
      expect(results[0].path).toBe('file1.ts');
      expect(results[1].path).toBe('file3.py');
    });

    it('should throw error when all files fail to read', async () => {
      // Arrange
      const filePaths = ['nonexistent1.ts', 'nonexistent2.js'];
      mockExistsSync.mockReturnValue(false);

      // Act & Assert
      await expect(fileReader.readMultipleFiles(filePaths)).rejects.toThrow(
        'Failed to read all files'
      );
    });
  });

  describe('language detection', () => {
    it('should detect language correctly for common extensions', async () => {
      // Test cases for language detection
      const testCases = [
        { file: 'test.js', expected: 'javascript' },
        { file: 'test.ts', expected: 'typescript' },
        { file: 'test.py', expected: 'python' },
        { file: 'test.java', expected: 'java' },
        { file: 'test.go', expected: 'go' },
        { file: 'test.rs', expected: 'rust' },
        { file: 'test.md', expected: 'markdown' },
        { file: 'test.json', expected: 'json' },
        { file: 'test.txt', expected: 'text' },
      ];

      const mockStats = {
        isFile: vi.fn().mockReturnValue(true),
        size: 1024,
        mtime: new Date(),
      } as any;

      for (const testCase of testCases) {
        // Arrange
        mockExistsSync.mockReturnValue(true);
        mockStatSync.mockReturnValue(mockStats);
        mockReadFileSync.mockReturnValue('test content');

        // Act
        const result = await fileReader.readFile(testCase.file);

        // Assert
        expect(result.language).toBe(testCase.expected);
      }
    });
  });

  describe('getSupportedExtensions', () => {
    it('should return array of supported extensions', () => {
      // Act
      const extensions = fileReader.getSupportedExtensions();

      // Assert
      expect(Array.isArray(extensions)).toBe(true);
      expect(extensions.length).toBeGreaterThan(0);
      expect(extensions).toContain('.ts');
      expect(extensions).toContain('.js');
      expect(extensions).toContain('.py');
      expect(extensions).toContain('.json');
    });

    it('should not modify the internal array', () => {
      // Act
      const extensions1 = fileReader.getSupportedExtensions();
      const extensions2 = fileReader.getSupportedExtensions();

      // Assert
      expect(extensions1).not.toBe(extensions2); // Different array instances
      expect(extensions1).toEqual(extensions2); // Same content
    });
  });
});