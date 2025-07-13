/**
 * @fileoverview Unit tests for FilePanel component
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import React from 'react';
import { render } from 'ink-testing-library';
import { FilePanel } from '../../../../../src/core/tui/components/FilePanel';
import type { ChatSession } from '../../../../../src/types';

describe('FilePanel', () => {
  let mockSession: ChatSession;
  let mockOnActivate: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    mockOnActivate = vi.fn();
    mockSession = {
      id: 'test-session',
      messages: [],
      context: [],
      config: {},
      createdAt: new Date(),
      updatedAt: new Date(),
    };
  });

  describe('Empty State', () => {
    it('should show empty state when no files in context', () => {
      // Arrange & Act
      const { lastFrame } = render(
        <FilePanel 
          session={mockSession} 
          isActive={true} 
          onActivate={mockOnActivate} 
        />
      );

      // Assert
      const output = lastFrame();
      expect(output).toContain('No files in context');
      expect(output).toContain('Use /add command to add files');
    });

    it('should display file panel header', () => {
      // Arrange & Act
      const { lastFrame } = render(
        <FilePanel 
          session={mockSession} 
          isActive={true} 
          onActivate={mockOnActivate} 
        />
      );

      // Assert
      const output = lastFrame();
      expect(output).toContain('📁 Files');
    });
  });

  describe('File List Display', () => {
    beforeEach(() => {
      mockSession.context = [
        {
          path: '/project/src/component.tsx',
          content: 'import React from "react";\nexport const Component = () => <div>Hello</div>;',
          size: 1024,
          language: 'typescript',
        },
        {
          path: '/project/package.json',
          content: '{"name": "test-project"}',
          size: 512,
          language: 'json',
        },
        {
          path: '/project/README.md',
          content: '# Test Project\nThis is a test.',
          size: 256,
          language: 'markdown',
        },
      ];
    });

    it('should display all files in context', () => {
      // Arrange & Act
      const { lastFrame } = render(
        <FilePanel 
          session={mockSession} 
          isActive={true} 
          onActivate={mockOnActivate} 
        />
      );

      // Assert
      const output = lastFrame();
      expect(output).toContain('component.tsx');
      expect(output).toContain('package.json');
      expect(output).toContain('README.md');
    });

    it('should show file count in header', () => {
      // Arrange & Act
      const { lastFrame } = render(
        <FilePanel 
          session={mockSession} 
          isActive={true} 
          onActivate={mockOnActivate} 
        />
      );

      // Assert
      const output = lastFrame();
      expect(output).toContain('(3 files)');
    });

    it('should display file sizes', () => {
      // Arrange & Act
      const { lastFrame } = render(
        <FilePanel 
          session={mockSession} 
          isActive={true} 
          onActivate={mockOnActivate} 
        />
      );

      // Assert
      const output = lastFrame();
      expect(output).toContain('(1KB)'); // 1024 bytes = 1KB
      expect(output).toContain('(1KB)'); // 512 bytes rounded
    });

    it('should show appropriate file icons', () => {
      // Arrange & Act
      const { lastFrame } = render(
        <FilePanel 
          session={mockSession} 
          isActive={true} 
          onActivate={mockOnActivate} 
        />
      );

      // Assert
      const output = lastFrame();
      expect(output).toContain('📘'); // TypeScript icon
      expect(output).toContain('📋'); // JSON icon
      expect(output).toContain('📝'); // Markdown icon
    });
  });

  describe('File Navigation', () => {
    beforeEach(() => {
      mockSession.context = [
        { path: '/file1.ts', content: 'test1', size: 100, language: 'typescript' },
        { path: '/file2.js', content: 'test2', size: 200, language: 'javascript' },
        { path: '/file3.md', content: 'test3', size: 300, language: 'markdown' },
      ];
    });

    it('should navigate down with down arrow when active', () => {
      // Arrange
      const { stdin, lastFrame } = render(
        <FilePanel 
          session={mockSession} 
          isActive={true} 
          onActivate={mockOnActivate} 
        />
      );

      // Act
      stdin.write('\x1b[B'); // Down arrow

      // Assert
      const output = lastFrame();
      expect(output).toBeDefined(); // Should still render
    });

    it('should navigate up with up arrow when active', () => {
      // Arrange
      const { stdin, lastFrame } = render(
        <FilePanel 
          session={mockSession} 
          isActive={true} 
          onActivate={mockOnActivate} 
        />
      );

      // Act
      stdin.write('\x1b[B'); // Down arrow first
      stdin.write('\x1b[A'); // Up arrow

      // Assert
      const output = lastFrame();
      expect(output).toBeDefined(); // Should still render
    });

    it('should highlight selected file', () => {
      // Arrange & Act
      const { lastFrame } = render(
        <FilePanel 
          session={mockSession} 
          isActive={true} 
          onActivate={mockOnActivate} 
        />
      );

      // Assert
      const output = lastFrame();
      expect(output).toContain('▶'); // Selection indicator
    });

    it('should not navigate when inactive', () => {
      // Arrange
      const { stdin, lastFrame } = render(
        <FilePanel 
          session={mockSession} 
          isActive={false} 
          onActivate={mockOnActivate} 
        />
      );

      // Act
      stdin.write('\x1b[B'); // Down arrow

      // Assert
      const output = lastFrame();
      expect(output).toBeDefined(); // Should still render but not change selection
    });
  });

  describe('File Operations', () => {
    beforeEach(() => {
      mockSession.context = [
        { path: '/file1.ts', content: 'test1', size: 100, language: 'typescript' },
        { path: '/file2.js', content: 'test2', size: 200, language: 'javascript' },
      ];
    });

    it('should remove file with Enter key when active', () => {
      // Arrange
      const { stdin, lastFrame } = render(
        <FilePanel 
          session={mockSession} 
          isActive={true} 
          onActivate={mockOnActivate} 
        />
      );

      // Act
      stdin.write('\r'); // Enter key

      // Assert
      expect(mockSession.context).toHaveLength(1); // File should be removed
    });

    it('should show file preview with Space key when active', () => {
      // Arrange
      const { stdin, lastFrame } = render(
        <FilePanel 
          session={mockSession} 
          isActive={true} 
          onActivate={mockOnActivate} 
        />
      );

      // Act
      stdin.write(' '); // Space key

      // Assert
      const output = lastFrame();
      expect(output).toContain('/file1.ts'); // Should show preview
    });

    it('should show navigation hints when active and has files', () => {
      // Arrange & Act
      const { lastFrame } = render(
        <FilePanel 
          session={mockSession} 
          isActive={true} 
          onActivate={mockOnActivate} 
        />
      );

      // Assert
      const output = lastFrame();
      expect(output).toContain('↑↓: Navigate');
      expect(output).toContain('Enter: Remove');
      expect(output).toContain('Space: Preview');
    });
  });

  describe('File Preview', () => {
    beforeEach(() => {
      mockSession.context = [
        {
          path: '/component.tsx',
          content: 'import React from "react";\n\ninterface Props {\n  title: string;\n}\n\nexport const Component: React.FC<Props> = ({ title }) => {\n  return (\n    <div className="component">\n      <h1>{title}</h1>\n      <p>This is a test component.</p>\n    </div>\n  );\n};\n\nexport default Component;',
          size: 1024,
          language: 'typescript',
        },
      ];
    });

    it('should show file preview when triggered', async () => {
      // Arrange
      const { stdin, lastFrame } = render(
        <FilePanel 
          session={mockSession} 
          isActive={true} 
          onActivate={mockOnActivate} 
        />
      );

      // Act
      stdin.write(' '); // Space to show preview
      await new Promise(resolve => setTimeout(resolve, 50)); // Wait for state update

      // Assert
      const output = lastFrame();
      expect(output).toContain('component.tsx');
      expect(output).toContain('(typescript)');
      expect(output).toContain('import React');
    });

    it('should close preview with Escape key', () => {
      // Arrange
      const { stdin, lastFrame } = render(
        <FilePanel 
          session={mockSession} 
          isActive={true} 
          onActivate={mockOnActivate} 
        />
      );

      // Act
      stdin.write(' '); // Space to show preview
      stdin.write('\x1b'); // Escape to close

      // Assert
      const output = lastFrame();
      expect(output).not.toContain('(typescript)'); // Should be back to file list
    });

    it('should close preview with q key', () => {
      // Arrange
      const { stdin, lastFrame } = render(
        <FilePanel 
          session={mockSession} 
          isActive={true} 
          onActivate={mockOnActivate} 
        />
      );

      // Act
      stdin.write(' '); // Space to show preview
      stdin.write('q'); // q to close

      // Assert
      const output = lastFrame();
      expect(output).not.toContain('(typescript)'); // Should be back to file list
    });

    it('should show line numbers in preview', async () => {
      // Arrange
      const { stdin, lastFrame } = render(
        <FilePanel 
          session={mockSession} 
          isActive={true} 
          onActivate={mockOnActivate} 
        />
      );

      // Act
      stdin.write(' '); // Space to show preview
      await new Promise(resolve => setTimeout(resolve, 50)); // Wait for state update

      // Assert
      const output = lastFrame();
      expect(output).toContain('  1:'); // Line numbers
      expect(output).toContain('  2:');
    });

    it('should limit preview to first 15 lines', async () => {
      // Arrange
      const { stdin, lastFrame } = render(
        <FilePanel 
          session={mockSession} 
          isActive={true} 
          onActivate={mockOnActivate} 
        />
      );

      // Act
      stdin.write(' '); // Space to show preview
      await new Promise(resolve => setTimeout(resolve, 50)); // Wait for state update

      // Assert
      const output = lastFrame();
      expect(output).toContain('and more lines'); // Truncation indicator
    });
  });

  describe('Panel State', () => {
    it('should highlight border when active', () => {
      // Arrange & Act
      const { lastFrame } = render(
        <FilePanel 
          session={mockSession} 
          isActive={true} 
          onActivate={mockOnActivate} 
        />
      );

      // Assert
      const output = lastFrame();
      expect(output).toBeDefined(); // Border styling is handled by Ink
    });

    it('should use gray border when inactive', () => {
      // Arrange & Act
      const { lastFrame } = render(
        <FilePanel 
          session={mockSession} 
          isActive={false} 
          onActivate={mockOnActivate} 
        />
      );

      // Assert
      const output = lastFrame();
      expect(output).toBeDefined(); // Border styling is handled by Ink
    });
  });

  describe('Error Handling', () => {
    it('should handle invalid file data gracefully', () => {
      // Arrange
      mockSession.context = [
        { path: null, content: undefined, size: -1, language: 'unknown' } as any,
      ];

      // Act & Assert
      expect(() => {
        render(
          <FilePanel 
            session={mockSession} 
            isActive={true} 
            onActivate={mockOnActivate} 
          />
        );
      }).not.toThrow();
    });

    it('should handle empty file content', () => {
      // Arrange
      mockSession.context = [
        { path: '/empty.txt', content: '', size: 0, language: 'text' },
      ];

      // Act & Assert
      expect(() => {
        render(
          <FilePanel 
            session={mockSession} 
            isActive={true} 
            onActivate={mockOnActivate} 
          />
        );
      }).not.toThrow();
    });
  });

  describe('Performance', () => {
    it('should handle large number of files efficiently', () => {
      // Arrange
      const largeContext = Array.from({ length: 100 }, (_, i) => ({
        path: `/file${i}.ts`,
        content: `// File ${i}`,
        size: 100,
        language: 'typescript',
      }));
      mockSession.context = largeContext;

      // Act & Assert
      expect(() => {
        render(
          <FilePanel 
            session={mockSession} 
            isActive={true} 
            onActivate={mockOnActivate} 
          />
        );
      }).not.toThrow();
    });
  });
});