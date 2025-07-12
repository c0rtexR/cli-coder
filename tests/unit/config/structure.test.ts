import { describe, it, expect } from 'vitest';
import { existsSync } from 'fs';
import { join } from 'path';

describe('Project Structure', () => {
  const projectRoot = process.cwd();

  it('should have all required directories', () => {
    const requiredDirs = [
      'src/types',
      'src/commands', 
      'src/core/agent',
      'src/core/chat',
      'src/core/session',
      'src/core/tui/components',
      'src/integrations/llm',
      'src/integrations/git',
      'src/integrations/filesystem',
      'src/integrations/clipboard',
      'src/utils',
      'src/config',
      'bin',
      'tests/unit',
      'tests/integration',
      'tests/e2e',
      'tests/real',
      'tests/fixtures',
      'docs',
      'scripts'
    ];

    requiredDirs.forEach(dir => {
      expect(existsSync(join(projectRoot, dir))).toBe(true);
    });
  });

  it('should have all required config files', () => {
    const requiredFiles = [
      'package.json',
      'tsconfig.json',
      'vitest.config.ts',
      '.env.example',
      '.gitignore',
      'eslint.config.js'
    ];

    requiredFiles.forEach(file => {
      expect(existsSync(join(projectRoot, file))).toBe(true);
    });
  });

  it('should have proper test directory structure', () => {
    const testDirs = [
      'tests/unit/config',
      'tests/unit/utils',
      'tests/unit/types',
      'tests/unit/commands',
      'tests/integration/cli',
      'tests/integration/llm',
      'tests/integration/filesystem',
      'tests/integration/session',
      'tests/e2e/scenarios',
      'tests/e2e/fixtures',
      'tests/e2e/helpers',
      'tests/real/commands',
      'tests/real/workflows',
      'tests/real/helpers',
      'tests/fixtures/files',
      'tests/fixtures/configs',
      'tests/fixtures/responses'
    ];

    testDirs.forEach(dir => {
      expect(existsSync(join(projectRoot, dir))).toBe(true);
    });
  });
});