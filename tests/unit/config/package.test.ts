import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { join } from 'path';

describe('Package Configuration', () => {
  const packageJson = JSON.parse(
    readFileSync(join(process.cwd(), 'package.json'), 'utf-8')
  );

  it('should have all required scripts', () => {
    const requiredScripts = [
      'dev',
      'build', 
      'test',
      'test:unit',
      'test:integration',
      'test:e2e',
      'test:real',
      'test:all',
      'type-check',
      'lint'
    ];

    requiredScripts.forEach(script => {
      expect(packageJson.scripts).toHaveProperty(script);
    });
  });

  it('should have all required dependencies', () => {
    const requiredDeps = [
      'commander',
      'inquirer',
      'chalk',
      'zod',
      'openai',
      '@anthropic-ai/sdk',
      'ink',
      'react'
    ];

    requiredDeps.forEach(dep => {
      expect(packageJson.dependencies).toHaveProperty(dep);
    });
  });

  it('should have all required dev dependencies', () => {
    const requiredDevDeps = [
      'typescript',
      'vitest',
      '@vitest/coverage-v8',
      'eslint',
      '@typescript-eslint/eslint-plugin',
      'tsx',
      'tsup'
    ];

    requiredDevDeps.forEach(dep => {
      expect(packageJson.devDependencies).toHaveProperty(dep);
    });
  });

  it('should have correct package metadata', () => {
    expect(packageJson.name).toBe('cli-coder');
    expect(packageJson.version).toBe('0.1.0');
    expect(packageJson.description).toBe('AI-powered CLI coding assistant');
    expect(packageJson.type).toBe('module');
    expect(packageJson.bin).toHaveProperty('cli-coder');
  });

  it('should have proper entry points', () => {
    expect(packageJson.main).toBe('dist/index.js');
    expect(packageJson.bin['cli-coder']).toBe('./bin/cli-coder');
  });
});