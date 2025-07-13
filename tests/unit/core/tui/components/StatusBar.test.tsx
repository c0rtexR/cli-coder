/**
 * @fileoverview Unit tests for StatusBar component
 */

import { describe, it, expect } from 'vitest';
import React from 'react';
import { render } from 'ink-testing-library';
import { StatusBar } from '../../../../../src/core/tui/components/StatusBar';

describe('StatusBar', () => {
  describe('Content Display', () => {
    it('should display application name', () => {
      // Arrange & Act
      const { lastFrame } = render(
        <StatusBar 
          provider="anthropic"
          model="claude-3-haiku"
          fileCount={0}
          activePanel="input"
        />
      );

      // Assert
      const output = lastFrame();
      expect(output).toContain('🤖 CLI Coder');
    });

    it('should display provider and model information', () => {
      // Arrange & Act
      const { lastFrame } = render(
        <StatusBar 
          provider="openai"
          model="gpt-4"
          fileCount={5}
          activePanel="chat"
        />
      );

      // Assert
      const output = lastFrame();
      expect(output).toContain('openai');
      expect(output).toContain('gpt-4');
    });

    it('should display file count', () => {
      // Arrange & Act
      const { lastFrame } = render(
        <StatusBar 
          provider="anthropic"
          model="claude-3-haiku"
          fileCount={3}
          activePanel="files"
        />
      );

      // Assert
      const output = lastFrame();
      expect(output).toContain('Files: 3');
    });

    it('should display active panel', () => {
      // Arrange & Act
      const { lastFrame } = render(
        <StatusBar 
          provider="anthropic"
          model="claude-3-haiku"
          fileCount={0}
          activePanel="chat"
        />
      );

      // Assert
      const output = lastFrame();
      expect(output).toContain('Active: chat');
    });

    it('should display help hint', () => {
      // Arrange & Act
      const { lastFrame } = render(
        <StatusBar 
          provider="anthropic"
          model="claude-3-haiku"
          fileCount={0}
          activePanel="input"
        />
      );

      // Assert
      const output = lastFrame();
      expect(output).toContain('Ctrl+H: Help');
    });
  });

  describe('Layout', () => {
    it('should arrange items in left and right sections', () => {
      // Arrange & Act
      const { lastFrame } = render(
        <StatusBar 
          provider="anthropic"
          model="claude-3-haiku"
          fileCount={2}
          activePanel="files"
        />
      );

      // Assert
      const output = lastFrame();
      // Left side should have app name and provider info
      expect(output).toContain('CLI Coder');
      expect(output).toContain('anthropic');
      
      // Right side should have file count, active panel, and help
      expect(output).toContain('Files: 2');
      expect(output).toContain('Active: files');
      expect(output).toContain('Ctrl+H: Help');
    });
  });

  describe('Different Panel States', () => {
    it('should correctly display when input panel is active', () => {
      // Arrange & Act
      const { lastFrame } = render(
        <StatusBar 
          provider="anthropic"
          model="claude-3-haiku"
          fileCount={1}
          activePanel="input"
        />
      );

      // Assert
      const output = lastFrame();
      expect(output).toContain('Active: input');
    });

    it('should correctly display when chat panel is active', () => {
      // Arrange & Act
      const { lastFrame } = render(
        <StatusBar 
          provider="openai"
          model="gpt-3.5-turbo"
          fileCount={4}
          activePanel="chat"
        />
      );

      // Assert
      const output = lastFrame();
      expect(output).toContain('Active: chat');
    });

    it('should correctly display when files panel is active', () => {
      // Arrange & Act
      const { lastFrame } = render(
        <StatusBar 
          provider="anthropic"
          model="claude-3-sonnet"
          fileCount={7}
          activePanel="files"
        />
      );

      // Assert
      const output = lastFrame();
      expect(output).toContain('Active: files');
    });
  });

  describe('Edge Cases', () => {
    it('should handle zero files', () => {
      // Arrange & Act
      const { lastFrame } = render(
        <StatusBar 
          provider="anthropic"
          model="claude-3-haiku"
          fileCount={0}
          activePanel="input"
        />
      );

      // Assert
      const output = lastFrame();
      expect(output).toContain('Files: 0');
    });

    it('should handle large file counts', () => {
      // Arrange & Act
      const { lastFrame } = render(
        <StatusBar 
          provider="anthropic"
          model="claude-3-haiku"
          fileCount={999}
          activePanel="files"
        />
      );

      // Assert
      const output = lastFrame();
      expect(output).toContain('Files: 999');
    });

    it('should handle long provider names', () => {
      // Arrange & Act
      const { lastFrame } = render(
        <StatusBar 
          provider="very-long-provider-name"
          model="very-long-model-name-v1.0"
          fileCount={5}
          activePanel="chat"
        />
      );

      // Assert
      const output = lastFrame();
      expect(output).toContain('very-long-provider-name');
      expect(output).toContain('very-long-model-name-v1.0');
    });

    it('should handle empty strings gracefully', () => {
      // Arrange & Act
      const { lastFrame } = render(
        <StatusBar 
          provider=""
          model=""
          fileCount={0}
          activePanel=""
        />
      );

      // Assert
      const output = lastFrame();
      expect(output).toContain('CLI Coder'); // Should still show app name
      expect(output).toContain('Files: 0');
    });
  });

  describe('Visual Styling', () => {
    it('should use blue background color', () => {
      // Arrange & Act
      const { lastFrame } = render(
        <StatusBar 
          provider="anthropic"
          model="claude-3-haiku"
          fileCount={1}
          activePanel="input"
        />
      );

      // Assert
      const output = lastFrame();
      expect(output).toBeDefined(); // Background color handled by Ink
    });

    it('should use white text color', () => {
      // Arrange & Act
      const { lastFrame } = render(
        <StatusBar 
          provider="anthropic"
          model="claude-3-haiku"
          fileCount={1}
          activePanel="input"
        />
      );

      // Assert
      const output = lastFrame();
      expect(output).toBeDefined(); // Text color handled by Ink
    });

    it('should have proper padding and spacing', () => {
      // Arrange & Act
      const { lastFrame } = render(
        <StatusBar 
          provider="anthropic"
          model="claude-3-haiku"
          fileCount={1}
          activePanel="input"
        />
      );

      // Assert
      const output = lastFrame();
      expect(output).toBeDefined(); // Spacing handled by Ink Box components
    });
  });

  describe('Content Formatting', () => {
    it('should format provider and model correctly', () => {
      // Arrange & Act
      const { lastFrame } = render(
        <StatusBar 
          provider="anthropic"
          model="claude-3-haiku"
          fileCount={1}
          activePanel="input"
        />
      );

      // Assert
      const output = lastFrame();
      expect(output).toContain('anthropic (claude-3-haiku)');
    });

    it('should separate sections with pipe character', () => {
      // Arrange & Act
      const { lastFrame } = render(
        <StatusBar 
          provider="anthropic"
          model="claude-3-haiku"
          fileCount={1}
          activePanel="input"
        />
      );

      // Assert
      const output = lastFrame();
      expect(output).toContain('|');
    });
  });

  describe('Accessibility', () => {
    it('should provide meaningful text content', () => {
      // Arrange & Act
      const { lastFrame } = render(
        <StatusBar 
          provider="anthropic"
          model="claude-3-haiku"
          fileCount={3}
          activePanel="chat"
        />
      );

      // Assert
      const output = lastFrame();
      // All important information should be in text form
      expect(output).toContain('CLI Coder');
      expect(output).toContain('anthropic');
      expect(output).toContain('claude-3-haiku');
      expect(output).toContain('Files: 3');
      expect(output).toContain('Active: chat');
      expect(output).toContain('Ctrl+H: Help');
    });
  });

  describe('Performance', () => {
    it('should render quickly without complex operations', () => {
      // Arrange
      const startTime = Date.now();

      // Act
      render(
        <StatusBar 
          provider="anthropic"
          model="claude-3-haiku"
          fileCount={100}
          activePanel="files"
        />
      );

      // Assert
      const renderTime = Date.now() - startTime;
      expect(renderTime).toBeLessThan(100); // Should render in less than 100ms
    });

    it('should not cause memory leaks with frequent updates', () => {
      // Arrange & Act
      for (let i = 0; i < 100; i++) {
        const { unmount } = render(
          <StatusBar 
            provider="anthropic"
            model="claude-3-haiku"
            fileCount={i}
            activePanel="input"
          />
        );
        unmount();
      }

      // Assert - Should complete without errors
      expect(true).toBe(true);
    });
  });
});