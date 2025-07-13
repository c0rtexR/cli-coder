import { homedir } from 'os';
import { resolve, dirname, basename, extname, isAbsolute } from 'path';
import { existsSync, statSync, readdirSync } from 'fs';
import { glob } from 'glob';
import type {
  PathValidationResult,
  PathCompletion,
  PathExpansionOptions,
  GlobResult,
  QuickAccessItem,
  FilePathError,
} from '../types';

/**
 * Utility class for cross-platform file path handling and validation
 */
export class FilePathUtils {
  private static readonly COMMON_PROJECT_FILES = [
    'package.json',
    'tsconfig.json',
    'README.md',
    '.gitignore',
    'src/index.ts',
    'src/main.ts',
    'src/app.ts',
  ];

  private static readonly DEFAULT_EXPANSION_OPTIONS: PathExpansionOptions = {
    expandHome: true,
    expandEnvironment: true,
    resolveSymlinks: false,
    makeAbsolute: true,
  };

  /**
   * Expand environment variables and home directory in path
   */
  static expandPath(
    path: string, 
    options: Partial<PathExpansionOptions> = {}
  ): string {
    const opts = { ...this.DEFAULT_EXPANSION_OPTIONS, ...options };
    let expandedPath = path;

    // Expand environment variables
    if (opts.expandEnvironment) {
      // ${VAR} syntax
      expandedPath = expandedPath.replace(/\$\{(\w+)\}/g, (_, varName) => 
        process.env[varName] || ''
      );
      
      // $VAR syntax
      expandedPath = expandedPath.replace(/\$(\w+)/g, (_, varName) => 
        process.env[varName] || ''
      );
      
      // Windows %VAR% syntax
      expandedPath = expandedPath.replace(/%(\w+)%/g, (_, varName) => 
        process.env[varName] || ''
      );
    }

    // Expand home directory
    if (opts.expandHome) {
      if (expandedPath.startsWith('~/') || expandedPath === '~') {
        expandedPath = expandedPath.replace(/^~/, homedir());
      }
    }

    // Convert to absolute path
    if (opts.makeAbsolute && !isAbsolute(expandedPath)) {
      expandedPath = resolve(process.cwd(), expandedPath);
    }

    return expandedPath;
  }

  /**
   * Get path completions for auto-completion
   */
  static async getCompletions(partial: string): Promise<string[]> {
    try {
      const expandedPath = this.expandPath(partial);
      const dirPath = dirname(expandedPath);
      const baseName = basename(expandedPath);

      if (!existsSync(dirPath)) {
        return [];
      }

      const entries = readdirSync(dirPath, { withFileTypes: true });
      const completions: string[] = [];

      for (const entry of entries) {
        if (entry.name.startsWith(baseName)) {
          const fullPath = resolve(dirPath, entry.name);
          if (entry.isDirectory()) {
            completions.push(fullPath + '/');
          } else {
            completions.push(fullPath);
          }
        }
      }

      return completions.sort();
    } catch {
      return [];
    }
  }

  /**
   * Get detailed path completions with metadata
   */
  static async getDetailedCompletions(partial: string): Promise<PathCompletion[]> {
    try {
      const completions = await this.getCompletions(partial);
      
      return completions.map(path => ({
        path,
        type: path.endsWith('/') ? 'directory' : 'file',
        displayName: basename(path.replace(/\/$/, '')),
        isMatch: true,
      }));
    } catch {
      return [];
    }
  }

  /**
   * Expand glob patterns with error handling
   */
  static async expandGlob(pattern: string): Promise<string[]> {
    try {
      const expandedPattern = this.expandPath(pattern);
      const files = await glob(expandedPattern, {
        nodir: true,
        ignore: [
          '**/node_modules/**',
          '**/.git/**',
          '**/dist/**',
          '**/build/**',
        ],
      });
      return files.sort();
    } catch {
      return [];
    }
  }

  /**
   * Get detailed glob results with metadata
   */
  static async getDetailedGlobResult(pattern: string): Promise<GlobResult> {
    const expandedPattern = this.expandPath(pattern);
    const errors: string[] = [];
    let files: string[] = [];
    let directories: string[] = [];

    try {
      // Get files
      files = await glob(expandedPattern, {
        nodir: true,
        ignore: [
          '**/node_modules/**',
          '**/.git/**',
          '**/dist/**',
          '**/build/**',
        ],
      });

      // Get directories (glob doesn't have onlyDirectories in all versions)
      const allMatches = await glob(expandedPattern, {
        ignore: [
          '**/node_modules/**',
          '**/.git/**',
          '**/dist/**',
          '**/build/**',
        ],
      });
      
      // Filter directories manually
      directories = allMatches.filter(path => {
        try {
          return existsSync(path) && statSync(path).isDirectory();
        } catch {
          return false;
        }
      });
    } catch (error) {
      errors.push((error as Error).message);
    }

    return {
      pattern: expandedPattern,
      files: files.sort(),
      directories: directories.sort(),
      errors,
      expandedAt: new Date(),
    };
  }

