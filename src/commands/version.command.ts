import { Command } from 'commander';
import chalk from 'chalk';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

// Get __dirname equivalent for ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export const versionCommand = new Command('version')
  .description('Display version information')
  .option('-j, --json', 'Output as JSON')
  .action(async (options) => {
    try {
      // Try multiple possible locations for package.json
      let packageJson;
      const possiblePaths = [
        join(__dirname, '../../package.json'),
        join(process.cwd(), 'package.json'),
        join(__dirname, '../../../package.json')
      ];

      for (const packagePath of possiblePaths) {
        try {
          packageJson = JSON.parse(readFileSync(packagePath, 'utf-8'));
          break;
        } catch (_error) {
          // Continue to next path
        }
      }

      if (!packageJson) {
        // Fallback to hardcoded values
        packageJson = {
          name: 'cli-coder',
          version: '0.1.0',
          description: 'AI-powered CLI coding assistant'
        };
      }
      
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