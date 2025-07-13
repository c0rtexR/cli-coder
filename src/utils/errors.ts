import chalk from 'chalk';
import { CLIErrorClass as CLIErrorInterface } from '../types';

export class CLIErrorClass extends Error implements CLIErrorInterface {
  constructor(
    public code: string,
    message: string,
    public details?: unknown
  ) {
    super(message);
    this.name = 'CLIError';
  }
}

export function setupErrorHandling(): void {
  process.on('uncaughtException', (error) => {
    console.error(chalk.red.bold('Uncaught Exception:'));
    console.error(chalk.red(error.message));
    if (process.env.NODE_ENV === 'development') {
      console.error(error.stack);
    }
    if (process.env.NODE_ENV !== 'test' && process.env.VITEST !== 'true') {
      process.exit(1);
    }
  });
}

export function handleError(error: Error | CLIErrorClass): void {
  if (error instanceof CLIErrorClass) {
    console.error(chalk.red(`Error [${error.code}]:`), error.message);
    if (error.details && process.env.NODE_ENV === 'development') {
      console.error(chalk.gray('Details:'), error.details);
    }
  } else {
    console.error(chalk.red('Unexpected error:'), error.message);
    if (process.env.NODE_ENV === 'development') {
      console.error(error.stack);
    }
  }
  
  // Don't exit in test environments
  if (process.env.NODE_ENV !== 'test' && process.env.VITEST !== 'true') {
    process.exit(1);
  }
}