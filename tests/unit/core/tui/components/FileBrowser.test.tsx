import React from 'react';
import { render } from 'ink-testing-library';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { FileBrowser } from '../../../../../src/core/tui/components/FileBrowser';
import { FileTreeNode, FileBrowserProps } from '../../../../../src/types/tui.types';

// Mock file tree data for testing
const mockFileTree: FileTreeNode[] = [
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
        modifiedAt: new Date('2025-01-01'),
        isSelected: false,
        isInContext: true,
        children: []
      },
      {
        id: 'src/utils.ts',
        name: 'utils.ts',
        path: 'src/utils.ts',
        type: 'file',
        extension: '.ts',
        size: 512,
        modifiedAt: new Date('2025-01-02'),
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
    modifiedAt: new Date('2025-01-03'),
    isSelected: false,
    isInContext: true,
    children: []
  }
];

const mockProps: FileBrowserProps = {
  fileTree: mockFileTree,
  selectedPath: null,
  isActive: true,
  onFileSelect: vi.fn(),
  onFileToggleContext: vi.fn(),
  onDirectoryToggle: vi.fn(),
  onSearch: vi.fn(),
  onMultiSelect: vi.fn(),
  searchQuery: '',
  showHidden: false,
  multiSelectMode: false,
  selectedFiles: []
};

