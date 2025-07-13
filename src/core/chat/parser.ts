/**
 * @fileoverview Command parser for slash commands in chat interface
 */

import chalk from 'chalk';
import type { ChatInterface } from './interface';
import { fileService } from '../../integrations/filesystem/service';
import { shellService } from '../../integrations/shell/service';
import { handleError } from '../../utils/errors';

export class CommandParser {
  private chatInterface: ChatInterface;

  constructor(chatInterface: ChatInterface) {
    this.chatInterface = chatInterface;
  }

  async parseCommand(command: string): Promise<void> {
    const parts = command.slice(1).split(' ').filter(part => part.trim() !== '');
    const cmd = parts[0]?.toLowerCase() || '';
    const args = parts.slice(1);

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

      case 'add':
        await this.handleAddFiles(args);
        break;

      case 'remove':
        await this.handleRemoveFiles(args);
        break;

      case 'shell':
      case 'sh':
        await this.handleShellCommand(args);
        break;

      case 'git':
        await this.handleGitCommand(args);
        break;

      case 'npm':
        await this.handleNpmCommand(args);
        break;

      case 'docker':
        await this.handleDockerCommand(args);
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

    console.log(chalk.blue(`📁 Files in Context (${session.context.length}):`));
    session.context.forEach((file, index) => {
      const sizeKB = Math.round(file.size / 1024);
      console.log(chalk.gray(`  ${index + 1}. ${file.path} (${sizeKB}KB, ${file.language})`));
    });

    const totalSize = session.context.reduce((sum, file) => sum + file.size, 0);
    console.log(chalk.gray(`Total: ${Math.round(totalSize / 1024)}KB`));
  }

  private async handleAddFiles(args: string[]): Promise<void> {
    if (args.length === 0) {
      console.log(chalk.red('Usage: /add <file-pattern> [file-pattern...]'));
      console.log(chalk.gray('Examples:'));
      console.log(chalk.gray('  /add src/main.ts'));
      console.log(chalk.gray('  /add src/**/*.ts'));
      console.log(chalk.gray('  /add package.json README.md'));
      return;
    }

    try {
      console.log(chalk.blue('📂 Adding files to context...'));
      
      const newFiles = await fileService.addFilesToContext(args);
      const session = this.chatInterface.getSession();
      
      // Check for duplicates
      const existingPaths = new Set(session.context.map(f => f.path));
      const uniqueNewFiles = newFiles.filter(f => !existingPaths.has(f.path));
      
      if (uniqueNewFiles.length === 0) {
        console.log(chalk.yellow('All files are already in context'));
        return;
      }

      // Add to context
      session.context.push(...uniqueNewFiles);
      
      console.log(chalk.green(`✅ Added ${uniqueNewFiles.length} files to context:`));
      uniqueNewFiles.forEach(file => {
        const sizeKB = Math.round(file.size / 1024);
        console.log(chalk.gray(`  + ${file.path} (${sizeKB}KB)`));
      });

      if (newFiles.length > uniqueNewFiles.length) {
        const duplicates = newFiles.length - uniqueNewFiles.length;
        console.log(chalk.yellow(`Note: ${duplicates} files were already in context`));
      }

    } catch (error) {
      handleError(error as Error);
    }
  }

  private async handleRemoveFiles(args: string[]): Promise<void> {
    const session = this.chatInterface.getSession();
    
    if (args.length === 0) {
      console.log(chalk.red('Usage: /remove <file-path> [file-path...] or /remove all'));
      console.log(chalk.gray('Examples:'));
      console.log(chalk.gray('  /remove src/main.ts'));
      console.log(chalk.gray('  /remove all'));
      return;
    }

    if (args[0] === 'all') {
      const count = session.context.length;
      session.context = [];
      console.log(chalk.green(`✅ Removed all ${count} files from context`));
      return;
    }

    let removedCount = 0;
    for (const filePath of args) {
      const initialLength = session.context.length;
      session.context = session.context.filter(f => f.path !== filePath);
      
      if (session.context.length < initialLength) {
        removedCount++;
        console.log(chalk.green(`✅ Removed: ${filePath}`));
      } else {
        console.log(chalk.yellow(`⚠️  Not in context: ${filePath}`));
      }
    }

    if (removedCount > 0) {
      console.log(chalk.blue(`Removed ${removedCount} files from context`));
    }
  }

  private async handleShellCommand(args: string[]): Promise<void> {
    if (args.length === 0) {
      console.log(chalk.red('Usage: /shell <command>'));
      console.log(chalk.gray('Examples:'));
      console.log(chalk.gray('  /shell git status'));
      console.log(chalk.gray('  /shell npm install lodash'));
      console.log(chalk.gray('  /shell docker ps'));
      console.log(chalk.gray('  /shell ls -la'));
      return;
    }

    const command = args.join(' ');
    
    try {
      const result = await shellService.execute(command, {
        workingDirectory: process.cwd(),
        showOutput: true,
      });

      if (result.success) {
        console.log(chalk.green(`✅ Command completed (${result.duration}ms)`));
      } else {
        console.log(chalk.red(`❌ Command failed with exit code ${result.exitCode}`));
      }
    } catch (error) {
      handleError(error as Error);
    }
  }

  private async handleGitCommand(args: string[]): Promise<void> {
    if (args.length === 0) {
      console.log(chalk.red('Usage: /git <subcommand>'));
      console.log(chalk.gray('Examples:'));
      console.log(chalk.gray('  /git status'));
      console.log(chalk.gray('  /git add .'));
      console.log(chalk.gray('  /git commit -m "message"'));
      console.log(chalk.gray('  /git log --oneline -5'));
      console.log(chalk.gray('  /git branch'));
      return;
    }

    try {
      const result = await shellService.git(args.join(' '));
      if (result.success) {
        console.log(chalk.green('✅ Git command completed'));
      } else {
        console.log(chalk.red('❌ Git command failed'));
      }
    } catch (error) {
      handleError(error as Error);
    }
  }

  private async handleNpmCommand(args: string[]): Promise<void> {
    if (args.length === 0) {
      console.log(chalk.red('Usage: /npm <subcommand>'));
      console.log(chalk.gray('Examples:'));
      console.log(chalk.gray('  /npm install'));
      console.log(chalk.gray('  /npm test'));
      console.log(chalk.gray('  /npm run build'));
      console.log(chalk.gray('  /npm list --depth=0'));
      console.log(chalk.gray('  /npm --version'));
      return;
    }

    try {
      const result = await shellService.npm(args.join(' '));
      if (result.success) {
        console.log(chalk.green('✅ NPM command completed'));
      } else {
        console.log(chalk.red('❌ NPM command failed'));
      }
    } catch (error) {
      handleError(error as Error);
    }
  }

  private async handleDockerCommand(args: string[]): Promise<void> {
    if (args.length === 0) {
      console.log(chalk.red('Usage: /docker <subcommand>'));
      console.log(chalk.gray('Examples:'));
      console.log(chalk.gray('  /docker ps'));
      console.log(chalk.gray('  /docker images'));
      console.log(chalk.gray('  /docker build -t myapp .'));
      console.log(chalk.gray('  /docker run hello-world'));
      console.log(chalk.gray('  /docker --version'));
      return;
    }

    try {
      const result = await shellService.docker(args.join(' '));
      if (result.success) {
        console.log(chalk.green('✅ Docker command completed'));
      } else {
        console.log(chalk.red('❌ Docker command failed'));
      }
    } catch (error) {
      handleError(error as Error);
    }
  }
}