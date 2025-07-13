import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { execSync } from 'child_process';
import { existsSync, statSync } from 'fs';
import { homedir } from 'os';
import { ClipboardService } from '../../../../src/integrations/clipboard/service';
import type { ClipboardFileResult, ClipboardError } from '../../../../src/types';

// Mock external dependencies
vi.mock('child_process');
vi.mock('fs');
vi.mock('os', () => ({
  homedir: vi.fn(),
}));

const mockExecSync = vi.mocked(execSync);
const mockExistsSync = vi.mocked(existsSync);
const mockStatSync = vi.mocked(statSync);
const mockHomedir = vi.mocked(homedir);

describe('ClipboardService', () => {
  let service: ClipboardService;
  const originalPlatform = process.platform;

  beforeEach(() => {
    service = new ClipboardService();
    vi.clearAllMocks();
  });

  afterEach(() => {
    // Restore original platform
    Object.defineProperty(process, 'platform', {
      value: originalPlatform,
      writable: true,
    });
  });

  describe('readClipboard', () => {
    it('should read clipboard on macOS using pbpaste', async () => {
      Object.defineProperty(process, 'platform', { value: 'darwin', writable: true });
      mockExecSync.mockReturnValue('test content');

      const result = await service.readClipboard();

      expect(result).toBe('test content');
      expect(mockExecSync).toHaveBeenCalledWith('pbpaste', { encoding: 'utf8', timeout: 5000 });
    });

    it('should read clipboard on Windows using PowerShell', async () => {
      Object.defineProperty(process, 'platform', { value: 'win32', writable: true });
      mockExecSync.mockReturnValue('test content');

      const result = await service.readClipboard();

      expect(result).toBe('test content');
      expect(mockExecSync).toHaveBeenCalledWith('powershell.exe Get-Clipboard', { encoding: 'utf8', timeout: 5000 });
    });

    it('should read clipboard on Linux using xclip', async () => {
      Object.defineProperty(process, 'platform', { value: 'linux', writable: true });
      mockExecSync.mockReturnValue('test content');

      const result = await service.readClipboard();

      expect(result).toBe('test content');
      expect(mockExecSync).toHaveBeenCalledWith('xclip -selection clipboard -o', { encoding: 'utf8', timeout: 5000 });
    });

    it('should fallback to xsel on Linux when xclip fails', async () => {
      Object.defineProperty(process, 'platform', { value: 'linux', writable: true });
      mockExecSync
        .mockImplementationOnce(() => {
          throw new Error('xclip not found');
        })
        .mockReturnValue('test content from xsel');

      const result = await service.readClipboard();

      expect(result).toBe('test content from xsel');
      expect(mockExecSync).toHaveBeenNthCalledWith(1, 'xclip -selection clipboard -o', { encoding: 'utf8', timeout: 5000 });
      expect(mockExecSync).toHaveBeenNthCalledWith(2, 'xsel --clipboard --output', { encoding: 'utf8', timeout: 5000 });
    });

    it('should throw error when clipboard command fails', async () => {
      Object.defineProperty(process, 'platform', { value: 'darwin', writable: true });
      mockExecSync.mockImplementation(() => {
        throw new Error('Command failed');
      });

      await expect(service.readClipboard()).rejects.toThrow('Failed to read clipboard: Command failed');
    });
  });

  describe('parseFilePaths', () => {
    beforeEach(() => {
      // Mock environment variables
      process.env.HOME = '/home/user';
      process.env.USERPROFILE = '/home/user';
    });

    it('should parse file:// URLs', () => {
      const content = 'file:///home/user/documents/test.txt';
      mockExistsSync.mockReturnValue(true);
      mockStatSync.mockReturnValue({ isFile: () => true } as any);

      const result = service.parseFilePaths(content);

      expect(result).toHaveLength(1);
      expect(result[0]).toBe('/home/user/documents/test.txt');
    });

    it('should parse quoted paths', () => {
      const content = '"/home/user/documents/test file.txt"';
      mockExistsSync.mockReturnValue(true);
      mockStatSync.mockReturnValue({ isFile: () => true } as any);

      const result = service.parseFilePaths(content);

      expect(result).toHaveLength(1);
      expect(result[0]).toContain('test file.txt');
    });

    it('should parse absolute Unix paths', () => {
      const content = '/home/user/documents/test.txt';
      mockExistsSync.mockReturnValue(true);
      mockStatSync.mockReturnValue({ isFile: () => true } as any);

      const result = service.parseFilePaths(content);

      expect(result).toHaveLength(1);
      expect(result[0]).toBe('/home/user/documents/test.txt');
    });

    it('should parse Windows absolute paths', () => {
      const content = 'C:\\Users\\user\\documents\\test.txt';
      mockExistsSync.mockReturnValue(true);
      mockStatSync.mockReturnValue({ isFile: () => true } as any);

      const result = service.parseFilePaths(content);

      expect(result).toHaveLength(1);
      expect(result[0]).toContain('test.txt');
    });

    it('should filter out non-existent files', () => {
      const content = '/existing/file.txt\n/nonexistent/file.txt';
      mockExistsSync
        .mockReturnValueOnce(true)  // First file exists
        .mockReturnValueOnce(false); // Second file doesn't exist
      mockStatSync.mockReturnValue({ isFile: () => true } as any);

      const result = service.parseFilePaths(content);

      expect(result).toHaveLength(1);
      expect(result[0]).toContain('existing/file.txt');
    });

    it('should filter out directories', () => {
      const content = '/home/user/file.txt\n/home/user/directory';
      mockExistsSync.mockReturnValue(true);
      mockStatSync
        .mockReturnValueOnce({ isFile: () => true, isDirectory: () => false } as any)  // First is file
        .mockReturnValueOnce({ isFile: () => false, isDirectory: () => true } as any); // Second is directory

      const result = service.parseFilePaths(content);

      expect(result).toHaveLength(1);
      expect(result[0]).toContain('file.txt');
    });

    it('should expand home directory paths', () => {
      const content = '~/documents/test.txt';
      mockHomedir.mockReturnValue('/home/user');
      mockExistsSync.mockReturnValue(true);
      mockStatSync.mockReturnValue({ isFile: () => true, isDirectory: () => false } as any);

      const result = service.parseFilePaths(content);

      expect(result).toHaveLength(1);
      expect(result[0]).toBe('/home/user/documents/test.txt');
    });

    it('should handle multiple file paths in one line', () => {
      const content = 'file:///home/user/file1.txt "/home/user/file2.txt" /home/user/file3.txt';
      mockExistsSync.mockReturnValue(true);
      mockStatSync.mockReturnValue({ isFile: () => true, isDirectory: () => false } as any);

      const result = service.parseFilePaths(content);

      expect(result).toHaveLength(3);
      expect(result).toContain('/home/user/file1.txt');
      expect(result).toContain('/home/user/file2.txt');
      expect(result).toContain('/home/user/file3.txt');
    });

    it('should handle empty content', () => {
      const result = service.parseFilePaths('');
      expect(result).toHaveLength(0);
    });

    it('should handle content with no valid paths', () => {
      const content = 'This is just some text with no paths';
      const result = service.parseFilePaths(content);
      expect(result).toHaveLength(0);
    });
  });

  describe('getFilePathsFromClipboard', () => {
    it('should return parsed file paths from clipboard', async () => {
      Object.defineProperty(process, 'platform', { value: 'darwin', writable: true });
      mockExecSync.mockReturnValue('/home/user/test.txt\n/home/user/test2.txt');
      mockExistsSync.mockReturnValue(true);
      mockStatSync.mockReturnValue({ isFile: () => true } as any);

      const result = await service.getFilePathsFromClipboard();

      expect(result).toHaveLength(2);
      expect(result).toContain('/home/user/test.txt');
      expect(result).toContain('/home/user/test2.txt');
    });

    it('should return empty array when clipboard read fails', async () => {
      Object.defineProperty(process, 'platform', { value: 'darwin', writable: true });
      mockExecSync.mockImplementation(() => {
        throw new Error('Clipboard read failed');
      });

      const result = await service.getFilePathsFromClipboard();

      expect(result).toHaveLength(0);
    });

    it('should return empty array when no valid paths found', async () => {
      Object.defineProperty(process, 'platform', { value: 'darwin', writable: true });
      mockExecSync.mockReturnValue('No file paths here');

      const result = await service.getFilePathsFromClipboard();

      expect(result).toHaveLength(0);
    });
  });

  describe('extractPathsFromLine', () => {
    it('should extract multiple path types from same line', () => {
      const line = 'file:///path/file1.txt "/path/file2.txt" /path/file3.txt';
      const result = (service as any).extractPathsFromLine(line);

      expect(result).toHaveLength(3);
      expect(result).toContain('/path/file1.txt');
      expect(result).toContain('/path/file2.txt');
      expect(result).toContain('/path/file3.txt');
    });

    it('should handle encoded file URLs', () => {
      const line = 'file:///path/file%20with%20spaces.txt';
      const result = (service as any).extractPathsFromLine(line);

      expect(result).toHaveLength(1);
      expect(result[0]).toBe('/path/file with spaces.txt');
    });

    it('should return original line when no specific patterns found but contains path separators', () => {
      const line = 'some/path/structure';
      const result = (service as any).extractPathsFromLine(line);

      expect(result).toHaveLength(1);
      expect(result[0]).toBe('some/path/structure');
    });

    it('should return empty array for lines without path-like content', () => {
      const line = 'just some regular text';
      const result = (service as any).extractPathsFromLine(line);

      expect(result).toHaveLength(0);
    });
  });

  describe('normalizePath', () => {
    beforeEach(() => {
      process.env.HOME = '/home/user';
      process.env.USERPROFILE = '/home/user';
    });

    it('should expand home directory on Unix', () => {
      mockHomedir.mockReturnValue('/home/user');
      const result = (service as any).normalizePath('~/documents/test.txt');
      expect(result).toBe('/home/user/documents/test.txt');
    });

    it('should expand home directory as bare ~', () => {
      mockHomedir.mockReturnValue('/home/user');
      const result = (service as any).normalizePath('~');
      expect(result).toBe('/home/user');
    });

    it('should resolve relative paths to absolute', () => {
      const originalCwd = process.cwd();
      vi.spyOn(process, 'cwd').mockReturnValue('/current/dir');

      const result = (service as any).normalizePath('./relative/path.txt');
      
      expect(result).toBe('/current/dir/relative/path.txt');
      
      vi.mocked(process.cwd).mockRestore();
    });

    it('should leave absolute paths unchanged', () => {
      const absolutePath = '/absolute/path/test.txt';
      const result = (service as any).normalizePath(absolutePath);
      expect(result).toBe(absolutePath);
    });
  });

  describe('validateAndNormalizePaths', () => {
    it('should filter and normalize valid file paths', () => {
      const paths = ['~/test.txt', '/absolute/test.txt', './relative/test.txt'];
      
      mockExistsSync
        .mockReturnValueOnce(true)   // First file exists
        .mockReturnValueOnce(false)  // Second doesn't exist  
        .mockReturnValueOnce(true);  // Third exists
      
      mockStatSync
        .mockReturnValueOnce({ isFile: () => true } as any)  // First is file
        .mockReturnValueOnce({ isFile: () => true } as any); // Third is file

      const result = (service as any).validateAndNormalizePaths(paths);

      expect(result).toHaveLength(2); // Only existing files should be returned
      expect(mockExistsSync).toHaveBeenCalledTimes(3);
      expect(mockStatSync).toHaveBeenCalledTimes(2); // Only called for existing paths
    });

    it('should return empty array when no paths exist', () => {
      const paths = ['/nonexistent1.txt', '/nonexistent2.txt'];
      mockExistsSync.mockReturnValue(false);

      const result = (service as any).validateAndNormalizePaths(paths);

      expect(result).toHaveLength(0);
    });

    it('should filter out directories', () => {
      const paths = ['/path/to/file.txt', '/path/to/directory'];
      mockExistsSync.mockReturnValue(true);
      mockStatSync
        .mockReturnValueOnce({ isFile: () => true } as any)   // First is file
        .mockReturnValueOnce({ isFile: () => false } as any); // Second is directory

      const result = (service as any).validateAndNormalizePaths(paths);

      expect(result).toHaveLength(1);
      expect(result[0]).toContain('file.txt');
    });
  });

  describe('error handling', () => {
    it('should handle missing environment variables gracefully', () => {
      delete process.env.HOME;
      delete process.env.USERPROFILE;
      mockHomedir.mockReturnValue('');
      
      const result = (service as any).normalizePath('~/test.txt');
      
      // Should still work, just with empty home expansion
      expect(result).toBe('/test.txt');
    });

    it('should handle file system errors gracefully', () => {
      mockExistsSync.mockImplementation(() => {
        throw new Error('File system error');
      });

      const result = (service as any).validateAndNormalizePaths(['/test.txt']);
      
      expect(result).toHaveLength(0);
    });

    it('should handle stat errors gracefully', () => {
      mockExistsSync.mockReturnValue(true);
      mockStatSync.mockImplementation(() => {
        throw new Error('Stat error');
      });

      const result = (service as any).validateAndNormalizePaths(['/test.txt']);
      
      expect(result).toHaveLength(0);
    });
  });
});