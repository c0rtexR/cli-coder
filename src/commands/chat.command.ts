import { Command } from 'commander';
import chalk from 'chalk';
import React from 'react';
import { render } from 'ink';
import { ConfigManager } from '../config/manager';
import { llmService } from '../integrations/llm';
import { ChatInterface } from '../core/chat/interface';
import { TUIApp } from '../core/tui/app';
import { SetupWizard } from '../core/wizard/setup';
import { ChatSession } from '../types';
import { handleError } from '../utils/errors';

const configManager = new ConfigManager();

export const chatCommand = new Command('chat')
  .description('Start interactive chat session')
  .option('-m, --model <model>', 'LLM model to use')
  .option('-p, --provider <provider>', 'LLM provider')
  .option('--basic', 'Use basic terminal interface (fallback mode)')
  .action(async (options) => {
    try {
      await startChatSession(options);
    } catch (error) {
      handleError(error as Error);
    }
  });

async function startChatSession(options: { model?: string; provider?: string; basic?: boolean }): Promise<void> {
  // Try to load configuration
  let config;
  try {
    config = await configManager.loadConfig();
  } catch (error) {
    // Configuration doesn't exist or is invalid - run setup wizard
    console.clear();
    await SetupWizard.showWelcomeMessage();
    const wizard = new SetupWizard();
    config = await wizard.run();
  }
  
  // Override with command options
  if (options.model) config.llm.model = options.model;
  if (options.provider) config.llm.provider = options.provider;

  // Initialize LLM service
  try {
    await llmService.initialize(config.llm);
  } catch (error) {
    console.error(chalk.red('❌ Failed to initialize LLM'));
    console.error(chalk.yellow('💡 This usually means your API key is invalid or the service is unavailable.'));
    console.error(chalk.gray('Run "cli-coder config --setup" to reconfigure.'));
    process.exit(1);
  }

  console.log(chalk.blue('🚀 Starting chat session...'));

  // Create session
  const session: ChatSession = {
    id: `session_${Date.now()}`,
    messages: [],
    context: [],
    config: config,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  // Start appropriate interface
  if (options.basic) {
    // Start basic terminal interface (fallback mode)
    const chatInterface = new ChatInterface(session, config);
    await chatInterface.start();
  } else {
    // Start TUI interface (default)
    const app = React.createElement(TUIApp, { session, config });
    render(app);
  }
}