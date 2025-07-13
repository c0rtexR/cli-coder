import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { TestRig } from '../../helpers/test-rig';
import * as fs from 'fs/promises';
import * as path from 'path';

describe('File Browser E2E Workflow', () => {
  let testRig: TestRig;
  let testProjectDir: string;

  beforeEach(async () => {
    testRig = new TestRig();
    testProjectDir = await testRig.createTestProject('file-browser-test', {
      'package.json': JSON.stringify({
        name: 'test-project',
        version: '1.0.0',
        scripts: { test: 'vitest' }
      }, null, 2),
      'src/main.ts': 'console.log("Hello, world!");',
      'src/utils.ts': 'export const add = (a: number, b: number) => a + b;',
      'src/components/Button.tsx': 'export const Button = () => <button>Click me</button>;',
      'src/components/Input.tsx': 'export const Input = () => <input />;',
      'README.md': '# Test Project\n\nThis is a test project.',
      'tsconfig.json': JSON.stringify({
        compilerOptions: {
          target: 'ES2020',
          module: 'ESNext'
        }
      }, null, 2),
      '.gitignore': 'node_modules/\ndist/\n.env',
      '.hidden': 'hidden file content'
    });
  });

  afterEach(async () => {
    await testRig.cleanup();
  });

  describe('Basic File Browser Operations', () => {
    it('should launch file browser interface in TUI mode', async () => {
      const session = await testRig.startInteractiveSession([
        'chat', '--mode', 'tui'
      ], { 
        cwd: testProjectDir,
        timeout: 5000 
      });

      // Should show file browser interface
      expect(session.output).toContain('📁 Files');
      expect(session.output).toContain('package.json');
      expect(session.output).toContain('src');
      expect(session.output).toContain('README.md');

      await session.close();
    });

    it('should navigate file tree with keyboard commands', async () => {
      const session = await testRig.startInteractiveSession([
        'chat', '--mode', 'tui'
      ], { 
        cwd: testProjectDir,
        timeout: 5000 
      });

      // Switch to file panel (Tab key)
      await session.sendKey('Tab');
      await session.sendKey('Tab'); // Navigate to files panel
      
      // Should show navigation indicators
      expect(session.output).toContain('▶'); // Selection indicator
      expect(session.output).toContain('↑↓: Navigate');

      // Navigate down through files
      await session.sendKey('ArrowDown');
      await session.sendKey('ArrowDown');

      // Should show different file selected
      expect(session.output).toMatch(/▶.*src|README\.md/);

      await session.close();
    });

    it('should expand and collapse directories', async () => {
      const session = await testRig.startInteractiveSession([
        'chat', '--mode', 'tui'
      ], { 
        cwd: testProjectDir,
        timeout: 5000 
      });

      // Navigate to file panel and select src directory
      await session.sendKey('Tab'); // Switch to files
      await session.sendKey('Tab');
      
      // Navigate to src directory
      await session.sendKey('ArrowDown'); // Move to src
      
      // Expand directory (Right arrow or Enter)
      await session.sendKey('ArrowRight');
      
      // Should show expanded directory contents
      expect(session.output).toContain('main.ts');
      expect(session.output).toContain('utils.ts');
      expect(session.output).toContain('components');

      // Collapse directory
      await session.sendKey('ArrowLeft');
      
      // Should hide directory contents
      expect(session.output).not.toContain('main.ts');

      await session.close();
    });

    it('should add and remove files from context', async () => {
      const session = await testRig.startInteractiveSession([
        'chat', '--mode', 'tui'
      ], { 
        cwd: testProjectDir,
        timeout: 5000 
      });

      // Navigate to file panel
      await session.sendKey('Tab');
      await session.sendKey('Tab');
      
      // Select package.json
      await session.navigateToFile('package.json');
      
      // Add to context with Enter
      await session.sendKey('Enter');
      
      // Should show context indicator
      expect(session.output).toContain('✓'); // Context indicator
      expect(session.output).toContain('1 files'); // File count in status

      // Remove from context
      await session.sendKey('Enter');
      
      // Should remove context indicator
      expect(session.output).not.toContain('✓');
      expect(session.output).toContain('0 files');

      await session.close();
    });
  });

  describe('File Search and Filtering', () => {
    it('should search files by name', async () => {
      const session = await testRig.startInteractiveSession([
        'chat', '--mode', 'tui'
      ], { 
        cwd: testProjectDir,
        timeout: 5000 
      });

      // Navigate to file panel
      await session.sendKey('Tab');
      await session.sendKey('Tab');
      
      // Start search with '/' key
      await session.sendKey('/');
      
      // Should show search prompt
      expect(session.output).toContain('Search:');
      
      // Type search query
      await session.type('main');
      
      // Should filter to show only matching files
      expect(session.output).toContain('main.ts');
      expect(session.output).not.toContain('package.json');
      expect(session.output).not.toContain('README.md');

      // Clear search (Escape)
      await session.sendKey('Escape');
      
      // Should show all files again
      expect(session.output).toContain('package.json');

      await session.close();
    });

    it('should filter by file type', async () => {
      const session = await testRig.startInteractiveSession([
        'chat', '--mode', 'tui'
      ], { 
        cwd: testProjectDir,
        timeout: 5000 
      });

      // Navigate to file panel
      await session.sendKey('Tab');
      await session.sendKey('Tab');
      
      // Use filter shortcut (Ctrl+F)
      await session.sendKey('Ctrl+f');
      
      // Type file extension filter
      await session.type('.ts');
      
      // Should show only TypeScript files
      expect(session.output).toContain('main.ts');
      expect(session.output).toContain('utils.ts');
      expect(session.output).not.toContain('package.json');
      expect(session.output).not.toContain('README.md');

      await session.close();
    });

    it('should toggle hidden file visibility', async () => {
      const session = await testRig.startInteractiveSession([
        'chat', '--mode', 'tui'
      ], { 
        cwd: testProjectDir,
        timeout: 5000 
      });

      // Navigate to file panel
      await session.sendKey('Tab');
      await session.sendKey('Tab');
      
      // Initially hidden files should not be visible
      expect(session.output).not.toContain('.hidden');
      expect(session.output).not.toContain('.gitignore');
      
      // Toggle hidden files (Ctrl+H)
      await session.sendKey('Ctrl+h');
      
      // Should show hidden files
      expect(session.output).toContain('.hidden');
      expect(session.output).toContain('.gitignore');
      
      // Toggle again to hide
      await session.sendKey('Ctrl+h');
      
      // Should hide hidden files again
      expect(session.output).not.toContain('.hidden');

      await session.close();
    });
  });

  describe('Multi-Selection and Bulk Operations', () => {
    it('should enable multi-select mode', async () => {
      const session = await testRig.startInteractiveSession([
        'chat', '--mode', 'tui'
      ], { 
        cwd: testProjectDir,
        timeout: 5000 
      });

      // Navigate to file panel
      await session.sendKey('Tab');
      await session.sendKey('Tab');
      
      // Enable multi-select mode (Ctrl+M)
      await session.sendKey('Ctrl+m');
      
      // Should show multi-select indicators
      expect(session.output).toContain('☐'); // Unselected checkbox
      expect(session.output).toContain('Multi-select mode');
      
      // Select multiple files with Space
      await session.sendKey('Space');
      await session.sendKey('ArrowDown');
      await session.sendKey('Space');
      
      // Should show selected files
      expect(session.output).toContain('☑'); // Selected checkbox
      expect(session.output).toContain('2 selected');

      await session.close();
    });

    it('should select all files with shortcut', async () => {
      const session = await testRig.startInteractiveSession([
        'chat', '--mode', 'tui'
      ], { 
        cwd: testProjectDir,
        timeout: 5000 
      });

      // Navigate to file panel and enable multi-select
      await session.sendKey('Tab');
      await session.sendKey('Tab');
      await session.sendKey('Ctrl+m');
      
      // Select all files (Ctrl+A)
      await session.sendKey('Ctrl+a');
      
      // Should show all files selected
      const visibleFileCount = 4; // package.json, src, README.md, tsconfig.json
      expect(session.output).toContain(`${visibleFileCount} selected`);

      await session.close();
    });

    it('should add multiple files to context at once', async () => {
      const session = await testRig.startInteractiveSession([
        'chat', '--mode', 'tui'
      ], { 
        cwd: testProjectDir,
        timeout: 5000 
      });

      // Enable multi-select and select files
      await session.sendKey('Tab');
      await session.sendKey('Tab');
      await session.sendKey('Ctrl+m');
      
      // Select package.json and README.md
      await session.navigateToFile('package.json');
      await session.sendKey('Space');
      await session.navigateToFile('README.md');
      await session.sendKey('Space');
      
      // Add all selected to context (Enter)
      await session.sendKey('Enter');
      
      // Should show multiple files in context
      expect(session.output).toContain('2 files'); // Status bar file count
      
      // Both files should have context indicators
      const contextCount = (session.output.match(/✓/g) || []).length;
      expect(contextCount).toBe(2);

      await session.close();
    });
  });

  describe('File Preview and Information', () => {
    it('should show file preview', async () => {
      const session = await testRig.startInteractiveSession([
        'chat', '--mode', 'tui'
      ], { 
        cwd: testProjectDir,
        timeout: 5000 
      });

      // Navigate to file panel and select a file
      await session.sendKey('Tab');
      await session.sendKey('Tab');
      await session.navigateToFile('package.json');
      
      // Show preview (Space)
      await session.sendKey('Space');
      
      // Should show file preview
      expect(session.output).toContain('package.json');
      expect(session.output).toContain('test-project');
      expect(session.output).toContain('1.0.0');
      
      // Close preview (Escape)
      await session.sendKey('Escape');
      
      // Should return to file list
      expect(session.output).not.toContain('1.0.0');

      await session.close();
    });

    it('should display file metadata', async () => {
      const session = await testRig.startInteractiveSession([
        'chat', '--mode', 'tui'
      ], { 
        cwd: testProjectDir,
        timeout: 5000 
      });

      // Navigate to file panel
      await session.sendKey('Tab');
      await session.sendKey('Tab');
      
      // Should show file sizes and metadata
      expect(session.output).toMatch(/\(\d+KB\)/); // File size indicators
      expect(session.output).toMatch(/📄|📁/); // File type icons

      await session.close();
    });
  });

  describe('Performance and Large Projects', () => {
    it('should handle large directory trees efficiently', async () => {
      // Create a large test project
      const largeProjectDir = await testRig.createTestProject('large-project', {});
      
      // Add many files and directories
      for (let i = 0; i < 50; i++) {
        await fs.writeFile(
          path.join(largeProjectDir, `file-${i}.txt`),
          `Content of file ${i}`
        );
      }
      
      // Create nested directory structure
      for (let i = 0; i < 10; i++) {
        const dirPath = path.join(largeProjectDir, `dir-${i}`);
        await fs.mkdir(dirPath, { recursive: true });
        
        for (let j = 0; j < 10; j++) {
          await fs.writeFile(
            path.join(dirPath, `nested-${j}.ts`),
            `export const value${j} = ${j};`
          );
        }
      }

      const session = await testRig.startInteractiveSession([
        'chat', '--mode', 'tui'
      ], { 
        cwd: largeProjectDir,
        timeout: 10000 // Increase timeout for large project
      });

      // Should load and display files efficiently
      expect(session.output).toContain('📁 Files');
      expect(session.output).toContain('file-0.txt');
      expect(session.output).toContain('dir-0');
      
      // Navigation should be responsive
      const startTime = Date.now();
      await session.sendKey('Tab');
      await session.sendKey('Tab');
      await session.sendKey('ArrowDown');
      await session.sendKey('ArrowDown');
      const endTime = Date.now();
      
      // Should respond quickly even with many files
      expect(endTime - startTime).toBeLessThan(1000);

      await session.close();
    });

    it('should provide smooth scrolling for long file lists', async () => {
      const session = await testRig.startInteractiveSession([
        'chat', '--mode', 'tui'
      ], { 
        cwd: testProjectDir,
        timeout: 5000 
      });

      // Navigate to file panel
      await session.sendKey('Tab');
      await session.sendKey('Tab');
      
      // Test Page Down/Up scrolling
      await session.sendKey('PageDown');
      await session.sendKey('PageUp');
      
      // Should handle scrolling smoothly
      expect(session.output).toContain('📁 Files');

      await session.close();
    });
  });

  describe('Error Handling and Edge Cases', () => {
    it('should handle permission errors gracefully', async () => {
      // Try to access a restricted directory (this might vary by system)
      const session = await testRig.startInteractiveSession([
        'chat', '--mode', 'tui', '--dir', '/root'
      ], { 
        timeout: 5000,
        expectError: true 
      });

      // Should show error message or fallback gracefully
      expect(session.output).toMatch(/permission|access|error/i);

      await session.close();
    });

    it('should handle empty directories', async () => {
      const emptyDir = await testRig.createTestProject('empty-project', {});

      const session = await testRig.startInteractiveSession([
        'chat', '--mode', 'tui'
      ], { 
        cwd: emptyDir,
        timeout: 5000 
      });

      // Should show empty state
      expect(session.output).toContain('No files found');

      await session.close();
    });

    it('should recover from file system changes during operation', async () => {
      const session = await testRig.startInteractiveSession([
        'chat', '--mode', 'tui'
      ], { 
        cwd: testProjectDir,
        timeout: 5000 
      });

      // Delete a file while browser is open
      await fs.unlink(path.join(testProjectDir, 'README.md'));
      
      // Refresh file browser (F5)
      await session.sendKey('F5');
      
      // Should update to reflect file system changes
      expect(session.output).not.toContain('README.md');

      await session.close();
    });
  });
});