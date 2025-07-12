import { Command } from 'commander';
import { chatCommand } from './chat.command';
import { versionCommand } from './version.command';
import { configCommand } from './config.command';
import { initCommand } from './init.command';

export async function registerCommands(program: Command): Promise<void> {
  // Register chat command (default command)
  program.addCommand(chatCommand);
  
  // Register other commands
  program.addCommand(versionCommand);
  program.addCommand(configCommand);
  program.addCommand(initCommand);

  // Set default action (chat)
  program.action(async () => {
    await chatCommand.parseAsync(['chat'], { from: 'user' });
  });
}