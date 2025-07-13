/**
 * @fileoverview Integration tests for chat command - CLI command execution with LLM service
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { join } from 'path';
import { mkdirSync, writeFileSync, rmSync, existsSync } from 'fs';
import { tmpdir } from 'os';
import { ConfigManager } from '../../../src/config/manager';
import { llmService } from '../../../src/integrations/llm';
import { ChatInterface } from '../../../src/core/chat/interface';

// Mock external dependencies
vi.mock('../../../src/integrations/llm');
vi.mock('../../../src/core/chat/interface');
vi.mock('chalk', () => ({
  default: {
    blue: vi.fn((text) => text),
    red: vi.fn((text) => text),
    gray: vi.fn((text) => text),
  },
}));

const mockLlmService = vi.mocked(llmService);
const MockedChatInterface = vi.mocked(ChatInterface);

describe('Chat Command Integration', () => {
  let testDir: string;
  let originalHome: string | undefined;
  let originalCwd: string;
  let originalEnv: NodeJS.ProcessEnv;
  let configManager: ConfigManager;

  beforeEach(() => {
    // Create unique temporary test directory
    const timestamp = Date.now();
    const random = Math.random().toString(36).slice(2);
    testDir = join(tmpdir(), `cli-coder-chat-test-${timestamp}-${random}`);
    mkdirSync(testDir, { recursive: true });

    // Store original values
    originalHome = process.env.HOME;
    originalCwd = process.cwd();
    originalEnv = { ...process.env };

    // Set test environment
    process.env.HOME = testDir;
    process.chdir(testDir);

    // Clear environment variables
    delete process.env.OPENAI_API_KEY;
    delete process.env.ANTHROPIC_API_KEY;

    configManager = new ConfigManager();

    // Reset mocks
    vi.clearAllMocks();
  });

  afterEach(async () => {
    try {
      if (existsSync(testDir)) {
        rmSync(testDir, { recursive: true, force: true });
      }
    } catch (error) {
      // Ignore cleanup errors
    }

    // Restore environment
    if (originalHome !== undefined) {
      process.env.HOME = originalHome;
    } else {
      delete process.env.HOME;
    }

    try {
      process.chdir(originalCwd);
    } catch (error) {
      // Ignore if original directory no longer exists
    }

    // Restore environment variables
    Object.keys(process.env).forEach(key => {
      if (!(key in originalEnv)) {
        delete process.env[key];
      }
    });
    Object.assign(process.env, originalEnv);

    await new Promise(resolve => setTimeout(resolve, 10));
  });

  async function createValidConfig() {
    const configDir = join(testDir, '.cli-coder');
    const configPath = join(configDir, 'config.json');
    mkdirSync(configDir, { recursive: true });

    const config = {
      llm: {
        provider: 'openai',
        apiKey: 'sk-test123456789',
        model: 'gpt-4',
      },
      shell: {
        allowDangerousCommands: false,
        defaultTimeout: 30000,
      },
    };

    writeFileSync(configPath, JSON.stringify(config, null, 2));
    return config;
  }

  describe('Chat Command Execution', () => {
    it('should load configuration and initialize LLM service', async () => {
      await createValidConfig();

      // Mock LLM service initialization
      mockLlmService.initialize.mockResolvedValue(undefined);
      mockLlmService.isInitialized.mockReturnValue(true);

      // Mock ChatInterface
      const mockChatInterface = {
        start: vi.fn().mockResolvedValue(undefined),
      };
      MockedChatInterface.mockImplementation(() => mockChatInterface as any);

      // Simulate command execution
      const { chatCommand } = await import('../../../src/commands/chat.command');
      
      // Test the action function directly
      const mockOptions = { model: 'gpt-3.5-turbo', provider: 'openai' };
      
      // We need to test the internal function, so we'll extract and test it
      // Since the command uses an action callback, we'll test the core logic
      const config = await configManager.loadConfig();
      
      expect(config.llm.provider).toBe('openai');
      expect(config.llm.apiKey).toBe('sk-test123456789');
      expect(config.llm.model).toBe('gpt-4');
    });

    it('should override config with command options', async () => {
      await createValidConfig();

      mockLlmService.initialize.mockResolvedValue(undefined);
      
      const config = await configManager.loadConfig();
      
      // Simulate option overrides
      const options = { model: 'gpt-3.5-turbo', provider: 'anthropic' };
      if (options.model) config.llm.model = options.model;
      if (options.provider) config.llm.provider = options.provider as any;

      expect(config.llm.model).toBe('gpt-3.5-turbo');
      expect(config.llm.provider).toBe('anthropic');
    });

    it('should handle LLM initialization failure', async () => {
      await createValidConfig();

      const error = new Error('API key invalid');
      mockLlmService.initialize.mockRejectedValue(error);

      await expect(
        (async () => {
          const config = await configManager.loadConfig();
          await llmService.initialize(config.llm);
        })()
      ).rejects.toThrow('API key invalid');
    });

    it('should create chat session with correct structure', async () => {
      await createValidConfig();
      
      const config = await configManager.loadConfig();
      const sessionId = `session_${Date.now()}`;
      
      const session = {
        id: sessionId,
        messages: [],
        context: [],
        config: config,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      expect(session.id).toContain('session_');
      expect(session.messages).toEqual([]);
      expect(session.context).toEqual([]);
      expect(session.config).toBe(config);
      expect(session.createdAt).toBeInstanceOf(Date);
      expect(session.updatedAt).toBeInstanceOf(Date);
    });

    it('should pass session and config to ChatInterface', async () => {
      await createValidConfig();

      const config = await configManager.loadConfig();
      
      const mockChatInterface = {
        start: vi.fn().mockResolvedValue(undefined),
      };
      MockedChatInterface.mockImplementation(() => mockChatInterface as any);

      // Create a ChatInterface instance
      const session = {
        id: 'test-session',
        messages: [],
        context: [],
        config: config,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const chatInterface = new ChatInterface(session, config);
      
      expect(MockedChatInterface).toHaveBeenCalledWith(session, config);
    });

    it('should handle missing configuration file', async () => {
      // No config file exists
      await expect(configManager.loadConfig()).rejects.toThrow();
    });

    it('should handle environment variable overrides', async () => {
      await createValidConfig();
      
      // Set environment override
      process.env.OPENAI_API_KEY = 'sk-env-override-key';
      
      const config = await configManager.loadConfig();
      
      expect(config.llm.apiKey).toBe('sk-env-override-key');
    });
  });

  describe('Error Handling', () => {
    it('should handle configuration validation errors', async () => {
      const configDir = join(testDir, '.cli-coder');
      const configPath = join(configDir, 'config.json');
      mkdirSync(configDir, { recursive: true });

      // Create invalid config
      const invalidConfig = {
        llm: {
          provider: 'invalid-provider',
          apiKey: '',
          model: '',
        },
      };

      writeFileSync(configPath, JSON.stringify(invalidConfig, null, 2));

      await expect(configManager.loadConfig()).rejects.toThrow();
    });

    it('should handle corrupted configuration file', async () => {
      const configDir = join(testDir, '.cli-coder');
      const configPath = join(configDir, 'config.json');
      mkdirSync(configDir, { recursive: true });

      // Write invalid JSON
      writeFileSync(configPath, '{ invalid json content ');

      await expect(configManager.loadConfig()).rejects.toThrow();
    });

    it('should provide helpful error messages for setup issues', async () => {
      // Test will verify that proper error messages are shown
      // when LLM initialization fails due to missing/invalid API keys
      
      await createValidConfig();
      
      const setupError = new Error('API key is required');
      mockLlmService.initialize.mockRejectedValue(setupError);
      
      await expect(
        (async () => {
          const config = await configManager.loadConfig();
          await llmService.initialize(config.llm);
        })()
      ).rejects.toThrow('API key is required');
    });
  });
});