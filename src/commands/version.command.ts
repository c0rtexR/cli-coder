import { Command } from 'commander';
import chalk from 'chalk';
import { readFileSync } from 'fs';
import { join } from 'path';

export const versionCommand = new Command('version')
  .description('Display version information')
  .option('-j, --json', 'Output as JSON')
  .action(async (options) => {
    try {
      const packagePath = join(__dirname, '../package.json');
      const packageJson = JSON.parse(readFileSync(packagePath, 'utf-8'));
      
      const versionInfo = {
        version: packageJson.version,
        name: packageJson.name,
        description: packageJson.description,
        node: process.version,
        platform: process.platform,
        arch: process.arch
      };

      if (options.json) {
        console.log(JSON.stringify(versionInfo, null, 2));
      } else {
        console.log(chalk.blue.bold(packageJson.name), chalk.green(packageJson.version));
        console.log(chalk.gray(packageJson.description));
        console.log();
        console.log(chalk.gray(`Node.js: ${process.version}`));
        console.log(chalk.gray(`Platform: ${process.platform} ${process.arch}`));
      }
    } catch (error) {
      console.error(chalk.red('Error reading version information'), error);
      process.exit(1);
    }
  });