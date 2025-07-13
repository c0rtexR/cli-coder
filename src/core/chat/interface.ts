/**
 * @fileoverview Interactive chat interface for LLM conversations
 */

import chalk from 'chalk';
import ora from 'ora';
import { ChatSession, ChatMessage, AppConfig } from '../../types';
import { llmService } from '../../integrations/llm';
import { CommandParser } from './parser';
import { ChatFormatter } from './formatter';

export class ChatInterface {
  private session: ChatSession;
  private config: AppConfig;
  private parser: CommandParser;
  private formatter: ChatFormatter;
  private isActive: boolean = false;
  private inputHandler?: (data: Buffer) => void;

  constructor(session: ChatSession, config: AppConfig) {
    this.session = session;
    this.config = config;
    this.parser = new CommandParser(this);
    this.formatter = new ChatFormatter();
  }

  async start(): Promise<void> {
    this.isActive = true;
    
    console.log(chalk.blue.bold('🤖 CLI Coder Chat'));
    console.log(chalk.gray(`Provider: ${llmService.getProviderName()}`));
    console.log(chalk.gray('Type /help for commands, Ctrl+C to exit'));
    console.log();

    // Set up input handling
    process.stdin.setEncoding('utf8');
    this.inputHandler = (data: Buffer) => {
      this.handleInput(data.toString());
    };
    process.stdin.on('data', this.inputHandler);
    
    this.showPrompt();

    // Keep process alive and handle SIGINT
    return new Promise((resolve) => {
      const handleExit = () => {
        this.stop().then(resolve);
      };
      
      process.on('SIGINT', handleExit);
      
      // Clean up listener when done
      process.once('exit', () => {
        process.removeListener('SIGINT', handleExit);
      });
    });
  }

  async handleInput(input: string): Promise<void> {
    const message = input.trim();
    
    if (!message) {
      this.showPrompt();
      return;
    }

    try {
      if (message.startsWith('/')) {
        await this.parser.parseCommand(message);
      } else {
        await this.handleChatMessage(message);
      }
    } catch (error) {
      console.error(chalk.red('Error:'), (error as Error).message);
    }
    
    this.showPrompt();
  }

  private async handleChatMessage(message: string): Promise<void> {
    // Add user message
    const userMessage: ChatMessage = {
      role: 'user',
      content: message,
      timestamp: new Date(),
    };
    this.session.messages.push(userMessage);

    // Show loading
    const spinner = ora('Thinking...').start();

    try {
      const response = await llmService.generateResponse(message, {
        messages: this.session.messages,
        files: this.session.context,
      });

      spinner.stop();

      // Add AI response
      const aiMessage: ChatMessage = {
        role: 'assistant',
        content: response.content,
        timestamp: new Date(),
      };
      this.session.messages.push(aiMessage);

      // Display response
      console.log(this.formatter.formatAIResponse(response.content));
      
    } catch (error) {
      spinner.stop();
      throw error;
    }
  }

  private showPrompt(): void {
    if (this.isActive) {
      process.stdout.write(chalk.cyan('> '));
    }
  }

  async stop(): Promise<void> {
    this.isActive = false;
    
    // Clean up input handler
    if (this.inputHandler) {
      process.stdin.removeListener('data', this.inputHandler);
    }
    
    console.log(chalk.yellow('\n👋 Goodbye!'));
    process.exit(0);
  }

  // Methods for slash commands
  public getSession(): ChatSession {
    return this.session;
  }

  public showHelp(): void {
    console.log(chalk.blue('Available Commands:'));
    console.log(chalk.gray('/help               - Show this help'));
    console.log(chalk.gray('/clear              - Clear chat history'));
    console.log(chalk.gray('/context            - Show files in context'));
    console.log(chalk.gray('/add <pattern>      - Add files to context (supports glob patterns)'));
    console.log(chalk.gray('/remove <file>      - Remove files from context'));
    console.log(chalk.gray('/remove all         - Remove all files from context'));
    console.log(chalk.gray('/exit               - Exit chat'));
    console.log();
    console.log(chalk.blue('File Pattern Examples:'));
    console.log(chalk.gray('/add src/main.ts    - Add single file'));
    console.log(chalk.gray('/add src/**/*.ts    - Add all TypeScript files in src/'));
    console.log(chalk.gray('/add *.json         - Add all JSON files in current directory'));
  }
}