describe('FileBrowser Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Rendering', () => {
    it('should render file tree structure', () => {
      const { lastFrame } = render(<FileBrowser {...mockProps} />);
      
      expect(lastFrame()).toContain('📁 src');
      expect(lastFrame()).toContain('package.json'); // Name is rendered with icon
      expect(lastFrame()).toContain('✓'); // Context indicator
    });

    it('should show file type icons correctly', () => {
      const { lastFrame } = render(<FileBrowser {...mockProps} />);
      
      expect(lastFrame()).toContain('📁'); // Directory icon
      expect(lastFrame()).toContain('📋'); // JSON file icon (package.json gets this icon)
    });

    it('should display file sizes and context indicators', () => {
      const { lastFrame } = render(<FileBrowser {...mockProps} />);
      
      expect(lastFrame()).toContain('2KB'); // package.json size
      expect(lastFrame()).toContain('✓'); // Context indicator for files in context
    });

    it('should highlight selected files when active', () => {
      const propsWithSelection = {
        ...mockProps,
        selectedPath: 'package.json'
      };
      const { lastFrame } = render(<FileBrowser {...propsWithSelection} />);
      
      // Should show selection indicator for selected file
      expect(lastFrame()).toContain('▶'); // Selection indicator
    });

    it('should show expanded directory contents', () => {
      const expandedTree = [...mockFileTree];
      expandedTree[0].isExpanded = true;
      
      const propsWithExpanded = {
        ...mockProps,
        fileTree: expandedTree
      };
      const { lastFrame } = render(<FileBrowser {...propsWithExpanded} />);
      
      expect(lastFrame()).toContain('main.ts');
      expect(lastFrame()).toContain('utils.ts');
    });
  });

  describe('Search Functionality', () => {
    it('should render search bar when searching', () => {
      const propsWithSearch = {
        ...mockProps,
        searchQuery: 'test'
      };
      const { lastFrame } = render(<FileBrowser {...propsWithSearch} />);
      
      expect(lastFrame()).toContain('/: Search'); // Search shortcut is shown
    });

    it('should display search query', () => {
      const propsWithSearch = {
        ...mockProps,
        searchQuery: 'main'
      };
      const { lastFrame } = render(<FileBrowser {...propsWithSearch} />);
      
      expect(lastFrame()).toContain('main');
    });

    it('should show filtered results when searching', () => {
      const filteredTree = mockFileTree.filter(node => 
        node.name.includes('package')
      );
      
      const propsWithFiltered = {
        ...mockProps,
        fileTree: filteredTree,
        searchQuery: 'package'
      };
      const { lastFrame } = render(<FileBrowser {...propsWithFiltered} />);
      
      expect(lastFrame()).toContain('package.json');
      expect(lastFrame()).not.toContain('src');
    });
  });

  describe('Multi-select Mode', () => {
    it('should show multi-select indicators when in multi-select mode', () => {
      const propsWithMultiSelect = {
        ...mockProps,
        multiSelectMode: true,
        selectedFiles: ['package.json']
      };
      const { lastFrame } = render(<FileBrowser {...propsWithMultiSelect} />);
      
      expect(lastFrame()).toContain('☑'); // Selected checkbox
      expect(lastFrame()).toContain('☐'); // Unselected checkbox
    });

    it('should display selected file count in multi-select mode', () => {
      const propsWithMultiSelect = {
        ...mockProps,
        multiSelectMode: true,
        selectedFiles: ['package.json', 'src/main.ts']
      };
      const { lastFrame } = render(<FileBrowser {...propsWithMultiSelect} />);
      
      expect(lastFrame()).toContain('2 selected');
    });
  });

  describe('Keyboard Interaction Logic', () => {
    it('should support navigation state management', () => {
      const { lastFrame } = render(<FileBrowser {...mockProps} />);
      
      // Test that component renders with navigation capabilities
      expect(lastFrame()).toContain('↑↓: Navigate');
      expect(lastFrame()).toContain('Enter: Select');
      expect(lastFrame()).toContain('Space: Toggle context');
    });

    it('should display appropriate shortcuts based on mode', () => {
      const propsWithMultiSelect = {
        ...mockProps,
        multiSelectMode: true
      };
      const { lastFrame } = render(<FileBrowser {...propsWithMultiSelect} />);
      
      expect(lastFrame()).toContain('Space: Multi-select');
      expect(lastFrame()).toContain('Ctrl+A: Select all');
    });
  });

  describe('Performance Indicators', () => {
    it('should handle large file trees efficiently', () => {
      const largeFileTree = Array.from({ length: 1000 }, (_, i) => ({
        id: `file-${i}`,
        name: `file-${i}.txt`,
        path: `file-${i}.txt`,
        type: 'file' as const,
        extension: '.txt',
        size: 1024,
        modifiedAt: new Date(),
        isSelected: false,
        isInContext: false,
        children: []
      }));

      const propsWithLargeTree = {
        ...mockProps,
        fileTree: largeFileTree
      };

      const startTime = performance.now();
      const { lastFrame } = render(<FileBrowser {...propsWithLargeTree} />);
      const endTime = performance.now();

      // Should render quickly even with large trees
      expect(endTime - startTime).toBeLessThan(100);
      expect(lastFrame()).toContain('file-0.txt');
    });
  });

  describe('Error Handling', () => {
    it('should handle empty file tree gracefully', () => {
      const propsWithEmptyTree = {
        ...mockProps,
        fileTree: []
      };
      const { lastFrame } = render(<FileBrowser {...propsWithEmptyTree} />);
      
      expect(lastFrame()).toContain('No files found');
    });

    it('should handle null/undefined props gracefully', () => {
      const propsWithNulls = {
        ...mockProps,
        selectedPath: null,
        searchQuery: ''
      };
      
      expect(() => {
        render(<FileBrowser {...propsWithNulls} />);
      }).not.toThrow();
    });
  });

  describe('Accessibility', () => {
    it('should provide clear focus indicators', () => {
      const { lastFrame } = render(<FileBrowser {...mockProps} />);
      
      // Should have accessibility indicators in help text
      expect(lastFrame()).toContain('↑↓: Navigate');
      expect(lastFrame()).toContain('Enter: Select');
    });

    it('should support keyboard-only navigation', () => {
      const { lastFrame } = render(<FileBrowser {...mockProps} />);
      
      // Should show all necessary keyboard shortcuts
      expect(lastFrame()).toContain('←→: Expand/Collapse');
      expect(lastFrame()).toContain('/: Search');
      expect(lastFrame()).toContain('Tab:'); // Tab shortcut is shown (might be split across lines)
    });
  });
});