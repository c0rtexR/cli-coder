import chalk from 'chalk';
import { ChatInterface } from './interface';

export class CommandParser {
  private chatInterface: ChatInterface;

  constructor(chatInterface: ChatInterface) {
    this.chatInterface = chatInterface;
  }

  async parseCommand(command: string): Promise<void> {
    const parts = command.slice(1).split(' ');
    const cmd = parts[0].toLowerCase();

    switch (cmd) {
      case 'help':
        this.chatInterface.showHelp();
        break;

      case 'clear':
        this.handleClear();
        break;

      case 'context':
        this.handleShowContext();
        break;

      case 'exit':
      case 'quit':
        await this.chatInterface.stop();
        break;

      default:
        console.log(chalk.red(`Unknown command: /${cmd}`));
        console.log(chalk.gray('Type /help for available commands'));
    }
  }

  private handleClear(): void {
    const session = this.chatInterface.getSession();
    session.messages = [];
    console.log(chalk.green('✅ Chat history cleared'));
  }

  private handleShowContext(): void {
    const session = this.chatInterface.getSession();
    
    if (session.context.length === 0) {
      console.log(chalk.gray('No files in context'));
      return;
    }

    console.log(chalk.blue.bold(`📁 Files in Context (${session.context.length}):`));
    session.context.forEach((file, index) => {
      console.log(chalk.gray(`  ${index + 1}. ${file.path}`));
    });
  }
}