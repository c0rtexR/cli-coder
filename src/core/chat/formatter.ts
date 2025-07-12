import chalk from 'chalk';

export class ChatFormatter {
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
        formattedLine = formattedLine.replace(/\*\*(.*?)\*\*/g, chalk.bold('$1'));
        formattedLine = formattedLine.replace(/`(.*?)`/g, chalk.cyan('$1'));
        
        if (line.startsWith('# ')) {
          formattedLine = chalk.blue.bold(line);
        }
        
        formattedLines.push(formattedLine);
      }
    }

    return '\n' + formattedLines.join('\n') + '\n';
  }
}