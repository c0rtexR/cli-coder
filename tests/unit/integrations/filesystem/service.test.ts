/**
 * @fileoverview Unit tests for FileService - main file operations service
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { glob } from 'glob';
import { FileService } from '../../../../src/integrations/filesystem/service';
import { FileReader } from '../../../../src/integrations/filesystem/reader';
import { FileWriter } from '../../../../src/integrations/filesystem/writer';
import { CLIErrorClass } from '../../../../src/utils/errors';

// Mock dependencies
vi.mock('glob');
vi.mock('../../../../src/integrations/filesystem/reader');
vi.mock('../../../../src/integrations/filesystem/writer');

const mockGlob = vi.mocked(glob);
const MockFileReader = vi.mocked(FileReader);
const MockFileWriter = vi.mocked(FileWriter);

describe('FileService', () => {
  let fileService: FileService;
  let mockReader: any;
  let mockWriter: any;

  beforeEach(() => {
    vi.clearAllMocks();
    
    // Create mock instances
    mockReader = {
      readMultipleFiles: vi.fn(),
      readFile: vi.fn(),
      getSupportedExtensions: vi.fn().mockReturnValue(['.ts', '.js', '.py', '.json', '.md']),
    };
    
    mockWriter = {
      writeFile: vi.fn(),
      writeMultipleFiles: vi.fn(),
    };

    // Mock constructors
    MockFileReader.mockImplementation(() => mockReader);
    MockFileWriter.mockImplementation(() => mockWriter);

    fileService = new FileService();
  });

  describe('addFilesToContext', () => {
    it('should expand glob patterns and read matching files', async () => {
      // Arrange
      const patterns = ['src/**/*.ts', 'package.json'];
      const globResults = ['src/main.ts', 'src/utils/helper.ts', 'package.json'];
      const mockFileContexts = [
        { path: 'src/main.ts', content: 'main content', language: 'typescript', size: 100, lastModified: new Date() },
        { path: 'src/utils/helper.ts', content: 'helper content', language: 'typescript', size: 150, lastModified: new Date() },
        { path: 'package.json', content: '{}', language: 'json', size: 50, lastModified: new Date() },
      ];

      mockGlob.mockResolvedValueOnce(['src/main.ts', 'src/utils/helper.ts']);
      mockGlob.mockResolvedValueOnce(['package.json']);
      mockReader.readMultipleFiles.mockResolvedValue(mockFileContexts);

      // Act
      const results = await fileService.addFilesToContext(patterns);

      // Assert
      expect(results).toEqual(mockFileContexts);
      expect(mockGlob).toHaveBeenCalledTimes(2);
      expect(mockGlob).toHaveBeenCalledWith('src/**/*.ts', {
        ignore: expect.arrayContaining(['**/node_modules/**', '**/.git/**']),
        nodir: true,
      });
      expect(mockGlob).toHaveBeenCalledWith('package.json', {
        ignore: expect.arrayContaining(['**/node_modules/**', '**/.git/**']),
        nodir: true,
      });
      expect(mockReader.readMultipleFiles).toHaveBeenCalledWith(globResults);
    });

    it('should remove duplicate files from multiple patterns', async () => {
      // Arrange
      const patterns = ['src/main.ts', 'src/**/*.ts'];
      mockGlob.mockResolvedValueOnce(['src/main.ts']);
      mockGlob.mockResolvedValueOnce(['src/main.ts', 'src/helper.ts']);
      mockReader.readMultipleFiles.mockResolvedValue([
        { path: 'src/main.ts', content: 'content', language: 'typescript', size: 100, lastModified: new Date() },
        { path: 'src/helper.ts', content: 'content', language: 'typescript', size: 100, lastModified: new Date() },
      ]);

      // Act
      const results = await fileService.addFilesToContext(patterns);

      // Assert
      expect(mockReader.readMultipleFiles).toHaveBeenCalledWith(['src/main.ts', 'src/helper.ts']);
      expect(results).toHaveLength(2);
    });

    it('should filter out unsupported file types', async () => {
      // Arrange
      const patterns = ['**/*'];
      const allFiles = ['file.ts', 'file.exe', 'file.py', 'file.bin'];
      mockGlob.mockResolvedValue(allFiles);
      mockReader.readMultipleFiles.mockResolvedValue([]);

      // Act
      await fileService.addFilesToContext(patterns);

      // Assert
      // Should only pass supported files to reader
      expect(mockReader.readMultipleFiles).toHaveBeenCalledWith(['file.ts', 'file.py']);
    });

    it('should throw error when no files found', async () => {
      // Arrange
      const patterns = ['nonexistent/**/*.ts'];
      mockGlob.mockResolvedValue([]);

      // Act & Assert
      await expect(fileService.addFilesToContext(patterns)).rejects.toThrow(
        'No files found matching patterns'
      );
    });

    it('should throw error when no supported files found', async () => {
      // Arrange
      const patterns = ['**/*.exe'];
      mockGlob.mockResolvedValue(['file.exe', 'another.bin']);

      // Act & Assert
      await expect(fileService.addFilesToContext(patterns)).rejects.toThrow(
        'No supported files found'
      );
    });

    it('should handle glob errors', async () => {
      // Arrange
      const patterns = ['[invalid'];
      mockGlob.mockRejectedValue(new Error('Invalid glob pattern'));

      // Act & Assert
      await expect(fileService.addFilesToContext(patterns)).rejects.toThrow(
        'Invalid pattern'
      );
    });

    it('should exclude common directories and files', async () => {
      // Arrange
      const patterns = ['**/*'];
      mockGlob.mockResolvedValue([]);

      // Act & Assert
      await expect(fileService.addFilesToContext(patterns)).rejects.toThrow('No files found matching patterns');
      
      expect(mockGlob).toHaveBeenCalledWith('**/*', {
        ignore: expect.arrayContaining([
          '**/node_modules/**',
          '**/.git/**',
          '**/dist/**',
          '**/build/**',
          '**/.next/**',
          '**/coverage/**',
          '**/.DS_Store',
          '**/*.log',
          '**/.env*',
          '**/.cli-coder-backups/**',
        ]),
        nodir: true,
      });
    });
  });

  describe('readFile', () => {
    it('should delegate to FileReader', async () => {
      // Arrange
      const filePath = 'test.ts';
      const mockFileContext = {
        path: filePath,
        content: 'test content',
        language: 'typescript',
        size: 100,
        lastModified: new Date(),
      };
      mockReader.readFile.mockResolvedValue(mockFileContext);

      // Act
      const result = await fileService.readFile(filePath);

      // Assert
      expect(result).toEqual(mockFileContext);
      expect(mockReader.readFile).toHaveBeenCalledWith(filePath);
    });
  });

  describe('writeFile', () => {
    it('should delegate to FileWriter with default backup', async () => {
      // Arrange
      const filePath = 'test.ts';
      const content = 'new content';
      const mockResult = { success: true, filePath };
      mockWriter.writeFile.mockResolvedValue(mockResult);

      // Act
      const result = await fileService.writeFile(filePath, content);

      // Assert
      expect(result).toEqual(mockResult);
      expect(mockWriter.writeFile).toHaveBeenCalledWith({
        filePath,
        content,
        createBackup: true,
      });
    });

    it('should allow disabling backup', async () => {
      // Arrange
      const filePath = 'test.ts';
      const content = 'new content';
      const mockResult = { success: true, filePath };
      mockWriter.writeFile.mockResolvedValue(mockResult);

      // Act
      const result = await fileService.writeFile(filePath, content, false);

      // Assert
      expect(mockWriter.writeFile).toHaveBeenCalledWith({
        filePath,
        content,
        createBackup: false,
      });
    });
  });

  describe('writeMultipleFiles', () => {
    it('should delegate to FileWriter', async () => {
      // Arrange
      const operations = [
        { filePath: 'file1.ts', content: 'content1' },
        { filePath: 'file2.js', content: 'content2' },
      ];
      const mockResults = [
        { success: true, filePath: 'file1.ts' },
        { success: true, filePath: 'file2.js' },
      ];
      mockWriter.writeMultipleFiles.mockResolvedValue(mockResults);

      // Act
      const results = await fileService.writeMultipleFiles(operations);

      // Assert
      expect(results).toEqual(mockResults);
      expect(mockWriter.writeMultipleFiles).toHaveBeenCalledWith(operations);
    });
  });

  describe('isFileSupported', () => {
    it('should return true for supported file extensions', () => {
      // Act & Assert
      expect(fileService.isFileSupported('test.ts')).toBe(true);
      expect(fileService.isFileSupported('test.js')).toBe(true);
      expect(fileService.isFileSupported('test.py')).toBe(true);
      expect(fileService.isFileSupported('test.json')).toBe(true);
    });

    it('should return false for unsupported file extensions', () => {
      // Act & Assert
      expect(fileService.isFileSupported('test.exe')).toBe(false);
      expect(fileService.isFileSupported('test.bin')).toBe(false);
      expect(fileService.isFileSupported('test.dll')).toBe(false);
    });

    it('should handle files without extensions', () => {
      // Act & Assert
      expect(fileService.isFileSupported('README')).toBe(false);
      expect(fileService.isFileSupported('Makefile')).toBe(false);
    });

    it('should be case insensitive', () => {
      // Act & Assert
      expect(fileService.isFileSupported('test.TS')).toBe(true);
      expect(fileService.isFileSupported('test.JS')).toBe(true);
      expect(fileService.isFileSupported('test.EXE')).toBe(false);
    });
  });

  describe('getSupportedExtensions', () => {
    it('should return supported extensions from FileReader', () => {
      // Act
      const extensions = fileService.getSupportedExtensions();

      // Assert
      expect(extensions).toEqual(['.ts', '.js', '.py', '.json', '.md']);
      expect(mockReader.getSupportedExtensions).toHaveBeenCalled();
    });
  });

  describe('validateFilePath', () => {
    it('should accept valid relative paths', () => {
      // Act & Assert
      expect(() => fileService.validateFilePath('src/main.ts')).not.toThrow();
      expect(() => fileService.validateFilePath('package.json')).not.toThrow();
      expect(() => fileService.validateFilePath('docs/readme.md')).not.toThrow();
    });

    it('should reject paths with directory traversal', () => {
      // Act & Assert
      expect(() => fileService.validateFilePath('../../../etc/passwd')).toThrow('File path validation failed');
      expect(() => fileService.validateFilePath('src/../../../secret')).toThrow('File path validation failed');
    });

    it('should reject absolute paths', () => {
      // Act & Assert
      expect(() => fileService.validateFilePath('/etc/passwd')).toThrow('File path validation failed');
      expect(() => fileService.validateFilePath('C:\\Windows\\System32')).toThrow('File path validation failed');
    });

    it('should reject Windows drive paths', () => {
      // Act & Assert
      expect(() => fileService.validateFilePath('C:\\file.txt')).toThrow('File path validation failed');
      expect(() => fileService.validateFilePath('D:\\folder\\file.js')).toThrow('File path validation failed');
    });
  });
});