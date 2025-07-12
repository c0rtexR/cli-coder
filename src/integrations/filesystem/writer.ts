import { writeFileSync, readFileSync, existsSync, mkdirSync, copyFileSync } from 'fs';
import { dirname, join, basename } from 'path';
import inquirer from 'inquirer';
import chalk from 'chalk';

export interface WriteOperation {
  filePath: string;
  content: string;
  createBackup?: boolean;
}

export interface WriteResult {
  success: boolean;
  filePath: string;
  backupPath?: string;
  error?: string;
}

export class FileWriter {
  private readonly BACKUP_DIR = '.cli-coder-backups';

  async writeFile(operation: WriteOperation): Promise<WriteResult> {
    const { filePath, content, createBackup = true } = operation;

    try {
      // Ensure directory exists
      const dir = dirname(filePath);
      if (!existsSync(dir)) {
        mkdirSync(dir, { recursive: true });
      }

      let backupPath: string | undefined;

      // Create backup if file exists and backup is requested
      if (existsSync(filePath) && createBackup) {
        backupPath = await this.createBackup(filePath);
      }

      // Show confirmation if file exists
      if (existsSync(filePath)) {
        const shouldProceed = await this.confirmOverwrite(filePath, content);
        if (!shouldProceed) {
          return {
            success: false,
            filePath,
            error: 'Operation cancelled by user'
          };
        }
      } else {
        // Show preview for new files
        const shouldProceed = await this.confirmNewFile(filePath, content);
        if (!shouldProceed) {
          return {
            success: false,
            filePath,
            error: 'Operation cancelled by user'
          };
        }
      }

      // Write the file
      writeFileSync(filePath, content, 'utf-8');

      return {
        success: true,
        filePath,
        backupPath,
      };

    } catch (error) {
      return {
        success: false,
        filePath,
        error: (error as Error).message,
      };
    }
  }

  async writeMultipleFiles(operations: WriteOperation[]): Promise<WriteResult[]> {
    const results: WriteResult[] = [];

    console.log(chalk.blue(`\n📝 Writing ${operations.length} files...`));
    
    for (const operation of operations) {
      console.log(chalk.gray(`Processing: ${operation.filePath}`));
      const result = await this.writeFile(operation);
      results.push(result);
      
      if (result.success) {
        console.log(chalk.green(`✅ ${operation.filePath}`));
      } else {
        console.log(chalk.red(`❌ ${operation.filePath}: ${result.error}`));
      }
    }

    return results;
  }

  private async createBackup(filePath: string): Promise<string> {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupDir = join(dirname(filePath), this.BACKUP_DIR);
    
    if (!existsSync(backupDir)) {
      mkdirSync(backupDir, { recursive: true });
    }

    const backupFileName = `${timestamp}_${basename(filePath)}`;
    const backupPath = join(backupDir, backupFileName);
    
    copyFileSync(filePath, backupPath);
    return backupPath;
  }

  private async confirmOverwrite(filePath: string, newContent: string): Promise<boolean> {
    try {
      const currentContent = readFileSync(filePath, 'utf-8');
      
      console.log(chalk.yellow(`\n⚠️  File exists: ${filePath}`));
      console.log(chalk.gray('Changes to be made:'));
      
      // Show a simple diff (could be enhanced with a proper diff library)
      this.showSimpleDiff(currentContent, newContent);

      const answer = await inquirer.prompt([{
        type: 'confirm',
        name: 'proceed',
        message: 'Do you want to overwrite this file?',
        default: false,
      }]);

      return answer.proceed;
    } catch (error) {
      // If we can't read the current file, just ask for confirmation
      const answer = await inquirer.prompt([{
        type: 'confirm',
        name: 'proceed',
        message: `Overwrite ${filePath}?`,
        default: false,
      }]);

      return answer.proceed;
    }
  }

  private async confirmNewFile(filePath: string, content: string): Promise<boolean> {
    console.log(chalk.blue(`\n📄 Creating new file: ${filePath}`));
    console.log(chalk.gray(`Content preview (first 10 lines):`));
    
    const lines = content.split('\n').slice(0, 10);
    lines.forEach((line, index) => {
      console.log(chalk.cyan(`${(index + 1).toString().padStart(2)}: ${line}`));
    });
    
    if (content.split('\n').length > 10) {
      console.log(chalk.gray(`... and ${content.split('\n').length - 10} more lines`));
    }

    const answer = await inquirer.prompt([{
      type: 'confirm',
      name: 'proceed',
      message: 'Create this file?',
      default: true,
    }]);

    return answer.proceed;
  }

  private showSimpleDiff(oldContent: string, newContent: string): void {
    const oldLines = oldContent.split('\n');
    const newLines = newContent.split('\n');
    
    console.log(chalk.red(`- Old (${oldLines.length} lines)`));
    console.log(chalk.green(`+ New (${newLines.length} lines)`));
    
    // Show first few different lines
    const maxLines = Math.min(5, Math.max(oldLines.length, newLines.length));
    for (let i = 0; i < maxLines; i++) {
      const oldLine = oldLines[i] || '';
      const newLine = newLines[i] || '';
      
      if (oldLine !== newLine) {
        if (oldLine) console.log(chalk.red(`- ${i + 1}: ${oldLine}`));
        if (newLine) console.log(chalk.green(`+ ${i + 1}: ${newLine}`));
      }
    }
    
    if (oldLines.length > 5 || newLines.length > 5) {
      console.log(chalk.gray('... (showing first 5 lines only)'));
    }
  }
}