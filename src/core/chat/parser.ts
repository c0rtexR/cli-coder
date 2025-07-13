/**
 * @fileoverview Command parser for slash commands in chat interface
 */

import chalk from 'chalk';
import inquirer from 'inquirer';
import type { ChatInterface } from './interface';
import { fileService } from '../../integrations/filesystem/service';
import { shellService } from '../../integrations/shell/service';
import { handleError } from '../../utils/errors';
import { clipboardService } from '../../integrations/clipboard';
import { FilePathUtils } from '../../utils/filepath';

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
      console.log(chalk.blue('📂 Interactive file selection'));
      await this.showAddFileMenu();
      return;
    }

    const [firstArg, ...restArgs] = args;

    switch (firstArg) {
      case '--interactive':
      case '-i':
        await this.showAddFileMenu();
        break;

      case '--clipboard':
      case '-c':
        await this.addFromClipboard();
        break;

      case '--recent':
      case '-r':
        await this.addRecentFiles();
        break;

      case '--workspace':
      case '-w':
        await this.addWorkspaceFiles();
        break;

      case '--all-ts':
        await this.addFilesByPattern(['**/*.ts', '**/*.tsx']);
        break;

      case '--all-js':
        await this.addFilesByPattern(['**/*.js', '**/*.jsx']);
        break;

      case '--all-docs':
        await this.addFilesByPattern(['**/*.md', '**/*.txt', '**/*.rst']);
        break;

      case '--all-config':
        await this.addFilesByPattern(['**/package.json', '**/tsconfig.json', '**/*.config.*', '**/.env*']);
        break;

      case '--help':
      case '-h':
        this.showAddHelp();
        break;

      default:
        // Regular file patterns
        await this.addFilesByPattern([firstArg, ...restArgs]);
        break;
    }
  }

  private showAddHelp(): void {
    console.log(chalk.blue('📂 Add Files to Context - Options:'));
    console.log(chalk.gray('  /add <pattern>...          Add files by pattern(s)'));
    console.log(chalk.gray('  /add --interactive, -i     Interactive file selection'));
    console.log(chalk.gray('  /add --clipboard, -c       Add files from clipboard'));
    console.log(chalk.gray('  /add --recent, -r          Add recently used files'));
    console.log(chalk.gray('  /add --workspace, -w       Add common workspace files'));
    console.log(chalk.gray('  /add --all-ts              Add all TypeScript files'));
    console.log(chalk.gray('  /add --all-js              Add all JavaScript files'));
    console.log(chalk.gray('  /add --all-docs            Add all documentation files'));
    console.log(chalk.gray('  /add --all-config          Add all configuration files'));
    console.log(chalk.gray(''));
    console.log(chalk.gray('Examples:'));
    console.log(chalk.gray('  /add src/main.ts'));
    console.log(chalk.gray('  /add src/**/*.ts'));
    console.log(chalk.gray('  /add package.json README.md'));
    console.log(chalk.gray('  /add --clipboard'));
  }

  private async showAddFileMenu(): Promise<void> {
    try {
      const choices = [
        { name: '📋 From clipboard', value: 'clipboard' },
        { name: '🕐 Recent files', value: 'recent' },
        { name: '🏢 Workspace files', value: 'workspace' },
        { name: '📘 All TypeScript files', value: 'all-ts' },
        { name: '📄 All JavaScript files', value: 'all-js' },
        { name: '📝 All documentation', value: 'all-docs' },
        { name: '⚙️ All configuration files', value: 'all-config' },
        { name: '🔍 Custom pattern', value: 'custom' },
        { name: '❌ Cancel', value: 'cancel' },
      ];

      const answer = await inquirer.prompt([{
        type: 'list',
        name: 'action',
        message: 'How would you like to add files?',
        choices,
      }]);

      switch (answer.action) {
        case 'clipboard':
          await this.addFromClipboard();
          break;
        case 'recent':
          await this.addRecentFiles();
          break;
        case 'workspace':
          await this.addWorkspaceFiles();
          break;
        case 'all-ts':
          await this.addFilesByPattern(['**/*.ts', '**/*.tsx']);
          break;
        case 'all-js':
          await this.addFilesByPattern(['**/*.js', '**/*.jsx']);
          break;
        case 'all-docs':
          await this.addFilesByPattern(['**/*.md', '**/*.txt', '**/*.rst']);
          break;
        case 'all-config':
          await this.addFilesByPattern(['**/package.json', '**/tsconfig.json', '**/*.config.*', '**/.env*']);
          break;
        case 'custom':
          await this.addCustomPattern();
          break;
        case 'cancel':
          console.log(chalk.gray('Operation cancelled'));
          break;
      }
    } catch (error) {
      handleError(error as Error);
    }
  }

  private async addFromClipboard(): Promise<void> {
    try {
      console.log(chalk.blue('📋 Reading clipboard...'));
      
      const filePaths = await clipboardService.getFilePathsFromClipboard();
      
      if (filePaths.length === 0) {
        console.log(chalk.yellow('No valid file paths found in clipboard'));
        console.log(chalk.gray('Make sure your clipboard contains file paths like:'));
        console.log(chalk.gray('  /path/to/file.txt'));
        console.log(chalk.gray('  file:///path/to/file.txt'));
        console.log(chalk.gray('  "C:\\path\\to\\file.txt"'));
        return;
      }

      console.log(chalk.green(`Found ${filePaths.length} file(s) in clipboard:`));
      filePaths.forEach(path => {
        console.log(chalk.gray(`  ${path}`));
      });

      const answer = await inquirer.prompt([{
        type: 'confirm',
        name: 'proceed',
        message: 'Add these files to context?',
        default: true,
      }]);

      if (answer.proceed) {
        await this.addFilesByPattern(filePaths);
      } else {
        console.log(chalk.gray('Operation cancelled'));
      }
    } catch (error) {
      console.log(chalk.red(`Error reading clipboard: ${(error as Error).message}`));
      console.log(chalk.gray('Make sure clipboard tools are available on your system:'));
      console.log(chalk.gray('  macOS: pbpaste (built-in)'));
      console.log(chalk.gray('  Linux: xclip or xsel'));
      console.log(chalk.gray('  Windows: PowerShell (built-in)'));
    }
  }

  private async addRecentFiles(): Promise<void> {
    const recentFiles = FilePathUtils.getRecentFiles(10);
    
    if (recentFiles.length === 0) {
      console.log(chalk.yellow('No recent files found'));
      console.log(chalk.gray('Recent files will appear here as you use the CLI'));
      return;
    }

    const answer = await inquirer.prompt([{
      type: 'checkbox',
      name: 'files',
      message: 'Select files to add:',
      choices: recentFiles.map(file => ({
        name: file,
        value: file,
      })),
    }]);

    if (answer.files.length > 0) {
      await this.addFilesByPattern(answer.files);
    } else {
      console.log(chalk.gray('No files selected'));
    }
  }

  private async addWorkspaceFiles(): Promise<void> {
    const workspaceFiles = FilePathUtils.getCommonProjectFiles();
    
    if (workspaceFiles.length === 0) {
      console.log(chalk.yellow('No common workspace files found'));
      console.log(chalk.gray('Looking for: package.json, tsconfig.json, README.md, etc.'));
      return;
    }

    const answer = await inquirer.prompt([{
      type: 'checkbox',
      name: 'files',
      message: 'Select workspace files to add:',
      choices: workspaceFiles.map(file => ({
        name: `${FilePathUtils.getFileIcon(file)} ${file}`,
        value: file,
        checked: ['package.json', 'README.md', 'tsconfig.json'].includes(file),
      })),
    }]);

    if (answer.files.length > 0) {
      await this.addFilesByPattern(answer.files);
    } else {
      console.log(chalk.gray('No files selected'));
    }
  }

  private async addCustomPattern(): Promise<void> {
    const answer = await inquirer.prompt([{
      type: 'input',
      name: 'pattern',
      message: 'Enter file pattern (supports glob):',
      default: 'src/**/*.ts',
      validate: (input: string) => {
        if (!input.trim()) {
          return 'Pattern cannot be empty';
        }
        return true;
      },
    }]);

    if (answer.pattern) {
      await this.addFilesByPattern([answer.pattern]);
    }
  }

  private async addFilesByPattern(patterns: string[]): Promise<void> {
    try {
      console.log(chalk.blue('📂 Adding files to context...'));
      
      const newFiles = await fileService.addFilesToContext(patterns);
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
        const icon = FilePathUtils.getFileIcon(file.path);
        console.log(chalk.gray(`  ${icon} ${file.path} (${sizeKB}KB)`));
      });

      if (newFiles.length > uniqueNewFiles.length) {
        const duplicates = newFiles.length - uniqueNewFiles.length;
        console.log(chalk.yellow(`Note: ${duplicates} files were already in context`));
      }

      // Show total context size
      const totalSize = session.context.reduce((sum, file) => sum + file.size, 0);
      const totalSizeKB = Math.round(totalSize / 1024);
      console.log(chalk.blue(`Total context: ${session.context.length} files (${totalSizeKB}KB)`));

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