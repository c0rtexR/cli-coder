import { describe, it, expect, beforeEach, vi } from 'vitest';
import { FileTreeService } from '../../../../src/core/filesystem/file-tree.service';
import { FileTreeNode, FileTreeSearchOptions } from '../../../../src/types/tui.types';

// Create a simplified test without mocking fs for now
describe('FileTreeService', () => {
  let service: FileTreeService;

  beforeEach(() => {
    service = new FileTreeService();
  });

  describe('searchFiles', () => {
    const mockTree: FileTreeNode[] = [
      {
        id: 'src',
        name: 'src',
        path: 'src',
        type: 'directory',
        isExpanded: false,
        isSelected: false,
        isInContext: false,
        children: [
          {
            id: 'src/main.ts',
            name: 'main.ts',
            path: 'src/main.ts',
            type: 'file',
            extension: '.ts',
            size: 1024,
            modifiedAt: new Date(),
            isSelected: false,
            isInContext: false,
            children: []
          }
        ]
      },
      {
        id: 'package.json',
        name: 'package.json',
        path: 'package.json',
        type: 'file',
        extension: '.json',
        size: 2048,
        modifiedAt: new Date(),
        isSelected: false,
        isInContext: false,
        children: []
      }
    ];

    it('should perform fuzzy search on file names', () => {
      const result = service.searchFiles(mockTree, { query: 'main' });
      
      expect(result).toHaveLength(1);
      expect(result[0].name).toBe('main.ts');
    });

    it('should search case-insensitively', () => {
      const result = service.searchFiles(mockTree, { query: 'MAIN' });
      
      expect(result).toHaveLength(1);
      expect(result[0].name).toBe('main.ts');
    });

    it('should filter by file extension', () => {
      const options: FileTreeSearchOptions = {
        query: '',
        fileTypes: ['.ts']
      };
      
      const result = service.searchFiles(mockTree, options);
      
      expect(result).toHaveLength(1);
      expect(result[0].extension).toBe('.ts');
    });

    it('should filter by modification date', () => {
      const recentDate = new Date();
      const oldDate = new Date('2020-01-01');
      
      const treeWithDates = [
        {
          ...mockTree[0].children![0],
          modifiedAt: recentDate
        },
        {
          ...mockTree[1],
          modifiedAt: oldDate
        }
      ];

      const options: FileTreeSearchOptions = {
        query: '',
        modifiedAfter: new Date('2024-01-01')
      };
      
      const result = service.searchFiles(treeWithDates, options);
      
      expect(result).toHaveLength(1);
      expect(result[0].modifiedAt).toEqual(recentDate);
    });

    it('should handle empty search results', () => {
      const result = service.searchFiles(mockTree, { query: 'nonexistent' });
      
      expect(result).toHaveLength(0);
    });

    it('should search recursively through nested directories', () => {
      const result = service.searchFiles(mockTree, { query: 'main' });
      
      expect(result).toHaveLength(1);
      expect(result[0].path).toBe('src/main.ts');
    });
  });

  describe('toggleDirectory', () => {
    it('should toggle directory expansion state', () => {
      const node: FileTreeNode = {
        id: 'src',
        name: 'src',
        path: 'src',
        type: 'directory',
        isExpanded: false,
        isSelected: false,
        isInContext: false,
        children: []
      };

      service.toggleDirectory(node);
      expect(node.isExpanded).toBe(true);

      service.toggleDirectory(node);
      expect(node.isExpanded).toBe(false);
    });

    it('should not affect non-directory nodes', () => {
      const node: FileTreeNode = {
        id: 'file.txt',
        name: 'file.txt',
        path: 'file.txt',
        type: 'file',
        extension: '.txt',
        size: 100,
        modifiedAt: new Date(),
        isSelected: false,
        isInContext: false,
        children: []
      };

      const initialState = { ...node };
      service.toggleDirectory(node);
      
      expect(node).toEqual(initialState);
    });
  });

  describe('updateContextStatus', () => {
    it('should update file context status', () => {
      const tree: FileTreeNode[] = [
        {
          id: 'file1.txt',
          name: 'file1.txt',
          path: 'file1.txt',
          type: 'file',
          extension: '.txt',
          size: 100,
          modifiedAt: new Date(),
          isSelected: false,
          isInContext: false,
          children: []
        }
      ];

      const contextFiles = ['file1.txt'];
      service.updateContextStatus(tree, contextFiles);

      expect(tree[0].isInContext).toBe(true);
    });

    it('should handle nested files in context updates', () => {
      const tree: FileTreeNode[] = [
        {
          id: 'src',
          name: 'src',
          path: 'src',
          type: 'directory',
          isExpanded: true,
          isSelected: false,
          isInContext: false,
          children: [
            {
              id: 'src/nested.ts',
              name: 'nested.ts',
              path: 'src/nested.ts',
              type: 'file',
              extension: '.ts',
              size: 200,
              modifiedAt: new Date(),
              isSelected: false,
              isInContext: false,
              children: []
            }
          ]
        }
      ];

      const contextFiles = ['src/nested.ts'];
      service.updateContextStatus(tree, contextFiles);

      expect(tree[0].children![0].isInContext).toBe(true);
    });
  });

  describe('sortTree', () => {
    it('should sort files by name', () => {
      const tree: FileTreeNode[] = [
        {
          id: 'z.txt',
          name: 'z.txt',
          path: 'z.txt',
          type: 'file',
          extension: '.txt',
          size: 100,
          modifiedAt: new Date(),
          isSelected: false,
          isInContext: false,
          children: []
        },
        {
          id: 'a.txt',
          name: 'a.txt',
          path: 'a.txt',
          type: 'file',
          extension: '.txt',
          size: 100,
          modifiedAt: new Date(),
          isSelected: false,
          isInContext: false,
          children: []
        }
      ];

      const sorted = service.sortTree(tree, 'name', 'asc');
      expect(sorted[0].name).toBe('a.txt');
      expect(sorted[1].name).toBe('z.txt');
    });

    it('should put directories first', () => {
      const tree: FileTreeNode[] = [
        {
          id: 'file.txt',
          name: 'file.txt',
          path: 'file.txt',
          type: 'file',
          extension: '.txt',
          size: 100,
          modifiedAt: new Date(),
          isSelected: false,
          isInContext: false,
          children: []
        },
        {
          id: 'dir',
          name: 'dir',
          path: 'dir',
          type: 'directory',
          isExpanded: false,
          isSelected: false,
          isInContext: false,
          children: []
        }
      ];

      const sorted = service.sortTree(tree, 'name', 'asc');
      expect(sorted[0].type).toBe('directory');
      expect(sorted[1].type).toBe('file');
    });
  });

  describe('filterTree', () => {
    it('should filter files by predicate', () => {
      const tree: FileTreeNode[] = [
        {
          id: 'test.ts',
          name: 'test.ts',
          path: 'test.ts',
          type: 'file',
          extension: '.ts',
          size: 100,
          modifiedAt: new Date(),
          isSelected: false,
          isInContext: false,
          children: []
        },
        {
          id: 'readme.md',
          name: 'readme.md',
          path: 'readme.md',
          type: 'file',
          extension: '.md',
          size: 100,
          modifiedAt: new Date(),
          isSelected: false,
          isInContext: false,
          children: []
        }
      ];

      const filtered = service.filterTree(tree, node => node.extension === '.ts');
      expect(filtered).toHaveLength(1);
      expect(filtered[0].name).toBe('test.ts');
    });
  });
});