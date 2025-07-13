import { execSync } from 'child_process';
import { existsSync, statSync } from 'fs';
import { resolve, isAbsolute } from 'path';
import { homedir } from 'os';
import type { 
  ClipboardContent, 
  ParsedFilePath, 
  ClipboardFileResult, 
  ClipboardServiceConfig,
  ClipboardPlatform,
  ClipboardCommand,
  ClipboardError 
} from '../../types';

/**
 * Cross-platform clipboard service for reading file paths from system clipboard
 */
export class ClipboardService {
  private config: ClipboardServiceConfig;
  private readonly commands: Record<ClipboardPlatform, ClipboardCommand>;

  constructor(config: Partial<ClipboardServiceConfig> = {}) {
    this.config = {
      timeout: 5000,
      enableValidation: true,
      ...config,
    };

    this.commands = {
      darwin: {
        platform: 'darwin',
        readCommand: 'pbpaste',
        writeCommand: 'pbcopy',
      },
      win32: {
        platform: 'win32',
        readCommand: 'powershell.exe Get-Clipboard',
        writeCommand: 'clip',
      },
      linux: {
        platform: 'linux',
        readCommand: 'xclip -selection clipboard -o',
        writeCommand: 'xclip -selection clipboard',
        fallbackCommands: ['xsel --clipboard --output'],
      },
    };
  }

  /**
   * Read clipboard content from system clipboard
   */
  async readClipboard(): Promise<string> {
    const platform = process.platform as ClipboardPlatform;
    const command = this.commands[platform];

    if (!command) {
      throw this.createError(
        'PLATFORM_NOT_SUPPORTED',
        `Platform ${platform} is not supported`,
        { platform }
      );
    }

    try {
      return execSync(command.readCommand, { 
        encoding: 'utf8',
        timeout: this.config.timeout,
      });
    } catch (primaryError) {
      // Try fallback commands for Linux
      if (platform === 'linux' && command.fallbackCommands) {
        for (const fallbackCommand of command.fallbackCommands) {
          try {
            return execSync(fallbackCommand, { 
              encoding: 'utf8',
              timeout: this.config.timeout,
            });
          } catch {
            // Continue to next fallback
          }
        }
      }

      throw this.createError(
        'COMMAND_FAILED',
        `Failed to read clipboard: ${(primaryError as Error).message}`,
        { platform, command: command.readCommand }
      );
    }
  }

  /**
   * Parse file paths from clipboard content
   */
  parseFilePaths(clipboardContent: string): string[] {
    if (!clipboardContent?.trim()) {
      return [];
    }

    const lines = clipboardContent
      .split('\n')
      .map(line => line.trim())
      .filter(Boolean);
    
    const filePaths: string[] = [];

    for (const line of lines) {
      const paths = this.extractPathsFromLine(line);
      filePaths.push(...paths);
    }

    return this.config.enableValidation 
      ? this.validateAndNormalizePaths(filePaths)
      : filePaths.map(path => this.normalizePath(path));
  }

  /**
   * Extract paths from a single line using multiple pattern matching strategies
   */
  private extractPathsFromLine(line: string): string[] {
    const paths: string[] = [];

    // file:// URLs
    const fileUrlMatches = line.match(/file:\/\/([^\s]+)/g);
    if (fileUrlMatches) {
      paths.push(
        ...fileUrlMatches.map(url => 
          decodeURIComponent(url.replace('file://', ''))
        )
      );
    }

    // Quoted paths
    const quotedMatches = line.match(/"([^"]+)"/g);
    if (quotedMatches) {
      paths.push(...quotedMatches.map(path => path.slice(1, -1)));
    }

    // Absolute paths (Unix and Windows)
    const absoluteMatches = line.match(/(?:^|\s)([/\\][\w\s\-.\/\\]+|[A-Z]:[\w\s\-.\/\\]+)/g);
    if (absoluteMatches) {
      paths.push(...absoluteMatches.map(path => path.trim()));
    }

    // If no specific patterns found, treat the whole line as a potential path
    if (paths.length === 0 && (line.includes('/') || line.includes('\\'))) {
      paths.push(line);
    }

    return paths;
  }

  /**
   * Validate file existence and normalize paths
   */
  private validateAndNormalizePaths(paths: string[]): string[] {
    return paths
      .map(path => this.normalizePath(path))
      .filter(path => {
        try {
          return existsSync(path) && statSync(path).isFile();
        } catch {
          return false;
        }
      });
  }

  /**
   * Normalize and expand file paths
   */
  private normalizePath(path: string): string {
    // Expand home directory
    if (path.startsWith('~/')) {
      path = path.replace('~', homedir());
    } else if (path === '~') {
      path = homedir();
    }

    // Convert to absolute path
    if (!isAbsolute(path)) {
      path = resolve(process.cwd(), path);
    }

    return path;
  }

  /**
   * Get file paths from clipboard with detailed metadata
   */
  async getFilePathsFromClipboard(): Promise<string[]> {
    try {
      const clipboardContent = await this.readClipboard();
      return this.parseFilePaths(clipboardContent);
    } catch (error) {
      // Return empty array instead of throwing to allow graceful handling
      return [];
    }
  }

  /**
   * Get detailed clipboard file result with metadata
   */
  async getDetailedClipboardResult(): Promise<ClipboardFileResult> {
    const rawContent = await this.readClipboard();
    const filePaths = this.parseFilePaths(rawContent);
    
    const paths: ParsedFilePath[] = filePaths.map(path => {
      const normalized = this.normalizePath(path);
      let exists = false;
      let isFile = false;
      let size: number | undefined;
      let lastModified: Date | undefined;

      try {
        exists = existsSync(normalized);
        if (exists) {
          const stats = statSync(normalized);
          isFile = stats.isFile();
          if (isFile) {
            size = stats.size;
            lastModified = stats.mtime;
          }
        }
      } catch {
        // Handle stat errors gracefully
      }

      return {
        original: path,
        normalized,
        exists,
        isFile,
        extension: this.getFileExtension(normalized),
        size,
        lastModified,
      };
    });

    return {
      paths,
      rawContent,
      parsedAt: new Date(),
    };
  }

  /**
   * Get file extension from path
   */
  private getFileExtension(path: string): string {
    const lastDot = path.lastIndexOf('.');
    const lastSlash = Math.max(path.lastIndexOf('/'), path.lastIndexOf('\\'));
    
    if (lastDot > lastSlash && lastDot > 0) {
      return path.substring(lastDot);
    }
    
    return '';
  }

  /**
   * Create a typed clipboard error
   */
  private createError(
    code: ClipboardError['code'],
    message: string,
    details?: Record<string, unknown>
  ): ClipboardError {
    const error = new Error(message) as ClipboardError;
    error.code = code;
    Object.assign(error, details);
    return error;
  }

  /**
   * Check if clipboard functionality is available on current platform
   */
  static isSupported(): boolean {
    const platform = process.platform as ClipboardPlatform;
    return ['darwin', 'win32', 'linux'].includes(platform);
  }

  /**
   * Get platform-specific clipboard commands
   */
  getPlatformCommands(): ClipboardCommand | null {
    const platform = process.platform as ClipboardPlatform;
    return this.commands[platform] || null;
  }
}

/**
 * Default clipboard service instance
 */
export const clipboardService = new ClipboardService();