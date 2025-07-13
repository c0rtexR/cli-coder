/**
 * @fileoverview TUI (Terminal User Interface) type definitions
 */

import type { ChatSession } from './session.types';
import type { AppConfig } from './config.types';

export interface TUIAppProps {
  session: ChatSession;
  config: AppConfig;
}

export interface StatusBarProps {
  provider: string;
  model: string;
  fileCount: number;
  activePanel: string;
}

export interface ChatPanelProps {
  session: ChatSession;
  isActive: boolean;
  onActivate: () => void;
}

export interface FilePanelProps {
  session: ChatSession;
  isActive: boolean;
  onActivate: () => void;
}

export interface InputPanelProps {
  session: ChatSession;
  isActive: boolean;
  onActivate: () => void;
}

export interface HelpScreenProps {
  onClose: () => void;
}

export interface MessageItemProps {
  message: import('./llm.types').ChatMessage;
}

export interface FileItemProps {
  file: import('./config.types').FileContext;
  isSelected: boolean;
  index: number;
}

export interface FilePreviewProps {
  file: import('./config.types').FileContext;
  onClose: () => void;
}

export interface TUIState {
  activePanel: 'chat' | 'files' | 'input';
  chatPanelWidth: number;
  showHelp: boolean;
  scrollOffset: number;
  selectedFileIndex: number;
  showFilePreview: boolean;
  input: string;
  commandHistory: string[];
  historyIndex: number;
  isLoading: boolean;
}

export interface KeyboardEvent {
  input?: string;
  key: {
    upArrow?: boolean;
    downArrow?: boolean;
    leftArrow?: boolean;
    rightArrow?: boolean;
    return?: boolean;
    escape?: boolean;
    tab?: boolean;
    backspace?: boolean;
    delete?: boolean;
    pageUp?: boolean;
    pageDown?: boolean;
    ctrl?: boolean;
    meta?: boolean;
    shift?: boolean;
  };
}

export interface TUITheme {
  colors: {
    primary: string;
    secondary: string;
    accent: string;
    background: string;
    text: string;
    muted: string;
    success: string;
    warning: string;
    error: string;
  };
  borders: {
    active: string;
    inactive: string;
  };
}

export interface PanelConfig {
  title: string;
  icon: string;
  borderColor: string;
  activeBorderColor: string;
  shortcuts: Record<string, string>;
}

export type PanelType = 'chat' | 'files' | 'input';

// Re-export from other modules for convenience
export type { ChatMessage } from './llm.types';
export type { FileContext } from './config.types';

// File Browser Types
export interface FileTreeNode {
  id: string;
  name: string;
  path: string;
  type: 'file' | 'directory';
  extension?: string;
  size?: number;
  modifiedAt?: Date;
  isExpanded?: boolean;
  isSelected: boolean;
  isInContext: boolean;
  isIgnored?: boolean;
  children?: FileTreeNode[];
}

export interface FileTreeOptions {
  showHidden?: boolean;
  respectGitignore?: boolean;
  maxDepth?: number;
  excludePatterns?: string[];
}

export interface FileTreeSearchOptions {
  query: string;
  fileTypes?: string[];
  modifiedAfter?: Date;
  modifiedBefore?: Date;
  includeContent?: boolean;
  maxResults?: number;
}

export interface FileBrowserProps {
  fileTree: FileTreeNode[];
  selectedPath: string | null;
  isActive: boolean;
  onFileSelect: (path: string) => void;
  onFileToggleContext: (path: string) => void;
  onDirectoryToggle: (path: string) => void;
  onSearch: (query: string, options?: FileTreeSearchOptions) => void;
  onMultiSelect: (paths: string[]) => void;
  searchQuery: string;
  showHidden: boolean;
  multiSelectMode: boolean;
  selectedFiles: string[];
}

export interface FileBrowserState {
  currentPath: string;
  selectedPath: string | null;
  expandedPaths: Set<string>;
  selectedFiles: Set<string>;
  searchQuery: string;
  searchResults: FileTreeNode[];
  isSearching: boolean;
  multiSelectMode: boolean;
  showHidden: boolean;
  sortBy: 'name' | 'size' | 'modified' | 'type';
  sortOrder: 'asc' | 'desc';
  scrollOffset: number;
  contextFiles: Set<string>;
}

export interface FileTreeServiceInterface {
  buildFileTree(rootPath: string, options?: FileTreeOptions): Promise<FileTreeNode[]>;
  searchFiles(tree: FileTreeNode[], options: FileTreeSearchOptions): FileTreeNode[];
  toggleDirectory(node: FileTreeNode): void;
  updateContextStatus(tree: FileTreeNode[], contextFiles: string[]): void;
  filterTree(tree: FileTreeNode[], predicate: (node: FileTreeNode) => boolean): FileTreeNode[];
  sortTree(tree: FileTreeNode[], sortBy: 'name' | 'size' | 'modified' | 'type', order: 'asc' | 'desc'): FileTreeNode[];
}

export interface FileBrowserControllerInterface {
  loadDirectory(path: string, options?: FileTreeOptions): Promise<FileTreeNode[]>;
  selectFile(path: string): void;
  toggleDirectory(path: string): Promise<void>;
  toggleFileContext(path: string): Promise<void>;
  searchFiles(query: string, options?: Partial<FileTreeSearchOptions>): Promise<FileTreeNode[]>;
  navigateUp(): void;
  navigateDown(): void;
  navigateToParent(): void;
  expandDirectory(path: string): Promise<void>;
  collapseDirectory(path: string): void;
  toggleMultiSelect(path: string): Promise<void>;
  enableMultiSelectMode(): void;
  disableMultiSelectMode(): void;
  clearMultiSelection(): void;
  selectAll(): void;
  getSelectedPath(): string | null;
  getSelectedFiles(): string[];
  getContextFiles(): string[];
  getCurrentTree(): FileTreeNode[];
  isMultiSelectMode(): boolean;
  enableFileSystemWatching(): void;
  disableFileSystemWatching(): void;
}

export interface FileSystemWatcher {
  watch(path: string, callback: (event: FileSystemEvent) => void): void;
  unwatch(path: string): void;
  close(): void;
}

export interface FileSystemEvent {
  type: 'created' | 'modified' | 'deleted' | 'moved';
  path: string;
  newPath?: string;
  isDirectory: boolean;
}