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
    .version('0.1.0')
    .configureOutput({
      writeErr: (str) => process.stderr.write(str),
      writeOut: (str) => process.stdout.write(str),
      outputError: (str, write) => {
        write(chalk.red(str));
      }
    })
    .exitOverride((err) => {
      // Handle commander errors properly
      const isTestEnv = process.env.NODE_ENV === 'test' || process.env.VITEST === 'true';
      
      if (err.code === 'commander.unknownCommand') {
        process.stderr.write(chalk.red('Error: unknown command\n'));
        if (!isTestEnv) process.exit(1);
        return;
      }
      if (err.code === 'commander.unknownOption') {
        process.stderr.write(chalk.red('Error: unknown option\n'));
        if (!isTestEnv) process.exit(1);
        return;
      }
      if (err.code === 'commander.excessArguments') {
        process.stderr.write(chalk.red('Error: unknown command\n'));
        if (!isTestEnv) process.exit(1);
        return;
      }
      if (err.code === 'commander.help') {
        // Help is a normal operation, exit with 0
        if (!isTestEnv) process.exit(0);
        return;
      }
      if (err.code === 'commander.helpDisplayed') {
        // Help display is also normal
        if (!isTestEnv) process.exit(0);
        return;
      }
      if (err.code === 'commander.version') {
        // Version display is also normal
        if (!isTestEnv) process.exit(0);
        return;
      }
      if (err.code === 'commander.versionDisplayed') {
        // Version display is also normal
        if (!isTestEnv) process.exit(0);
        return;
      }
      // For other errors, use default behavior
      if (!isTestEnv) process.exit(err.exitCode || 1);
    });

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
  if (process.env.NODE_ENV !== 'test' && process.env.VITEST !== 'true') {
    process.exit(1);
  }
});

// Run the CLI
main().catch((error) => {
  console.error(chalk.red('Fatal error:'), error.message);
  if (process.env.NODE_ENV !== 'test' && process.env.VITEST !== 'true') {
    process.exit(1);
  }
});

export { main as program };
export default main;