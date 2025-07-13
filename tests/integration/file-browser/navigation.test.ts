import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { FileBrowserController } from '../../../src/core/tui/controllers/file-browser.controller';
import { FileTreeService } from '../../../src/core/filesystem/file-tree.service';
import { FileTreeNode } from '../../../src/types/tui.types';
import * as fs from 'fs/promises';
import * as path from 'path';

// Create test directory structure
const testDir = path.join(process.cwd(), 'test-file-browser');

describe('File Browser Navigation Integration', () => {
  let controller: FileBrowserController;
  let fileTreeService: FileTreeService;

  beforeEach(async () => {
    // Setup test directory structure
    await fs.mkdir(testDir, { recursive: true });
    await fs.mkdir(path.join(testDir, 'src'), { recursive: true });
    await fs.mkdir(path.join(testDir, 'src', 'components'), { recursive: true });
    await fs.writeFile(path.join(testDir, 'package.json'), '{"name": "test"}');
    await fs.writeFile(path.join(testDir, 'src', 'main.ts'), 'console.log("hello");');
    await fs.writeFile(path.join(testDir, 'src', 'utils.ts'), 'export function test() {}');
    await fs.writeFile(path.join(testDir, 'src', 'components', 'Button.tsx'), 'export const Button = () => null;');
    await fs.writeFile(path.join(testDir, '.hidden'), 'hidden content');

    fileTreeService = new FileTreeService();
    controller = new FileBrowserController(fileTreeService);
  });

  afterEach(async () => {
    // Cleanup test directory
    await fs.rm(testDir, { recursive: true, force: true });
  });

  describe('Tree Building and Navigation', () => {
    it('should build complete file tree from directory', async () => {
      const tree = await controller.loadDirectory(testDir);

      expect(tree).toBeDefined();
      expect(tree.length).toBeGreaterThan(0);
      
      // Should contain main files and directories
      const srcDir = tree.find(node => node.name === 'src');
      const packageJson = tree.find(node => node.name === 'package.json');
      
      expect(srcDir).toBeDefined();
      expect(srcDir?.type).toBe('directory');
      expect(packageJson).toBeDefined();
      expect(packageJson?.type).toBe('file');
    });

    it('should expand and collapse directories', async () => {
      const tree = await controller.loadDirectory(testDir);
      const srcDir = tree.find(node => node.name === 'src')!;

      // Initially collapsed
      expect(srcDir.isExpanded).toBe(false);
      expect(srcDir.children).toHaveLength(0);

      // Expand directory
      await controller.toggleDirectory(srcDir.path);
      expect(srcDir.isExpanded).toBe(true);
      expect(srcDir.children).toHaveLength(3); // main.ts, utils.ts, components/

      // Collapse directory
      await controller.toggleDirectory(srcDir.path);
      expect(srcDir.isExpanded).toBe(false);
    });

    it('should handle nested directory expansion', async () => {
      const tree = await controller.loadDirectory(testDir);
      const srcDir = tree.find(node => node.name === 'src')!;

      // Expand src directory
      await controller.toggleDirectory(srcDir.path);
      const componentsDir = srcDir.children!.find(node => node.name === 'components')!;

      expect(componentsDir).toBeDefined();
      expect(componentsDir.type).toBe('directory');

      // Expand components directory
      await controller.toggleDirectory(componentsDir.path);
      expect(componentsDir.isExpanded).toBe(true);
      expect(componentsDir.children).toHaveLength(1); // Button.tsx
      expect(componentsDir.children![0].name).toBe('Button.tsx');
    });

    it('should track selected file path', async () => {
      const tree = await controller.loadDirectory(testDir);
      const packageJson = tree.find(node => node.name === 'package.json')!;

      controller.selectFile(packageJson.path);
      expect(controller.getSelectedPath()).toBe(packageJson.path);
      expect(packageJson.isSelected).toBe(true);
    });

    it('should handle navigation through keyboard events', async () => {
      const tree = await controller.loadDirectory(testDir);
      
      // Navigate down
      controller.navigateDown();
      expect(controller.getSelectedPath()).toBe(tree[0].path);

      // Navigate down again
      controller.navigateDown();
      expect(controller.getSelectedPath()).toBe(tree[1].path);

      // Navigate up
      controller.navigateUp();
      expect(controller.getSelectedPath()).toBe(tree[0].path);
    });
  });

  describe('File Selection and Context Management', () => {
    it('should add files to context', async () => {
      const tree = await controller.loadDirectory(testDir);
      const packageJson = tree.find(node => node.name === 'package.json')!;

      await controller.toggleFileContext(packageJson.path);
      expect(packageJson.isInContext).toBe(true);
      expect(controller.getContextFiles()).toContain(packageJson.path);
    });

    it('should remove files from context', async () => {
      const tree = await controller.loadDirectory(testDir);
      const packageJson = tree.find(node => node.name === 'package.json')!;

      // Add to context
      await controller.toggleFileContext(packageJson.path);
      expect(packageJson.isInContext).toBe(true);

      // Remove from context
      await controller.toggleFileContext(packageJson.path);
      expect(packageJson.isInContext).toBe(false);
      expect(controller.getContextFiles()).not.toContain(packageJson.path);
    });

    it('should handle multi-select mode', async () => {
      const tree = await controller.loadDirectory(testDir);
      
      controller.enableMultiSelectMode();
      expect(controller.isMultiSelectMode()).toBe(true);

      // Select multiple files
      const packageJson = tree.find(node => node.name === 'package.json')!;
      await controller.toggleMultiSelect(packageJson.path);
      
      const srcDir = tree.find(node => node.name === 'src')!;
      await controller.toggleDirectory(srcDir.path);
      const mainTs = srcDir.children!.find(node => node.name === 'main.ts')!;
      await controller.toggleMultiSelect(mainTs.path);

      expect(controller.getSelectedFiles()).toContain(packageJson.path);
      expect(controller.getSelectedFiles()).toContain(mainTs.path);
    });

    it('should clear multi-selection', async () => {
      const tree = await controller.loadDirectory(testDir);
      
      controller.enableMultiSelectMode();
      
      const packageJson = tree.find(node => node.name === 'package.json')!;
      await controller.toggleMultiSelect(packageJson.path);
      
      expect(controller.getSelectedFiles()).toHaveLength(1);
      
      controller.clearMultiSelection();
      expect(controller.getSelectedFiles()).toHaveLength(0);
    });
  });

  describe('Search and Filtering', () => {
    it('should search files by name', async () => {
      const tree = await controller.loadDirectory(testDir);
      
      const results = await controller.searchFiles('package');
      expect(results).toHaveLength(1);
      expect(results[0].name).toBe('package.json');
    });

    it('should search files by extension', async () => {
      const tree = await controller.loadDirectory(testDir);
      
      const results = await controller.searchFiles('', { fileTypes: ['.ts'] });
      expect(results.length).toBe(2); // main.ts, utils.ts
      expect(results.every(file => file.extension === '.ts')).toBe(true);
    });

    it('should handle fuzzy search', async () => {
      const tree = await controller.loadDirectory(testDir);
      
      const results = await controller.searchFiles('btn'); // Should match Button.tsx
      expect(results).toHaveLength(1);
      expect(results[0].name).toBe('Button.tsx');
    });

    it('should filter hidden files based on settings', async () => {
      const treeWithHidden = await controller.loadDirectory(testDir, { showHidden: true });
      const treeWithoutHidden = await controller.loadDirectory(testDir, { showHidden: false });

      const hiddenFileInIncluded = treeWithHidden.find(node => node.name === '.hidden');
      const hiddenFileInExcluded = treeWithoutHidden.find(node => node.name === '.hidden');

      expect(hiddenFileInIncluded).toBeDefined();
      expect(hiddenFileInExcluded).toBeUndefined();
    });
  });

  describe('Performance and Error Handling', () => {
    it('should handle large directories efficiently', async () => {
      // Create a large test directory
      const largeDir = path.join(testDir, 'large');
      await fs.mkdir(largeDir, { recursive: true });

      // Create many files
      const filePromises = Array.from({ length: 100 }, (_, i) =>
        fs.writeFile(path.join(largeDir, `file-${i}.txt`), `content ${i}`)
      );
      await Promise.all(filePromises);

      const startTime = performance.now();
      const tree = await controller.loadDirectory(largeDir);
      const endTime = performance.now();

      expect(tree.length).toBe(100);
      expect(endTime - startTime).toBeLessThan(1000); // Should load within 1 second
    });

    it('should handle permission errors gracefully', async () => {
      const restrictedPath = '/root/restricted';
      
      await expect(controller.loadDirectory(restrictedPath)).rejects.toThrow();
    });

    it('should handle non-existent directories', async () => {
      const nonExistentPath = path.join(testDir, 'does-not-exist');
      
      await expect(controller.loadDirectory(nonExistentPath)).rejects.toThrow();
    });

    it('should cache directory contents for performance', async () => {
      const spy = vi.spyOn(fs, 'readdir');
      
      // First load
      await controller.loadDirectory(testDir);
      const firstCallCount = spy.mock.calls.length;
      
      // Second load (should use cache)
      await controller.loadDirectory(testDir);
      const secondCallCount = spy.mock.calls.length;
      
      // Should not increase readdir calls significantly due to caching
      expect(secondCallCount - firstCallCount).toBeLessThan(firstCallCount);
    });
  });

  describe('File System Monitoring', () => {
    it('should detect file system changes when enabled', async () => {
      const tree = await controller.loadDirectory(testDir);
      
      // Enable file system watching
      controller.enableFileSystemWatching();
      
      // Create a new file
      const newFilePath = path.join(testDir, 'new-file.txt');
      await fs.writeFile(newFilePath, 'new content');
      
      // Wait for file system event
      await new Promise(resolve => setTimeout(resolve, 100));
      
      // Tree should be updated with new file
      const updatedTree = controller.getCurrentTree();
      const newFile = updatedTree.find(node => node.name === 'new-file.txt');
      expect(newFile).toBeDefined();
    });

    it('should update context when files are deleted', async () => {
      const tree = await controller.loadDirectory(testDir);
      const packageJson = tree.find(node => node.name === 'package.json')!;
      
      // Add file to context
      await controller.toggleFileContext(packageJson.path);
      expect(controller.getContextFiles()).toContain(packageJson.path);
      
      // Delete the file
      await fs.unlink(path.join(testDir, 'package.json'));
      
      // Enable watching and wait for update
      controller.enableFileSystemWatching();
      await new Promise(resolve => setTimeout(resolve, 100));
      
      // File should be removed from context
      expect(controller.getContextFiles()).not.toContain(packageJson.path);
    });
  });
});