#!/usr/bin/env node

/**
 * CLI Coder - AI-powered CLI coding assistant
 * Main entry point
 */

import { Command } from 'commander';
import chalk from 'chalk';

const program = new Command();

program
  .name('cli-coder')
  .description('AI-powered CLI coding assistant')
  .version('0.1.0');

// Placeholder command structure
program
  .command('init')
  .description('Initialize CLI Coder configuration')
  .action(() => {
    console.log(chalk.green('🚀 CLI Coder initialized!'));
  });

program
  .command('chat')
  .description('Start interactive chat session')
  .action(() => {
    console.log(chalk.blue('💬 Chat mode coming soon...'));
  });

// Parse command line arguments
if (import.meta.url === `file://${process.argv[1]}`) {
  program.parse();
}

export { program };
export default program;