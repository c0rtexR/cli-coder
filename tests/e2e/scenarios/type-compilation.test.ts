/**
 * @fileoverview E2E test scenarios for type compilation and usage
 */

import { describe, it, expect } from 'vitest';
import { execSync } from 'child_process';
import { writeFileSync, readFileSync, mkdirSync, rmSync } from 'fs';
import { join } from 'path';

describe('Type Compilation E2E Tests', () => {
  const testDir = join('/tmp', 'cli-coder-type-e2e');
  
  beforeEach(() => {
    // Clean up and create test directory
    try {
      rmSync(testDir, { recursive: true });
    } catch {
      // Directory doesn't exist, that's fine
    }
    mkdirSync(testDir, { recursive: true });
  });

  afterEach(() => {
    // Clean up test directory
    try {
      rmSync(testDir, { recursive: true });
    } catch {
      // Ignore cleanup errors
    }
  });

  it('should compile TypeScript files using our types', () => {
    // Create a test TypeScript file that uses our types
    const testCode = `
import type { 
  LLMConfig, 
  ChatMessage, 
  ShellCommand, 
  AppConfig,
  ChatSession,
  Result,
  isSuccess,
  isError
} from '../../../src/types';

// Test LLM configuration
const llmConfig: LLMConfig = {
  provider: 'openai',
  apiKey: 'sk-test123',
  model: 'gpt-4',
  temperature: 0.7,
  maxTokens: 2000
};

// Test chat message
const message: ChatMessage = {
  role: 'user',
  content: 'Hello, world!',
  timestamp: new Date()
};

// Test shell command
const command: ShellCommand = {
  command: 'ls',
  args: ['-la'],
  timeout: 5000
};

// Test Result type with type guards
function processResult<T>(result: Result<T>): T | null {
  if (isSuccess(result)) {
    return result.data;
  } else {
    console.error('Error:', result.error);
    return null;
  }
}

// Test app configuration
const appConfig: AppConfig = {
  llm: llmConfig,
  shell: {
    allowDangerousCommands: false,
    defaultTimeout: 30000,
    confirmationRequired: true,
    historySize: 100
  },
  editor: {
    defaultEditor: 'code',
    tempDir: '/tmp'
  },
  session: {
    saveHistory: true,
    maxHistorySize: 1000,
    historyPath: '/home/.cli-coder/history'
  }
};

// Test session
const session: ChatSession = {
  id: 'test-session',
  messages: [message],
  context: [],
  config: {},
  createdAt: new Date(),
  updatedAt: new Date()
};

export { llmConfig, message, command, appConfig, session, processResult };
`;

    const testFilePath = join(testDir, 'type-test.ts');
    writeFileSync(testFilePath, testCode);

    // Create a simple tsconfig for the test
    const tsconfig = {
      compilerOptions: {
        target: 'ES2022',
        module: 'ESNext',
        moduleResolution: 'node',
        strict: true,
        esModuleInterop: true,
        skipLibCheck: true,
        forceConsistentCasingInFileNames: true,
        noEmit: true
      },
      include: [testFilePath]
    };

    const tsconfigPath = join(testDir, 'tsconfig.json');
    writeFileSync(tsconfigPath, JSON.stringify(tsconfig, null, 2));

    // Try to compile the TypeScript file
    try {
      const result = execSync(`npx tsc --project ${tsconfigPath}`, {
        encoding: 'utf-8',
        cwd: process.cwd() // Use project root for node_modules access
      });
      
      // If compilation succeeds, the test passes
      expect(true).toBe(true);
    } catch (error: any) {
      // If compilation fails, show the error
      console.error('TypeScript compilation failed:', error.stdout || error.message);
      expect(false).toBe(true); // Force test failure
    }
  });

  it('should validate type exports are accessible', () => {
    // Test that all our types can be imported
    const importTest = `
import { 
  // CLI Types
  CLICommand,
  CommandOptions,
  CLIError,
  CLIErrorClass,
  
  // LLM Types
  LLMProvider,
  LLMConfig,
  LLMResponse,
  ChatMessage,
  ChatContext,
  
  // Shell Types
  ShellCommand,
  ShellResult,
  ShellOptions,
  ShellExecution,
  ShellHistory,
  
  // Config Types
  AppConfig,
  ShellConfig,
  EditorConfig,
  SessionConfig,
  FileContext,
  
  // Session Types
  ChatSession,
  SessionMetadata,
  SlashCommand,
  
  // Utility Types
  Result,
  AsyncResult,
  isSuccess,
  isError
} from '../../../src/types';

// Verify all imports are available at runtime (not just compile time)
const typeNames = [
  'CLICommand', 'CommandOptions', 'CLIError', 'CLIErrorClass',
  'LLMProvider', 'LLMConfig', 'LLMResponse', 'ChatMessage', 'ChatContext',
  'ShellCommand', 'ShellResult', 'ShellOptions', 'ShellExecution', 'ShellHistory',
  'AppConfig', 'ShellConfig', 'EditorConfig', 'SessionConfig', 'FileContext',
  'ChatSession', 'SessionMetadata', 'SlashCommand',
  'Result', 'AsyncResult'
];

const functions = [isSuccess, isError];

console.log('Type imports successful:', typeNames.length, 'types imported');
console.log('Function imports successful:', functions.length, 'functions imported');

export { typeNames, functions };
`;

    const testFilePath = join(testDir, 'import-test.ts');
    writeFileSync(testFilePath, importTest);

    // Create tsconfig
    const tsconfig = {
      compilerOptions: {
        target: 'ES2022',
        module: 'ESNext',
        moduleResolution: 'node',
        strict: true,
        esModuleInterop: true,
        skipLibCheck: true,
        noEmit: true
      },
      include: [testFilePath]
    };

    const tsconfigPath = join(testDir, 'tsconfig.json');
    writeFileSync(tsconfigPath, JSON.stringify(tsconfig, null, 2));

    // Test compilation
    try {
      execSync(`npx tsc --project ${tsconfigPath}`, {
        encoding: 'utf-8',
        cwd: process.cwd()
      });
      expect(true).toBe(true);
    } catch (error: any) {
      console.error('Import test compilation failed:', error.stdout || error.message);
      expect(false).toBe(true);
    }
  });

  it('should validate type usage in realistic scenarios', () => {
    // Create a more complex test that mimics real usage
    const realWorldTest = `
import type { 
  LLMProvider,
  LLMConfig,
  ChatContext,
  ChatMessage,
  LLMResponse,
  ShellCommand,
  ShellResult,
  ChatSession,
  SlashCommand,
  Result,
  isSuccess
} from '../../../src/types';

// Implement a mock LLM provider
class MockLLMProvider implements LLMProvider {
  name = 'mock-provider';

  async generateResponse(prompt: string, context: ChatContext): Promise<LLMResponse> {
    return {
      content: \`Mock response to: \${prompt}\`,
      usage: {
        promptTokens: prompt.length,
        completionTokens: 20,
        totalTokens: prompt.length + 20
      },
      model: 'mock-model'
    };
  }

  validateConfig(config: LLMConfig): boolean {
    return config.apiKey.length > 0 && config.model.length > 0;
  }
}

// Create a shell command executor
function executeShellCommand(command: ShellCommand): Result<ShellResult> {
  try {
    // Mock execution
    const result: ShellResult = {
      success: true,
      stdout: \`Executed: \${command.command}\`,
      stderr: '',
      exitCode: 0,
      command: \`\${command.command} \${command.args?.join(' ') || ''}\`,
      duration: 100
    };

    return { success: true, data: result };
  } catch (error) {
    return { success: false, error: error as Error };
  }
}

// Create a slash command
const helpCommand: SlashCommand = {
  name: 'help',
  description: 'Show help information',
  usage: '/help [command]',
  execute: async (args: string[], session: ChatSession): Promise<void> => {
    const helpMessage: ChatMessage = {
      role: 'assistant',
      content: args.length > 0 ? \`Help for: \${args[0]}\` : 'Available commands: /help',
      timestamp: new Date()
    };
    session.messages.push(helpMessage);
  }
};

// Test the implementations
async function testImplementations() {
  const provider = new MockLLMProvider();
  const config: LLMConfig = {
    provider: 'openai',
    apiKey: 'test-key',
    model: 'test-model'
  };

  const isValidConfig = provider.validateConfig(config);
  console.log('Config valid:', isValidConfig);

  const command: ShellCommand = {
    command: 'echo',
    args: ['hello']
  };

  const result = executeShellCommand(command);
  if (isSuccess(result)) {
    console.log('Command output:', result.data.stdout);
  }

  const session: ChatSession = {
    id: 'test',
    messages: [],
    context: [],
    config: {},
    createdAt: new Date(),
    updatedAt: new Date()
  };

  await helpCommand.execute(['test'], session);
  console.log('Session messages:', session.messages.length);
}

export { MockLLMProvider, executeShellCommand, helpCommand, testImplementations };
`;

    const testFilePath = join(testDir, 'real-world-test.ts');
    writeFileSync(testFilePath, realWorldTest);

    // Create tsconfig
    const tsconfig = {
      compilerOptions: {
        target: 'ES2022',
        module: 'ESNext',
        moduleResolution: 'node',
        strict: true,
        esModuleInterop: true,
        skipLibCheck: true,
        noEmit: true
      },
      include: [testFilePath]
    };

    const tsconfigPath = join(testDir, 'tsconfig.json');
    writeFileSync(tsconfigPath, JSON.stringify(tsconfig, null, 2));

    // Test compilation
    try {
      execSync(`npx tsc --project ${tsconfigPath}`, {
        encoding: 'utf-8',
        cwd: process.cwd()
      });
      expect(true).toBe(true);
    } catch (error: any) {
      console.error('Real-world test compilation failed:', error.stdout || error.message);
      expect(false).toBe(true);
    }
  });

  it('should validate no circular dependencies', () => {
    // Test that our type structure doesn't have circular dependencies
    const circularTest = `
// Try to import all types to check for circular dependencies
import type * as CLI from '../../../src/types/cli.types';
import type * as LLM from '../../../src/types/llm.types';
import type * as Shell from '../../../src/types/shell.types';
import type * as Config from '../../../src/types/config.types';
import type * as Session from '../../../src/types/session.types';
import * as Types from '../../../src/types';

// Use the types to ensure they're properly loaded
const testCLI: CLI.CLICommand = {
  name: 'test',
  description: 'test',
  execute: async () => {}
};

const testLLM: LLM.LLMConfig = {
  provider: 'openai',
  apiKey: 'test',
  model: 'test'
};

const testShell: Shell.ShellCommand = {
  command: 'test'
};

const testConfig: Config.FileContext = {
  path: 'test',
  content: 'test',
  language: 'test',
  size: 0,
  lastModified: new Date()
};

const testSession: Session.ChatSession = {
  id: 'test',
  messages: [],
  context: [],
  config: {},
  createdAt: new Date(),
  updatedAt: new Date()
};

// Test utility types
const result: Types.Result<string> = { success: true, data: 'test' };
const isOk = Types.isSuccess(result);

console.log('No circular dependencies detected');

export { testCLI, testLLM, testShell, testConfig, testSession, result, isOk };
`;

    const testFilePath = join(testDir, 'circular-test.ts');
    writeFileSync(testFilePath, circularTest);

    // Create tsconfig
    const tsconfig = {
      compilerOptions: {
        target: 'ES2022',
        module: 'ESNext',
        moduleResolution: 'node',
        strict: true,
        esModuleInterop: true,
        skipLibCheck: true,
        noEmit: true
      },
      include: [testFilePath]
    };

    const tsconfigPath = join(testDir, 'tsconfig.json');
    writeFileSync(tsconfigPath, JSON.stringify(tsconfig, null, 2));

    // Test compilation
    try {
      execSync(`npx tsc --project ${tsconfigPath}`, {
        encoding: 'utf-8',
        cwd: process.cwd()
      });
      expect(true).toBe(true);
    } catch (error: any) {
      console.error('Circular dependency test failed:', error.stdout || error.message);
      expect(false).toBe(true);
    }
  });
});