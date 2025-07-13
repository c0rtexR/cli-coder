import { Command } from 'commander';
import chalk from 'chalk';
import { ConfigManager } from '../config/manager';
import { llmService } from '../integrations/llm';
import { ChatInterface } from '../core/chat/interface';
import { ChatSession } from '../types';
import { handleError } from '../utils/errors';

const configManager = new ConfigManager();

export const chatCommand = new Command('chat')
  .description('Start interactive chat session')
  .option('-m, --model <model>', 'LLM model to use')
  .option('-p, --provider <provider>', 'LLM provider (openai, anthropic, gemini)')
  .option('--no-git', 'Disable git integration')
  .action(async (options) => {
    try {
      await startChatSession(options);
    } catch (error) {
      handleError(error as Error);
    }
  });

interface ChatCommandOptions {
  model?: string;
  provider?: string;
  git?: boolean;
}

async function startChatSession(options: ChatCommandOptions): Promise<void> {
  console.log(chalk.blue('🚀 Starting chat session...'));

  // Load configuration
  const config = await configManager.loadConfig();
  
  // Override with command options
  if (options.model) config.llm.model = options.model;
  if (options.provider) config.llm.provider = options.provider as 'openai' | 'anthropic' | 'gemini';

  // Initialize LLM service
  try {
    await llmService.initialize(config.llm);
  } catch (error) {
    console.error(chalk.red('❌ Failed to initialize LLM'));
    console.error(chalk.gray('Run "cli-coder config --setup"'));
    throw error;
  }

  // Create session
  const session: ChatSession = {
    id: `session_${Date.now()}`,
    messages: [],
    context: [],
    config: config,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  // Start chat
  const chatInterface = new ChatInterface(session, config);
  await chatInterface.start();
}