/**
 * Type definitions for file path handling and validation
 */

export interface PathValidationResult {
  valid: boolean;
  error?: string;
  details?: {
    exists: boolean;
    isFile: boolean;
    isDirectory: boolean;
    readable: boolean;
    writable: boolean;
  };
}

export interface PathCompletion {
  path: string;
  type: 'file' | 'directory';
  displayName: string;
  isMatch: boolean;
}

export interface PathExpansionOptions {
  expandHome: boolean;
  expandEnvironment: boolean;
  resolveSymlinks: boolean;
  makeAbsolute: boolean;
}

export interface GlobResult {
  pattern: string;
  files: string[];
  directories: string[];
  errors: string[];
  expandedAt: Date;
}

export interface RecentFile {
  path: string;
  lastAccessed: Date;
  accessCount: number;
  context?: string;
}

export interface QuickAccessItem {
  type: 'file' | 'directory' | 'bookmark' | 'template';
  path: string;
  displayName: string;
  description?: string;
  shortcut?: string;
  icon?: string;
  metadata?: Record<string, unknown>;
}

export interface FilePathInputState {
  input: string;
  completions: string[];
  selectedCompletion: number;
  showCompletions: boolean;
  validation: PathValidationResult;
  history: string[];
}

export interface FilePathError extends Error {
  code: 'INVALID_PATH' | 'FILE_NOT_FOUND' | 'NOT_A_FILE' | 'PERMISSION_DENIED' | 'GLOB_ERROR';
  path?: string;
  details?: Record<string, unknown>;
}