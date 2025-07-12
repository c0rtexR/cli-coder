import { Command } from '../components/CommandPalette';
import { ChatSession } from '../../../types';
import { shellService } from '../../../integrations/shell';
import { fileService } from '../../../integrations/filesystem/service';

export class CommandRegistry {
  private session: ChatSession;

  constructor(session: ChatSession) {
    this.session = session;
  }

  getCommands(): Command[] {
    return [
      // Chat Commands
      {
        name: 'clear',
        description: 'Clear chat history',
        usage: '/clear',
        category: 'chat',
        execute: () => {
          this.session.messages = [];
        },
      },
      {
        name: 'help',
        description: 'Show available commands',
        usage: '/help',
        category: 'help',
        execute: () => {
          this.session.messages.push({
            role: 'assistant',
            content: this.getHelpMessage(),
            timestamp: new Date(),
          });
        },
      },

      // File Commands
      {
        name: 'add',
        description: 'Add files to context (supports glob patterns)',
        usage: '/add <file-pattern>',
        category: 'files',
        execute: async (args) => {
          if (!args || args.length === 0) {
            this.session.messages.push({
              role: 'assistant',
              content: 'Usage: /add <file-pattern>\nExample: /add src/**/*.ts',
              timestamp: new Date(),
            });
            return;
          }

          try {
            const pattern = args.join(' ');
            const files = await fileService.findFiles(pattern);
            
            for (const filePath of files) {
              const fileData = await fileService.readFile(filePath);
              // Check if file is already in context
              const existingIndex = this.session.context.findIndex(f => f.path === filePath);
              
              if (existingIndex >= 0) {
                // Update existing file
                this.session.context[existingIndex] = fileData;
              } else {
                // Add new file
                this.session.context.push(fileData);
              }
            }

            this.session.messages.push({
              role: 'assistant',
              content: `Added ${files.length} file(s) to context: ${files.join(', ')}`,
              timestamp: new Date(),
            });
          } catch (error) {
            this.session.messages.push({
              role: 'assistant',
              content: `Error adding files: ${(error as Error).message}`,
              timestamp: new Date(),
            });
          }
        },
      },
      {
        name: 'remove',
        description: 'Remove files from context',
        usage: '/remove <file> or /remove all',
        category: 'files',
        execute: (args) => {
          if (!args || args.length === 0) {
            this.session.messages.push({
              role: 'assistant',
              content: 'Usage: /remove <file> or /remove all',
              timestamp: new Date(),
            });
            return;
          }

          if (args[0] === 'all') {
            const count = this.session.context.length;
            this.session.context = [];
            this.session.messages.push({
              role: 'assistant',
              content: `Removed all ${count} files from context`,
              timestamp: new Date(),
            });
            return;
          }

          const fileName = args.join(' ');
          const initialLength = this.session.context.length;
          this.session.context = this.session.context.filter(file => 
            !file.path.includes(fileName)
          );
          
          const removedCount = initialLength - this.session.context.length;
          this.session.messages.push({
            role: 'assistant',
            content: removedCount > 0 
              ? `Removed ${removedCount} file(s) matching "${fileName}"`
              : `No files found matching "${fileName}"`,
            timestamp: new Date(),
          });
        },
      },
      {
        name: 'context',
        description: 'Show files currently in context',
        usage: '/context',
        category: 'files',
        execute: () => {
          if (this.session.context.length === 0) {
            this.session.messages.push({
              role: 'assistant',
              content: 'No files in context. Use /add <pattern> to add files.',
              timestamp: new Date(),
            });
            return;
          }

          const fileList = this.session.context.map((file, index) => {
            const sizeKB = Math.round(file.size / 1024);
            return `${index + 1}. ${file.path} (${sizeKB}KB, ${file.language})`;
          }).join('\n');

          this.session.messages.push({
            role: 'assistant',
            content: `Files in context (${this.session.context.length}):\n${fileList}`,
            timestamp: new Date(),
          });
        },
      },

      // Shell Commands
      {
        name: 'shell',
        description: 'Execute shell command',
        usage: '/shell <command>',
        category: 'shell',
        execute: async (args) => {
          if (!args || args.length === 0) {
            this.session.messages.push({
              role: 'assistant',
              content: 'Usage: /shell <command>\nExample: /shell ls -la',
              timestamp: new Date(),
            });
            return;
          }

          try {
            const command = args.join(' ');
            const result = await shellService.execute(command, {
              workingDirectory: process.cwd(),
              showOutput: false,
            });

            this.session.messages.push({
              role: 'assistant',
              content: `Command: ${command}\n\nOutput:\n${result.stdout}\n${result.stderr ? `\nErrors:\n${result.stderr}` : ''}`,
              timestamp: new Date(),
            });
          } catch (error) {
            this.session.messages.push({
              role: 'assistant',
              content: `Shell command failed: ${(error as Error).message}`,
              timestamp: new Date(),
            });
          }
        },
      },
      {
        name: 'git',
        description: 'Execute git command',
        usage: '/git <subcommand>',
        category: 'shell',
        execute: async (args) => {
          if (!args || args.length === 0) {
            this.session.messages.push({
              role: 'assistant',
              content: 'Usage: /git <subcommand>\nExample: /git status',
              timestamp: new Date(),
            });
            return;
          }

          try {
            const result = await shellService.git(args.join(' '), {
              showOutput: false,
            });

            this.session.messages.push({
              role: 'assistant',
              content: `Git ${args.join(' ')}:\n\n${result.stdout}\n${result.stderr ? `\nErrors:\n${result.stderr}` : ''}`,
              timestamp: new Date(),
            });
          } catch (error) {
            this.session.messages.push({
              role: 'assistant',
              content: `Git command failed: ${(error as Error).message}`,
              timestamp: new Date(),
            });
          }
        },
      },
      {
        name: 'npm',
        description: 'Execute npm command',
        usage: '/npm <subcommand>',
        category: 'shell',
        execute: async (args) => {
          if (!args || args.length === 0) {
            this.session.messages.push({
              role: 'assistant',
              content: 'Usage: /npm <subcommand>\nExample: /npm list',
              timestamp: new Date(),
            });
            return;
          }

          try {
            const result = await shellService.npm(args.join(' '), {
              showOutput: false,
            });

            this.session.messages.push({
              role: 'assistant',
              content: `NPM ${args.join(' ')}:\n\n${result.stdout}\n${result.stderr ? `\nErrors:\n${result.stderr}` : ''}`,
              timestamp: new Date(),
            });
          } catch (error) {
            this.session.messages.push({
              role: 'assistant',
              content: `NPM command failed: ${(error as Error).message}`,
              timestamp: new Date(),
            });
          }
        },
      },
      {
        name: 'docker',
        description: 'Execute docker command',
        usage: '/docker <subcommand>',
        category: 'shell',
        execute: async (args) => {
          if (!args || args.length === 0) {
            this.session.messages.push({
              role: 'assistant',
              content: 'Usage: /docker <subcommand>\nExample: /docker ps',
              timestamp: new Date(),
            });
            return;
          }

          try {
            const result = await shellService.docker(args.join(' '), {
              showOutput: false,
            });

            this.session.messages.push({
              role: 'assistant',
              content: `Docker ${args.join(' ')}:\n\n${result.stdout}\n${result.stderr ? `\nErrors:\n${result.stderr}` : ''}`,
              timestamp: new Date(),
            });
          } catch (error) {
            this.session.messages.push({
              role: 'assistant',
              content: `Docker command failed: ${(error as Error).message}`,
              timestamp: new Date(),
            });
          }
        },
      },
    ];
  }

  private getHelpMessage(): string {
    const commands = this.getCommands();
    const categories = ['chat', 'files', 'shell', 'help'] as const;
    
    let help = 'Available Commands:\n\n';
    
    categories.forEach(category => {
      const categoryCommands = commands.filter(cmd => cmd.category === category);
      if (categoryCommands.length > 0) {
        const categoryName = category.charAt(0).toUpperCase() + category.slice(1);
        help += `${categoryName} Commands:\n`;
        categoryCommands.forEach(cmd => {
          help += `  ${cmd.usage} - ${cmd.description}\n`;
        });
        help += '\n';
      }
    });

    help += 'Tip: Type "/" to open the command palette for interactive selection!';
    return help;
  }
}