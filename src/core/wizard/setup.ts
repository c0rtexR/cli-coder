import chalk from 'chalk';
import inquirer from 'inquirer';
import { ConfigManager } from '../../config/manager';
import { LLMProviderFactory } from '../../integrations/llm/factory';
import { AppConfig } from '../../types';

export class SetupWizard {
  private configManager: ConfigManager;

  constructor() {
    this.configManager = new ConfigManager();
  }

  async run(): Promise<AppConfig> {
    console.log(chalk.blue.bold('\n🎉 Welcome to CLI Coder!'));
    console.log(chalk.gray('Let\'s get you set up with your AI coding assistant.\n'));

    const config = await this.runInteractiveSetup();
    
    console.log(chalk.green('\n✅ Setup complete!'));
    console.log(chalk.gray('Your configuration has been saved. Starting CLI Coder...\n'));
    
    return config;
  }

  private async runInteractiveSetup(): Promise<AppConfig> {
    // Step 1: Choose LLM Provider
    const providerChoice = await inquirer.prompt([
      {
        type: 'list',
        name: 'provider',
        message: 'Choose your AI provider:',
        choices: [
          {
            name: 'Anthropic Claude (Recommended) - Advanced reasoning and coding',
            value: 'anthropic',
          },
          {
            name: 'OpenAI GPT - Popular and versatile',
            value: 'openai',
          },
        ],
        default: 'anthropic',
      },
    ]);

    // Step 2: Get API Key
    const { apiKey } = await inquirer.prompt([
      {
        type: 'password',
        name: 'apiKey',
        message: `Enter your ${providerChoice.provider === 'anthropic' ? 'Anthropic' : 'OpenAI'} API key:`,
        mask: '*',
        validate: (input: string) => {
          if (!input.trim()) {
            return 'API key is required';
          }
          if (providerChoice.provider === 'anthropic' && !input.startsWith('sk-ant-')) {
            return 'Anthropic API keys should start with "sk-ant-"';
          }
          if (providerChoice.provider === 'openai' && !input.startsWith('sk-')) {
            return 'OpenAI API keys should start with "sk-"';
          }
          return true;
        },
      },
    ]);

    // Step 3: Choose Model
    const modelChoices = this.getModelChoices(providerChoice.provider);
    const { model } = await inquirer.prompt([
      {
        type: 'list',
        name: 'model',
        message: 'Choose a model:',
        choices: modelChoices,
        default: modelChoices[0].value,
      },
    ]);

    // Step 4: Advanced Settings (Optional)
    const { configureAdvanced } = await inquirer.prompt([
      {
        type: 'confirm',
        name: 'configureAdvanced',
        message: 'Would you like to configure advanced settings?',
        default: false,
      },
    ]);

    let temperature = 0.7;
    let maxTokens = 4000;

    if (configureAdvanced) {
      const advanced = await inquirer.prompt([
        {
          type: 'number',
          name: 'temperature',
          message: 'Temperature (creativity, 0.0-1.0):',
          default: 0.7,
          validate: (input: number) => {
            if (input < 0 || input > 1) {
              return 'Temperature must be between 0.0 and 1.0';
            }
            return true;
          },
        },
        {
          type: 'number',
          name: 'maxTokens',
          message: 'Max tokens per response:',
          default: 4000,
          validate: (input: number) => {
            if (input < 100 || input > 8000) {
              return 'Max tokens must be between 100 and 8000';
            }
            return true;
          },
        },
      ]);
      temperature = advanced.temperature;
      maxTokens = advanced.maxTokens;
    }

    // Create and save configuration
    const config: AppConfig = {
      llm: {
        provider: providerChoice.provider,
        apiKey,
        model,
        temperature,
        maxTokens,
      },
      shell: {
        allowDangerousCommands: false,
        defaultTimeout: 30000,
        confirmationRequired: true,
        historySize: 100,
      },
      editor: {
        defaultEditor: 'code',
        tempDir: '/tmp',
      },
      session: {
        saveHistory: true,
        maxHistorySize: 100,
        historyPath: '.cli-coder/history',
      },
    };

    await this.configManager.saveConfig(config);
    return config;
  }

  private getModelChoices(provider: string) {
    switch (provider) {
      case 'anthropic':
        return [
          { name: 'Claude 3.5 Sonnet (Recommended) - Best balance of speed and intelligence', value: 'claude-3-5-sonnet-20241022' },
          { name: 'Claude 3.5 Haiku - Fastest responses', value: 'claude-3-5-haiku-20241022' },
          { name: 'Claude 3 Opus - Most capable', value: 'claude-3-opus-20240229' },
        ];
      case 'openai':
        return [
          { name: 'GPT-4o (Recommended) - Latest and most capable', value: 'gpt-4o' },
          { name: 'GPT-4 Turbo - High performance', value: 'gpt-4-turbo-preview' },
          { name: 'GPT-3.5 Turbo - Fast and cost-effective', value: 'gpt-3.5-turbo' },
        ];
      default:
        return [{ name: 'Default', value: 'default' }];
    }
  }

  static async showWelcomeMessage(): Promise<void> {
    console.log(chalk.blue.bold('\n🤖 CLI Coder'));
    console.log(chalk.gray('AI-powered coding assistant for your terminal\n'));
    
    console.log(chalk.yellow('💡 To get started, you\'ll need:'));
    console.log(chalk.gray('  • An API key from Anthropic or OpenAI'));
    console.log(chalk.gray('  • Basic knowledge of your preferred AI provider\n'));
    
    console.log(chalk.blue('🔗 Get your API keys:'));
    console.log(chalk.gray('  • Anthropic: https://console.anthropic.com/'));
    console.log(chalk.gray('  • OpenAI: https://platform.openai.com/api-keys\n'));
    
    const { proceed } = await inquirer.prompt([
      {
        type: 'confirm',
        name: 'proceed',
        message: 'Ready to set up CLI Coder?',
        default: true,
      },
    ]);

    if (!proceed) {
      console.log(chalk.yellow('\n👋 Setup cancelled. Run "cli-coder config --setup" when you\'re ready!'));
      process.exit(0);
    }
  }
}