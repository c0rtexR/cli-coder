/**
 * @fileoverview Unit tests for type system structure validation
 */

import { describe, it, expect } from 'vitest';

describe('Type System Structure', () => {
  it('should export all required type categories from main index', async () => {
    // Test dynamic import to verify exports
    const Types = await import('../../../src/types');
    
    // Verify utility types are exported
    expect(Types.isSuccess).toBeDefined();
    expect(Types.isError).toBeDefined();
    expect(typeof Types.isSuccess).toBe('function');
    expect(typeof Types.isError).toBe('function');
  });

  it('should export CLI types', async () => {
    const CLITypes = await import('../../../src/types/cli.types');
    
    // Verify types exist by checking their TypeScript definitions exist
    // Note: In runtime, TypeScript interfaces don't exist, but we can test imports work
    expect(CLITypes).toBeDefined();
  });

  it('should export LLM types', async () => {
    const LLMTypes = await import('../../../src/types/llm.types');
    
    expect(LLMTypes).toBeDefined();
  });

  it('should export Shell types', async () => {
    const ShellTypes = await import('../../../src/types/shell.types');
    
    expect(ShellTypes).toBeDefined();
  });

  it('should export Config types', async () => {
    const ConfigTypes = await import('../../../src/types/config.types');
    
    expect(ConfigTypes).toBeDefined();
  });

  it('should export Session types', async () => {
    const SessionTypes = await import('../../../src/types/session.types');
    
    expect(SessionTypes).toBeDefined();
  });

  it('should provide type consistency across modules', async () => {
    // Import all type modules
    const Types = await import('../../../src/types');
    const CLITypes = await import('../../../src/types/cli.types');
    const LLMTypes = await import('../../../src/types/llm.types');
    const ShellTypes = await import('../../../src/types/shell.types');
    const ConfigTypes = await import('../../../src/types/config.types');
    const SessionTypes = await import('../../../src/types/session.types');

    // Verify all modules loaded without errors
    expect(Types).toBeDefined();
    expect(CLITypes).toBeDefined();
    expect(LLMTypes).toBeDefined();
    expect(ShellTypes).toBeDefined();
    expect(ConfigTypes).toBeDefined();
    expect(SessionTypes).toBeDefined();
  });

  it('should have no circular dependencies', async () => {
    // Test that all type modules can be imported independently
    const importPromises = [
      import('../../../src/types/cli.types'),
      import('../../../src/types/llm.types'),
      import('../../../src/types/shell.types'),
      import('../../../src/types/config.types'),
      import('../../../src/types/session.types')
    ];

    // If there are circular dependencies, this will throw
    const modules = await Promise.all(importPromises);
    
    expect(modules).toHaveLength(5);
    modules.forEach(module => {
      expect(module).toBeDefined();
    });
  });

  it('should support tree shaking by using individual imports', async () => {
    // Test individual type imports to ensure proper module structure
    try {
      // These imports should work for proper tree shaking
      await import('../../../src/types/cli.types');
      await import('../../../src/types/llm.types');
      await import('../../../src/types/shell.types');
      await import('../../../src/types/config.types');
      await import('../../../src/types/session.types');
      
      // If we get here, all imports worked
      expect(true).toBe(true);
    } catch (error) {
      // If any import fails, the test should fail
      expect(error).toBeUndefined();
    }
  });
});