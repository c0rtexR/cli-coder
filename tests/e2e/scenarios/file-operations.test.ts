/**
 * @fileoverview End-to-end tests for file operations - complete user workflows
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { spawn, ChildProcess } from 'child_process';
import { writeFileSync, mkdirSync, rmSync, existsSync } from 'fs';
import { join } from 'path';

describe('File Operations E2E', () => {
  let testDir: string;
  let originalCwd: string;
  const CLI_PATH = join(process.cwd(), 'dist', 'index.js');

  beforeEach(async () => {
    // Setup test directory
    testDir = join(process.cwd(), 'test-e2e-files');
    originalCwd = process.cwd();
    
    if (existsSync(testDir)) {
      rmSync(testDir, { recursive: true, force: true });
    }
    mkdirSync(testDir, { recursive: true });

    // Change to test directory
    process.chdir(testDir);
  });

  afterEach(() => {
    // Cleanup
    process.chdir(originalCwd);
    if (existsSync(testDir)) {
      rmSync(testDir, { recursive: true, force: true });
    }
  });

  const runCLICommand = (args: string[], input?: string): Promise<{
    stdout: string;
    stderr: string;
    exitCode: number;
  }> => {
    return new Promise((resolve) => {
      const child = spawn('node', [CLI_PATH, ...args], {
        stdio: ['pipe', 'pipe', 'pipe'],
        cwd: testDir,
      });

      let stdout = '';
      let stderr = '';

      child.stdout?.on('data', (data) => {
        stdout += data.toString();
      });

      child.stderr?.on('data', (data) => {
        stderr += data.toString();
      });

      if (input) {
        child.stdin?.write(input);
        child.stdin?.end();
      }

      child.on('close', (code) => {
        resolve({
          stdout,
          stderr,
          exitCode: code || 0,
        });
      });

      // Timeout after 10 seconds
      setTimeout(() => {
        child.kill('SIGTERM');
        resolve({
          stdout,
          stderr,
          exitCode: 1,
        });
      }, 10000);
    });
  };

  const runInteractiveCLI = (commands: string[]): Promise<{
    stdout: string;
    stderr: string;
    exitCode: number;
  }> => {
    return new Promise((resolve) => {
      const child = spawn('node', [CLI_PATH, 'chat'], {
        stdio: ['pipe', 'pipe', 'pipe'],
        cwd: testDir,
      });

      let stdout = '';
      let stderr = '';
      let commandIndex = 0;

      child.stdout?.on('data', (data) => {
        const output = data.toString();
        stdout += output;

        // Send next command when we see a prompt
        if (output.includes('> ') && commandIndex < commands.length) {
          setTimeout(() => {
            child.stdin?.write(commands[commandIndex] + '\n');
            commandIndex++;
          }, 100);
        }

        // Exit when all commands are sent
        if (commandIndex >= commands.length && output.includes('> ')) {
          setTimeout(() => {
            child.stdin?.write('/exit\n');
          }, 100);
        }
      });

      child.stderr?.on('data', (data) => {
        stderr += data.toString();
      });

      child.on('close', (code) => {
        resolve({
          stdout,
          stderr,
          exitCode: code || 0,
        });
      });

      // Timeout after 15 seconds
      setTimeout(() => {
        child.kill('SIGTERM');
        resolve({
          stdout,
          stderr,
          exitCode: 1,
        });
      }, 15000);
    });
  };

  describe('file addition workflows', () => {
    it('should add single file to chat context', async () => {
      // Arrange
      writeFileSync('test.ts', 'const hello = "world";');

      // Act
      const result = await runInteractiveCLI([
        '/add test.ts',
        '/context'
      ]);

      // Assert
      expect(result.exitCode).toBe(0);
      expect(result.stdout).toContain('Added 1 files to context');
      expect(result.stdout).toContain('test.ts');
      expect(result.stdout).toContain('Files in Context (1)');
    });

    it('should add multiple files using glob patterns', async () => {
      // Arrange
      mkdirSync('src', { recursive: true });
      writeFileSync('src/main.ts', 'console.log("main");');
      writeFileSync('src/utils.ts', 'export const utils = {};');
      writeFileSync('package.json', '{"name": "test"}');

      // Act
      const result = await runInteractiveCLI([
        '/add src/**/*.ts',
        '/add package.json',
        '/context'
      ]);

      // Assert
      expect(result.exitCode).toBe(0);
      expect(result.stdout).toContain('Added 2 files to context');
      expect(result.stdout).toContain('src/main.ts');
      expect(result.stdout).toContain('src/utils.ts');
      expect(result.stdout).toContain('Files in Context (3)');
    });

    it('should handle file not found gracefully', async () => {
      // Act
      const result = await runInteractiveCLI([
        '/add nonexistent.ts',
        '/context'
      ]);

      // Assert
      expect(result.exitCode).toBe(0);
      expect(result.stdout).toContain('No files in context');
    });

    it('should filter unsupported file types', async () => {
      // Arrange
      writeFileSync('good.ts', 'typescript content');
      writeFileSync('bad.exe', 'binary content');

      // Act
      const result = await runInteractiveCLI([
        '/add *',
        '/context'
      ]);

      // Assert
      expect(result.exitCode).toBe(0);
      expect(result.stdout).toContain('good.ts');
      expect(result.stdout).not.toContain('bad.exe');
    });
  });

  describe('file removal workflows', () => {
    beforeEach(() => {
      // Create test files
      writeFileSync('file1.ts', 'content1');
      writeFileSync('file2.js', 'content2');
      writeFileSync('file3.py', 'content3');
    });

    it('should remove specific files from context', async () => {
      // Act
      const result = await runInteractiveCLI([
        '/add *.ts *.js *.py',
        '/remove file1.ts',
        '/context'
      ]);

      // Assert
      expect(result.exitCode).toBe(0);
      expect(result.stdout).toContain('Removed: file1.ts');
      expect(result.stdout).toContain('Files in Context (2)');
      expect(result.stdout).not.toContain('file1.ts');
    });

    it('should remove all files from context', async () => {
      // Act
      const result = await runInteractiveCLI([
        '/add *',
        '/remove all',
        '/context'
      ]);

      // Assert
      expect(result.exitCode).toBe(0);
      expect(result.stdout).toContain('Removed all');
      expect(result.stdout).toContain('No files in context');
    });

    it('should handle removing non-existent files', async () => {
      // Act
      const result = await runInteractiveCLI([
        '/add file1.ts',
        '/remove nonexistent.ts',
        '/context'
      ]);

      // Assert
      expect(result.exitCode).toBe(0);
      expect(result.stdout).toContain('Not in context: nonexistent.ts');
      expect(result.stdout).toContain('Files in Context (1)');
    });
  });

  describe('context display workflows', () => {
    it('should show empty context initially', async () => {
      // Act
      const result = await runInteractiveCLI(['/context']);

      // Assert
      expect(result.exitCode).toBe(0);
      expect(result.stdout).toContain('No files in context');
    });

    it('should display file details correctly', async () => {
      // Arrange
      const largeContent = 'a'.repeat(2048);
      writeFileSync('large.ts', largeContent);
      writeFileSync('small.js', 'tiny');

      // Act
      const result = await runInteractiveCLI([
        '/add *.ts *.js',
        '/context'
      ]);

      // Assert
      expect(result.exitCode).toBe(0);
      expect(result.stdout).toContain('Files in Context (2)');
      expect(result.stdout).toContain('large.ts (2KB, typescript)');
      expect(result.stdout).toContain('small.js (0KB, javascript)');
      expect(result.stdout).toContain('Total:');
    });
  });

  describe('help and command discovery', () => {
    it('should show help for file commands', async () => {
      // Act
      const result = await runInteractiveCLI(['/help']);

      // Assert
      expect(result.exitCode).toBe(0);
      expect(result.stdout).toContain('Available Commands:');
      expect(result.stdout).toContain('/add <pattern>');
      expect(result.stdout).toContain('/remove <file>');
      expect(result.stdout).toContain('/context');
      expect(result.stdout).toContain('File Pattern Examples:');
    });

    it('should show usage for add command', async () => {
      // Act
      const result = await runInteractiveCLI(['/add']);

      // Assert
      expect(result.exitCode).toBe(0);
      expect(result.stdout).toContain('Usage: /add <file-pattern>');
      expect(result.stdout).toContain('Examples:');
      expect(result.stdout).toContain('/add src/main.ts');
      expect(result.stdout).toContain('/add src/**/*.ts');
    });

    it('should show usage for remove command', async () => {
      // Act
      const result = await runInteractiveCLI(['/remove']);

      // Assert
      expect(result.exitCode).toBe(0);
      expect(result.stdout).toContain('Usage: /remove <file-path>');
      expect(result.stdout).toContain('Examples:');
      expect(result.stdout).toContain('/remove all');
    });
  });

  describe('complex workflows', () => {
    it('should handle complete file management session', async () => {
      // Arrange
      mkdirSync('src', { recursive: true });
      mkdirSync('test', { recursive: true });
      writeFileSync('src/main.ts', 'main content');
      writeFileSync('src/utils.ts', 'utils content');
      writeFileSync('test/main.test.ts', 'test content');
      writeFileSync('package.json', '{}');
      writeFileSync('README.md', '# Project');

      // Act
      const result = await runInteractiveCLI([
        '/add src/**/*.ts',      // Add TypeScript files
        '/context',              // Check what was added
        '/add package.json',     // Add package.json
        '/add *.md',            // Add README
        '/context',              // Check all files
        '/remove src/utils.ts',  // Remove one file
        '/context',              // Check after removal
        '/remove all',           // Clear everything
        '/context'               // Verify empty
      ]);

      // Assert
      expect(result.exitCode).toBe(0);
      expect(result.stdout).toContain('Added 2 files to context'); // src files
      expect(result.stdout).toContain('Files in Context (2)');     // after src
      expect(result.stdout).toContain('Files in Context (4)');     // after all adds
      expect(result.stdout).toContain('Removed: src/utils.ts');
      expect(result.stdout).toContain('Files in Context (3)');     // after removal
      expect(result.stdout).toContain('Removed all');
      expect(result.stdout).toContain('No files in context');      // final state
    });

    it('should handle error recovery in workflows', async () => {
      // Arrange
      writeFileSync('good.ts', 'good content');

      // Act
      const result = await runInteractiveCLI([
        '/add good.ts',           // Should succeed
        '/add nonexistent.ts',    // Should fail gracefully
        '/context',               // Should show only good.ts
        '/remove nonexistent.ts', // Should handle gracefully
        '/context'                // Should still show good.ts
      ]);

      // Assert
      expect(result.exitCode).toBe(0);
      expect(result.stdout).toContain('Added 1 files to context');
      expect(result.stdout).toContain('Files in Context (1)');
      expect(result.stdout).toContain('good.ts');
      expect(result.stdout).toContain('Not in context: nonexistent.ts');
    });
  });

  describe('file type and language detection', () => {
    it('should correctly detect and display file languages', async () => {
      // Arrange
      const files = [
        { name: 'script.js', content: 'console.log("js");' },
        { name: 'component.tsx', content: 'export const Component = () => {};' },
        { name: 'style.css', content: 'body { margin: 0; }' },
        { name: 'data.json', content: '{"key": "value"}' },
        { name: 'script.py', content: 'print("python")' },
      ];

      for (const file of files) {
        writeFileSync(file.name, file.content);
      }

      // Act
      const result = await runInteractiveCLI([
        '/add *',
        '/context'
      ]);

      // Assert
      expect(result.exitCode).toBe(0);
      expect(result.stdout).toContain('javascript');
      expect(result.stdout).toContain('typescript');
      expect(result.stdout).toContain('css');
      expect(result.stdout).toContain('json');
      expect(result.stdout).toContain('python');
    });
  });

  describe('performance and limits', () => {
    it('should handle multiple files efficiently', async () => {
      // Arrange - Create many small files
      mkdirSync('many-files', { recursive: true });
      for (let i = 0; i < 20; i++) {
        writeFileSync(`many-files/file${i}.ts`, `export const value${i} = ${i};`);
      }

      // Act
      const startTime = Date.now();
      const result = await runInteractiveCLI([
        '/add many-files/**/*.ts',
        '/context'
      ]);
      const endTime = Date.now();

      // Assert
      expect(result.exitCode).toBe(0);
      expect(result.stdout).toContain('Added 20 files to context');
      expect(result.stdout).toContain('Files in Context (20)');
      expect(endTime - startTime).toBeLessThan(5000); // Should complete within 5 seconds
    });
  });
});