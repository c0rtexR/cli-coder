/**
 * Type definitions for clipboard integration
 */

export interface ClipboardContent {
  text: string;
  timestamp: Date;
}

export interface ParsedFilePath {
  original: string;
  normalized: string;
  exists: boolean;
  isFile: boolean;
  extension: string;
  size?: number;
  lastModified?: Date;
}

export interface ClipboardFileResult {
  paths: ParsedFilePath[];
  rawContent: string;
  parsedAt: Date;
}

export interface ClipboardServiceConfig {
  timeout: number;
  fallbackCommand?: string;
  enableValidation: boolean;
}

export type ClipboardPlatform = 'darwin' | 'win32' | 'linux';

export interface ClipboardCommand {
  platform: ClipboardPlatform;
  readCommand: string;
  writeCommand?: string;
  fallbackCommands?: string[];
}

export interface ClipboardError extends Error {
  code: 'PLATFORM_NOT_SUPPORTED' | 'COMMAND_FAILED' | 'INVALID_CONTENT' | 'TIMEOUT';
  platform?: ClipboardPlatform;
  command?: string;
}