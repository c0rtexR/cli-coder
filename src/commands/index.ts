import { Command } from 'commander';
import { chatCommand } from './chat.command';
import { versionCommand } from './version.command';
import { configCommand } from './config.command';
import { initCommand } from './init.command';

export async function registerCommands(program: Command): Promise<void> {
  // Register commands
  program.addCommand(chatCommand);
  program.addCommand(versionCommand);
  program.addCommand(configCommand);
  program.addCommand(initCommand);

  // Handle unknown commands
  program.on('command:*', (operands) => {
    console.error(`unknown command '${operands[0]}'`);
    const availableCommands = program.commands.map(cmd => cmd.name());
    console.error(`Available commands are: ${availableCommands.join(', ')}`);
    process.exit(1);
  });

  // Set default action - if no command provided, show help
  program.action(async (options, command) => {
    // If there are arguments that don't match a command, it's an unknown command
    const args = command.args;
    if (args.length > 0) {
      console.error(`unknown command '${args[0]}'`);
      const availableCommands = program.commands.map(cmd => cmd.name());
      console.error(`Available commands are: ${availableCommands.join(', ')}`);
      process.exit(1);
    }
    // Otherwise show help
    program.help();
  });
}