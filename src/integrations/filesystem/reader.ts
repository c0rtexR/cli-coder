import { readFileSync, statSync, existsSync } from 'fs';
import { extname } from 'path';
import { FileContext } from '../../types';
import { CLIErrorClass } from '../../utils/errors';

export class FileReader {
  private readonly MAX_FILE_SIZE = 1024 * 1024; // 1MB
  private readonly SUPPORTED_EXTENSIONS = [
    '.js', '.ts', '.jsx', '.tsx', '.py', '.java', '.c', '.cpp', '.h',
    '.css', '.scss', '.html', '.xml', '.json', '.yaml', '.yml',
    '.md', '.txt', '.sql', '.sh', '.bash', '.zsh', '.ps1',
    '.go', '.rs', '.php', '.rb', '.swift', '.kt', '.dart',
    '.vue', '.svelte', '.toml', '.ini', '.env'
  ];

  async readFile(filePath: string): Promise<FileContext> {
    // Validate file exists
    if (!existsSync(filePath)) {
      throw new CLIErrorClass('FILE_NOT_FOUND', `File not found: ${filePath}`);
    }

    // Get file stats
    const stats = statSync(filePath);
    
    // Check if it's a file (not directory)
    if (!stats.isFile()) {
      throw new CLIErrorClass('NOT_A_FILE', `Path is not a file: ${filePath}`);
    }

    // Check file size
    if (stats.size > this.MAX_FILE_SIZE) {
      throw new CLIErrorClass('FILE_TOO_LARGE', 
        `File too large (${Math.round(stats.size / 1024)}KB > ${this.MAX_FILE_SIZE / 1024}KB): ${filePath}`);
    }

    // Check if file type is supported
    const extension = extname(filePath).toLowerCase();
    if (!this.isSupportedFileType(extension)) {
      throw new CLIErrorClass('UNSUPPORTED_FILE_TYPE', 
        `Unsupported file type: ${extension} for file: ${filePath}`);
    }

    try {
      // Read file content
      const content = readFileSync(filePath, 'utf-8');
      
      return {
        path: filePath,
        content,
        language: this.detectLanguage(extension),
        size: stats.size,
        lastModified: stats.mtime,
      };
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'EACCES') {
        throw new CLIErrorClass('PERMISSION_DENIED', `Permission denied: ${filePath}`);
      }
      throw new CLIErrorClass('read_ERROR', `Failed to read file: ${filePath}`, error);
    }
  }

  async readMultipleFiles(filePaths: string[]): Promise<FileContext[]> {
    const results: FileContext[] = [];
    const errors: string[] = [];

    for (const filePath of filePaths) {
      try {
        const fileContext = await this.readFile(filePath);
        results.push(fileContext);
      } catch (error) {
        errors.push(`${filePath}: ${(error as Error).message}`);
      }
    }

    if (errors.length > 0 && results.length === 0) {
      throw new CLIErrorClass('ALL_FILES_FAILED', `Failed to read all files:\n${errors.join('\n')}`);
    }

    return results;
  }

  private isSupportedFileType(extension: string): boolean {
    return this.SUPPORTED_EXTENSIONS.includes(extension);
  }

  private detectLanguage(extension: string): string {
    const languageMap: Record<string, string> = {
      '.js': 'javascript',
      '.ts': 'typescript',
      '.jsx': 'javascript',
      '.tsx': 'typescript',
      '.py': 'python',
      '.java': 'java',
      '.c': 'c',
      '.cpp': 'cpp',
      '.h': 'c',
      '.css': 'css',
      '.scss': 'scss',
      '.html': 'html',
      '.xml': 'xml',
      '.json': 'json',
      '.yaml': 'yaml',
      '.yml': 'yaml',
      '.md': 'markdown',
      '.txt': 'text',
      '.sql': 'sql',
      '.sh': 'bash',
      '.bash': 'bash',
      '.zsh': 'zsh',
      '.ps1': 'powershell',
      '.go': 'go',
      '.rs': 'rust',
      '.php': 'php',
      '.rb': 'ruby',
      '.swift': 'swift',
      '.kt': 'kotlin',
      '.dart': 'dart',
      '.vue': 'vue',
      '.svelte': 'svelte',
    };

    return languageMap[extension] || 'text';
  }

  getSupportedExtensions(): string[] {
    return [...this.SUPPORTED_EXTENSIONS];
  }
}