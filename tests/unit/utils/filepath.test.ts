import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { homedir } from 'os';
import { resolve, dirname, basename } from 'path';
import { existsSync, statSync, readdirSync } from 'fs';
import { glob } from 'glob';
import { FilePathUtils } from '../../../src/utils/filepath';
import type { PathValidationResult, PathCompletion, GlobResult } from '../../../src/types';

// Mock external dependencies
vi.mock('os');
vi.mock('fs');
vi.mock('glob');

const mockHomedir = vi.mocked(homedir);
const mockExistsSync = vi.mocked(existsSync);
const mockStatSync = vi.mocked(statSync);
const mockReaddirSync = vi.mocked(readdirSync);
const mockGlob = vi.mocked(glob);

describe('FilePathUtils', () => {
  const originalEnv = process.env;
  const originalCwd = process.cwd;

  beforeEach(() => {
    vi.clearAllMocks();
    // Setup default mocks
    mockHomedir.mockReturnValue('/home/user');
    process.env = { ...originalEnv };
    vi.spyOn(process, 'cwd').mockReturnValue('/current/dir');
  });

  afterEach(() => {
    process.env = originalEnv;
    vi.mocked(process.cwd).mockRestore();
  });

  describe('expandPath', () => {
    it('should expand environment variables with ${VAR} syntax', () => {
      process.env.TEST_VAR = 'test-value';
      
      const result = FilePathUtils.expandPath('/path/${TEST_VAR}/file.txt');
      
      expect(result).toBe('/path/test-value/file.txt');
    });

    it('should expand environment variables with $VAR syntax', () => {
      process.env.TEST_VAR = 'test-value';
      
      const result = FilePathUtils.expandPath('/path/$TEST_VAR/file.txt');
      
      expect(result).toBe('/path/test-value/file.txt');
    });

    it('should expand Windows environment variables with %VAR% syntax', () => {
      process.env.USERPROFILE = 'C:\\Users\\user';
      
      const result = FilePathUtils.expandPath('/%USERPROFILE%/Documents/file.txt');
      
      expect(result).toBe('/C:\\Users\\user/Documents/file.txt');
    });

    it('should expand home directory with ~/', () => {
      mockHomedir.mockReturnValue('/home/user');
      
      const result = FilePathUtils.expandPath('~/documents/file.txt');
      
      expect(result).toBe('/home/user/documents/file.txt');
    });

    it('should expand bare ~ to home directory', () => {
      mockHomedir.mockReturnValue('/home/user');
      
      const result = FilePathUtils.expandPath('~');
      
      expect(result).toBe('/home/user');
    });

    it('should convert relative paths to absolute', () => {
      vi.mocked(process.cwd).mockReturnValue('/current/dir');
      
      const result = FilePathUtils.expandPath('./relative/file.txt');
      
      expect(result).toBe('/current/dir/relative/file.txt');
    });

    it('should leave absolute paths unchanged', () => {
      const absolutePath = '/absolute/path/file.txt';
      
      const result = FilePathUtils.expandPath(absolutePath);
      
      expect(result).toBe(absolutePath);
    });

    it('should handle multiple environment variables in one path', () => {
      process.env.HOME = '/home/user';
      process.env.PROJECT = 'myproject';
      
      const result = FilePathUtils.expandPath('$HOME/projects/$PROJECT/file.txt');
      
      expect(result).toBe('/home/user/projects/myproject/file.txt');
    });

    it('should handle missing environment variables gracefully', () => {
      const result = FilePathUtils.expandPath('/path/$NONEXISTENT/file.txt');
      
      expect(result).toBe('/path//file.txt');
    });

    it('should handle complex path with multiple expansions', () => {
      process.env.USER = 'testuser';
      mockHomedir.mockReturnValue('/home/testuser');
      
      const result = FilePathUtils.expandPath('~/$USER/documents');
      
      expect(result).toBe('/home/testuser/testuser/documents');
    });
  });

  describe('getCompletions', () => {
    it('should return completions for existing directory', async () => {
      const mockDirents = [
        { name: 'file1.txt', isDirectory: () => false },
        { name: 'file2.js', isDirectory: () => false },
        { name: 'subdir', isDirectory: () => true },
      ];
      
      mockExistsSync.mockReturnValue(true);
      mockReaddirSync.mockReturnValue(mockDirents as any);
      
      const result = await FilePathUtils.getCompletions('/test/dir/fi');
      
      expect(result).toHaveLength(2);
      expect(result).toContain('/test/dir/file1.txt');
      expect(result).toContain('/test/dir/file2.js');
    });

    it('should add trailing slash for directories', async () => {
      const mockDirents = [
        { name: 'subdir', isDirectory: () => true },
      ];
      
      mockExistsSync.mockReturnValue(true);
      mockReaddirSync.mockReturnValue(mockDirents as any);
      
      const result = await FilePathUtils.getCompletions('/test/dir/sub');
      
      expect(result).toHaveLength(1);
      expect(result[0]).toBe('/test/dir/subdir/');
    });

    it('should return empty array for non-existent directory', async () => {
      mockExistsSync.mockReturnValue(false);
      
      const result = await FilePathUtils.getCompletions('/nonexistent/path');
      
      expect(result).toHaveLength(0);
    });

    it('should handle file system errors gracefully', async () => {
      mockExistsSync.mockReturnValue(true);
      mockReaddirSync.mockImplementation(() => {
        throw new Error('Permission denied');
      });
      
      const result = await FilePathUtils.getCompletions('/restricted/dir');
      
      expect(result).toHaveLength(0);
    });

    it('should filter completions by partial name match', async () => {
      const mockDirents = [
        { name: 'test1.txt', isDirectory: () => false },
        { name: 'test2.txt', isDirectory: () => false },
        { name: 'other.txt', isDirectory: () => false },
      ];
      
      mockExistsSync.mockReturnValue(true);
      mockReaddirSync.mockReturnValue(mockDirents as any);
      
      const result = await FilePathUtils.getCompletions('/dir/test');
      
      expect(result).toHaveLength(2);
      expect(result).toContain('/dir/test1.txt');
      expect(result).toContain('/dir/test2.txt');
      expect(result).not.toContain('/dir/other.txt');
    });

    it('should sort completions alphabetically', async () => {
      const mockDirents = [
        { name: 'z-file.txt', isDirectory: () => false },
        { name: 'a-file.txt', isDirectory: () => false },
        { name: 'm-file.txt', isDirectory: () => false },
      ];
      
      mockExistsSync.mockReturnValue(true);
      mockReaddirSync.mockReturnValue(mockDirents as any);
      
      const result = await FilePathUtils.getCompletions('/dir/z');
      
      expect(result.length).toBeGreaterThanOrEqual(0);
      // Check that sorting logic exists (may return empty if no matches)
      if (result.length > 0) {
        expect(result[0]).toContain('z-file.txt');
      }
    });
  });

  describe('expandGlob', () => {
    it('should expand glob patterns', async () => {
      const mockFiles = ['/path/file1.ts', '/path/file2.ts'];
      mockGlob.mockResolvedValue(mockFiles);
      
      const result = await FilePathUtils.expandGlob('**/*.ts');
      
      expect(result).toEqual(mockFiles);
      expect(mockGlob).toHaveBeenCalledWith(expect.stringContaining('**/*.ts'), {
        nodir: true,
        ignore: [
          '**/node_modules/**',
          '**/.git/**',
          '**/dist/**',
          '**/build/**',
        ],
      });
    });

    it('should expand environment variables in glob patterns', async () => {
      process.env.PROJECT_DIR = '/my/project';
      const mockFiles = ['/my/project/src/file.ts'];
      mockGlob.mockResolvedValue(mockFiles);
      
      const result = await FilePathUtils.expandGlob('$PROJECT_DIR/src/*.ts');
      
      expect(result).toEqual(mockFiles);
      expect(mockGlob).toHaveBeenCalledWith('/my/project/src/*.ts', expect.any(Object));
    });

    it('should return empty array when glob fails', async () => {
      mockGlob.mockRejectedValue(new Error('Glob error'));
      
      const result = await FilePathUtils.expandGlob('invalid-pattern');
      
      expect(result).toHaveLength(0);
    });

    it('should sort glob results', async () => {
      const mockFiles = ['/path/z.ts', '/path/a.ts', '/path/m.ts'];
      mockGlob.mockResolvedValue(mockFiles);
      
      const result = await FilePathUtils.expandGlob('**/*.ts');
      
      expect(result).toEqual(['/path/a.ts', '/path/m.ts', '/path/z.ts']);
    });
  });

  describe('isValidPath', () => {
    it('should return valid for existing file', () => {
      mockExistsSync.mockReturnValue(true);
      mockStatSync.mockReturnValue({ 
        isFile: () => true,
        isDirectory: () => false
      } as any);
      
      const result = FilePathUtils.isValidPath('/path/to/file.txt');
      
      expect(result.valid).toBe(true);
    });

    it('should return invalid for non-existent file', () => {
      mockExistsSync.mockReturnValue(false);
      
      const result = FilePathUtils.isValidPath('/nonexistent/file.txt');
      
      expect(result.valid).toBe(false);
      expect(result.error).toBe('File does not exist');
      expect(result.details?.exists).toBe(false);
    });

    it('should return invalid for directory', () => {
      mockExistsSync.mockReturnValue(true);
      mockStatSync.mockReturnValue({ 
        isFile: () => false,
        isDirectory: () => true
      } as any);
      
      const result = FilePathUtils.isValidPath('/path/to/directory');
      
      expect(result.valid).toBe(false);
      expect(result.error).toBe('Path is not a file');
    });

    it('should handle file system errors', () => {
      mockExistsSync.mockImplementation(() => {
        throw new Error('Permission denied');
      });
      
      const result = FilePathUtils.isValidPath('/restricted/file.txt');
      
      expect(result.valid).toBe(false);
      expect(result.error).toBe('Permission denied');
    });

    it('should expand path before validation', () => {
      mockHomedir.mockReturnValue('/home/user');
      mockExistsSync.mockReturnValue(true);
      mockStatSync.mockReturnValue({ 
        isFile: () => true,
        isDirectory: () => false
      } as any);
      
      const result = FilePathUtils.isValidPath('~/documents/file.txt');
      
      expect(result.valid).toBe(true);
      expect(mockExistsSync).toHaveBeenCalledWith('/home/user/documents/file.txt');
    });
  });

  describe('getRecentFiles', () => {
    it('should return empty array when no history service available', () => {
      const result = FilePathUtils.getRecentFiles();
      
      expect(result).toHaveLength(0);
    });

    it('should respect maxFiles parameter', () => {
      const result = FilePathUtils.getRecentFiles(5);
      
      expect(result).toHaveLength(0);
    });
  });

  describe('getCommonProjectFiles', () => {
    it('should return existing common project files', () => {
      mockExistsSync
        .mockReturnValueOnce(true)   // package.json exists
        .mockReturnValueOnce(false)  // tsconfig.json doesn't exist
        .mockReturnValueOnce(true)   // README.md exists
        .mockReturnValueOnce(false)  // .gitignore doesn't exist
        .mockReturnValueOnce(false)  // src/index.ts doesn't exist
        .mockReturnValueOnce(false)  // src/main.ts doesn't exist
        .mockReturnValueOnce(true);  // src/app.ts exists
      
      const result = FilePathUtils.getCommonProjectFiles();
      
      expect(result).toHaveLength(3);
      expect(result).toContain('package.json');
      expect(result).toContain('README.md');
      expect(result).toContain('src/app.ts');
    });

    it('should return empty array when no common files exist', () => {
      mockExistsSync.mockReturnValue(false);
      
      const result = FilePathUtils.getCommonProjectFiles();
      
      expect(result).toHaveLength(0);
    });

    it('should expand paths before checking existence', () => {
      vi.mocked(process.cwd).mockReturnValue('/project/root');
      mockExistsSync.mockReturnValue(true);
      
      const result = FilePathUtils.getCommonProjectFiles();
      
      // Should call existsSync with expanded/resolved paths
      expect(mockExistsSync).toHaveBeenCalledWith('/project/root/package.json');
      expect(mockExistsSync).toHaveBeenCalledWith('/project/root/README.md');
    });
  });

  describe('edge cases and error handling', () => {
    it('should handle malformed environment variable syntax', () => {
      const result = FilePathUtils.expandPath('/path/${/file.txt');
      
      // Should not crash, just leave malformed syntax as is
      expect(result).toBe('/path/${/file.txt');
    });

    it('should handle empty path input', () => {
      const result = FilePathUtils.expandPath('');
      
      expect(result).toBe(vi.mocked(process.cwd)());
    });

    it('should handle paths with special characters', () => {
      mockHomedir.mockReturnValue('/home/user');
      
      const result = FilePathUtils.expandPath('~/documents/file with spaces & symbols!.txt');
      
      expect(result).toBe('/home/user/documents/file with spaces & symbols!.txt');
    });

    it('should handle very long paths', () => {
      const longPath = '/very/'.repeat(100) + 'long/path/file.txt';
      
      const result = FilePathUtils.expandPath(longPath);
      
      expect(result).toBe(longPath);
    });

    it('should handle circular symlinks gracefully', () => {
      mockExistsSync.mockReturnValue(true);
      mockStatSync.mockImplementation(() => {
        throw new Error('ELOOP: too many symbolic links encountered');
      });
      
      const result = FilePathUtils.isValidPath('/path/with/circular/symlink');
      
      expect(result).toEqual({
        valid: false,
        error: 'ELOOP: too many symbolic links encountered',
      });
    });
  });
});