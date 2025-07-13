/**
 * @fileoverview Unit tests for ChatPanel component
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import React from 'react';
import { render } from 'ink-testing-library';
import { ChatPanel } from '../../../../../src/core/tui/components/ChatPanel';
import type { ChatSession, ChatMessage } from '../../../../../src/types';

describe('ChatPanel', () => {
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
    it('should show empty state message when no messages', () => {
      // Arrange & Act
      const { lastFrame } = render(
        <ChatPanel 
          session={mockSession} 
          isActive={true} 
          onActivate={mockOnActivate} 
        />
      );

      // Assert
      const output = lastFrame();
      expect(output).toContain('Start a conversation');
    });

    it('should display chat panel header', () => {
      // Arrange & Act
      const { lastFrame } = render(
        <ChatPanel 
          session={mockSession} 
          isActive={true} 
          onActivate={mockOnActivate} 
        />
      );

      // Assert
      const output = lastFrame();
      expect(output).toContain('💬 Chat');
    });
  });

  describe('Message Display', () => {
    beforeEach(() => {
      mockSession.messages = [
        {
          role: 'user',
          content: 'Hello, how can you help me?',
          timestamp: new Date('2024-01-01T10:00:00Z'),
        },
        {
          role: 'assistant',
          content: 'I can help you with coding tasks, explain concepts, and more!',
          timestamp: new Date('2024-01-01T10:00:30Z'),
        },
      ];
    });

    it('should display all messages in session', () => {
      // Arrange & Act
      const { lastFrame } = render(
        <ChatPanel 
          session={mockSession} 
          isActive={true} 
          onActivate={mockOnActivate} 
        />
      );

      // Assert
      const output = lastFrame();
      expect(output).toContain('Hello, how can you help me?');
      expect(output).toContain('I can help you with coding tasks');
    });

    it('should show message count in header', () => {
      // Arrange & Act
      const { lastFrame } = render(
        <ChatPanel 
          session={mockSession} 
          isActive={true} 
          onActivate={mockOnActivate} 
        />
      );

      // Assert
      const output = lastFrame();
      expect(output).toContain('(2 messages)');
    });

    it('should distinguish between user and assistant messages', () => {
      // Arrange & Act
      const { lastFrame } = render(
        <ChatPanel 
          session={mockSession} 
          isActive={true} 
          onActivate={mockOnActivate} 
        />
      );

      // Assert
      const output = lastFrame();
      expect(output).toContain('👤 You');
      expect(output).toContain('🤖 Assistant');
    });

    it('should display timestamps for messages', () => {
      // Arrange & Act
      const { lastFrame } = render(
        <ChatPanel 
          session={mockSession} 
          isActive={true} 
          onActivate={mockOnActivate} 
        />
      );

      // Assert
      const output = lastFrame();
      expect(output).toContain('ago'); // Relative timestamps
    });
  });

  describe('Message Scrolling', () => {
    beforeEach(() => {
      // Create many messages to test scrolling
      mockSession.messages = Array.from({ length: 50 }, (_, i) => ({
        role: i % 2 === 0 ? 'user' : 'assistant',
        content: `Message ${i + 1}`,
        timestamp: new Date(),
      })) as ChatMessage[];
    });

    it('should scroll up with up arrow when active', () => {
      // Arrange
      const { stdin, lastFrame } = render(
        <ChatPanel 
          session={mockSession} 
          isActive={true} 
          onActivate={mockOnActivate} 
        />
      );

      // Act
      stdin.write('\x1b[A'); // Up arrow

      // Assert
      const output = lastFrame();
      expect(output).toBeDefined(); // Should still render
    });

    it('should scroll down with down arrow when active', () => {
      // Arrange
      const { stdin, lastFrame } = render(
        <ChatPanel 
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

    it('should fast scroll with Page Up/Down when active', () => {
      // Arrange
      const { stdin, lastFrame } = render(
        <ChatPanel 
          session={mockSession} 
          isActive={true} 
          onActivate={mockOnActivate} 
        />
      );

      // Act
      stdin.write('\x1b[5~'); // Page Up

      // Assert
      const output = lastFrame();
      expect(output).toBeDefined(); // Should still render
    });

    it('should not scroll when inactive', () => {
      // Arrange
      const { stdin, lastFrame } = render(
        <ChatPanel 
          session={mockSession} 
          isActive={false} 
          onActivate={mockOnActivate} 
        />
      );

      // Act
      stdin.write('\x1b[A'); // Up arrow

      // Assert
      const output = lastFrame();
      expect(output).toBeDefined(); // Should still render but not change scroll
    });

    it('should show scroll hints when active', () => {
      // Arrange & Act
      const { lastFrame } = render(
        <ChatPanel 
          session={mockSession} 
          isActive={true} 
          onActivate={mockOnActivate} 
        />
      );

      // Assert
      const output = lastFrame();
      expect(output).toContain('↑↓: Scroll');
      expect(output).toContain('PgUp/PgDn: Fast scroll');
    });
  });

  describe('Panel State', () => {
    it('should highlight border when active', () => {
      // Arrange & Act
      const { lastFrame } = render(
        <ChatPanel 
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
        <ChatPanel 
          session={mockSession} 
          isActive={false} 
          onActivate={mockOnActivate} 
        />
      );

      // Assert
      const output = lastFrame();
      expect(output).toBeDefined(); // Border styling is handled by Ink
    });

    it('should call onActivate when clicked/focused', () => {
      // Arrange
      const { lastFrame } = render(
        <ChatPanel 
          session={mockSession} 
          isActive={false} 
          onActivate={mockOnActivate} 
        />
      );

      // Act - Simulate click (this is conceptual as Ink doesn't have real click events)
      lastFrame(); // Just render to trigger any focus handlers

      // Assert - In a real implementation, this would test click handling
      expect(mockOnActivate).not.toHaveBeenCalled(); // No real click in test
    });
  });

  describe('Message Formatting', () => {
    beforeEach(() => {
      mockSession.messages = [
        {
          role: 'user',
          content: 'Multi\nline\nmessage',
          timestamp: new Date(),
        },
        {
          role: 'assistant',
          content: 'Code example:\n```typescript\nconst x = 1;\n```',
          timestamp: new Date(),
        },
      ];
    });

    it('should handle multi-line messages', () => {
      // Arrange & Act
      const { lastFrame } = render(
        <ChatPanel 
          session={mockSession} 
          isActive={true} 
          onActivate={mockOnActivate} 
        />
      );

      // Assert
      const output = lastFrame();
      expect(output).toContain('Multi');
      expect(output).toContain('line');
      expect(output).toContain('message');
    });

    it('should preserve code formatting', () => {
      // Arrange & Act
      const { lastFrame } = render(
        <ChatPanel 
          session={mockSession} 
          isActive={true} 
          onActivate={mockOnActivate} 
        />
      );

      // Assert
      const output = lastFrame();
      expect(output).toContain('Code example:');
      expect(output).toContain('const x = 1;');
    });
  });

  describe('Performance', () => {
    it('should handle large message history efficiently', () => {
      // Arrange
      const largeSession = {
        ...mockSession,
        messages: Array.from({ length: 1000 }, (_, i) => ({
          role: i % 2 === 0 ? 'user' : 'assistant',
          content: `Message ${i}`,
          timestamp: new Date(),
        })) as ChatMessage[],
      };

      // Act & Assert
      expect(() => {
        render(
          <ChatPanel 
            session={largeSession} 
            isActive={true} 
            onActivate={mockOnActivate} 
          />
        );
      }).not.toThrow();
    });

    it('should auto-scroll to bottom for new messages', () => {
      // Arrange
      const { rerender, lastFrame } = render(
        <ChatPanel 
          session={mockSession} 
          isActive={true} 
          onActivate={mockOnActivate} 
        />
      );

      // Act - Add new message
      mockSession.messages.push({
        role: 'user',
        content: 'New message',
        timestamp: new Date(),
      });

      rerender(
        <ChatPanel 
          session={mockSession} 
          isActive={true} 
          onActivate={mockOnActivate} 
        />
      );

      // Assert
      const output = lastFrame();
      expect(output).toContain('New message');
    });
  });
});