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

// Utility Types

/**
 * Result type for operations that can succeed or fail
 */
export type Result<T, E = Error> = {
  success: true;
  data: T;
} | {
  success: false;
  error: E;
};

/**
 * Async result type for Promise-based operations
 */
export type AsyncResult<T, E = Error> = Promise<Result<T, E>>;

/**
 * Log levels for the application
 */
export type LogLevel = 'debug' | 'info' | 'warn' | 'error';