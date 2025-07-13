/**
 * @fileoverview Unit tests for FileWriter - file writing functionality with backups and confirmations
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { writeFileSync, readFileSync, existsSync, mkdirSync, copyFileSync } from 'fs';
import { dirname, join, basename } from 'path';
import inquirer from 'inquirer';
import { FileWriter, WriteOperation } from '../../../../src/integrations/filesystem/writer';

// Mock dependencies
vi.mock('fs');
vi.mock('path');
vi.mock('inquirer');

const mockWriteFileSync = vi.mocked(writeFileSync);
const mockReadFileSync = vi.mocked(readFileSync);
const mockExistsSync = vi.mocked(existsSync);
const mockMkdirSync = vi.mocked(mkdirSync);
const mockCopyFileSync = vi.mocked(copyFileSync);
const mockDirname = vi.mocked(dirname);
const mockJoin = vi.mocked(join);
const mockBasename = vi.mocked(basename);
const mockInquirer = vi.mocked(inquirer);

describe('FileWriter', () => {
  let fileWriter: FileWriter;
  let originalConsoleLog: any;

  beforeEach(() => {
    fileWriter = new FileWriter();
    vi.clearAllMocks();
    
    // Mock console.log to avoid noise in tests
    originalConsoleLog = console.log;
    console.log = vi.fn();

    // Default mock implementations
    mockDirname.mockImplementation((path) => path.split('/').slice(0, -1).join('/'));
    mockJoin.mockImplementation((...parts) => parts.join('/'));
    mockBasename.mockImplementation((path) => path.split('/').pop() || '');
  });

  afterEach(() => {
    console.log = originalConsoleLog;
  });

  describe('writeFile', () => {
    const testOperation: WriteOperation = {
      filePath: 'test/file.ts',
      content: 'const test = "hello";',
      createBackup: true,
    };

    it('should write new file successfully with user confirmation', async () => {
      // Arrange
      mockExistsSync.mockImplementation((path) => {
        if (path === 'test/file.ts') return false; // File doesn't exist
        if (path === 'test') return true; // Directory exists
        return false;
      });
      mockInquirer.prompt.mockResolvedValue({ proceed: true });

      // Act
      const result = await fileWriter.writeFile(testOperation);

      // Assert
      expect(result.success).toBe(true);
      expect(result.filePath).toBe(testOperation.filePath);
      expect(mockWriteFileSync).toHaveBeenCalledWith(
        testOperation.filePath,
        testOperation.content,
        'utf-8'
      );
      expect(mockInquirer.prompt).toHaveBeenCalled();
    });

    it('should create directory if it does not exist', async () => {
      // Arrange
      mockExistsSync.mockImplementation((path) => {
        if (path === 'test/file.ts') return false; // File doesn't exist
        if (path === 'test') return false; // Directory doesn't exist
        return false;
      });
      mockInquirer.prompt.mockResolvedValue({ proceed: true });

      // Act
      await fileWriter.writeFile(testOperation);

      // Assert
      expect(mockMkdirSync).toHaveBeenCalledWith('test', { recursive: true });
    });

    it('should create backup when file exists and backup is requested', async () => {
      // Arrange
      const existingContent = 'old content';
      mockExistsSync.mockImplementation((path) => {
        if (path === 'test/file.ts') return true; // File exists
        if (path === 'test') return true; // Directory exists
        if (path === 'test/.cli-coder-backups') return true; // Backup dir exists
        return false;
      });
      mockReadFileSync.mockReturnValue(existingContent);
      mockInquirer.prompt.mockResolvedValue({ proceed: true });

      // Act
      const result = await fileWriter.writeFile(testOperation);

      // Assert
      expect(result.success).toBe(true);
      expect(result.backupPath).toBeDefined();
      expect(mockCopyFileSync).toHaveBeenCalled();
    });

    it('should not create backup when createBackup is false', async () => {
      // Arrange
      const operationWithoutBackup = { ...testOperation, createBackup: false };
      mockExistsSync.mockImplementation((path) => path === 'test/file.ts');
      mockReadFileSync.mockReturnValue('existing content');
      mockInquirer.prompt.mockResolvedValue({ proceed: true });

      // Act
      const result = await fileWriter.writeFile(operationWithoutBackup);

      // Assert
      expect(result.success).toBe(true);
      expect(result.backupPath).toBeUndefined();
      expect(mockCopyFileSync).not.toHaveBeenCalled();
    });

    it('should cancel operation when user declines confirmation', async () => {
      // Arrange
      mockExistsSync.mockReturnValue(false);
      mockInquirer.prompt.mockResolvedValue({ proceed: false });

      // Act
      const result = await fileWriter.writeFile(testOperation);

      // Assert
      expect(result.success).toBe(false);
      expect(result.error).toBe('Operation cancelled by user');
      expect(mockWriteFileSync).not.toHaveBeenCalled();
    });

    it('should handle write errors gracefully', async () => {
      // Arrange
      mockExistsSync.mockReturnValue(false);
      mockInquirer.prompt.mockResolvedValue({ proceed: true });
      mockWriteFileSync.mockImplementation(() => {
        throw new Error('Write permission denied');
      });

      // Act
      const result = await fileWriter.writeFile(testOperation);

      // Assert
      expect(result.success).toBe(false);
      expect(result.error).toBe('Write permission denied');
    });

    it('should show overwrite confirmation for existing files', async () => {
      // Arrange
      const existingContent = 'existing content';
      mockExistsSync.mockReturnValue(true);
      mockReadFileSync.mockReturnValue(existingContent);
      mockInquirer.prompt.mockResolvedValue({ proceed: true });

      // Act
      await fileWriter.writeFile(testOperation);

      // Assert
      expect(mockInquirer.prompt).toHaveBeenCalledWith([
        expect.objectContaining({
          type: 'confirm',
          message: 'Do you want to overwrite this file?',
          default: false,
        }),
      ]);
    });
  });

  describe('writeMultipleFiles', () => {
    const operations: WriteOperation[] = [
      { filePath: 'file1.ts', content: 'content1' },
      { filePath: 'file2.js', content: 'content2' },
    ];

    it('should write multiple files successfully', async () => {
      // Arrange
      mockExistsSync.mockReturnValue(false); // Files don't exist
      mockDirname.mockImplementation((path) => path.split('/').slice(0, -1).join('/') || '.');
      mockInquirer.prompt.mockResolvedValue({ proceed: true });

      // Act
      const results = await fileWriter.writeMultipleFiles(operations);

      // Assert
      expect(results).toHaveLength(2);
      expect(results[0].success).toBe(true);
      expect(results[1].success).toBe(true);
      expect(mockWriteFileSync).toHaveBeenCalledTimes(2);
    });

    it('should continue with other files when one fails', async () => {
      // Arrange
      mockExistsSync.mockReturnValue(false);
      mockInquirer.prompt.mockResolvedValue({ proceed: true });
      mockWriteFileSync.mockImplementation((path) => {
        if (path === 'file1.ts') {
          throw new Error('Failed to write file1');
        }
      });

      // Act
      const results = await fileWriter.writeMultipleFiles(operations);

      // Assert
      expect(results).toHaveLength(2);
      expect(results[0].success).toBe(false);
      expect(results[0].error).toBe('Failed to write file1');
      expect(results[1].success).toBe(true);
    });

    it('should show progress messages', async () => {
      // Arrange
      mockExistsSync.mockReturnValue(false);
      mockInquirer.prompt.mockResolvedValue({ proceed: true });

      // Act
      await fileWriter.writeMultipleFiles(operations);

      // Assert
      expect(console.log).toHaveBeenCalledWith(
        expect.stringContaining('Writing 2 files')
      );
    });
  });

  describe('backup creation', () => {
    it('should create backup directory if it does not exist', async () => {
      // Arrange
      const filePath = 'src/test.ts';
      mockExistsSync.mockImplementation((path) => {
        if (path === filePath) return true;
        if (path === 'src/.cli-coder-backups') return false;
        return false;
      });
      mockReadFileSync.mockReturnValue('existing content');
      mockInquirer.prompt.mockResolvedValue({ proceed: true });

      // Act
      await fileWriter.writeFile({
        filePath,
        content: 'new content',
        createBackup: true,
      });

      // Assert
      expect(mockMkdirSync).toHaveBeenCalledWith(
        'src/.cli-coder-backups',
        { recursive: true }
      );
    });

    it('should generate unique backup filenames with timestamp', async () => {
      // Arrange
      const filePath = 'test.ts';
      mockExistsSync.mockReturnValue(true);
      mockReadFileSync.mockReturnValue('existing content');
      mockInquirer.prompt.mockResolvedValue({ proceed: true });

      // Mock Date to ensure consistent timestamp
      const mockDate = new Date('2023-01-01T12:00:00.000Z');
      vi.spyOn(global, 'Date').mockImplementation(() => mockDate);

      // Act
      await fileWriter.writeFile({
        filePath,
        content: 'new content',
        createBackup: true,
      });

      // Assert
      expect(mockCopyFileSync).toHaveBeenCalledWith(
        'test.ts',
        expect.stringContaining('2023-01-01T12-00-00-000Z_test.ts')
      );
    });
  });

  describe('confirmation prompts', () => {
    it('should show content preview for new files', async () => {
      // Arrange
      const content = 'line1\nline2\nline3\nline4\nline5\nline6\nline7\nline8\nline9\nline10\nline11\nline12';
      mockExistsSync.mockReturnValue(false);
      mockInquirer.prompt.mockResolvedValue({ proceed: true });

      // Act
      await fileWriter.writeFile({
        filePath: 'new-file.ts',
        content,
        createBackup: false,
      });

      // Assert
      expect(console.log).toHaveBeenCalledWith(
        expect.stringContaining('Creating new file')
      );
      expect(console.log).toHaveBeenCalledWith(
        expect.stringContaining('Content preview')
      );
      expect(console.log).toHaveBeenCalledWith(
        expect.stringContaining('and 2 more lines')
      );
    });

    it('should show diff for file overwrites', async () => {
      // Arrange
      const oldContent = 'old line 1\nold line 2';
      const newContent = 'new line 1\nnew line 2';
      mockExistsSync.mockReturnValue(true);
      mockReadFileSync.mockReturnValue(oldContent);
      mockInquirer.prompt.mockResolvedValue({ proceed: true });

      // Act
      await fileWriter.writeFile({
        filePath: 'existing-file.ts',
        content: newContent,
        createBackup: false,
      });

      // Assert
      expect(console.log).toHaveBeenCalledWith(
        expect.stringContaining('File exists')
      );
      expect(console.log).toHaveBeenCalledWith(
        expect.stringContaining('Changes to be made')
      );
    });

    it('should handle confirmation prompt when file read fails', async () => {
      // Arrange
      mockExistsSync.mockReturnValue(true);
      mockReadFileSync.mockImplementation(() => {
        throw new Error('Permission denied');
      });
      mockInquirer.prompt.mockResolvedValue({ proceed: true });

      // Act
      const result = await fileWriter.writeFile({
        filePath: 'existing-file.ts',
        content: 'new content',
        createBackup: false,
      });

      // Assert
      expect(result.success).toBe(true);
      expect(mockInquirer.prompt).toHaveBeenCalledWith([
        expect.objectContaining({
          message: expect.stringContaining('Overwrite'),
        }),
      ]);
    });
  });
});