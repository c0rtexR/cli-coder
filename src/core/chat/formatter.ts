/**
 * @fileoverview Chat message formatter with markdown support
 */

import chalk from 'chalk';

export class ChatFormatter {
  /**
   * Format AI response with markdown-like styling
   */
  formatAIResponse(content: string): string {
    const lines = content.split('\n');
    const formattedLines: string[] = [];
    let inCodeBlock = false;

    for (const line of lines) {
      if (line.startsWith('```')) {
        if (inCodeBlock) {
          formattedLines.push(chalk.gray('```'));
          inCodeBlock = false;
        } else {
          formattedLines.push(chalk.gray('```'));
          inCodeBlock = true;
        }
      } else if (inCodeBlock) {
        formattedLines.push(chalk.cyan(line));
      } else {
        // Format regular text
        let formattedLine = line;
        
        // Bold text with **
        formattedLine = formattedLine.replace(/\*\*(.*?)\*\*/g, (_, text) => chalk.bold(text));
        
        // Inline code with backticks
        formattedLine = formattedLine.replace(/`(.*?)`/g, (_, text) => chalk.cyan(text));
        
        // Headers with #
        if (line.startsWith('# ')) {
          formattedLine = chalk.blue.bold(line);
        } else if (line.startsWith('## ')) {
          formattedLine = chalk.blue.bold(line);
        }
        
        formattedLines.push(formattedLine);
      }
    }

    return '\n' + formattedLines.join('\n') + '\n';
  }
}