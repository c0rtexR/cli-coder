import { glob } from 'glob';
import { FileReader } from './reader';
import { FileWriter, WriteOperation, WriteResult } from './writer';
import { FileContext } from '../../types';
import { CLIErrorClass } from '../../utils/errors';

export class FileService {
  private reader: FileReader;
  private writer: FileWriter;
  private readonly EXCLUDED_PATTERNS = [
    '**/node_modules/**',
    '**/.git/**',
    '**/dist/**',
    '**/build/**',
    '**/.next/**',
    '**/coverage/**',
    '**/.nyc_output/**',
    '**/.DS_Store',
    '**/Thumbs.db',
    '**/*.log',
    '**/.env*',
    '**/.cli-coder-backups/**'
  ];

  constructor() {
    this.reader = new FileReader();
    this.writer = new FileWriter();
  }

  async addFilesToContext(patterns: string[]): Promise<FileContext[]> {
    const allFiles: string[] = [];

    // Expand glob patterns
    for (const pattern of patterns) {
      try {
        const files = await glob(pattern, {
          ignore: this.EXCLUDED_PATTERNS,
          nodir: true, // Only files, not directories
        });
        allFiles.push(...files);
      } catch (error) {
        throw new CLIErrorClass('GLOB_ERROR', `Invalid pattern: ${pattern}`, error);
      }
    }

    // Remove duplicates
    const uniqueFiles = [...new Set(allFiles)];

    if (uniqueFiles.length === 0) {
      throw new CLIErrorClass('NO_FILES_FOUND', `No files found matching patterns: ${patterns.join(', ')}`);
    }

    // Filter out unsupported files
    const supportedFiles = uniqueFiles.filter(file => {
      const ext = file.split('.').pop()?.toLowerCase() || '';
      return this.reader.getSupportedExtensions().includes(`.${ext}`);
    });

    if (supportedFiles.length === 0) {
      throw new CLIErrorClass('NO_SUPPORTED_FILES', 
        `No supported files found. Supported extensions: ${this.reader.getSupportedExtensions().join(', ')}`);
    }

    // Read all files
    return await this.reader.readMultipleFiles(supportedFiles);
  }

  async readFile(filePath: string): Promise<FileContext> {
    return await this.reader.readFile(filePath);
  }

  async writeFile(filePath: string, content: string, createBackup = true): Promise<WriteResult> {
    return await this.writer.writeFile({
      filePath,
      content,
      createBackup,
    });
  }

  async writeMultipleFiles(operations: WriteOperation[]): Promise<WriteResult[]> {
    return await this.writer.writeMultipleFiles(operations);
  }

  isFileSupported(filePath: string): boolean {
    const ext = '.' + (filePath.split('.').pop()?.toLowerCase() || '');
    return this.reader.getSupportedExtensions().includes(ext);
  }

  getSupportedExtensions(): string[] {
    return this.reader.getSupportedExtensions();
  }

  validateFilePath(filePath: string): void {
    // Prevent directory traversal attacks
    if (filePath.includes('..') || filePath.startsWith('/') || /^[A-Za-z]:\\/.test(filePath)) {
      throw new CLIErrorClass('INVALID_PATH', 'File path validation failed: potential security risk');
    }
  }
}

// Singleton instance
export const fileService = new FileService();