import { Command } from 'commander';
import chalk from 'chalk';
import inquirer from 'inquirer';
import { ConfigManager } from '../config';
import { SetupWizard } from '../core/wizard/setup';

const configManager = new ConfigManager();

export const configCommand = new Command('config')
  .description('Manage configuration')
  .option('-l, --list', 'List current configuration')
  .option('--setup', 'Interactive configuration setup')
  .option('--setup-shell', 'Setup shell command preferences')
  .option('--global', 'Use global configuration')
  .action(async (options) => {
    if (options.setup) {
      await setupInteractiveConfig(options.global);
    } else if (options.setupShell) {
      await setupShellConfig(options.global);
    } else if (options.list) {
      await listConfiguration();
    } else {
      configCommand.help();
    }
  });

async function setupInteractiveConfig(global = false): Promise<void> {
  console.clear();
  await SetupWizard.showWelcomeMessage();
  const wizard = new SetupWizard();
  await wizard.run();
}

async function setupShellConfig(global = false): Promise<void> {
  console.log(chalk.blue.bold('⚙️ Shell Command Configuration'));
  
  const answers = await inquirer.prompt([
    {
      type: 'confirm',
      name: 'confirmationRequired',
      message: 'Require confirmation for shell commands?',
      default: true,
    },
    {
      type: 'input',
      name: 'defaultTimeout',
      message: 'Default timeout for commands (seconds):',
      default: '30',
      validate: (input: string): boolean | string => {
        const num = parseInt(input);
        return !isNaN(num) && num > 0 ? true : 'Please enter a positive number';
      },
    },
    {
      type: 'confirm',
      name: 'allowDangerousCommands',
      message: 'Allow potentially dangerous commands? (NOT RECOMMENDED)',
      default: false,
    },
    {
      type: 'input',
      name: 'historySize',
      message: 'Number of commands to keep in history:',
      default: '100',
      validate: (input: string): boolean | string => {
        const num = parseInt(input);
        return !isNaN(num) && num > 0 ? true : 'Please enter a positive number';
      },
    },
  ]);

  const config = {
    shell: {
      confirmationRequired: answers.confirmationRequired,
      defaultTimeout: parseInt(answers.defaultTimeout) * 1000, // Convert to milliseconds
      allowDangerousCommands: answers.allowDangerousCommands,
      historySize: parseInt(answers.historySize),
    },
  };

  await configManager.saveConfig(config, global);
  console.log(chalk.green('✅ Shell configuration saved!'));
  
  if (answers.allowDangerousCommands) {
    console.log(chalk.red('⚠️  WARNING: Dangerous commands are now allowed!'));
    console.log(chalk.yellow('Use with extreme caution.'));
  }
}

async function listConfiguration(): Promise<void> {
  const config = await configManager.loadConfig();
  
  // Hide sensitive information
  const displayConfig = { ...config };
  if (displayConfig.llm?.apiKey) {
    displayConfig.llm.apiKey = `${displayConfig.llm.apiKey.slice(0, 8)}...`;
  }
  
  console.log(chalk.blue.bold('📋 Current Configuration:'));
  console.log();
  console.log(chalk.green('LLM Settings:'));
  console.log(`  Provider: ${displayConfig.llm.provider}`);
  console.log(`  Model: ${displayConfig.llm.model}`);
  console.log(`  API Key: ${displayConfig.llm.apiKey}`);
  console.log();
  console.log(chalk.yellow('Shell Settings:'));
  console.log(`  Confirmation Required: ${displayConfig.shell.confirmationRequired}`);
  console.log(`  Default Timeout: ${displayConfig.shell.defaultTimeout / 1000}s`);
  console.log(`  Allow Dangerous: ${displayConfig.shell.allowDangerousCommands}`);
  console.log(`  History Size: ${displayConfig.shell.historySize}`);
  console.log();
  console.log(chalk.gray('Session Settings:'));
  console.log(`  Save History: ${displayConfig.session.saveHistory}`);
  console.log(`  Max History: ${displayConfig.session.maxHistorySize}`);
}