/**
 * @fileoverview Unit tests for CLI type definitions
 */

import { describe, it, expect } from 'vitest';
import type { CLICommand, CommandOptions, CLIError, CLIErrorClass } from '../../../src/types/cli.types';

describe('CLI Types', () => {
  describe('CLICommand', () => {
    it('should validate CLICommand interface structure', () => {
      const command: CLICommand = {
        name: 'test-command',
        description: 'A test command',
        aliases: ['tc', 'test'],
        execute: async (args: string[], options: CommandOptions) => {
          // Mock execution
        }
      };

      expect(command.name).toBe('test-command');
      expect(command.description).toBe('A test command');
      expect(command.aliases).toEqual(['tc', 'test']);
      expect(typeof command.execute).toBe('function');
    });

    it('should allow optional aliases', () => {
      const command: CLICommand = {
        name: 'simple-command',
        description: 'A simple command without aliases',
        execute: async () => {}
      };

      expect(command.aliases).toBeUndefined();
      expect(command.name).toBe('simple-command');
    });

    it('should have proper execution signature', async () => {
      const mockExecute = async (args: string[], options: CommandOptions): Promise<void> => {
        expect(Array.isArray(args)).toBe(true);
        expect(typeof options).toBe('object');
      };

      const command: CLICommand = {
        name: 'execution-test',
        description: 'Test execution signature',
        execute: mockExecute
      };

      await command.execute(['arg1', 'arg2'], { flag: true });
    });
  });

  describe('CommandOptions', () => {
    it('should accept any string key with unknown value', () => {
      const options: CommandOptions = {
        verbose: true,
        output: 'json',
        count: 42,
        nested: { key: 'value' }
      };

      expect(options.verbose).toBe(true);
      expect(options.output).toBe('json');
      expect(options.count).toBe(42);
      expect(options.nested).toEqual({ key: 'value' });
    });
  });

  describe('CLIError', () => {
    it('should validate CLIError has required fields', () => {
      const error: CLIError = {
        code: 'INVALID_COMMAND',
        message: 'Command not found'
      };

      expect(error.code).toBe('INVALID_COMMAND');
      expect(error.message).toBe('Command not found');
      expect(error.details).toBeUndefined();
    });

    it('should allow optional details field', () => {
      const error: CLIError = {
        code: 'VALIDATION_ERROR',
        message: 'Invalid input provided',
        details: {
          field: 'username',
          value: 'invalid@value',
          reason: 'Contains invalid characters'
        }
      };

      expect(error.details).toBeDefined();
      expect(typeof error.details).toBe('object');
    });
  });

  describe('CLIErrorClass', () => {
    it('should extend Error interface properly', () => {
      class TestCLIError extends Error implements CLIErrorClass {
        public code: string;
        public details?: unknown;

        constructor(code: string, message: string, details?: unknown) {
          super(message);
          this.code = code;
          this.details = details;
          this.name = 'CLIError';
        }
      }

      const error = new TestCLIError('TEST_ERROR', 'Test error message', { test: true });

      expect(error instanceof Error).toBe(true);
      expect(error.code).toBe('TEST_ERROR');
      expect(error.message).toBe('Test error message');
      expect(error.details).toEqual({ test: true });
      expect(error.name).toBe('CLIError');
    });

    it('should work without details', () => {
      class SimpleCLIError extends Error implements CLIErrorClass {
        public code: string;

        constructor(code: string, message: string) {
          super(message);
          this.code = code;
          this.name = 'CLIError';
        }
      }

      const error = new SimpleCLIError('SIMPLE_ERROR', 'Simple error');

      expect(error.code).toBe('SIMPLE_ERROR');
      expect(error.message).toBe('Simple error');
      expect(error.details).toBeUndefined();
    });
  });
});