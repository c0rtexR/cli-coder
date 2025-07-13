/**
 * @fileoverview Unit tests for ChatInterface - core chat functionality
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { ChatInterface } from '../../../../src/core/chat/interface';
import { ChatSession, AppConfig } from '../../../../src/types';
import { llmService } from '../../../../src/integrations/llm';

// Mock dependencies
vi.mock('../../../../src/integrations/llm');
vi.mock('../../../../src/core/chat/parser');
vi.mock('../../../../src/core/chat/formatter');
vi.mock('ora', () => ({
  default: vi.fn(() => ({
    start: vi.fn().mockReturnThis(),
    stop: vi.fn(),
  })),
}));
vi.mock('chalk', () => ({
  default: {
    blue: Object.assign(
      vi.fn((text) => text),
      { bold: vi.fn((text) => text) }
    ),
    gray: vi.fn((text) => text),
    cyan: vi.fn((text) => text),
    yellow: vi.fn((text) => text),
    red: vi.fn((text) => text),
    green: vi.fn((text) => text),
  },
}));

const mockLlmService = vi.mocked(llmService);

describe('ChatInterface', () => {
  let chatInterface: ChatInterface;
  let mockSession: ChatSession;
  let mockConfig: AppConfig;
  let originalConsoleLog: any;
  let stdinMock: any;
  let stdoutMock: any;

  beforeEach(() => {
    // Create mock session
    mockSession = {
      id: 'test-session',
      messages: [],
      context: [],
      config: {},
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    // Create mock config
    mockConfig = {
      llm: {
        provider: 'openai',
        apiKey: 'test-key',
        model: 'gpt-4',
      },
      shell: {
        allowDangerousCommands: false,
        defaultTimeout: 30000,
        confirmationRequired: true,
        historySize: 100,
      },
      editor: {
        defaultEditor: 'code',
        tempDir: '/tmp',
      },
      session: {
        saveHistory: true,
        maxHistorySize: 100,
      },
    };

    // Mock stdin/stdout methods
    originalConsoleLog = console.log;
    console.log = vi.fn();

    stdinMock = {
      setEncoding: vi.fn(),
      on: vi.fn(),
      removeListener: vi.fn(),
    };

    stdoutMock = {
      write: vi.fn(),
    };

    // Spy on process methods instead of replacing them
    vi.spyOn(process.stdin, 'setEncoding').mockImplementation(stdinMock.setEncoding);
    vi.spyOn(process.stdin, 'on').mockImplementation(stdinMock.on);
    vi.spyOn(process.stdin, 'removeListener').mockImplementation(stdinMock.removeListener);
    vi.spyOn(process.stdout, 'write').mockImplementation(stdoutMock.write);
    vi.spyOn(process, 'on').mockImplementation(vi.fn());
    vi.spyOn(process, 'exit').mockImplementation(vi.fn() as any);

    // Mock LLM service
    mockLlmService.getProviderName.mockReturnValue('OpenAI');
    mockLlmService.generateResponse.mockResolvedValue({
      content: 'Test AI response',
      usage: { promptTokens: 10, completionTokens: 20, totalTokens: 30 },
      model: 'gpt-4',
    });

    chatInterface = new ChatInterface(mockSession, mockConfig);
  });

  afterEach(() => {
    // Restore original methods
    console.log = originalConsoleLog;
    vi.restoreAllMocks();
  });

  describe('constructor', () => {
    it('should initialize with session and config', () => {
      expect(chatInterface.getSession()).toBe(mockSession);
    });
  });

  describe('start', () => {
    it('should set up input handling and display welcome message', async () => {
      // Mock process events
      process.on = vi.fn();

      // Start the chat interface (don't await as it runs indefinitely)
      const startPromise = chatInterface.start();

      // Verify stdin setup
      expect(stdinMock.setEncoding).toHaveBeenCalledWith('utf8');
      expect(stdinMock.on).toHaveBeenCalledWith('data', expect.any(Function));

      // Verify welcome message
      expect(console.log).toHaveBeenCalledWith(expect.stringContaining('CLI Coder Chat'));
      expect(console.log).toHaveBeenCalledWith(expect.stringContaining('Provider: OpenAI'));

      // Verify prompt display
      expect(stdoutMock.write).toHaveBeenCalledWith(expect.stringContaining('> '));

      // Clean up
      await chatInterface.stop();
    });
  });

  describe('handleInput', () => {
    it('should handle empty input', async () => {
      const showPromptSpy = vi.spyOn(chatInterface as any, 'showPrompt');
      
      await chatInterface.handleInput('');
      
      expect(showPromptSpy).toHaveBeenCalled();
    });

    it('should handle whitespace-only input', async () => {
      const showPromptSpy = vi.spyOn(chatInterface as any, 'showPrompt');
      
      await chatInterface.handleInput('   \n  ');
      
      expect(showPromptSpy).toHaveBeenCalled();
    });

    it('should handle slash commands', async () => {
      const mockParser = {
        parseCommand: vi.fn().mockResolvedValue(undefined),
      };
      (chatInterface as any).parser = mockParser;
      
      await chatInterface.handleInput('/help');
      
      expect(mockParser.parseCommand).toHaveBeenCalledWith('/help');
    });

    it('should handle chat messages', async () => {
      const handleChatMessageSpy = vi.spyOn(chatInterface as any, 'handleChatMessage');
      handleChatMessageSpy.mockResolvedValue(undefined);
      
      await chatInterface.handleInput('Hello, AI!');
      
      expect(handleChatMessageSpy).toHaveBeenCalledWith('Hello, AI!');
    });

    it('should handle errors gracefully', async () => {
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      const mockParser = {
        parseCommand: vi.fn().mockRejectedValue(new Error('Test error')),
      };
      (chatInterface as any).parser = mockParser;
      
      await chatInterface.handleInput('/help');
      
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        expect.stringContaining('Error:'),
        'Test error'
      );
      
      consoleErrorSpy.mockRestore();
    });
  });

  describe('handleChatMessage', () => {
    it('should add user message to session', async () => {
      const message = 'Test user message';
      
      await (chatInterface as any).handleChatMessage(message);
      
      expect(mockSession.messages).toHaveLength(2); // user + assistant
      expect(mockSession.messages[0].role).toBe('user');
      expect(mockSession.messages[0].content).toBe(message);
      expect(mockSession.messages[0].timestamp).toBeInstanceOf(Date);
    });

    it('should call LLM service with correct parameters', async () => {
      const message = 'Test message';
      
      await (chatInterface as any).handleChatMessage(message);
      
      expect(mockLlmService.generateResponse).toHaveBeenCalledWith(message, {
        messages: expect.any(Array),
        files: mockSession.context,
      });
    });

    it('should add AI response to session', async () => {
      const message = 'Test message';
      
      await (chatInterface as any).handleChatMessage(message);
      
      expect(mockSession.messages).toHaveLength(2);
      expect(mockSession.messages[1].role).toBe('assistant');
      expect(mockSession.messages[1].content).toBe('Test AI response');
      expect(mockSession.messages[1].timestamp).toBeInstanceOf(Date);
    });

    it('should format and display AI response', async () => {
      const mockFormatter = {
        formatAIResponse: vi.fn().mockReturnValue('Formatted response'),
      };
      (chatInterface as any).formatter = mockFormatter;
      
      await (chatInterface as any).handleChatMessage('Test message');
      
      expect(mockFormatter.formatAIResponse).toHaveBeenCalledWith('Test AI response');
      expect(console.log).toHaveBeenCalledWith('Formatted response');
    });

    it('should handle LLM service errors', async () => {
      mockLlmService.generateResponse.mockRejectedValue(new Error('LLM Error'));
      
      await expect((chatInterface as any).handleChatMessage('Test message')).rejects.toThrow('LLM Error');
      
      // Should still add user message even if LLM fails
      expect(mockSession.messages).toHaveLength(1);
      expect(mockSession.messages[0].role).toBe('user');
    });
  });

  describe('stop', () => {
    it('should set isActive to false and exit gracefully', async () => {
      await chatInterface.stop();
      
      expect(console.log).toHaveBeenCalledWith(expect.stringContaining('Goodbye!'));
      expect(process.exit).toHaveBeenCalledWith(0);
    });
  });

  describe('getSession', () => {
    it('should return the current session', () => {
      const result = chatInterface.getSession();
      expect(result).toBe(mockSession);
    });
  });

  describe('showHelp', () => {
    it('should display available commands', () => {
      chatInterface.showHelp();
      
      expect(console.log).toHaveBeenCalledWith(expect.stringContaining('Available Commands:'));
      expect(console.log).toHaveBeenCalledWith(expect.stringContaining('/help'));
      expect(console.log).toHaveBeenCalledWith(expect.stringContaining('/clear'));
      expect(console.log).toHaveBeenCalledWith(expect.stringContaining('/context'));
      expect(console.log).toHaveBeenCalledWith(expect.stringContaining('/exit'));
    });
  });
});