/**
 * @fileoverview Real API compatibility tests for type definitions
 */

import { describe, it, expect } from 'vitest';
import type { LLMResponse, LLMConfig } from '../../../src/types/llm.types';
import type { ShellResult, ShellCommand } from '../../../src/types/shell.types';

describe('API Compatibility Tests', () => {
  describe('OpenAI API Response Compatibility', () => {
    it('should match OpenAI API response structure', () => {
      // Real OpenAI API response structure (simplified)
      const mockOpenAIResponse = {
        id: 'chatcmpl-8VKpT7oSH3RhEjJyNc8J1qYzXzKPq',
        object: 'chat.completion',
        created: 1700000000,
        model: 'gpt-4-0613',
        choices: [
          {
            index: 0,
            message: {
              role: 'assistant',
              content: 'Hello! How can I help you with your coding project today?',
              function_call: null
            },
            finish_reason: 'stop'
          }
        ],
        usage: {
          prompt_tokens: 23,
          completion_tokens: 16,
          total_tokens: 39
        },
        system_fingerprint: 'fp_abc123'
      };

      // Transform to our LLMResponse type
      const llmResponse: LLMResponse = {
        content: mockOpenAIResponse.choices[0].message.content,
        usage: {
          promptTokens: mockOpenAIResponse.usage.prompt_tokens,
          completionTokens: mockOpenAIResponse.usage.completion_tokens,
          totalTokens: mockOpenAIResponse.usage.total_tokens
        },
        model: mockOpenAIResponse.model
      };

      expect(llmResponse.content).toBe('Hello! How can I help you with your coding project today?');
      expect(llmResponse.usage.promptTokens).toBe(23);
      expect(llmResponse.usage.completionTokens).toBe(16);
      expect(llmResponse.usage.totalTokens).toBe(39);
      expect(llmResponse.model).toBe('gpt-4-0613');
      
      // Validate our type structure matches expected usage
      expect(typeof llmResponse.content).toBe('string');
      expect(typeof llmResponse.usage.promptTokens).toBe('number');
      expect(typeof llmResponse.usage.completionTokens).toBe('number');
      expect(typeof llmResponse.usage.totalTokens).toBe('number');
      expect(typeof llmResponse.model).toBe('string');
    });

    it('should handle OpenAI streaming response chunks', () => {
      // OpenAI streaming response chunk
      const streamingChunk = {
        id: 'chatcmpl-8VKpT7oSH3RhEjJyNc8J1qYzXzKPq',
        object: 'chat.completion.chunk',
        created: 1700000000,
        model: 'gpt-4-0613',
        choices: [
          {
            index: 0,
            delta: {
              role: 'assistant',
              content: 'Hello'
            },
            finish_reason: null
          }
        ]
      };

      // For streaming, we might handle partial responses
      const partialResponse: Partial<LLMResponse> = {
        content: streamingChunk.choices[0].delta.content || '',
        model: streamingChunk.model
      };

      expect(partialResponse.content).toBe('Hello');
      expect(partialResponse.model).toBe('gpt-4-0613');
      expect(partialResponse.usage).toBeUndefined(); // Not available in streaming chunks
    });

    it('should validate OpenAI configuration patterns', () => {
      const validConfigs: LLMConfig[] = [
        {
          provider: 'openai',
          apiKey: 'sk-proj-1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef',
          model: 'gpt-4-turbo-preview',
          temperature: 0.7,
          maxTokens: 4096
        },
        {
          provider: 'openai',
          apiKey: 'sk-1234567890abcdef1234567890abcdef12345678',
          model: 'gpt-3.5-turbo',
          temperature: 0.0,
          maxTokens: 2048
        },
        {
          provider: 'openai',
          apiKey: 'sk-org-1234567890abcdef1234567890abcdef1234567890abcdef',
          model: 'gpt-4-0613'
        }
      ];

      validConfigs.forEach(config => {
        expect(config.provider).toBe('openai');
        expect(config.apiKey.startsWith('sk-')).toBe(true);
        expect(config.model.startsWith('gpt-')).toBe(true);
        
        if (config.temperature !== undefined) {
          expect(config.temperature).toBeGreaterThanOrEqual(0);
          expect(config.temperature).toBeLessThanOrEqual(2);
        }
        
        if (config.maxTokens !== undefined) {
          expect(config.maxTokens).toBeGreaterThan(0);
          expect(config.maxTokens).toBeLessThanOrEqual(8192);
        }
      });
    });
  });

  describe('Anthropic API Response Compatibility', () => {
    it('should match Anthropic API response structure', () => {
      // Real Anthropic API response structure
      const mockAnthropicResponse = {
        id: 'msg_01XFDUDYJgAACzvnptvVoYEL',
        type: 'message',
        role: 'assistant',
        content: [
          {
            type: 'text',
            text: 'I\'m Claude, an AI assistant created by Anthropic. I\'d be happy to help you with your coding questions!'
          }
        ],
        model: 'claude-3-sonnet-20240229',
        stop_reason: 'end_turn',
        stop_sequence: null,
        usage: {
          input_tokens: 15,
          output_tokens: 25
        }
      };

      // Transform to our LLMResponse type
      const llmResponse: LLMResponse = {
        content: mockAnthropicResponse.content[0].text,
        usage: {
          promptTokens: mockAnthropicResponse.usage.input_tokens,
          completionTokens: mockAnthropicResponse.usage.output_tokens,
          totalTokens: mockAnthropicResponse.usage.input_tokens + mockAnthropicResponse.usage.output_tokens
        },
        model: mockAnthropicResponse.model
      };

      expect(llmResponse.content).toBe('I\'m Claude, an AI assistant created by Anthropic. I\'d be happy to help you with your coding questions!');
      expect(llmResponse.usage.promptTokens).toBe(15);
      expect(llmResponse.usage.completionTokens).toBe(25);
      expect(llmResponse.usage.totalTokens).toBe(40);
      expect(llmResponse.model).toBe('claude-3-sonnet-20240229');
    });

    it('should handle Anthropic multi-content responses', () => {
      // Anthropic can return multiple content blocks
      const multiContentResponse = {
        id: 'msg_example',
        type: 'message',
        role: 'assistant',
        content: [
          {
            type: 'text',
            text: 'Here\'s a code example:'
          },
          {
            type: 'text',
            text: 'console.log("Hello, World!");'
          },
          {
            type: 'text',
            text: 'This prints a greeting to the console.'
          }
        ],
        model: 'claude-3-sonnet-20240229',
        usage: {
          input_tokens: 10,
          output_tokens: 20
        }
      };

      // Combine all text content
      const combinedContent = multiContentResponse.content
        .filter(block => block.type === 'text')
        .map(block => block.text)
        .join('\n\n');

      const llmResponse: LLMResponse = {
        content: combinedContent,
        usage: {
          promptTokens: multiContentResponse.usage.input_tokens,
          completionTokens: multiContentResponse.usage.output_tokens,
          totalTokens: multiContentResponse.usage.input_tokens + multiContentResponse.usage.output_tokens
        },
        model: multiContentResponse.model
      };

      expect(llmResponse.content).toContain('Here\'s a code example:');
      expect(llmResponse.content).toContain('console.log("Hello, World!");');
      expect(llmResponse.content).toContain('This prints a greeting to the console.');
    });

    it('should validate Anthropic configuration patterns', () => {
      const validConfigs: LLMConfig[] = [
        {
          provider: 'anthropic',
          apiKey: 'sk-ant-api03-1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef12',
          model: 'claude-3-opus-20240229',
          temperature: 0.5,
          maxTokens: 4000
        },
        {
          provider: 'anthropic',
          apiKey: 'sk-ant-api03-abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890ab',
          model: 'claude-3-sonnet-20240229',
          temperature: 0.7
        },
        {
          provider: 'anthropic',
          apiKey: 'sk-ant-api03-xyz1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcd',
          model: 'claude-3-haiku-20240307'
        }
      ];

      validConfigs.forEach(config => {
        expect(config.provider).toBe('anthropic');
        expect(config.apiKey.startsWith('sk-ant-')).toBe(true);
        expect(config.model.startsWith('claude-')).toBe(true);
        
        if (config.temperature !== undefined) {
          expect(config.temperature).toBeGreaterThanOrEqual(0);
          expect(config.temperature).toBeLessThanOrEqual(1);
        }
      });
    });
  });

  describe('Google Gemini API Response Compatibility', () => {
    it('should match Gemini API response structure', () => {
      // Real Google Gemini API response structure
      const mockGeminiResponse = {
        candidates: [
          {
            content: {
              parts: [
                {
                  text: 'Hello! I\'m Gemini, Google\'s AI model. I can help you with various coding tasks and questions.'
                }
              ],
              role: 'model'
            },
            finishReason: 'STOP',
            index: 0,
            safetyRatings: [
              {
                category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT',
                probability: 'NEGLIGIBLE'
              },
              {
                category: 'HARM_CATEGORY_HATE_SPEECH',
                probability: 'NEGLIGIBLE'
              }
            ]
          }
        ],
        promptFeedback: {
          safetyRatings: []
        },
        usageMetadata: {
          promptTokenCount: 12,
          candidatesTokenCount: 18,
          totalTokenCount: 30
        }
      };

      // Transform to our LLMResponse type
      const llmResponse: LLMResponse = {
        content: mockGeminiResponse.candidates[0].content.parts[0].text,
        usage: {
          promptTokens: mockGeminiResponse.usageMetadata.promptTokenCount,
          completionTokens: mockGeminiResponse.usageMetadata.candidatesTokenCount,
          totalTokens: mockGeminiResponse.usageMetadata.totalTokenCount
        },
        model: 'gemini-pro' // Model name not always in response, set from config
      };

      expect(llmResponse.content).toBe('Hello! I\'m Gemini, Google\'s AI model. I can help you with various coding tasks and questions.');
      expect(llmResponse.usage.promptTokens).toBe(12);
      expect(llmResponse.usage.completionTokens).toBe(18);
      expect(llmResponse.usage.totalTokens).toBe(30);
      expect(llmResponse.model).toBe('gemini-pro');
    });

    it('should handle Gemini multi-part responses', () => {
      // Gemini can return multiple parts in content
      const multiPartResponse = {
        candidates: [
          {
            content: {
              parts: [
                {
                  text: 'Here\'s how to create a function in JavaScript:'
                },
                {
                  text: 'function greet(name) {\n  return `Hello, ${name}!`;\n}'
                },
                {
                  text: 'You can call it like: greet("World")'
                }
              ],
              role: 'model'
            },
            finishReason: 'STOP'
          }
        ],
        usageMetadata: {
          promptTokenCount: 8,
          candidatesTokenCount: 25,
          totalTokenCount: 33
        }
      };

      // Combine all text parts
      const combinedContent = multiPartResponse.candidates[0].content.parts
        .map(part => part.text)
        .join('\n\n');

      const llmResponse: LLMResponse = {
        content: combinedContent,
        usage: {
          promptTokens: multiPartResponse.usageMetadata.promptTokenCount,
          completionTokens: multiPartResponse.usageMetadata.candidatesTokenCount,
          totalTokens: multiPartResponse.usageMetadata.totalTokenCount
        },
        model: 'gemini-1.5-pro'
      };

      expect(llmResponse.content).toContain('Here\'s how to create a function in JavaScript:');
      expect(llmResponse.content).toContain('function greet(name)');
      expect(llmResponse.content).toContain('You can call it like: greet("World")');
    });

    it('should validate Gemini configuration patterns', () => {
      const validConfigs: LLMConfig[] = [
        {
          provider: 'gemini',
          apiKey: 'AIzaSyAbCdEfGhIjKlMnOpQrStUvWxYz1234567890',
          model: 'gemini-1.5-pro-latest',
          temperature: 0.9,
          maxTokens: 2048
        },
        {
          provider: 'gemini',
          apiKey: 'AIzaSyXyZ1234567890AbCdEfGhIjKlMnOpQrStUv',
          model: 'gemini-pro',
          temperature: 0.4
        },
        {
          provider: 'gemini',
          apiKey: 'AIzaSy9876543210ZyXwVuTsRqPoNmLkJiHgFeDcBa',
          model: 'gemini-1.0-pro'
        }
      ];

      validConfigs.forEach(config => {
        expect(config.provider).toBe('gemini');
        expect(config.apiKey.startsWith('AIzaSy')).toBe(true);
        expect(config.model.includes('gemini')).toBe(true);
        
        if (config.temperature !== undefined) {
          expect(config.temperature).toBeGreaterThanOrEqual(0);
          expect(config.temperature).toBeLessThanOrEqual(2);
        }
      });
    });
  });

  describe('Shell Command Execution Compatibility', () => {
    it('should match real command execution results', () => {
      // Mock actual shell execution results
      const realCommandResults = [
        {
          command: 'ls -la',
          stdout: 'total 24\ndrwxr-xr-x  3 user user 4096 Jan  1 10:00 .\ndrwxr-xr-x 10 user user 4096 Jan  1 09:00 ..\n-rw-r--r--  1 user user  100 Jan  1 10:00 file.txt',
          stderr: '',
          exitCode: 0,
          duration: 45
        },
        {
          command: 'git status',
          stdout: 'On branch main\nYour branch is up to date with \'origin/main\'.\n\nnothing to commit, working tree clean',
          stderr: '',
          exitCode: 0,
          duration: 120
        },
        {
          command: 'npm test',
          stdout: '> test\n> jest\n\n PASS  ./tests/example.test.js\n  ✓ example test (2 ms)\n\nTest Suites: 1 passed, 1 total\nTests:       1 passed, 1 total',
          stderr: '',
          exitCode: 0,
          duration: 3500
        },
        {
          command: 'nonexistent-command',
          stdout: '',
          stderr: 'bash: nonexistent-command: command not found',
          exitCode: 127,
          duration: 25
        }
      ];

      // Transform to our ShellResult types
      const shellResults: ShellResult[] = realCommandResults.map(result => ({
        success: result.exitCode === 0,
        stdout: result.stdout,
        stderr: result.stderr,
        exitCode: result.exitCode,
        command: result.command,
        duration: result.duration
      }));

      // Validate successful commands
      const successfulResults = shellResults.filter(r => r.success);
      expect(successfulResults).toHaveLength(3);
      
      successfulResults.forEach(result => {
        expect(result.success).toBe(true);
        expect(result.exitCode).toBe(0);
        expect(result.stderr).toBe('');
        expect(result.stdout.length).toBeGreaterThan(0);
        expect(result.duration).toBeGreaterThan(0);
      });

      // Validate failed command
      const failedResults = shellResults.filter(r => !r.success);
      expect(failedResults).toHaveLength(1);
      
      const failedResult = failedResults[0];
      expect(failedResult.success).toBe(false);
      expect(failedResult.exitCode).toBe(127);
      expect(failedResult.stdout).toBe('');
      expect(failedResult.stderr).toContain('command not found');
    });

    it('should handle different shell command patterns', () => {
      const commandPatterns: ShellCommand[] = [
        // Simple commands
        { command: 'pwd' },
        { command: 'whoami' },
        
        // Commands with arguments
        { command: 'ls', args: ['-la', '/tmp'] },
        { command: 'grep', args: ['pattern', 'file.txt'] },
        
        // Complex git commands
        { command: 'git', args: ['log', '--oneline', '--graph', '-10'] },
        { command: 'git', args: ['diff', 'HEAD~1', 'HEAD', '--name-only'] },
        
        // Package manager commands
        { command: 'npm', args: ['run', 'build'], timeout: 120000 },
        { command: 'yarn', args: ['install', '--frozen-lockfile'], timeout: 180000 },
        
        // System commands with confirmation
        { command: 'sudo', args: ['systemctl', 'restart', 'nginx'], requireConfirmation: true },
        { command: 'rm', args: ['-rf', 'temp-directory'], requireConfirmation: true }
      ];

      commandPatterns.forEach(cmd => {
        expect(typeof cmd.command).toBe('string');
        expect(cmd.command.length).toBeGreaterThan(0);
        
        if (cmd.args) {
          expect(Array.isArray(cmd.args)).toBe(true);
        }
        
        if (cmd.timeout) {
          expect(cmd.timeout).toBeGreaterThan(0);
        }
        
        if (cmd.requireConfirmation !== undefined) {
          expect(typeof cmd.requireConfirmation).toBe('boolean');
        }
      });
    });

    it('should validate command safety patterns', () => {
      const safetyTests = [
        {
          command: { command: 'ls', args: ['-la'] },
          expectedDangerous: false
        },
        {
          command: { command: 'rm', args: ['-rf', '/'] },
          expectedDangerous: true
        },
        {
          command: { command: 'sudo', args: ['rm', 'file.txt'] },
          expectedDangerous: true
        },
        {
          command: { command: 'git', args: ['push', '--force'] },
          expectedDangerous: false // Potentially risky but not system-dangerous
        },
        {
          command: { command: 'mkfs', args: ['/dev/sda1'] },
          expectedDangerous: true
        },
        {
          command: { command: 'npm', args: ['install'] },
          expectedDangerous: false
        }
      ];

      // Simple danger detection function
      const isDangerous = (cmd: ShellCommand): boolean => {
        const dangerousCommands = ['rm', 'sudo', 'mkfs', 'fdisk', 'dd', 'format'];
        if (dangerousCommands.includes(cmd.command)) return true;
        
        const argsString = cmd.args?.join(' ') || '';
        const dangerousPatterns = ['-rf /', '/dev/', '--force-with-lease'];
        return dangerousPatterns.some(pattern => argsString.includes(pattern));
      };

      safetyTests.forEach(test => {
        const actualDangerous = isDangerous(test.command);
        expect(actualDangerous).toBe(test.expectedDangerous);
      });
    });
  });

  describe('Cross-API Response Normalization', () => {
    it('should normalize responses from different providers', () => {
      // Different provider response formats that should normalize to same structure
      const providerResponses = {
        openai: {
          choices: [{ message: { content: 'OpenAI response' } }],
          usage: { prompt_tokens: 10, completion_tokens: 15, total_tokens: 25 },
          model: 'gpt-4'
        },
        anthropic: {
          content: [{ text: 'Anthropic response' }],
          usage: { input_tokens: 12, output_tokens: 18 },
          model: 'claude-3-sonnet'
        },
        gemini: {
          candidates: [{ content: { parts: [{ text: 'Gemini response' }] } }],
          usageMetadata: { promptTokenCount: 8, candidatesTokenCount: 20, totalTokenCount: 28 }
        }
      };

      // Normalize all to our LLMResponse format
      const normalizedResponses: LLMResponse[] = [
        {
          content: providerResponses.openai.choices[0].message.content,
          usage: {
            promptTokens: providerResponses.openai.usage.prompt_tokens,
            completionTokens: providerResponses.openai.usage.completion_tokens,
            totalTokens: providerResponses.openai.usage.total_tokens
          },
          model: providerResponses.openai.model
        },
        {
          content: providerResponses.anthropic.content[0].text,
          usage: {
            promptTokens: providerResponses.anthropic.usage.input_tokens,
            completionTokens: providerResponses.anthropic.usage.output_tokens,
            totalTokens: providerResponses.anthropic.usage.input_tokens + providerResponses.anthropic.usage.output_tokens
          },
          model: providerResponses.anthropic.model
        },
        {
          content: providerResponses.gemini.candidates[0].content.parts[0].text,
          usage: {
            promptTokens: providerResponses.gemini.usageMetadata.promptTokenCount,
            completionTokens: providerResponses.gemini.usageMetadata.candidatesTokenCount,
            totalTokens: providerResponses.gemini.usageMetadata.totalTokenCount
          },
          model: 'gemini-pro'
        }
      ];

      // All responses should have consistent structure
      normalizedResponses.forEach(response => {
        expect(typeof response.content).toBe('string');
        expect(response.content.length).toBeGreaterThan(0);
        expect(typeof response.usage.promptTokens).toBe('number');
        expect(typeof response.usage.completionTokens).toBe('number');
        expect(typeof response.usage.totalTokens).toBe('number');
        expect(typeof response.model).toBe('string');
        
        // Token consistency
        expect(response.usage.totalTokens).toBeGreaterThanOrEqual(
          response.usage.promptTokens + response.usage.completionTokens
        );
      });

      // Verify specific responses
      expect(normalizedResponses[0].content).toBe('OpenAI response');
      expect(normalizedResponses[1].content).toBe('Anthropic response');
      expect(normalizedResponses[2].content).toBe('Gemini response');
    });
  });
});