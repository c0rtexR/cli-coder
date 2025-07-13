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