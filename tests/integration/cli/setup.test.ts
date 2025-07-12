import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { execSync } from 'child_process';
import { mkdirSync, rmSync } from 'fs';
import { join } from 'path';

describe('CLI Setup Integration', () => {
  let testDir: string;

  beforeEach(() => {
    testDir = join('/tmp', 'cli-coder-integration-test', Date.now().toString());
    mkdirSync(testDir, { recursive: true });
  });

  afterEach(() => {
    if (testDir) {
      rmSync(testDir, { recursive: true, force: true });
    }
  });

  it('should build successfully', () => {
    expect(() => {
      execSync('npm run build', { 
        stdio: 'pipe',
        cwd: process.cwd()
      });
    }).not.toThrow();
  });

  it('should run type checking without errors', () => {
    expect(() => {
      execSync('npm run type-check', { 
        stdio: 'pipe',
        cwd: process.cwd()
      });
    }).not.toThrow();
  });

  it('should run linting without errors', () => {
    expect(() => {
      execSync('npm run lint', { 
        stdio: 'pipe',
        cwd: process.cwd()
      });
    }).not.toThrow();
  });

  it('should have working CLI entry point after build', () => {
    // Build first
    execSync('npm run build', { 
      stdio: 'pipe',
      cwd: process.cwd()
    });

    // Test that the built CLI can be executed
    expect(() => {
      const output = execSync('node dist/index.js --help', { 
        encoding: 'utf-8',
        cwd: process.cwd()
      });
      expect(output).toContain('cli-coder');
      expect(output).toContain('AI-powered CLI coding assistant');
    }).not.toThrow();
  });
});