#!/usr/bin/env node

import { Command } from 'commander';
import chalk from 'chalk';
import { registerCommands } from './commands/index';
import { setupErrorHandling } from './utils/errors';

async function main(): Promise<void> {
  const program = new Command();
  
  program
    .name('cli-coder')
    .description('AI-powered CLI coding assistant')
    .version('0.1.0');

  // Setup global error handling
  setupErrorHandling();

  // Register all commands
  await registerCommands(program);

  // Parse arguments
  await program.parseAsync(process.argv);
}

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  console.error(chalk.red('Unhandled promise rejection:'), reason);
  process.exit(1);
});

// Run the CLI
main().catch((error) => {
  console.error(chalk.red('Fatal error:'), error.message);
  process.exit(1);
});

export { main as program };
export default main;