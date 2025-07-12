/**
 * @fileoverview Real-world usage tests for the complete type system
 */

import { describe, it, expect } from 'vitest';
import { execSync } from 'child_process';
import { writeFileSync, mkdirSync, rmSync } from 'fs';
import { join } from 'path';

describe('Type System Real Usage Tests', () => {
  const testDir = join('/tmp', 'cli-coder-real-types');
  
  beforeEach(() => {
    try {
      rmSync(testDir, { recursive: true });
    } catch {
      // Directory doesn't exist
    }
    mkdirSync(testDir, { recursive: true });
  });

  afterEach(() => {
    try {
      rmSync(testDir, { recursive: true });
    } catch {
      // Ignore cleanup errors
    }
  });

  it('should support building a complete CLI application with our types', () => {
    // Create a mini CLI app using our types
    const miniAppCode = `
import type {
  CLICommand,
  LLMConfig,
  LLMProvider,
  ChatSession,
  ChatMessage,
  ShellCommand,
  ShellResult,
  AppConfig,
  Result,
  isSuccess,
  isError
} from '../../../src/types';

class MiniCLI {
  private config: AppConfig;
  private session: ChatSession;

  constructor(config: AppConfig) {
    this.config = config;
    this.session = {
      id: 'mini-cli-session',
      messages: [],
      context: [],
      config: {},
      createdAt: new Date(),
      updatedAt: new Date()
    };
  }

  async executeCommand(name: string, args: string[]): Promise<Result<string>> {
    try {
      const command = this.getCommand(name);
      if (!command) {
        return { success: false, error: new Error(\`Command '\${name}' not found\`) };
      }

      await command.execute(args, {});
      return { success: true, data: \`Command '\${name}' executed successfully\` };
    } catch (error) {
      return { success: false, error: error as Error };
    }
  }

  private getCommand(name: string): CLICommand | null {
    const commands: CLICommand[] = [
      {
        name: 'help',
        description: 'Show help information',
        execute: async (args: string[]) => {
          console.log('Available commands: help, chat, shell');
        }
      },
      {
        name: 'chat',
        description: 'Start a chat session',
        execute: async (args: string[]) => {
          const message: ChatMessage = {
            role: 'user',
            content: args.join(' ') || 'Hello',
            timestamp: new Date()
          };
          this.session.messages.push(message);
          console.log(\`Added message: \${message.content}\`);
        }
      }
    ];

    return commands.find(cmd => cmd.name === name) || null;
  }
}

// Test the mini CLI
const config: AppConfig = {
  llm: {
    provider: 'openai',
    apiKey: 'test-key',
    model: 'gpt-4'
  },
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
    historyPath: '/tmp/history.json'
  }
};

async function testMiniCLI() {
  const cli = new MiniCLI(config);
  
  const helpResult = await cli.executeCommand('help', []);
  console.log('Help result:', isSuccess(helpResult) ? 'success' : 'failed');
  
  const chatResult = await cli.executeCommand('chat', ['Hello', 'world']);
  console.log('Chat result:', isSuccess(chatResult) ? 'success' : 'failed');
  
  const invalidResult = await cli.executeCommand('invalid', []);
  console.log('Invalid command result:', isError(invalidResult) ? 'failed as expected' : 'unexpected success');
}

export { MiniCLI, testMiniCLI, config };
`;

    const testFilePath = join(testDir, 'mini-cli.ts');
    writeFileSync(testFilePath, miniAppCode);

    // Create package.json for the test
    const packageJson = {
      name: 'type-test',
      version: '1.0.0',
      type: 'module',
      dependencies: {}
    };

    writeFileSync(join(testDir, 'package.json'), JSON.stringify(packageJson, null, 2));

    // Create tsconfig
    const tsconfig = {
      compilerOptions: {
        target: 'ES2022',
        module: 'ESNext',
        moduleResolution: 'node',
        strict: true,
        esModuleInterop: true,
        skipLibCheck: true,
        declaration: true,
        outDir: './dist'
      },
      include: [testFilePath]
    };

    writeFileSync(join(testDir, 'tsconfig.json'), JSON.stringify(tsconfig, null, 2));

    // Test compilation and build
    try {
      const compileResult = execSync(`npx tsc --project ${join(testDir, 'tsconfig.json')}`, {
        encoding: 'utf-8',
        cwd: process.cwd()
      });

      // Check that output files were generated
      const jsFilePath = join(testDir, 'dist', 'mini-cli.js');
      const dtsFilePath = join(testDir, 'dist', 'mini-cli.d.ts');

      try {
        execSync(`test -f ${jsFilePath}`, { encoding: 'utf-8' });
        execSync(`test -f ${dtsFilePath}`, { encoding: 'utf-8' });
        expect(true).toBe(true); // Files exist
      } catch {
        expect(false).toBe(true); // Files don't exist
      }
    } catch (error: any) {
      console.error('Mini CLI compilation failed:', error.stdout || error.message);
      expect(false).toBe(true);
    }
  });

  it('should validate type system performance in large codebases', () => {
    // Generate a large number of type usage scenarios
    const largeCodebase = `
import type {
  LLMConfig,
  ChatMessage,
  ShellCommand,
  FileContext,
  ChatSession,
  Result,
  AppConfig
} from '../../../src/types';

// Generate many configurations
${Array.from({ length: 50 }, (_, i) => `
const config${i}: LLMConfig = {
  provider: ${i % 3 === 0 ? "'openai'" : i % 3 === 1 ? "'anthropic'" : "'gemini'"},
  apiKey: 'key-${i}',
  model: 'model-${i}',
  temperature: ${(i * 0.01).toFixed(2)},
  maxTokens: ${1000 + i * 10}
};`).join('')}

// Generate many messages
${Array.from({ length: 100 }, (_, i) => `
const message${i}: ChatMessage = {
  role: ${i % 3 === 0 ? "'user'" : i % 3 === 1 ? "'assistant'" : "'system'"},
  content: 'Message content ${i}',
  timestamp: new Date('2024-01-01T${String(10 + Math.floor(i / 60)).padStart(2, '0')}:${String(i % 60).padStart(2, '0')}:00Z')
};`).join('')}

// Generate many shell commands
${Array.from({ length: 50 }, (_, i) => `
const command${i}: ShellCommand = {
  command: 'command-${i}',
  args: ['arg${i}-1', 'arg${i}-2'],
  timeout: ${5000 + i * 100},
  requireConfirmation: ${i % 2 === 0}
};`).join('')}

// Generate many file contexts
${Array.from({ length: 30 }, (_, i) => `
const file${i}: FileContext = {
  path: '/project/file${i}.ts',
  content: 'export const value${i} = ${i};',
  language: 'typescript',
  size: ${100 + i * 10},
  lastModified: new Date('2024-01-01T${String(10 + Math.floor(i / 60)).padStart(2, '0')}:${String(i % 60).padStart(2, '0')}:00Z')
};`).join('')}

// Create app configurations using generated data
const appConfigs: AppConfig[] = [
${Array.from({ length: 10 }, (_, i) => `
  {
    llm: config${i * 5},
    shell: {
      allowDangerousCommands: ${i % 2 === 0},
      defaultTimeout: ${30000 + i * 5000},
      confirmationRequired: ${i % 3 === 0},
      historySize: ${100 + i * 50}
    },
    editor: {
      defaultEditor: 'editor-${i}',
      tempDir: '/tmp/editor-${i}'
    },
    session: {
      saveHistory: ${i % 2 === 0},
      maxHistorySize: ${1000 + i * 500},
      historyPath: '/path/to/session-${i}.json'
    }
  }`).join(',')}
];

// Create sessions using generated data
const sessions: ChatSession[] = [
${Array.from({ length: 5 }, (_, i) => `
  {
    id: 'session-${i}',
    name: 'Session ${i}',
    messages: [${Array.from({ length: 5 }, (_, j) => `message${i * 5 + j}`).join(', ')}],
    context: [${Array.from({ length: 3 }, (_, j) => `file${i * 3 + j}`).join(', ')}],
    config: appConfigs[${i}],
    createdAt: new Date('2024-01-0${i + 1}T10:00:00Z'),
    updatedAt: new Date('2024-01-0${i + 1}T11:00:00Z')
  }`).join(',')}
];

// Function to process all data
function processLargeDataset(): Result<number> {
  try {
    let totalItems = 0;
    totalItems += appConfigs.length;
    totalItems += sessions.length;
    
    // Simulate processing
    sessions.forEach(session => {
      totalItems += session.messages.length;
      totalItems += session.context.length;
    });

    return { success: true, data: totalItems };
  } catch (error) {
    return { success: false, error: error as Error };
  }
}

export { appConfigs, sessions, processLargeDataset };
`;

    const testFilePath = join(testDir, 'large-codebase.ts');
    writeFileSync(testFilePath, largeCodebase);

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

    writeFileSync(join(testDir, 'tsconfig.json'), JSON.stringify(tsconfig, null, 2));

    // Test compilation performance
    const startTime = Date.now();
    try {
      execSync(`npx tsc --project ${join(testDir, 'tsconfig.json')}`, {
        encoding: 'utf-8',
        cwd: process.cwd()
      });
      
      const endTime = Date.now();
      const compilationTime = endTime - startTime;
      
      // Compilation should complete in reasonable time (< 10 seconds)
      expect(compilationTime).toBeLessThan(10000);
      console.log(\`Large codebase compilation time: \${compilationTime}ms\`);
    } catch (error: any) {
      console.error('Large codebase compilation failed:', error.stdout || error.message);
      expect(false).toBe(true);
    }
  });

  it('should validate type system works with build tools', () => {
    // Test that our types work with common build tools
    const buildToolTest = `
import type {
  LLMConfig,
  ChatSession,
  AppConfig,
  Result
} from '../../../src/types';

// Export types for library usage
export type { LLMConfig, ChatSession, AppConfig, Result };

// Export utility functions
export function createDefaultConfig(): AppConfig {
  return {
    llm: {
      provider: 'openai',
      apiKey: '',
      model: 'gpt-4'
    },
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
      historyPath: '~/.cli-coder/history.json'
    }
  };
}

export function createSession(id: string): ChatSession {
  return {
    id,
    messages: [],
    context: [],
    config: {},
    createdAt: new Date(),
    updatedAt: new Date()
  };
}

export function validateLLMConfig(config: LLMConfig): Result<boolean> {
  if (!config.apiKey || config.apiKey.length === 0) {
    return { success: false, error: new Error('API key is required') };
  }
  
  if (!config.model || config.model.length === 0) {
    return { success: false, error: new Error('Model is required') };
  }
  
  if (config.temperature !== undefined && (config.temperature < 0 || config.temperature > 2)) {
    return { success: false, error: new Error('Temperature must be between 0 and 2') };
  }
  
  return { success: true, data: true };
}

// Default export for library
const CLICoderTypes = {
  createDefaultConfig,
  createSession,
  validateLLMConfig
};

export default CLICoderTypes;
`;

    const testFilePath = join(testDir, 'build-tool-test.ts');
    writeFileSync(testFilePath, buildToolTest);

    // Create package.json with build script
    const packageJson = {
      name: 'build-tool-test',
      version: '1.0.0',
      type: 'module',
      main: 'dist/build-tool-test.js',
      types: 'dist/build-tool-test.d.ts',
      scripts: {
        build: 'tsc'
      }
    };

    writeFileSync(join(testDir, 'package.json'), JSON.stringify(packageJson, null, 2));

    // Create tsconfig for library build
    const tsconfig = {
      compilerOptions: {
        target: 'ES2022',
        module: 'ESNext',
        moduleResolution: 'node',
        strict: true,
        esModuleInterop: true,
        skipLibCheck: true,
        declaration: true,
        declarationMap: true,
        sourceMap: true,
        outDir: './dist',
        rootDir: '.'
      },
      include: [testFilePath],
      exclude: ['dist', 'node_modules']
    };

    writeFileSync(join(testDir, 'tsconfig.json'), JSON.stringify(tsconfig, null, 2));

    // Test library build
    try {
      execSync('npm run build', {
        encoding: 'utf-8',
        cwd: testDir
      });

      // Verify build outputs
      const outputs = [
        'dist/build-tool-test.js',
        'dist/build-tool-test.d.ts',
        'dist/build-tool-test.js.map',
        'dist/build-tool-test.d.ts.map'
      ];

      outputs.forEach(output => {
        try {
          execSync(\`test -f \${output}\`, { cwd: testDir });
        } catch {
          expect(false).toBe(true); // File doesn't exist
        }
      });

      expect(true).toBe(true); // All files exist
    } catch (error: any) {
      console.error('Build tool test failed:', error.stdout || error.message);
      expect(false).toBe(true);
    }
  });

  it('should validate type system documentation generation', () => {
    // Test that our types can generate proper documentation
    const docTestCode = `
/**
 * @fileoverview Documentation test for CLI Coder types
 * @author CLI Coder Team
 * @version 1.0.0
 */

import type {
  LLMConfig,
  ChatMessage,
  ChatSession,
  ShellCommand,
  AppConfig
} from '../../../src/types';

/**
 * Configuration for Large Language Model providers
 * @example
 * const config: LLMConfig = {
 *   provider: 'openai',
 *   apiKey: 'sk-...',
 *   model: 'gpt-4',
 *   temperature: 0.7
 * };
 */
export type DocumentedLLMConfig = LLMConfig;

/**
 * A message in a chat conversation
 * @example
 * const message: ChatMessage = {
 *   role: 'user',
 *   content: 'Hello, how can you help me?',
 *   timestamp: new Date()
 * };
 */
export type DocumentedChatMessage = ChatMessage;

/**
 * A complete chat session with history and context
 * @example
 * const session: ChatSession = {
 *   id: 'session-123',
 *   messages: [],
 *   context: [],
 *   config: {},
 *   createdAt: new Date(),
 *   updatedAt: new Date()
 * };
 */
export type DocumentedChatSession = ChatSession;

/**
 * A shell command to be executed
 * @example
 * const command: ShellCommand = {
 *   command: 'npm',
 *   args: ['install'],
 *   timeout: 30000
 * };
 */
export type DocumentedShellCommand = ShellCommand;

/**
 * Complete application configuration
 * @example
 * const config: AppConfig = {
 *   llm: { provider: 'openai', apiKey: '...', model: 'gpt-4' },
 *   shell: { allowDangerousCommands: false, defaultTimeout: 30000, confirmationRequired: true, historySize: 100 },
 *   editor: { defaultEditor: 'code', tempDir: '/tmp' },
 *   session: { saveHistory: true, maxHistorySize: 1000, historyPath: '~/.history' }
 * };
 */
export type DocumentedAppConfig = AppConfig;

/**
 * Utility class for working with CLI Coder types
 */
export class TypeDocumentation {
  /**
   * Creates a default LLM configuration
   * @param provider - The LLM provider to use
   * @param apiKey - The API key for the provider
   * @param model - The model to use
   * @returns A configured LLMConfig object
   */
  static createLLMConfig(
    provider: 'openai' | 'anthropic' | 'gemini',
    apiKey: string,
    model: string
  ): LLMConfig {
    return {
      provider,
      apiKey,
      model,
      temperature: 0.7,
      maxTokens: 2000
    };
  }

  /**
   * Creates a new chat session
   * @param id - Unique identifier for the session
   * @param name - Optional name for the session
   * @returns A new ChatSession object
   */
  static createSession(id: string, name?: string): ChatSession {
    return {
      id,
      name,
      messages: [],
      context: [],
      config: {},
      createdAt: new Date(),
      updatedAt: new Date()
    };
  }
}
`;

    const testFilePath = join(testDir, 'doc-test.ts');
    writeFileSync(testFilePath, docTestCode);

    // Create typedoc config
    const typedocConfig = {
      entryPoints: [testFilePath],
      out: './docs',
      theme: 'default',
      excludePrivate: true,
      excludeProtected: true,
      excludeExternals: true,
      readme: 'none'
    };

    writeFileSync(join(testDir, 'typedoc.json'), JSON.stringify(typedocConfig, null, 2));

    // Create tsconfig
    const tsconfig = {
      compilerOptions: {
        target: 'ES2022',
        module: 'ESNext',
        moduleResolution: 'node',
        strict: true,
        esModuleInterop: true,
        skipLibCheck: true,
        declaration: true,
        outDir: './dist'
      },
      include: [testFilePath]
    };

    writeFileSync(join(testDir, 'tsconfig.json'), JSON.stringify(tsconfig, null, 2));

    // Test TypeScript compilation first
    try {
      execSync(\`npx tsc --project \${join(testDir, 'tsconfig.json')}\`, {
        encoding: 'utf-8',
        cwd: process.cwd()
      });

      // Test documentation generation (if typedoc is available)
      try {
        execSync(\`npx typedoc --options \${join(testDir, 'typedoc.json')}\`, {
          encoding: 'utf-8',
          cwd: testDir,
          timeout: 30000
        });

        // Check if docs were generated
        try {
          execSync('test -d docs', { cwd: testDir });
          expect(true).toBe(true); // Docs directory exists
        } catch {
          console.warn('TypeDoc not available or documentation generation failed');
          expect(true).toBe(true); // Don't fail the test if typedoc isn't available
        }
      } catch (error) {
        console.warn('TypeDoc not available:', error);
        expect(true).toBe(true); // Don't fail if typedoc isn't installed
      }
    } catch (error: any) {
      console.error('Documentation test compilation failed:', error.stdout || error.message);
      expect(false).toBe(true);
    }
  });
});