  /**
   * Validate file path and provide detailed feedback
   */
  static isValidPath(path: string): PathValidationResult {
    try {
      const expandedPath = this.expandPath(path);
      
      if (!existsSync(expandedPath)) {
        return { 
          valid: false, 
          error: 'File does not exist',
          details: {
            exists: false,
            isFile: false,
            isDirectory: false,
            readable: false,
            writable: false,
          }
        };
      }

      const stats = statSync(expandedPath);
      const isFile = stats.isFile();
      const isDirectory = stats.isDirectory();

      if (!isFile) {
        return { 
          valid: false, 
          error: 'Path is not a file',
          details: {
            exists: true,
            isFile: false,
            isDirectory,
            readable: true, // If we can stat it, we can read it
            writable: false, // Don't assume write access
          }
        };
      }

      return { 
        valid: true,
        details: {
          exists: true,
          isFile: true,
          isDirectory: false,
          readable: true,
          writable: false, // Conservative assumption
        }
      };
    } catch (error) {
      return { 
        valid: false, 
        error: (error as Error).message,
        details: {
          exists: false,
          isFile: false,
          isDirectory: false,
          readable: false,
          writable: false,
        }
      };
    }
  }

  /**
   * Get recent files (placeholder implementation)
   * TODO: Integrate with actual history service
   */
  static getRecentFiles(_maxFiles = 10): string[] {
    // This would integrate with a history service in the future
    // For now, return empty array
    return [];
  }

  /**
   * Get common project files that exist in current directory
   */
  static getCommonProjectFiles(): string[] {
    return this.COMMON_PROJECT_FILES.filter(file => {
      try {
        const expandedPath = this.expandPath(file);
        return existsSync(expandedPath);
      } catch {
        return false;
      }
    });
  }

  /**
   * Get workspace-specific quick access items
   */
  static getQuickAccessItems(): QuickAccessItem[] {
    const items: QuickAccessItem[] = [];

    // Add common project files
    const projectFiles = this.getCommonProjectFiles();
    for (const file of projectFiles) {
      items.push({
        type: 'file',
        path: file,
        displayName: basename(file),
        description: 'Project file',
        icon: this.getFileIcon(file),
      });
    }

    // Add common directories
    const commonDirs = ['src', 'lib', 'test', 'docs'];
    for (const dir of commonDirs) {
      try {
        const expandedPath = this.expandPath(dir);
        if (existsSync(expandedPath) && statSync(expandedPath).isDirectory()) {
          items.push({
            type: 'directory',
            path: dir,
            displayName: dir,
            description: 'Project directory',
            icon: '📁',
          });
        }
      } catch {
        // Ignore errors
      }
    }

    return items;
  }

  /**
   * Get appropriate icon for file type
   */
  static getFileIcon(filePath: string): string {
    const ext = extname(filePath).toLowerCase();
    
    const iconMap: Record<string, string> = {
      '.ts': '📘',
      '.tsx': '📘', 
      '.js': '📄',
      '.jsx': '📄',
      '.json': '📋',
      '.md': '📝',
      '.txt': '📄',
      '.yml': '⚙️',
      '.yaml': '⚙️',
      '.toml': '⚙️',
      '.xml': '📄',
      '.html': '🌐',
      '.css': '🎨',
      '.scss': '🎨',
      '.py': '🐍',
      '.go': '🐹',
      '.rs': '🦀',
      '.java': '☕',
      '.cpp': '⚡',
      '.c': '⚡',
    };

    return iconMap[ext] || '📄';
  }

  /**
   * Create a typed file path error
   */
  static createError(
    code: FilePathError['code'],
    message: string,
    path?: string,
    details?: Record<string, unknown>
  ): FilePathError {
    const error = new Error(message) as FilePathError;
    error.code = code;
    if (path) error.path = path;
    if (details) error.details = details;
    return error;
  }

  /**
   * Check if a path pattern is a glob
   */
  static isGlobPattern(pattern: string): boolean {
    return /[*?[\]{}]/.test(pattern);
  }

  /**
   * Normalize path separators for current platform
   */
  static normalizeSeparators(path: string): string {
    if (process.platform === 'win32') {
      return path.replace(/\//g, '\\');
    }
    return path.replace(/\\/g, '/');
  }

  /**
   * Get relative path from current working directory
   */
  static getRelativePath(absolutePath: string): string {
    try {
      const cwd = process.cwd();
      const expanded = this.expandPath(absolutePath);
      
      if (expanded.startsWith(cwd)) {
        const relative = expanded.substring(cwd.length);
        return relative.startsWith('/') || relative.startsWith('\\') 
          ? '.' + relative 
          : './' + relative;
      }
      
      return expanded;
    } catch {
      return absolutePath;
    }
  }

  /**
   * Check if path is within current working directory
   */
  static isWithinCwd(path: string): boolean {
    try {
      const expanded = this.expandPath(path);
      const cwd = process.cwd();
      return expanded.startsWith(cwd);
    } catch {
      return false;
    }
  }
}

export default FilePathUtils;