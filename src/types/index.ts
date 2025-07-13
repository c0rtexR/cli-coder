/**
 * Central type definitions export for CLI coder application
 */

// CLI Types
export * from './cli.types';

// LLM Types  
export * from './llm.types';

// Shell Integration Types
export * from './shell.types';

// Configuration Types
export * from './config.types';

// Session Types
export * from './session.types';

// TUI Types
export * from './tui.types';

// Utility Types
export type Result<T, E = Error> = {
  success: true;
  data: T;
} | {
  success: false;
  error: E;
};

export type AsyncResult<T, E = Error> = Promise<Result<T, E>>;

// Type Guards
export function isSuccess<T, E>(result: Result<T, E>): result is { success: true; data: T } {
  return result.success;
}

export function isError<T, E>(result: Result<T, E>): result is { success: false; error: E } {
  return !result.success;
}