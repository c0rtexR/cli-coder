import { Command } from 'commander';
import chalk from 'chalk';
import { ConfigManager } from '../config/manager';

const configManager = new ConfigManager();

export const configCommand = new Command('config')
  .description('Manage configuration')
  .option('-l, --list', 'List current configuration')
  .option('--setup', 'Interactive configuration setup')
  .option('--setup-shell', 'Setup shell command preferences')
  .option('--global', 'Use global configuration')
  .action(async (options) => {
    try {
      if (options.setup) {
        await setupInteractiveConfig(options.global);
      } else if (options.setupShell) {
        await setupShellConfig(options.global);
      } else if (options.list) {
        await listConfiguration();
      } else {
        configCommand.help();
      }
    } catch (error) {
      console.error(chalk.red('Configuration error:'), error instanceof Error ? error.message : error);
      process.exit(1);
    }
  });

async function setupInteractiveConfig(global = false): Promise<void> {
  console.log(chalk.blue('🚧 Interactive configuration setup will be implemented in future issues'));
  console.log(chalk.gray('This will provide a step-by-step guide to configure:'));
  console.log(chalk.gray('- LLM provider and API keys'));
  console.log(chalk.gray('- Model preferences'));
  console.log(chalk.gray('- Shell command settings'));
  console.log(chalk.gray('- Editor integration'));
  console.log(chalk.gray(`Target: ${global ? 'global' : 'local'} configuration`));
}

async function setupShellConfig(global = false): Promise<void> {
  console.log(chalk.blue('🚧 Shell configuration setup will be implemented in future issues'));
  console.log(chalk.gray('This will configure:'));
  console.log(chalk.gray('- Command timeout settings'));
  console.log(chalk.gray('- Dangerous command policies'));
  console.log(chalk.gray('- Confirmation requirements'));
  console.log(chalk.gray('- Command history preferences'));
  console.log(chalk.gray(`Target: ${global ? 'global' : 'local'} configuration`));
}

async function listConfiguration(): Promise<void> {
  try {
    const config = await configManager.loadConfig();
    
    // Hide sensitive information
    const displayConfig = structuredClone(config);
    if (displayConfig.llm?.apiKey) {
      const key = displayConfig.llm.apiKey;
      displayConfig.llm.apiKey = key.length > 8 ? `${key.slice(0, 8)}...` : key;
    }
    
    console.log(chalk.blue.bold('📋 Current Configuration:'));
    console.log();
    console.log(chalk.green('LLM Settings:'));
    console.log(`  Provider: ${displayConfig.llm.provider}`);
    console.log(`  Model: ${displayConfig.llm.model}`);
    console.log(`  API Key: ${displayConfig.llm.apiKey}`);
    if (displayConfig.llm.temperature !== undefined) {
      console.log(`  Temperature: ${displayConfig.llm.temperature}`);
    }
    if (displayConfig.llm.maxTokens !== undefined) {
      console.log(`  Max Tokens: ${displayConfig.llm.maxTokens}`);
    }
    console.log();
    
    console.log(chalk.yellow('Shell Settings:'));
    console.log(`  Confirmation Required: ${displayConfig.shell.confirmationRequired}`);
    console.log(`  Default Timeout: ${displayConfig.shell.defaultTimeout / 1000}s`);
    console.log(`  Allow Dangerous: ${displayConfig.shell.allowDangerousCommands}`);
    console.log(`  History Size: ${displayConfig.shell.historySize}`);
    if (displayConfig.shell.workingDirectory) {
      console.log(`  Working Directory: ${displayConfig.shell.workingDirectory}`);
    }
    console.log();
    
    console.log(chalk.cyan('Editor Settings:'));
    console.log(`  Default Editor: ${displayConfig.editor.defaultEditor}`);
    console.log(`  Temp Directory: ${displayConfig.editor.tempDir}`);
    console.log();
    
    console.log(chalk.gray('Session Settings:'));
    console.log(`  Save History: ${displayConfig.session.saveHistory}`);
    console.log(`  Max History: ${displayConfig.session.maxHistorySize}`);
  } catch (error) {
    throw new Error(`Failed to load configuration: ${error instanceof Error ? error.message : error}`);
  }
}